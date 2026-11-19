"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { registrarHistorico } from "@/lib/auditoria";
import { exigirPermissaoAcao } from "@/lib/auth/guardas";
import { obterIpRequisicao } from "@/lib/auth/sessao";
import { hojeLocalIso } from "@/lib/periodo";
import { errosPorCampo } from "@/lib/validacao/esquemas";
import { esquemaEtapa, esquemaServico, STATUS_ETAPA } from "@/lib/validacao/esquemas-operacao";
import { camposAlterados, sucesso, valoresDoFormulario, type EstadoFormulario } from "./tipos";

async function proximoCodigo(tx: Prisma.TransactionClient, ano: number): Promise<string> {
  const prefixo = `SRV-${ano}-`;
  const ultimo = await tx.servico.findFirst({
    where: { codigo: { startsWith: prefixo } },
    orderBy: { codigo: "desc" },
    select: { codigo: true },
  });
  const n = ultimo ? Number(ultimo.codigo.slice(prefixo.length)) + 1 : 1;
  return `${prefixo}${String(n).padStart(4, "0")}`;
}

export async function salvarServico(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("servicos", "escrever");
  const valores = valoresDoFormulario(formData);
  const propriedadeIds = formData.getAll("propriedadeIds").map(String);
  const id = valores.id || null;

  const r = esquemaServico.safeParse({ ...valores, propriedadeIds });
  if (!r.success) {
    return { erros: errosPorCampo(r.error), mensagem: "Corrija os campos destacados.", valores: { ...valores, propriedadeIds: propriedadeIds.join(",") } };
  }
  const { propriedadeIds: ids, ...dados } = r.data;

  // As propriedades precisam pertencer ao cliente escolhido.
  const validas = await prisma.propriedade.count({ where: { id: { in: ids }, clienteId: dados.clienteId } });
  if (validas !== ids.length) {
    return { erros: { propriedadeIds: ["Selecione propriedades do cliente escolhido."] }, valores: { ...valores, propriedadeIds: ids.join(",") } };
  }

  const ip = await obterIpRequisicao();
  let servicoId: string;

  if (id) {
    const antes = await prisma.servico.findUnique({ where: { id }, include: { propriedades: true } });
    if (!antes) return { mensagem: "Serviço não encontrado." };
    if (antes.tipoServicoId !== dados.tipoServicoId) {
      return { erros: { tipoServicoId: ["O tipo não pode ser alterado depois de criado (as etapas já foram geradas)."] }, valores };
    }
    await prisma.$transaction([
      prisma.servico.update({
        where: { id },
        data: {
          ...dados,
          concluidoEm: dados.status === "CONCLUIDO" ? (antes.concluidoEm ?? new Date()) : null,
        },
      }),
      prisma.servicoPropriedade.deleteMany({ where: { servicoId: id, propriedadeId: { notIn: ids } } }),
      prisma.servicoPropriedade.createMany({ data: ids.map((propriedadeId) => ({ servicoId: id, propriedadeId })), skipDuplicates: true }),
    ]);
    servicoId = id;
    await registrarHistorico({
      usuarioId: usuario.id, acao: "ATUALIZAR", entidade: "Servico", entidadeId: id, ip,
      detalhes: { campos: camposAlterados(antes, dados), propriedades: ids.length },
    });
  } else {
    const modelo = await prisma.etapaModelo.findMany({ where: { tipoServicoId: dados.tipoServicoId }, orderBy: { ordem: "asc" } });
    // Tenta algumas vezes caso dois usuários criem serviços ao mesmo tempo (código único).
    let criado: { id: string } | null = null;
    for (let tentativa = 0; tentativa < 3 && !criado; tentativa++) {
      try {
        criado = await prisma.$transaction(async (tx) => {
          const codigo = await proximoCodigo(tx, dados.dataContratacao.getUTCFullYear());
          return tx.servico.create({
            data: {
              ...dados,
              codigo,
              concluidoEm: dados.status === "CONCLUIDO" ? new Date() : null,
              propriedades: { create: ids.map((propriedadeId) => ({ propriedadeId })) },
              etapas: { create: modelo.map((e) => ({ ordem: e.ordem, nome: e.nome })) },
            },
            select: { id: true },
          });
        });
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
      }
    }
    if (!criado) return { mensagem: "Não foi possível gerar o código do serviço. Tente novamente.", valores };
    servicoId = criado.id;
    await registrarHistorico({ usuarioId: usuario.id, acao: "CRIAR", entidade: "Servico", entidadeId: servicoId, ip });
  }

  revalidatePath("/servicos");
  revalidatePath(`/clientes/${dados.clienteId}`);
  redirect(`/servicos/${servicoId}?ok=salvo`);
}

