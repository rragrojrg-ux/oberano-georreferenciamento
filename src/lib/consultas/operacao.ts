import "server-only";
import type { Prisma, StatusServico } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CONFIG_CUSTO_POR_KM, CUSTO_POR_KM_PADRAO } from "@/lib/dominio";
import { calcularFinanceiroServico, paraCentavos, percentualProgresso, type FinanceiroServico } from "@/lib/financeiro";
import { filtroData, type Periodo } from "@/lib/periodo";
import { POR_PAGINA } from "./cadastros";

export interface ResumoFinanceiro extends FinanceiroServico {
  contratadoCentavos: number;
  recebidoCentavos: number;
  despesasCentavos: number;
}

const somaCentavos = (itens: { toString(): string }[]): number => itens.reduce<number>((t, v) => t + paraCentavos(v), 0);

export function resumirFinanceiro(s: {
  valorContratado: { toString(): string };
  pagamentos: { valor: { toString(): string } }[];
  despesas: { valorTotal: { toString(): string } }[];
}): ResumoFinanceiro {
  const contratadoCentavos = paraCentavos(s.valorContratado);
  const recebidoCentavos = somaCentavos(s.pagamentos.map((p) => p.valor));
  const despesasCentavos = somaCentavos(s.despesas.map((d) => d.valorTotal));
  return {
    contratadoCentavos,
    recebidoCentavos,
    despesasCentavos,
    ...calcularFinanceiroServico({ contratadoCentavos, recebidoCentavos, despesasCentavos }),
  };
}

export async function obterCustoPorKm(): Promise<number> {
  const c = await prisma.configuracao.findUnique({ where: { chave: CONFIG_CUSTO_POR_KM } });
  const n = Number(c?.valor ?? CUSTO_POR_KM_PADRAO);
  return Number.isFinite(n) && n > 0 ? n : Number(CUSTO_POR_KM_PADRAO);
}

// ───────────── Serviços ─────────────

export interface FiltroServicos {
  busca: string;
  status?: StatusServico;
  tipoId?: string;
  pagina: number;
}

export async function listarServicos(f: FiltroServicos) {
  const filtros: Prisma.ServicoWhereInput[] = [];
  if (f.status) filtros.push({ status: f.status });
  if (f.tipoId) filtros.push({ tipoServicoId: f.tipoId });
  if (f.busca) {
    filtros.push({
      OR: [
        { codigo: { contains: f.busca, mode: "insensitive" } },
        { descricaoPersonalizada: { contains: f.busca, mode: "insensitive" } },
        { responsavelTecnico: { contains: f.busca, mode: "insensitive" } },
        { cliente: { nome: { contains: f.busca, mode: "insensitive" } } },
        { propriedades: { some: { propriedade: { nome: { contains: f.busca, mode: "insensitive" } } } } },
      ],
    });
  }
  const where: Prisma.ServicoWhereInput = filtros.length ? { AND: filtros } : {};
  const [total, itens] = await Promise.all([
    prisma.servico.count({ where }),
    prisma.servico.findMany({
      where,
      orderBy: [{ dataContratacao: "desc" }, { codigo: "desc" }],
      skip: (f.pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true, codigo: true, status: true, dataContratacao: true, prazoPrevisto: true, valorContratado: true,
        descricaoPersonalizada: true,
        tipoServico: { select: { nome: true } },
        cliente: { select: { id: true, nome: true } },
        propriedades: { select: { propriedade: { select: { nome: true } } } },
        etapas: { select: { status: true } },
        pagamentos: { select: { valor: true } },
        despesas: { select: { valorTotal: true } },
      },
    }),
  ]);
  return {
    total,
    paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    itens: itens.map((s) => ({
      ...s,
      progresso: percentualProgresso(s.etapas.filter((e) => e.status === "CONCLUIDA").length, s.etapas.length),
      financeiro: resumirFinanceiro(s),
    })),
  };
}

export async function obterServico(id: string) {
  const s = await prisma.servico.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nome: true } },
      tipoServico: { select: { id: true, nome: true } },
      propriedades: {
        select: { propriedade: { select: { id: true, nome: true, municipio: true, uf: true, areaHectares: true, areaAlqueires: true } } },
      },
      etapas: { orderBy: { ordem: "asc" } },
      despesas: { orderBy: [{ data: "desc" }, { criadoEm: "desc" }], include: { categoria: { select: { nome: true } } } },
      deslocamentos: { orderBy: [{ data: "desc" }, { criadoEm: "desc" }] },
      usosMaterial: { orderBy: [{ data: "desc" }, { criadoEm: "desc" }], include: { tipoMaterial: { select: { nome: true, unidade: true } } } },
      pagamentos: { orderBy: [{ data: "desc" }, { criadoEm: "desc" }] },
    },
  });
  if (!s) return null;
  return {
    ...s,
    progresso: percentualProgresso(s.etapas.filter((e) => e.status === "CONCLUIDA").length, s.etapas.length),
    financeiro: resumirFinanceiro(s),
  };
}

/** Dados para o formulário de serviço: clientes com suas propriedades e tipos ativos. */
export async function opcoesServico() {
  const [clientes, tipos] = await Promise.all([
    prisma.cliente.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, propriedades: { orderBy: { nome: "asc" }, select: { id: true, nome: true, municipio: true, uf: true } } },
    }),
    prisma.tipoServico.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);
  return { clientes, tipos };
}

