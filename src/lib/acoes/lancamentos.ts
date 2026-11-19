"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { registrarHistorico } from "@/lib/auditoria";
import { exigirPermissaoAcao } from "@/lib/auth/guardas";
import { obterIpRequisicao } from "@/lib/auth/sessao";
import { CATEGORIA_MARCOS, CATEGORIA_QUILOMETRAGEM } from "@/lib/dominio";
import { calcularTotalCentavos, paraCentavos } from "@/lib/financeiro";
import { formatarMoedaCentavos } from "@/lib/formatacao";
import { obterCustoPorKm } from "@/lib/consultas/operacao";
import { errosPorCampo } from "@/lib/validacao/esquemas";
import {
  esquemaDeslocamento, esquemaDespesa, esquemaPagamento, esquemaUsoMaterial,
} from "@/lib/validacao/esquemas-operacao";
import { sucesso, valoresDoFormulario, type EstadoFormulario } from "./tipos";

/**
 * Lançamentos de um serviço. Regra central contra dupla contagem:
 * TODA despesa do serviço vive na tabela `despesas`. Deslocamentos e usos de material criam,
 * na mesma transação, exatamente uma despesa vinculada (chave única deslocamentoId/usoMaterialId).
 * Essas despesas vinculadas não podem ser editadas/excluídas avulsas — só pelo lançamento de origem.
 */

async function servicoExiste(id: string) {
  return prisma.servico.findUnique({ where: { id }, select: { id: true, valorContratado: true } });
}

function revalidar(servicoId: string) {
  revalidatePath(`/servicos/${servicoId}`);
  revalidatePath("/servicos");
  revalidatePath("/despesas");
  revalidatePath("/quilometragem");
  revalidatePath("/marcos");
  revalidatePath("/financeiro");
  revalidatePath("/");
}

async function categoriaSistema(nome: string) {
  const c = await prisma.categoriaDespesa.upsert({ where: { nome }, update: {}, create: { nome, sistema: true } });
  return c.id;
}

// ───────────── Despesas avulsas ─────────────

export async function adicionarDespesa(_a: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("despesas", "escrever");
  const valores = valoresDoFormulario(formData);
  const servico = await servicoExiste(valores.servicoId ?? "");
  if (!servico) return { mensagem: "Serviço não encontrado." };

  const r = esquemaDespesa.safeParse(valores);
  if (!r.success) return { erros: errosPorCampo(r.error), valores };
  const d = r.data;

  const categoria = await prisma.categoriaDespesa.findUnique({ where: { id: d.categoriaId } });
  if (!categoria || !categoria.ativo) return { erros: { categoriaId: ["Categoria inválida."] }, valores };
  if (categoria.sistema) {
    return { erros: { categoriaId: [`Use a aba própria para lançar ${categoria.nome} (evita contagem em dobro).`] }, valores };
  }

  // Total: quantidade × unitário, ou o total informado.
  let totalCentavos: number;
  if (d.quantidade !== null && d.valorUnitario !== null) {
    totalCentavos = calcularTotalCentavos(d.quantidade, paraCentavos(d.valorUnitario));
  } else if (d.valorTotal !== null) {
    totalCentavos = paraCentavos(d.valorTotal);
  } else {
    return { erros: { valorTotal: ["Informe o valor total ou quantidade × valor unitário."] }, valores };
  }

  const nova = await prisma.despesa.create({
    data: {
      servicoId: servico.id, categoriaId: d.categoriaId, data: d.data, descricao: d.descricao,
      quantidade: d.quantidade, valorUnitario: d.valorUnitario, valorTotal: totalCentavos / 100, observacoes: d.observacoes,
    },
  });
  await registrarHistorico({
    usuarioId: usuario.id, acao: "CRIAR", entidade: "Despesa", entidadeId: nova.id,
    detalhes: { servicoId: servico.id, valor: totalCentavos / 100 }, ip: await obterIpRequisicao(),
  });
  revalidar(servico.id);
  return sucesso(`Despesa de ${formatarMoedaCentavos(totalCentavos)} lançada.`);
}

