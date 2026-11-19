import { z } from "zod";

export const PRESETS = {
  mes: "Este mês",
  "3m": "Últimos 3 meses",
  "6m": "Últimos 6 meses",
  "12m": "Últimos 12 meses",
  ano: "Este ano",
  tudo: "Todo o período",
  personalizado: "Personalizado",
} as const;

export type Preset = keyof typeof PRESETS;

export interface Periodo {
  preset: Preset;
  /** Inclusivo, 00:00 UTC */
  inicio: Date | null;
  /** Inclusivo, 00:00 UTC do último dia */
  fim: Date;
  rotulo: string;
}

const dataIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)));

const esquema = z.object({
  periodo: z.enum(Object.keys(PRESETS) as [Preset, ...Preset[]]).catch("12m"),
  de: dataIso.optional().catch(undefined),
  ate: dataIso.optional().catch(undefined),
});

function utcHoje(): Date {
  const h = new Date();
  return new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth(), h.getUTCDate()));
}

export const paraIso = (d: Date) => d.toISOString().slice(0, 10);

/** Data de hoje no fuso de Brasília, "AAAA-MM-DD" (evita virar o dia às 21h por causa do UTC). */
export const hojeLocalIso = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

/** Interpreta os parâmetros da URL (?periodo=…&de=…&ate=…) com validação Zod. */
export function resolverPeriodo(params: Record<string, string | string[] | undefined>): Periodo {
  const p = esquema.parse({
    periodo: typeof params.periodo === "string" ? params.periodo : undefined,
    de: typeof params.de === "string" ? params.de : undefined,
    ate: typeof params.ate === "string" ? params.ate : undefined,
  });
  const hoje = utcHoje();
  const inicioMes = (mesesAtras: number) => new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - mesesAtras, 1));

  switch (p.periodo) {
    case "mes":
      return { preset: "mes", inicio: inicioMes(0), fim: hoje, rotulo: PRESETS.mes };
    case "3m":
      return { preset: "3m", inicio: inicioMes(2), fim: hoje, rotulo: PRESETS["3m"] };
    case "6m":
      return { preset: "6m", inicio: inicioMes(5), fim: hoje, rotulo: PRESETS["6m"] };
    case "ano":
      return { preset: "ano", inicio: new Date(Date.UTC(hoje.getUTCFullYear(), 0, 1)), fim: hoje, rotulo: PRESETS.ano };
    case "tudo":
      return { preset: "tudo", inicio: null, fim: hoje, rotulo: PRESETS.tudo };
    case "personalizado": {
      if (p.de && p.ate) {
        let inicio = new Date(`${p.de}T00:00:00Z`);
        let fim = new Date(`${p.ate}T00:00:00Z`);
        if (inicio > fim) [inicio, fim] = [fim, inicio];
        const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
        return { preset: "personalizado", inicio, fim, rotulo: `${fmt(inicio)} a ${fmt(fim)}` };
      }
      return { preset: "12m", inicio: inicioMes(11), fim: hoje, rotulo: PRESETS["12m"] };
    }
    default:
      return { preset: "12m", inicio: inicioMes(11), fim: hoje, rotulo: PRESETS["12m"] };
  }
}

/** Filtro Prisma para campos de data (fim inclusivo). */
export function filtroData(periodo: Periodo) {
  const ateExclusivo = new Date(periodo.fim);
  ateExclusivo.setUTCDate(ateExclusivo.getUTCDate() + 1);
  return periodo.inicio ? { gte: periodo.inicio, lt: ateExclusivo } : { lt: ateExclusivo };
}
