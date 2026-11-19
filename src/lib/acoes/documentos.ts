"use server";

import type { CategoriaDocumento } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { registrarHistorico } from "@/lib/auditoria";
import { exigirPermissaoAcao } from "@/lib/auth/guardas";
import { obterIpRequisicao, type UsuarioSessao } from "@/lib/auth/sessao";
import {
  criarUrlDeEnvio, driver, hashDe, lerArquivo, nomeValido, removerArquivo, salvarArquivo,
} from "@/lib/documentos/armazenamento";
import {
  CATEGORIAS_DOCUMENTO, extensaoDe, sanitizarNome, TAMANHO_MAXIMO, TIPOS_PERMITIDOS, validarArquivo,
} from "@/lib/documentos/validacao";
import { sucesso, type EstadoFormulario } from "./tipos";

const vazioParaNull = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v.trim() : null);

interface Metadados {
  categoria: CategoriaDocumento;
  descricao: string | null;
  clienteId: string | null;
  propriedadeId: string | null;
  servicoId: string | null;
}

/** Valida categoria e vínculos (cliente/propriedade/serviço coerentes entre si). */
async function lerMetadados(formData: FormData): Promise<{ ok: true; dados: Metadados } | { ok: false; estado: EstadoFormulario }> {
  const categoria = String(formData.get("categoria") ?? "");
  const descricao = vazioParaNull(formData.get("descricao"))?.slice(0, 300) ?? null;
  let clienteId = vazioParaNull(formData.get("clienteId"));
  const propriedadeId = vazioParaNull(formData.get("propriedadeId"));
  const servicoId = vazioParaNull(formData.get("servicoId"));

  // Devolvidos em caso de erro para não obrigar a preencher tudo de novo (o arquivo precisa ser reescolhido).
  const valores = { categoria, descricao: descricao ?? "", clienteId: clienteId ?? "", propriedadeId: propriedadeId ?? "", servicoId: servicoId ?? "" };
  const falha = (erros: Record<string, string[]>) => ({ ok: false as const, estado: { erros, valores } });

  const erros: Record<string, string[]> = {};
  if (!(categoria in CATEGORIAS_DOCUMENTO)) erros.categoria = ["Selecione a categoria."];
  if (!clienteId && !propriedadeId && !servicoId) erros.clienteId = ["Vincule o documento a um cliente, propriedade ou serviço."];
  if (Object.keys(erros).length) return falha(erros);

  if (servicoId) {
    const s = await prisma.servico.findUnique({ where: { id: servicoId }, select: { clienteId: true } });
    if (!s) return falha({ servicoId: ["Serviço não encontrado."] });
    if (clienteId && s.clienteId !== clienteId) return falha({ servicoId: ["O serviço não pertence ao cliente."] });
    clienteId ??= s.clienteId;
  }
  if (propriedadeId) {
    const p = await prisma.propriedade.findUnique({ where: { id: propriedadeId }, select: { clienteId: true } });
    if (!p) return falha({ propriedadeId: ["Propriedade não encontrada."] });
    if (clienteId && p.clienteId !== clienteId) return falha({ propriedadeId: ["A propriedade não pertence ao cliente."] });
    clienteId ??= p.clienteId;
  }
  if (clienteId && !(await prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true } }))) {
    return falha({ clienteId: ["Cliente não encontrado."] });
  }
  return { ok: true, dados: { categoria: categoria as CategoriaDocumento, descricao, clienteId, propriedadeId, servicoId } };
}

const paraValores = (m: Metadados): Record<string, string> => ({
  categoria: m.categoria,
  descricao: m.descricao ?? "",
  clienteId: m.clienteId ?? "",
  propriedadeId: m.propriedadeId ?? "",
  servicoId: m.servicoId ?? "",
});

async function registrar(
  usuario: UsuarioSessao,
  m: Metadados,
  arq: { nomeOriginal: string; nomeArmazenado: string; mime: string; tamanho: number; hash: string },
) {
  try {
    const doc = await prisma.documento.create({
      data: {
        ...m,
        nomeOriginal: arq.nomeOriginal,
        nomeArmazenado: arq.nomeArmazenado,
        mimeType: arq.mime,
        tamanhoBytes: arq.tamanho,
        hashSha256: arq.hash,
        enviadoPorId: usuario.id,
      },
    });
    await registrarHistorico({
      usuarioId: usuario.id, acao: "CRIAR", entidade: "Documento", entidadeId: doc.id,
      detalhes: { categoria: m.categoria, tamanho: arq.tamanho, clienteId: m.clienteId, propriedadeId: m.propriedadeId, servicoId: m.servicoId },
      ip: await obterIpRequisicao(),
    });
  } catch (e) {
    await removerArquivo(arq.nomeArmazenado); // não deixa arquivo órfão
    throw e;
  }
  revalidatePath("/documentos");
}