export async function removerDespesa(_a: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("despesas", "escrever");
  const id = String(formData.get("id") ?? "");
  const d = await prisma.despesa.findUnique({ where: { id } });
  if (!d) return { mensagem: "Despesa não encontrada." };
  if (d.deslocamentoId || d.usoMaterialId) {
    return { mensagem: "Esta despesa foi gerada por um deslocamento ou uso de material. Exclua o lançamento de origem." };
  }
  await prisma.despesa.delete({ where: { id } });
  await registrarHistorico({ usuarioId: usuario.id, acao: "EXCLUIR", entidade: "Despesa", entidadeId: id, detalhes: { servicoId: d.servicoId, valor: Number(d.valorTotal) }, ip: await obterIpRequisicao() });
  revalidar(d.servicoId);
  return sucesso("Despesa excluída.");
}

// ───────────── Deslocamentos ─────────────

export async function adicionarDeslocamento(_a: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("quilometragem", "escrever");
  const valores = valoresDoFormulario(formData);
  const servico = await servicoExiste(valores.servicoId ?? "");
  if (!servico) return { mensagem: "Serviço não encontrado." };

  const r = esquemaDeslocamento.safeParse(valores);
  if (!r.success) return { erros: errosPorCampo(r.error), valores };
  const d = r.data;

  // O custo por km vem SEMPRE da configuração vigente (não do navegador) e fica gravado no lançamento.
  const custoKm = await obterCustoPorKm();
  const totalCentavos = calcularTotalCentavos(d.km, paraCentavos(custoKm));
  const categoriaId = await categoriaSistema(CATEGORIA_QUILOMETRAGEM);

  const novo = await prisma.deslocamento.create({
    data: {
      servicoId: servico.id, data: d.data, origem: d.origem, destino: d.destino, km: d.km,
      custoPorKm: custoKm, valorTotal: totalCentavos / 100, observacoes: d.observacoes,
      despesa: {
        create: {
          servicoId: servico.id, categoriaId, data: d.data,
          descricao: `Deslocamento ${d.origem} → ${d.destino} (${d.km.toLocaleString("pt-BR")} km)`,
          quantidade: d.km, valorUnitario: custoKm, valorTotal: totalCentavos / 100,
        },
      },
    },
  });
  await registrarHistorico({ usuarioId: usuario.id, acao: "CRIAR", entidade: "Deslocamento", entidadeId: novo.id, detalhes: { servicoId: servico.id, km: d.km }, ip: await obterIpRequisicao() });
  revalidar(servico.id);
  return sucesso(`Deslocamento de ${d.km.toLocaleString("pt-BR")} km lançado (${formatarMoedaCentavos(totalCentavos)}).`);
}

export async function removerDeslocamento(_a: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("quilometragem", "escrever");
  const id = String(formData.get("id") ?? "");
  const d = await prisma.deslocamento.findUnique({ where: { id } });
  if (!d) return { mensagem: "Deslocamento não encontrado." };
  // A despesa vinculada é removida em cascata.
  await prisma.deslocamento.delete({ where: { id } });
  await registrarHistorico({ usuarioId: usuario.id, acao: "EXCLUIR", entidade: "Deslocamento", entidadeId: id, detalhes: { servicoId: d.servicoId }, ip: await obterIpRequisicao() });
  revalidar(d.servicoId);
  return sucesso("Deslocamento excluído.");
}

// ───────────── Marcos e materiais ─────────────

