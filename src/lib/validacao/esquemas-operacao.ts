import { z } from "zod";
import { lerNumero } from "./documentos";

const textoOpcional = (max: number) =>
  z.string().trim().max(max, `Máximo de ${max} caracteres.`).transform((v) => (v === "" ? null : v));

/** "AAAA-MM-DD" → Date (00:00 UTC). */
export const data = (mensagem = "Informe uma data válida.") =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, mensagem)
    .transform((s) => new Date(`${s}T00:00:00Z`))
    .refine((d) => !Number.isNaN(d.getTime()) && d.getUTCFullYear() >= 1990 && d.getUTCFullYear() <= 2100, mensagem);

const dataOpcional = z
  .string()
  .transform((s, ctx) => {
    if (!s) return null;
    const d = new Date(`${s}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Data inválida." });
      return z.NEVER;
    }
    return d;
  });

interface OpcoesNumero { mensagem: string; casas?: number; min?: number; max?: number }

/** Número digitado (pt-BR) → number com N casas (obrigatório). */
export const numero = (opts: OpcoesNumero) => numeroBruto({ ...opts, opcional: false }).transform((v) => v as number);

/** Número digitado (pt-BR) → number com N casas, ou null se vazio. */
export const numeroOpcional = (opts: OpcoesNumero) => numeroBruto({ ...opts, opcional: true });

const numeroBruto = (opts: OpcoesNumero & { opcional: boolean }) =>
  z.string().transform((v, ctx): number | null => {
    const n = lerNumero(v);
    if (n === null) {
      if (opts.opcional) return null;
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: opts.mensagem });
      return z.NEVER;
    }
    if (Number.isNaN(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: opts.mensagem });
      return z.NEVER;
    }
    const min = opts.min ?? 0.01;
    if (n < min) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `O valor deve ser no mínimo ${String(min).replace(".", ",")}.` });
      return z.NEVER;
    }
    if (n > (opts.max ?? 100_000_000)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valor muito alto." });
      return z.NEVER;
    }
    const f = 10 ** (opts.casas ?? 2);
    return Math.round(n * f) / f;
  });

const dinheiro = (mensagem = "Informe o valor (ex.: 1.250,00).") => numero({ mensagem, casas: 2 });

export const STATUS_SERVICO = ["AGUARDANDO_INICIO", "EM_ANDAMENTO", "PAUSADO", "CONCLUIDO", "CANCELADO"] as const;
export const STATUS_ETAPA = ["PENDENTE", "EM_ANDAMENTO", "CONCLUIDA"] as const;
export const FORMAS_PAGAMENTO = ["PIX", "TRANSFERENCIA", "BOLETO", "DINHEIRO", "CHEQUE", "CARTAO", "OUTRO"] as const;

export const esquemaServico = z
  .object({
    clienteId: z.string().min(1, "Selecione o cliente."),
    propriedadeIds: z.array(z.string().min(1)).min(1, "Selecione ao menos uma propriedade."),
    tipoServicoId: z.string().min(1, "Selecione o tipo de serviço."),
    descricaoPersonalizada: textoOpcional(200),
    dataContratacao: data("Informe a data de contratação."),
    valorContratado: numero({ mensagem: "Informe o valor contratado (ex.: 15.000,00).", min: 0 }),
    prazoPrevisto: dataOpcional,
    status: z.enum(STATUS_SERVICO, { errorMap: () => ({ message: "Selecione a situação." }) }),
    responsavelTecnico: textoOpcional(150),
    observacoes: textoOpcional(4000),
  })
  .superRefine((d, ctx) => {
    if (d.prazoPrevisto && d.prazoPrevisto < d.dataContratacao) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["prazoPrevisto"], message: "O prazo não pode ser anterior à contratação." });
    }
  });

export const esquemaEtapa = z
  .object({
    status: z.enum(STATUS_ETAPA),
    dataInicio: dataOpcional,
    dataConclusao: dataOpcional,
    observacoes: textoOpcional(2000),
  })
  .superRefine((d, ctx) => {
    if (d.dataInicio && d.dataConclusao && d.dataConclusao < d.dataInicio) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dataConclusao"], message: "Conclusão anterior ao início." });
    }
  });

export const esquemaDespesa = z.object({
  categoriaId: z.string().min(1, "Selecione a categoria."),
  data: data(),
  descricao: z.string().trim().min(2, "Descreva a despesa.").max(300),
  quantidade: numeroOpcional({ mensagem: "Quantidade inválida.", casas: 3, min: 0.001 }),
  valorUnitario: numeroOpcional({ mensagem: "Valor unitário inválido." }),
  valorTotal: numeroOpcional({ mensagem: "Valor total inválido." }),
  observacoes: textoOpcional(1000),
});

export const esquemaDeslocamento = z.object({
  data: data(),
  origem: z.string().trim().min(2, "Informe a origem.").max(150),
  destino: z.string().trim().min(2, "Informe o destino.").max(150),
  km: numero({ mensagem: "Informe os quilômetros (ex.: 125,5).", casas: 1, min: 0.1, max: 100_000 }),
  observacoes: textoOpcional(1000),
});

export const esquemaUsoMaterial = z.object({
  tipoMaterialId: z.string().min(1, "Selecione o material."),
  data: data(),
  quantidade: numero({ mensagem: "Informe a quantidade.", casas: 3, min: 0.001, max: 1_000_000 }),
  custoUnitario: numero({ mensagem: "Informe o custo unitário.", min: 0 }),
  observacoes: textoOpcional(1000),
});

export const esquemaPagamento = z.object({
  data: data(),
  valor: dinheiro(),
  forma: z.enum(FORMAS_PAGAMENTO, { errorMap: () => ({ message: "Selecione a forma." }) }),
  descricao: textoOpcional(200),
  chaveIdempotencia: z.string().uuid("Formulário expirado. Recarregue a página."),
});

export const esquemaCustoKm = z.object({
  custoPorKm: numero({ mensagem: "Informe o custo por km (ex.: 1,20).", min: 0.01, max: 1000 }),
});

export const esquemaTipoServico = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(100),
  etapas: z
    .string()
    .transform((t) => t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))
    .pipe(z.array(z.string().max(150, "Etapa com nome muito longo.")).min(1, "Informe ao menos uma etapa (uma por linha).").max(40)),
  ativo: z.string().optional().transform((v) => v === "on"),
});

export const esquemaNome = z.object({ nome: z.string().trim().min(2, "Informe o nome.").max(100) });

export const esquemaTipoMaterial = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(100),
  unidade: z.string().trim().min(1, "Informe a unidade.").max(10),
  custoUnitarioPadrao: numeroOpcional({ mensagem: "Custo inválido.", min: 0 }),
});