export async function excluirServico(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("servicos", "escrever");
  const id = String(formData.get("id") ?? "");
  const s = await prisma.servico.findUnique({
    where: { id },
    select: { clienteId: true, _count: { select: { pagamentos: true, despesas: true } } },
  });
  if (!s) return { mensagem: "Serviço não encontrado." };
  if (s._count.pagamentos > 0 || s._count.despesas > 0) {
    return {
      mensagem: `Não é possível excluir: há ${s._count.pagamentos} pagamento(s) e ${s._count.despesas} despesa(s) lançados. Para encerrar, altere a situação para "Cancelado".`,
    };
  }
  await prisma.servico.delete({ where: { id } });
  await registrarHistorico({ usuarioId: usuario.id, acao: "EXCLUIR", entidade: "Servico", entidadeId: id, ip: await obterIpRequisicao() });
  revalidatePath("/servicos");
  redirect("/servicos?ok=excluido");
}

// ───────────── Etapas ─────────────

export async function atualizarEtapa(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("servicos", "escrever");
  const valores = valoresDoFormulario(formData);
  const etapa = await prisma.etapa.findUnique({ where: { id: valores.etapaId ?? "" }, include: { servico: { select: { status: true } } } });
  if (!etapa) return { mensagem: "Etapa não encontrada." };

  const r = esquemaEtapa.safeParse(valores);
  if (!r.success) return { erros: errosPorCampo(r.error), mensagem: "Corrija os campos da etapa.", valores };

  const hoje = new Date(`${hojeLocalIso()}T00:00:00Z`);
  const d = r.data;
  // Datas automáticas quando o usuário não informa.
  const dataInicio = d.status === "PENDENTE" ? d.dataInicio : (d.dataInicio ?? etapa.dataInicio ?? hoje);
  const dataConclusao = d.status === "CONCLUIDA" ? (d.dataConclusao ?? hoje) : null;

  await prisma.$transaction(async (tx) => {
    await tx.etapa.update({ where: { id: etapa.id }, data: { status: d.status, dataInicio, dataConclusao, observacoes: d.observacoes } });
    // Serviço aguardando início passa a "em andamento" quando alguma etapa começa.
    if (etapa.servico.status === "AGUARDANDO_INICIO" && d.status !== "PENDENTE") {
      await tx.servico.update({ where: { id: etapa.servicoId }, data: { status: "EM_ANDAMENTO" } });
    }
  });
  await registrarHistorico({
    usuarioId: usuario.id, acao: "ATUALIZAR", entidade: "Etapa", entidadeId: etapa.id,
    detalhes: { servicoId: etapa.servicoId, etapa: etapa.nome, de: etapa.status, para: d.status }, ip: await obterIpRequisicao(),
  });
  revalidatePath(`/servicos/${etapa.servicoId}`);
  return sucesso("Etapa atualizada.");
}

export async function adicionarEtapa(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("servicos", "escrever");
  const servicoId = String(formData.get("servicoId") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  if (nome.length < 2 || nome.length > 150) return { erros: { nome: ["Informe o nome da etapa."] } };
  const ultima = await prisma.etapa.findFirst({ where: { servicoId }, orderBy: { ordem: "desc" }, select: { ordem: true } });
  const servico = await prisma.servico.findUnique({ where: { id: servicoId }, select: { id: true } });
  if (!servico) return { mensagem: "Serviço não encontrado." };
  const nova = await prisma.etapa.create({ data: { servicoId, nome, ordem: (ultima?.ordem ?? 0) + 1 } });
  await registrarHistorico({ usuarioId: usuario.id, acao: "CRIAR", entidade: "Etapa", entidadeId: nova.id, detalhes: { servicoId, nome }, ip: await obterIpRequisicao() });
  revalidatePath(`/servicos/${servicoId}`);
  return sucesso("Etapa adicionada.");
}

export async function removerEtapa(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("servicos", "escrever");
  const id = String(formData.get("id") ?? "");
  const etapa = await prisma.etapa.findUnique({ where: { id } });
  if (!etapa) return { mensagem: "Etapa não encontrada." };
  if (etapa.status !== STATUS_ETAPA[0]) return { mensagem: "Só é possível remover etapas pendentes." };
  await prisma.etapa.delete({ where: { id } });
  await registrarHistorico({ usuarioId: usuario.id, acao: "EXCLUIR", entidade: "Etapa", entidadeId: id, detalhes: { servicoId: etapa.servicoId, nome: etapa.nome }, ip: await obterIpRequisicao() });
  revalidatePath(`/servicos/${etapa.servicoId}`);
  return sucesso("Etapa removida.");
}