export async function adicionarUsoMaterial(_a: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("materiais", "escrever");
  const valores = valoresDoFormulario(formData);
  const servico = await servicoExiste(valores.servicoId ?? "");
  if (!servico) return { mensagem: "Serviço não encontrado." };

  const r = esquemaUsoMaterial.safeParse(valores);
  if (!r.success) return { erros: errosPorCampo(r.error), valores };
  const d = r.data;

  const material = await prisma.tipoMaterial.findUnique({ where: { id: d.tipoMaterialId } });
  if (!material || !material.ativo) return { erros: { tipoMaterialId: ["Material inválido."] }, valores };

  const totalCentavos = calcularTotalCentavos(d.quantidade, paraCentavos(d.custoUnitario));
  const categoriaId = await categoriaSistema(CATEGORIA_MARCOS);

  const novo = await prisma.usoMaterial.create({
    data: {
      servicoId: servico.id, tipoMaterialId: material.id, data: d.data, quantidade: d.quantidade,
      custoUnitario: d.custoUnitario, valorTotal: totalCentavos / 100, observacoes: d.observacoes,
      despesa: {
        create: {
          servicoId: servico.id, categoriaId, data: d.data,
          descricao: `${d.quantidade.toLocaleString("pt-BR")} ${material.unidade} × ${material.nome}`,
          quantidade: d.quantidade, valorUnitario: d.custoUnitario, valorTotal: totalCentavos / 100,
        },
      },
    },
  });
  await registrarHistorico({ usuarioId: usuario.id, acao: "CRIAR", entidade: "UsoMaterial", entidadeId: novo.id, detalhes: { servicoId: servico.id, material: material.nome, quantidade: d.quantidade }, ip: await obterIpRequisicao() });
  revalidar(servico.id);
  return sucesso(`${material.nome}: ${d.quantidade.toLocaleString("pt-BR")} ${material.unidade} lançado(s).`);
}

export async function removerUsoMaterial(_a: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("materiais", "escrever");
  const id = String(formData.get("id") ?? "");
  const u = await prisma.usoMaterial.findUnique({ where: { id } });
  if (!u) return { mensagem: "Lançamento não encontrado." };
  await prisma.usoMaterial.delete({ where: { id } });
  await registrarHistorico({ usuarioId: usuario.id, acao: "EXCLUIR", entidade: "UsoMaterial", entidadeId: id, detalhes: { servicoId: u.servicoId }, ip: await obterIpRequisicao() });
  revalidar(u.servicoId);
  return sucesso("Lançamento de material excluído.");
}

// ───────────── Pagamentos ─────────────

export async function registrarPagamento(_a: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("financeiro", "escrever");
  const valores = valoresDoFormulario(formData);
  const servico = await servicoExiste(valores.servicoId ?? "");
  if (!servico) return { mensagem: "Serviço não encontrado." };

  const r = esquemaPagamento.safeParse(valores);
  if (!r.success) return { erros: errosPorCampo(r.error), valores };
  const d = r.data;

  // Pagamentos parciais são permitidos, mas a soma não pode passar do valor contratado.
  const soma = await prisma.pagamento.aggregate({ where: { servicoId: servico.id }, _sum: { valor: true } });
  const saldo = paraCentavos(servico.valorContratado) - paraCentavos(soma._sum.valor ?? 0);
  if (paraCentavos(d.valor) > saldo) {
    return {
      erros: { valor: [`Maior que o saldo a receber (${formatarMoedaCentavos(Math.max(0, saldo))}). Ajuste o valor contratado se houve aditivo.`] },
      valores,
    };
  }

  try {
    const novo = await prisma.pagamento.create({
      data: { servicoId: servico.id, data: d.data, valor: d.valor, forma: d.forma, descricao: d.descricao, chaveIdempotencia: d.chaveIdempotencia },
    });
    await registrarHistorico({ usuarioId: usuario.id, acao: "CRIAR", entidade: "Pagamento", entidadeId: novo.id, detalhes: { servicoId: servico.id, valor: d.valor }, ip: await obterIpRequisicao() });
  } catch (e) {
    // Mesmo formulário enviado duas vezes (clique duplo, conexão lenta): o pagamento já existe.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      revalidar(servico.id);
      return sucesso("Este pagamento já havia sido registrado — nada foi duplicado.");
    }
    throw e;
  }
  revalidar(servico.id);
  return sucesso(`Pagamento de ${formatarMoedaCentavos(paraCentavos(d.valor))} registrado.`);
}

export async function removerPagamento(_a: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPermissaoAcao("financeiro", "escrever");
  const id = String(formData.get("id") ?? "");
  const p = await prisma.pagamento.findUnique({ where: { id } });
  if (!p) return { mensagem: "Pagamento não encontrado." };
  await prisma.pagamento.delete({ where: { id } });
  await registrarHistorico({ usuarioId: usuario.id, acao: "EXCLUIR", entidade: "Pagamento", entidadeId: id, detalhes: { servicoId: p.servicoId, valor: Number(p.valor) }, ip: await obterIpRequisicao() });
  revalidar(p.servicoId);
  return sucesso("Pagamento excluído.");
}