export async function opcoesLancamentos() {
  const [categorias, materiais, custoKm] = await Promise.all([
    prisma.categoriaDespesa.findMany({ where: { ativo: true, sistema: false }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.tipoMaterial.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true, unidade: true, custoUnitarioPadrao: true } }),
    obterCustoPorKm(),
  ]);
  return {
    categorias,
    materiais: materiais.map((m) => ({ ...m, custoUnitarioPadrao: m.custoUnitarioPadrao ? Number(m.custoUnitarioPadrao) : null })),
    custoKm,
  };
}

// ───────────── Listagens globais ─────────────

export async function listarDespesas(periodo: Periodo, categoriaId: string | undefined, pagina: number) {
  const where: Prisma.DespesaWhereInput = { data: filtroData(periodo), ...(categoriaId ? { categoriaId } : {}) };
  const [total, soma, itens, porCategoria, categorias] = await Promise.all([
    prisma.despesa.count({ where }),
    prisma.despesa.aggregate({ where, _sum: { valorTotal: true } }),
    prisma.despesa.findMany({
      where,
      orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        categoria: { select: { nome: true } },
        servico: { select: { id: true, codigo: true, cliente: { select: { nome: true } } } },
      },
    }),
    prisma.despesa.groupBy({ by: ["categoriaId"], where, _sum: { valorTotal: true } }),
    prisma.categoriaDespesa.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);
  const nomes = new Map(categorias.map((c) => [c.id, c.nome]));
  return {
    total,
    paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    somaCentavos: paraCentavos(soma._sum.valorTotal ?? 0),
    itens,
    categorias,
    porCategoria: porCategoria
      .map((g) => ({ nome: nomes.get(g.categoriaId) ?? "—", centavos: paraCentavos(g._sum.valorTotal ?? 0) }))
      .sort((a, b) => b.centavos - a.centavos),
  };
}

export async function listarDeslocamentos(periodo: Periodo, pagina: number) {
  const where: Prisma.DeslocamentoWhereInput = { data: filtroData(periodo) };
  const [total, soma, itens] = await Promise.all([
    prisma.deslocamento.count({ where }),
    prisma.deslocamento.aggregate({ where, _sum: { km: true, valorTotal: true } }),
    prisma.deslocamento.findMany({
      where,
      orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: { servico: { select: { id: true, codigo: true, cliente: { select: { nome: true } } } } },
    }),
  ]);
  return {
    total,
    paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    kmTotal: Number(soma._sum.km ?? 0),
    somaCentavos: paraCentavos(soma._sum.valorTotal ?? 0),
    itens,
  };
}

export async function listarUsosMaterial(periodo: Periodo, pagina: number) {
  const where: Prisma.UsoMaterialWhereInput = { data: filtroData(periodo) };
  const [total, soma, itens, porTipo, tipos] = await Promise.all([
    prisma.usoMaterial.count({ where }),
    prisma.usoMaterial.aggregate({ where, _sum: { valorTotal: true } }),
    prisma.usoMaterial.findMany({
      where,
      orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        tipoMaterial: { select: { nome: true, unidade: true } },
        servico: { select: { id: true, codigo: true, cliente: { select: { nome: true } } } },
      },
    }),
    prisma.usoMaterial.groupBy({ by: ["tipoMaterialId"], where, _sum: { quantidade: true, valorTotal: true } }),
    prisma.tipoMaterial.findMany({ orderBy: { nome: "asc" } }),
  ]);
  const mapa = new Map(tipos.map((t) => [t.id, t]));
  return {
    total,
    paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    somaCentavos: paraCentavos(soma._sum.valorTotal ?? 0),
    itens,
    porTipo: porTipo.map((g) => ({
      nome: mapa.get(g.tipoMaterialId)?.nome ?? "—",
      unidade: mapa.get(g.tipoMaterialId)?.unidade ?? "",
      quantidade: Number(g._sum.quantidade ?? 0),
      centavos: paraCentavos(g._sum.valorTotal ?? 0),
    })),
  };
}

/** Visão financeira de todos os serviços (exceto cancelados, salvo se filtrado). */
export async function financeiroPorServico(status?: StatusServico) {
  const servicos = await prisma.servico.findMany({
    where: status ? { status } : { status: { not: "CANCELADO" } },
    orderBy: [{ dataContratacao: "desc" }],
    select: {
      id: true, codigo: true, status: true, dataContratacao: true, valorContratado: true, descricaoPersonalizada: true,
      tipoServico: { select: { nome: true } },
      cliente: { select: { nome: true } },
      pagamentos: { select: { valor: true } },
      despesas: { select: { valorTotal: true } },
    },
  });
  const linhas = servicos.map((s) => ({ ...s, financeiro: resumirFinanceiro(s) }));
  const totais = linhas.reduce(
    (t, l) => ({
      contratado: t.contratado + l.financeiro.contratadoCentavos,
      recebido: t.recebido + l.financeiro.recebidoCentavos,
      saldo: t.saldo + l.financeiro.saldoAReceberCentavos,
      despesas: t.despesas + l.financeiro.despesasCentavos,
      resultado: t.resultado + l.financeiro.resultadoEstimadoCentavos,
    }),
    { contratado: 0, recebido: 0, saldo: 0, despesas: 0, resultado: 0 },
  );
  return { linhas, totais };
}
