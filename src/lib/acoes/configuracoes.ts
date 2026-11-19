"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { registrarHistorico } from "@/lib/auditoria";
import { exigirPermissaoAcao } from "@/lib/auth/guardas";
import { obterIpRequisicao } from "@/lib/auth/sessao";
import { CONFIG_CUSTO_POR_KM } from "@/lib/dominio";
import { errosPorCampo } from "@/lib/validacao/esquemas";
import { esquemaCustoKm, esquemaNome, esquemaTipoMaterial, esquemaTipoServico } from "@/lib/validacao/esquemas-operacao";
import { sucesso, valoresDoFormulario, type EstadoFormulario } from "./tipos";

const duplicado = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

async function auditar(usuarioId: string, entidade: string, entidadeId: string | null, detalhes: Prisma.InputJsonValue) {
  await registrarHistorico({ usuarioId, acao: "ATUALIZAR", entidade, entidadeId, detalhes, ip: await obterIpRequisicao() });
}

export async function salvarCustoKm(_a: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("configuracoes", "escrever");
  const valores = valoresDoFormulario(formData);
  const r = esquemaCustoKm.safeParse(valores);
  if (!r.success) return { erros: errosPorCampo(r.error), valores };
  await prisma.configuracao.upsert({
    where: { chave: CONFIG_CUSTO_POR_KM },
    update: { valor: String(r.data.custoPorKm) },
    create: { chave: CONFIG_CUSTO_POR_KM, valor: String(r.data.custoPorKm), descricao: "Custo por quilômetro rodado (R$)" },
  });
  await auditar(usuario.id, "Configuracao", CONFIG_CUSTO_POR_KM, { custoPorKm: r.data.custoPorKm });
  revalidatePath("/configuracoes");
  revalidatePath("/quilometragem");
  return sucesso("Custo por km atualizado. Vale para os próximos lançamentos; os anteriores mantêm o valor da época.");
}

export async function salvarTipoServico(_a: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("configuracoes", "escrever");
  const valores = valoresDoFormulario(formData);
  const id = valores.id || null;
  const r = esquemaTipoServico.safeParse(valores);
  if (!r.success) return { erros: errosPorCampo(r.error), valores };
  const { nome, etapas, ativo } = r.data;

  try {
    const tipoId = await prisma.$transaction(async (tx) => {
      const tipo = id
        ? await tx.tipoServico.update({ where: { id }, data: { nome, ativo } })
        : await tx.tipoServico.create({ data: { nome, ativo: true } });
      // O modelo só afeta serviços NOVOS; serviços existentes mantêm suas etapas.
      await tx.etapaModelo.deleteMany({ where: { tipoServicoId: tipo.id } });
      await tx.etapaModelo.createMany({ data: etapas.map((n, i) => ({ tipoServicoId: tipo.id, ordem: i + 1, nome: n })) });
      return tipo.id;
    });
    await auditar(usuario.id, "TipoServico", tipoId, { nome, etapas: etapas.length, ativo });
  } catch (e) {
    if (duplicado(e)) return { erros: { nome: ["Já existe um tipo com este nome."] }, valores };
    throw e;
  }
  revalidatePath("/configuracoes");
  return sucesso(id ? "Tipo de serviço atualizado." : "Tipo de serviço criado.");
}

export async function criarCategoriaDespesa(_a: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("configuracoes", "escrever");
  const valores = valoresDoFormulario(formData);
  const r = esquemaNome.safeParse(valores);
  if (!r.success) return { erros: errosPorCampo(r.error), valores };
  try {
    const c = await prisma.categoriaDespesa.create({ data: { nome: r.data.nome } });
    await auditar(usuario.id, "CategoriaDespesa", c.id, { nome: c.nome, acao: "criar" });
  } catch (e) {
    if (duplicado(e)) return { erros: { nome: ["Categoria já existe."] }, valores };
    throw e;
  }
  revalidatePath("/configuracoes");
  return sucesso("Categoria criada.");
}

export async function alternarCategoriaDespesa(_a: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("configuracoes", "escrever");
  const id = String(formData.get("id") ?? "");
  const c = await prisma.categoriaDespesa.findUnique({ where: { id } });
  if (!c) return { mensagem: "Categoria não encontrada." };
  if (c.sistema) return { mensagem: "Categorias de sistema não podem ser desativadas." };
  await prisma.categoriaDespesa.update({ where: { id }, data: { ativo: !c.ativo } });
  await auditar(usuario.id, "CategoriaDespesa", id, { ativo: !c.ativo });
  revalidatePath("/configuracoes");
  return sucesso(c.ativo ? "Categoria desativada." : "Categoria reativada.");
}

export async function salvarTipoMaterial(_a: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("configuracoes", "escrever");
  const valores = valoresDoFormulario(formData);
  const id = valores.id || null;
  const r = esquemaTipoMaterial.safeParse(valores);
  if (!r.success) return { erros: errosPorCampo(r.error), valores };
  try {
    const t = id
      ? await prisma.tipoMaterial.update({ where: { id }, data: r.data })
      : await prisma.tipoMaterial.create({ data: r.data });
    await auditar(usuario.id, "TipoMaterial", t.id, { nome: t.nome });
  } catch (e) {
    if (duplicado(e)) return { erros: { nome: ["Já existe um material com este nome."] }, valores };
    throw e;
  }
  revalidatePath("/configuracoes");
  revalidatePath("/marcos");
  return sucesso(id ? "Material atualizado." : "Material cadastrado.");
}

export async function alternarTipoMaterial(_a: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("configuracoes", "escrever");
  const id = String(formData.get("id") ?? "");
  const t = await prisma.tipoMaterial.findUnique({ where: { id } });
  if (!t) return { mensagem: "Material não encontrado." };
  await prisma.tipoMaterial.update({ where: { id }, data: { ativo: !t.ativo } });
  await auditar(usuario.id, "TipoMaterial", id, { ativo: !t.ativo });
  revalidatePath("/configuracoes");
  return sucesso(t.ativo ? "Material desativado." : "Material reativado.");
}
