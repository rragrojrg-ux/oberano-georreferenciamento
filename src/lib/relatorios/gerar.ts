import "server-only";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CATEGORIA_MARCOS, CATEGORIA_QUILOMETRAGEM, STATUS_SERVICO_ROTULO } from "@/lib/dominio";
import { paraCentavos, percentualProgresso } from "@/lib/financeiro";
import { formatarData, formatarMoedaCentavos, formatarPercentual } from "@/lib/formatacao";
import { resumirFinanceiro } from "@/lib/consultas/operacao";

export const TIPOS_RELATORIO = {
  "despesas-por-servico": "Despesas por serviço",
  recebimentos: "Recebimentos",
  pendentes: "Valores pendentes de recebimento",
  "em-andamento": "Serviços em andamento",
  concluidos: "Serviços concluídos",
  "resultado-por-servico": "Resultado financeiro por serviço",
} as const;
export type TipoRelatorio = keyof typeof TIPOS_RELATORIO;

export interface Coluna {
  rotulo: string;
  numerico?: boolean;
  /** Peso relativo de largura no PDF */
  peso?: number;
}

export interface Relatorio {
  tipo: TipoRelatorio;
  titulo: string;
  filtrosDescricao: string;
  colunas: Coluna[];
  linhas: string[][];
  total?: string[];
  observacao?: string;
}

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined);
const id = z.string().min(1).max(40).regex(/^[a-z0-9]+$/i).optional().catch(undefined);

export const esquemaFiltrosRelatorio = z.object({
  tipo: z.enum(Object.keys(TIPOS_RELATORIO) as [TipoRelatorio, ...TipoRelatorio[]]).catch("resultado-por-servico"),
  cliente: id,
  propriedade: id,
  servico: id,
  de: dataIso,
  ate: dataIso,
});
export type FiltrosRelatorio = z.infer<typeof esquemaFiltrosRelatorio>;

export function lerFiltros(params: Record<string, string | string[] | undefined> | URLSearchParams): FiltrosRelatorio {
  const get = (k: string) => (params instanceof URLSearchParams ? params.get(k) ?? undefined : typeof params[k] === "string" ? (params[k] as string) || undefined : undefined);
  return esquemaFiltrosRelatorio.parse({
    tipo: get("tipo"), cliente: get("cliente"), propriedade: get("propriedade"), servico: get("servico"), de: get("de"), ate: get("ate"),
  });
}

function intervalo(f: FiltrosRelatorio): Prisma.DateTimeFilter | undefined {
  if (!f.de && !f.ate) return undefined;
  const r: Prisma.DateTimeFilter = {};
  if (f.de) r.gte = new Date(`${f.de}T00:00:00Z`);
  if (f.ate) {
    const fim = new Date(`${f.ate}T00:00:00Z`);
    fim.setUTCDate(fim.getUTCDate() + 1);
    r.lt = fim;
  }
  return r;
}

function filtroServico(f: FiltrosRelatorio): Prisma.ServicoWhereInput {
  return {
    ...(f.servico ? { id: f.servico } : {}),
    ...(f.cliente ? { clienteId: f.cliente } : {}),
    ...(f.propriedade ? { propriedades: { some: { propriedadeId: f.propriedade } } } : {}),
  };
}

async function descreverFiltros(f: FiltrosRelatorio): Promise<string> {
  const partes: string[] = [];
  const [c, p, s] = await Promise.all([
    f.cliente ? prisma.cliente.findUnique({ where: { id: f.cliente }, select: { nome: true } }) : null,
    f.propriedade ? prisma.propriedade.findUnique({ where: { id: f.propriedade }, select: { nome: true } }) : null,
    f.servico ? prisma.servico.findUnique({ where: { id: f.servico }, select: { codigo: true } }) : null,
  ]);
  if (c) partes.push(`Cliente: ${c.nome}`);
  if (p) partes.push(`Propriedade: ${p.nome}`);
  if (s) partes.push(`Serviço: ${s.codigo}`);
  const fmt = (d: string) => d.split("-").reverse().join("/");
  if (f.de || f.ate) partes.push(`Período: ${f.de ? fmt(f.de) : "início"} a ${f.ate ? fmt(f.ate) : "hoje"}`);
  return partes.length ? partes.join(" · ") : "Sem filtros (todos os registros)";
}