// ───────────── Modo local: o arquivo passa pelo servidor ─────────────

export async function enviarDocumento(_a: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("documentos", "escrever");
  const meta = await lerMetadados(formData);
  if (!meta.ok) return meta.estado;

  const valores = paraValores(meta.dados);
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erros: { arquivo: ["Selecione um arquivo."] }, valores };

  const conteudo = Buffer.from(await arquivo.arrayBuffer());
  const nomeOriginal = sanitizarNome(arquivo.name);
  const v = validarArquivo(nomeOriginal, conteudo.length, conteudo.subarray(0, 8192));
  if (!v.ok) return { erros: { arquivo: [v.erro] }, valores };

  const { nomeArmazenado, hashSha256 } = await salvarArquivo(conteudo, v.extensao);
  await registrar(usuario, meta.dados, { nomeOriginal, nomeArmazenado, mime: v.mime, tamanho: conteudo.length, hash: hashSha256 });
  return sucesso(`“${nomeOriginal}” enviado.`);
}

// ───────────── Modo Supabase: o navegador envia direto ao bucket privado ─────────────
// (a Vercel limita requisições a ~4,5 MB; documentos técnicos costumam ser maiores)

export type RespostaPreparo =
  | { ok: true; url: string; nomeArmazenado: string }
  | { ok: false; estado: EstadoFormulario };

/** 1ª fase: valida dados e tipo/tamanho declarados e devolve uma URL assinada de envio. */
export async function prepararEnvioDocumento(formData: FormData): Promise<RespostaPreparo> {
  await exigirPermissaoAcao("documentos", "escrever");
  if (driver !== "supabase") return { ok: false, estado: { mensagem: "Envio direto desativado neste servidor." } };
  const meta = await lerMetadados(formData);
  if (!meta.ok) return meta;

  const nome = sanitizarNome(String(formData.get("nome") ?? ""));
  const tamanho = Number(formData.get("tamanho"));
  const extensao = extensaoDe(nome);
  if (!TIPOS_PERMITIDOS[extensao]) {
    return { ok: false, estado: { erros: { arquivo: [`Tipo de arquivo não permitido. Aceitos: ${Object.keys(TIPOS_PERMITIDOS).join(", ")}.`] } } };
  }
  if (!Number.isFinite(tamanho) || tamanho <= 0 || tamanho > TAMANHO_MAXIMO) {
    return { ok: false, estado: { erros: { arquivo: ["Arquivo vazio ou maior que 20 MB."] } } };
  }
  const { nomeArmazenado, url } = await criarUrlDeEnvio(extensao);
  return { ok: true, url, nomeArmazenado };
}

/** 2ª fase: baixa o que chegou ao bucket, confere o CONTEÚDO real e só então registra. */
export async function confirmarEnvioDocumento(formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("documentos", "escrever");
  const meta = await lerMetadados(formData);
  if (!meta.ok) return meta.estado;

  const nomeArmazenado = String(formData.get("nomeArmazenado") ?? "");
  const nomeOriginal = sanitizarNome(String(formData.get("nome") ?? ""));
  if (!nomeValido(nomeArmazenado) || extensaoDe(nomeArmazenado) !== extensaoDe(nomeOriginal)) {
    return { mensagem: "Envio inválido. Tente novamente." };
  }
  if (await prisma.documento.findUnique({ where: { nomeArmazenado }, select: { id: true } })) {
    return sucesso(`“${nomeOriginal}” já estava registrado.`);
  }

  let conteudo: Buffer;
  try {
    conteudo = await lerArquivo(nomeArmazenado);
  } catch {
    return { mensagem: "O arquivo não chegou ao armazenamento. Tente enviar novamente." };
  }
  const v = validarArquivo(nomeOriginal, conteudo.length, conteudo.subarray(0, 8192));
  if (!v.ok) {
    await removerArquivo(nomeArmazenado);
    return { erros: { arquivo: [v.erro] } };
  }
  await registrar(usuario, meta.dados, { nomeOriginal, nomeArmazenado, mime: v.mime, tamanho: conteudo.length, hash: hashDe(conteudo) });
  return sucesso(`“${nomeOriginal}” enviado.`);
}

export async function excluirDocumento(_a: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("documentos", "escrever");
  const id = String(formData.get("id") ?? "");
  const doc = await prisma.documento.findUnique({ where: { id } });
  if (!doc) return { mensagem: "Documento não encontrado." };
  await prisma.documento.delete({ where: { id } });
  await removerArquivo(doc.nomeArmazenado);
  await registrarHistorico({
    usuarioId: usuario.id, acao: "EXCLUIR", entidade: "Documento", entidadeId: id,
    detalhes: { categoria: doc.categoria, nome: doc.nomeOriginal }, ip: await obterIpRequisicao(),
  });
  revalidatePath("/documentos");
  return sucesso("Documento excluído.");
}
