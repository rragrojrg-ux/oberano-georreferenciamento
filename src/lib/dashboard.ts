import "server-only";
import type { StatusServico } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcularFinanceiroServico, paraCentavos, percentualProgresso } from "@/lib/financeiro";
import { filtroData, type Periodo } from "@/lib/periodo";

export interface PontoMensal {
  mes: string; // AAAA-MM
  contratado: number;
  recebido: number;
  despesas: number;
}

export interface ServicoRecente {
  id: string;
  codigo: string;
  cliente: string;
  tipo: string;
  propriedades: string[];
  status: StatusServico;
  dataContratacao: Date;
  valor: number;
  progresso: number;
}

export interface ResumoDashboard {
  totalClientes: number;
  totalPropriedades: number;
  servicosEmAndamento: number;
  servicosConcluidos: number;
  porStatus: Record<StatusServico, number>;
  contratadoCentavos: number;
  recebidoCentavos: number;
  pendenteCentavos: number;
  despesasCentavos: number;
  resultadoEstimadoCentavos: number;
  margemEstimada: number | null;
  fluxoCaixaCentavos: number;
  mensal: PontoMensal[];
  recentes: ServicoRecente[];
}

const chaveMes = (d: Date) => d.toISOString().slice(0, 7);

function mesesEntre(inicio: Date, fim: Date): string[] {
  const meses: string[] = [];
  const c = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), 1));
  while (c <= fim && meses.length < 60) {
    meses.push(chaveMes(c));
    c.setUTCMonth(c.getUTCMonth() + 1);
  }
  return meses;
}

/**
 * Indicadores do painel.
 * - Contratos, serviços, saldo pendente e resultado estimado: serviços CONTRATADOS no período (exceto cancelados).
 * - Recebimentos e despesas: lançamentos com DATA no período (visão de caixa).
 */
export async function obterResumoDashboard(periodo: Periodo): Promise<ResumoDashboard> {
  const intervalo = filtroData(periodo);

  const [totalClientes, totalPropriedades, servicos, pagamentos, despesas, recentesBrutos] = await Promise.all([
    prisma.cliente.count(),
    prisma.propriedade.count(),
    prisma.servico.findMany({
      where: { dataContratacao: intervalo },
      select: {
        status: true,
        dataContratacao: true,
        valorContratado: true,
        pagamentos: { select: { valor: true } },
        despesas: { select: { valorTotal: true } },
      },
    }),
    prisma.pagamento.findMany({ where: { data: intervalo }, select: { data: true, valor: true } }),
    prisma.despesa.findMany({ where: { data: intervalo }, select: { data: true, valorTotal: true } }),
    prisma.servico.findMany({
      orderBy: [{ dataContratacao: "desc" }, { criadoEm: "desc" }],
      take: 8,
      select: {
        id: true,
        codigo: true,
        status: true,
        dataContratacao: true,
        valorContratado: true,
        descricaoPersonalizada: true,
        cliente: { select: { nome: true } },
        tipoServico: { select: { nome: true } },
        propriedades: { select: { propriedade: { select: { nome: true } } } },
        etapas: { select: { status: true } },
      },
    }),
  ]);

  const porStatus: Record<StatusServico, number> = {
    AGUARDANDO_INICIO: 0, EM_ANDAMENTO: 0, PAUSADO: 0, CONCLUIDO: 0, CANCELADO: 0,
  };
  let contratado = 0;
  let pendente = 0;
  let resultado = 0;
  for (const s of servicos) {
    porStatus[s.status]++;
    if (s.status === "CANCELADO") continue;
    const f = calcularFinanceiroServico({
      contratadoCentavos: paraCentavos(s.valorContratado),
      recebidoCentavos: s.pagamentos.reduce((t, p) => t + paraCentavos(p.valor), 0),
      despesasCentavos: s.despesas.reduce((t, d) => t + paraCentavos(d.valorTotal), 0),
    });
    contratado += paraCentavos(s.valorContratado);
    pendente += f.saldoAReceberCentavos;
    resultado += f.resultadoEstimadoCentavos;
  }

  const recebido = pagamentos.reduce((t, p) => t + paraCentavos(p.valor), 0);
  const totalDespesas = despesas.reduce((t, d) => t + paraCentavos(d.valorTotal), 0);

  // Série mensal
  const datas = [
    ...servicos.map((s) => s.dataContratacao),
    ...pagamentos.map((p) => p.data),
    ...despesas.map((d) => d.data),
  ];
  const inicioSerie = periodo.inicio ?? (datas.length ? new Date(Math.min(...datas.map((d) => d.getTime()))) : periodo.fim);
  const mapa = new Map<string, PontoMensal>(
    mesesEntre(inicioSerie, periodo.fim).map((m) => [m, { mes: m, contratado: 0, recebido: 0, despesas: 0 }]),
  );
  for (const s of servicos) {
    if (s.status === "CANCELADO") continue;
    const p = mapa.get(chaveMes(s.dataContratacao));
    if (p) p.contratado += paraCentavos(s.valorContratado);
  }
  for (const pg of pagamentos) {
    const p = mapa.get(chaveMes(pg.data));
    if (p) p.recebido += paraCentavos(pg.valor);
  }
  for (const d of despesas) {
    const p = mapa.get(chaveMes(d.data));
    if (p) p.despesas += paraCentavos(d.valorTotal);
  }
  const mensal = [...mapa.values()].map((p) => ({
    mes: p.mes,
    contratado: p.contratado / 100,
    recebido: p.recebido / 100,
    despesas: p.despesas / 100,
  }));

  const recentes: ServicoRecente[] = recentesBrutos.map((s) => ({
    id: s.id,
    codigo: s.codigo,
    cliente: s.cliente.nome,
    tipo: s.descricaoPersonalizada || s.tipoServico.nome,
    propriedades: s.propriedades.map((p) => p.propriedade.nome),
    status: s.status,
    dataContratacao: s.dataContratacao,
    valor: Number(s.valorContratado),
    progresso: percentualProgresso(s.etapas.filter((e) => e.status === "CONCLUIDA").length, s.etapas.length),
  }));

  return {
    totalClientes,
    totalPropriedades,
    servicosEmAndamento: porStatus.EM_ANDAMENTO,
    servicosConcluidos: porStatus.CONCLUIDO,
    porStatus,
    contratadoCentavos: contratado,
    recebidoCentavos: recebido,
    pendenteCentavos: pendente,
    despesasCentavos: totalDespesas,
    resultadoEstimadoCentavos: resultado,
    margemEstimada: contratado > 0 ? Math.round((resultado / contratado) * 1000) / 10 : null,
    fluxoCaixaCentavos: recebido - totalDespesas,
    mensal,
    recentes,
  };
}