const nomeServico = (s: { codigo: string; descricaoPersonalizada: string | null; tipoServico: { nome: string } }) =>
  `${s.codigo} · ${s.descricaoPersonalizada || s.tipoServico.nome}`;

const selServico = {
  id: true, codigo: true, status: true, dataContratacao: true, prazoPrevisto: true, concluidoEm: true, valorContratado: true,
  descricaoPersonalizada: true,
  tipoServico: { select: { nome: true } },
  cliente: { select: { nome: true } },
} satisfies Prisma.ServicoSelect;

export async function gerarRelatorio(f: FiltrosRelatorio): Promise<Relatorio> {
  const periodo = intervalo(f);
  const base = { tipo: f.tipo, titulo: TIPOS_RELATORIO[f.tipo], filtrosDescricao: await descreverFiltros(f) };

  switch (f.tipo) {
    case "despesas-por-servico": {
      const despesas = await prisma.despesa.findMany({
        where: { servico: filtroServico(f), ...(periodo ? { data: periodo } : {}) },
        select: { valorTotal: true, categoria: { select: { nome: true } }, servico: { select: selServico } },
      });
      const grupos = new Map<string, { s: (typeof despesas)[number]["servico"]; n: number; km: number; marcos: number; outras: number }>();
      for (const d of despesas) {
        const g = grupos.get(d.servico.id) ?? { s: d.servico, n: 0, km: 0, marcos: 0, outras: 0 };
        const v = paraCentavos(d.valorTotal);
        g.n++;
        if (d.categoria.nome === CATEGORIA_QUILOMETRAGEM) g.km += v;
        else if (d.categoria.nome === CATEGORIA_MARCOS) g.marcos += v;
        else g.outras += v;
        grupos.set(d.servico.id, g);
      }
      const lista = [...grupos.values()].sort((a, b) => b.km + b.marcos + b.outras - (a.km + a.marcos + a.outras));
      const t = lista.reduce((acc, g) => ({ n: acc.n + g.n, km: acc.km + g.km, marcos: acc.marcos + g.marcos, outras: acc.outras + g.outras }), { n: 0, km: 0, marcos: 0, outras: 0 });
      return {
        ...base,
        colunas: [
          { rotulo: "Serviço", peso: 3 }, { rotulo: "Cliente", peso: 2.5 }, { rotulo: "Lançamentos", numerico: true },
          { rotulo: "Quilometragem", numerico: true, peso: 1.3 }, { rotulo: "Marcos", numerico: true, peso: 1.3 },
          { rotulo: "Outras", numerico: true, peso: 1.3 }, { rotulo: "Total", numerico: true, peso: 1.4 },
        ],
        linhas: lista.map((g) => [
          nomeServico(g.s), g.s.cliente.nome, String(g.n), formatarMoedaCentavos(g.km), formatarMoedaCentavos(g.marcos),
          formatarMoedaCentavos(g.outras), formatarMoedaCentavos(g.km + g.marcos + g.outras),
        ]),
        total: ["Total", "", String(t.n), formatarMoedaCentavos(t.km), formatarMoedaCentavos(t.marcos), formatarMoedaCentavos(t.outras), formatarMoedaCentavos(t.km + t.marcos + t.outras)],
      };
    }

    case "recebimentos": {
      const FORMA: Record<string, string> = { PIX: "PIX", TRANSFERENCIA: "Transferência", BOLETO: "Boleto", DINHEIRO: "Dinheiro", CHEQUE: "Cheque", CARTAO: "Cartão", OUTRO: "Outro" };
      const pgs = await prisma.pagamento.findMany({
        where: { servico: filtroServico(f), ...(periodo ? { data: periodo } : {}) },
        orderBy: { data: "asc" },
        select: { data: true, valor: true, forma: true, descricao: true, servico: { select: selServico } },
      });
      const total = pgs.reduce((t, p) => t + paraCentavos(p.valor), 0);
      return {
        ...base,
        colunas: [
          { rotulo: "Data" }, { rotulo: "Serviço", peso: 3 }, { rotulo: "Cliente", peso: 2.5 }, { rotulo: "Forma" },
          { rotulo: "Descrição", peso: 2 }, { rotulo: "Valor", numerico: true, peso: 1.3 },
        ],
        linhas: pgs.map((p) => [formatarData(p.data), nomeServico(p.servico), p.servico.cliente.nome, FORMA[p.forma] ?? p.forma, p.descricao ?? "", formatarMoedaCentavos(paraCentavos(p.valor))]),
        total: ["Total", `${pgs.length} pagamento(s)`, "", "", "", formatarMoedaCentavos(total)],
        observacao: "Visão de caixa: pagamentos pela data em que foram recebidos.",
      };
    }

    case "pendentes":
    case "resultado-por-servico": {
      const servicos = await prisma.servico.findMany({
        where: { ...filtroServico(f), status: { not: "CANCELADO" }, ...(periodo ? { dataContratacao: periodo } : {}) },
        orderBy: { dataContratacao: "asc" },
        select: { ...selServico, pagamentos: { select: { valor: true } }, despesas: { select: { valorTotal: true } } },
      });
      const comFin = servicos.map((s) => ({ s, fin: resumirFinanceiro(s) }));
      if (f.tipo === "pendentes") {
        const lista = comFin.filter((x) => x.fin.saldoAReceberCentavos > 0);
        const t = lista.reduce((a, x) => ({ c: a.c + x.fin.contratadoCentavos, r: a.r + x.fin.recebidoCentavos, s: a.s + x.fin.saldoAReceberCentavos }), { c: 0, r: 0, s: 0 });
        return {
          ...base,
          colunas: [
            { rotulo: "Serviço", peso: 3 }, { rotulo: "Cliente", peso: 2.5 }, { rotulo: "Situação", peso: 1.3 }, { rotulo: "Contratação" },
            { rotulo: "Contratado", numerico: true, peso: 1.3 }, { rotulo: "Recebido", numerico: true, peso: 1.3 }, { rotulo: "A receber", numerico: true, peso: 1.3 },
          ],
          linhas: lista.map(({ s, fin }) => [
            nomeServico(s), s.cliente.nome, STATUS_SERVICO_ROTULO[s.status], formatarData(s.dataContratacao),
            formatarMoedaCentavos(fin.contratadoCentavos), formatarMoedaCentavos(fin.recebidoCentavos), formatarMoedaCentavos(fin.saldoAReceberCentavos),
          ]),
          total: ["Total", `${lista.length} serviço(s)`, "", "", formatarMoedaCentavos(t.c), formatarMoedaCentavos(t.r), formatarMoedaCentavos(t.s)],
          observacao: "Saldo a receber = valor contratado − pagamentos recebidos. Serviços cancelados não entram.",
        };
      }
      const t = comFin.reduce(
        (a, x) => ({ c: a.c + x.fin.contratadoCentavos, r: a.r + x.fin.recebidoCentavos, d: a.d + x.fin.despesasCentavos, res: a.res + x.fin.resultadoEstimadoCentavos }),
        { c: 0, r: 0, d: 0, res: 0 },
      );
      return {
        ...base,
        colunas: [
          { rotulo: "Serviço", peso: 3 }, { rotulo: "Cliente", peso: 2.3 }, { rotulo: "Contratado", numerico: true, peso: 1.3 },
          { rotulo: "Recebido", numerico: true, peso: 1.3 }, { rotulo: "Despesas", numerico: true, peso: 1.3 },
          { rotulo: "Resultado estimado", numerico: true, peso: 1.4 }, { rotulo: "Margem", numerico: true, peso: 0.8 },
        ],
        linhas: comFin.map(({ s, fin }) => [
          nomeServico(s), s.cliente.nome, formatarMoedaCentavos(fin.contratadoCentavos), formatarMoedaCentavos(fin.recebidoCentavos),
          formatarMoedaCentavos(fin.despesasCentavos), formatarMoedaCentavos(fin.resultadoEstimadoCentavos), formatarPercentual(fin.margemEstimadaPercentual),
        ]),
        total: [
          "Total", `${comFin.length} serviço(s)`, formatarMoedaCentavos(t.c), formatarMoedaCentavos(t.r), formatarMoedaCentavos(t.d),
          formatarMoedaCentavos(t.res), formatarPercentual(t.c ? Math.round((t.res / t.c) * 1000) / 10 : null),
        ],
        observacao: "Resultado estimado = contratado − despesas registradas; margem = resultado ÷ contratado. Estimativa gerencial — não é lucro contábil.",
      };
    }

    case "em-andamento": {
      const servicos = await prisma.servico.findMany({
        where: { ...filtroServico(f), status: { in: ["AGUARDANDO_INICIO", "EM_ANDAMENTO", "PAUSADO"] }, ...(periodo ? { dataContratacao: periodo } : {}) },
        orderBy: [{ prazoPrevisto: "asc" }, { dataContratacao: "asc" }],
        select: {
          ...selServico,
          propriedades: { select: { propriedade: { select: { nome: true } } } },
          etapas: { orderBy: { ordem: "asc" }, select: { nome: true, status: true } },
        },
      });
      const hoje = new Date();
      return {
        ...base,
        colunas: [
          { rotulo: "Serviço", peso: 2.6 }, { rotulo: "Cliente", peso: 2 }, { rotulo: "Propriedades", peso: 2 }, { rotulo: "Situação", peso: 1.2 },
          { rotulo: "Prazo" }, { rotulo: "Etapa atual", peso: 2 }, { rotulo: "Progresso", numerico: true, peso: 0.9 },
        ],
        linhas: servicos.map((s) => {
          const atual = s.etapas.find((e) => e.status === "EM_ANDAMENTO") ?? s.etapas.find((e) => e.status === "PENDENTE");
          const atrasado = s.prazoPrevisto && s.prazoPrevisto < hoje;
          return [
            nomeServico(s), s.cliente.nome, s.propriedades.map((p) => p.propriedade.nome).join(", "), STATUS_SERVICO_ROTULO[s.status],
            s.prazoPrevisto ? `${formatarData(s.prazoPrevisto)}${atrasado ? " (atrasado)" : ""}` : "—",
            atual?.nome ?? "—",
            `${percentualProgresso(s.etapas.filter((e) => e.status === "CONCLUIDA").length, s.etapas.length)}%`,
          ];
        }),
        total: ["Total", `${servicos.length} serviço(s)`, "", "", "", "", ""],
      };
    }

    case "concluidos": {
      const servicos = await prisma.servico.findMany({
        where: { ...filtroServico(f), status: "CONCLUIDO", ...(periodo ? { concluidoEm: periodo } : {}) },
        orderBy: { concluidoEm: "asc" },
        select: { ...selServico, pagamentos: { select: { valor: true } }, despesas: { select: { valorTotal: true } } },
      });
      const comFin = servicos.map((s) => ({ s, fin: resumirFinanceiro(s) }));
      const t = comFin.reduce((a, x) => ({ c: a.c + x.fin.contratadoCentavos, s: a.s + x.fin.saldoAReceberCentavos, r: a.r + x.fin.resultadoEstimadoCentavos }), { c: 0, s: 0, r: 0 });
      return {
        ...base,
        colunas: [
          { rotulo: "Serviço", peso: 3 }, { rotulo: "Cliente", peso: 2.5 }, { rotulo: "Contratação" }, { rotulo: "Conclusão" },
          { rotulo: "Contratado", numerico: true, peso: 1.3 }, { rotulo: "A receber", numerico: true, peso: 1.3 }, { rotulo: "Resultado estimado", numerico: true, peso: 1.4 },
        ],
        linhas: comFin.map(({ s, fin }) => [
          nomeServico(s), s.cliente.nome, formatarData(s.dataContratacao), formatarData(s.concluidoEm),
          formatarMoedaCentavos(fin.contratadoCentavos), formatarMoedaCentavos(fin.saldoAReceberCentavos), formatarMoedaCentavos(fin.resultadoEstimadoCentavos),
        ]),
        total: ["Total", `${comFin.length} serviço(s)`, "", "", formatarMoedaCentavos(t.c), formatarMoedaCentavos(t.s), formatarMoedaCentavos(t.r)],
        observacao: "O filtro de período considera a data de conclusão.",
      };
    }
  }
}
