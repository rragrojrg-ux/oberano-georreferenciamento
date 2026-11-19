import { z } from "zod";
import { lerNumero, somenteDigitos, UFS, validarCnpj, validarCpf } from "./documentos";

/** Texto opcional: string vazia vira null. */
const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .transform((v) => (v === "" ? null : v));

const uf = z.enum(UFS, { errorMap: () => ({ message: "Selecione o estado." }) });

export const esquemaCliente = z
  .object({
    tipoPessoa: z.enum(["FISICA", "JURIDICA"], { errorMap: () => ({ message: "Selecione o tipo." }) }),
    nome: z.string().trim().min(3, "Informe o nome completo ou a razão social.").max(200),
    documento: z.string().trim().transform(somenteDigitos),
    telefone: z
      .string()
      .trim()
      .transform(somenteDigitos)
      .refine((v) => v === "" || v.length === 10 || v.length === 11, "Telefone com DDD: 10 ou 11 dígitos.")
      .transform((v) => (v === "" ? null : v)),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(200)
      .refine((v) => v === "" || z.string().email().safeParse(v).success, "E-mail inválido.")
      .transform((v) => (v === "" ? null : v)),
    municipio: z.string().trim().min(2, "Informe o município.").max(120),
    uf,
    observacoes: textoOpcional(2000),
  })
  .superRefine((d, ctx) => {
    const ok = d.tipoPessoa === "FISICA" ? validarCpf(d.documento) : validarCnpj(d.documento);
    if (!ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["documento"],
        message: d.tipoPessoa === "FISICA" ? "CPF inválido." : "CNPJ inválido.",
      });
    }
  });

export type DadosCliente = z.infer<typeof esquemaCliente>;

const area = z
  .string()
  .transform((v, ctx) => {
    const n = lerNumero(v);
    if (n === null || Number.isNaN(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe a área em hectares (ex.: 48,40)." });
      return z.NEVER;
    }
    return n;
  })
  .pipe(z.number().positive("A área deve ser maior que zero.").max(10_000_000, "Área muito grande."));

export const esquemaPropriedade = z.object({
  clienteId: z.string().min(1, "Selecione o cliente."),
  nome: z.string().trim().min(2, "Informe o nome da propriedade.").max(200),
  municipio: z.string().trim().min(2, "Informe o município.").max(120),
  uf,
  areaHectares: area,
  matricula: textoOpcional(60),
  cartorio: textoOpcional(200),
  codigoIncra: textoOpcional(40),
  ccir: textoOpcional(40),
  car: textoOpcional(80),
  observacoes: textoOpcional(2000),
});

export type DadosPropriedade = z.infer<typeof esquemaPropriedade>;

/** Converte erros do Zod em { campo: [mensagens] } para o formulário. */
export function errosPorCampo(erro: z.ZodError): Record<string, string[]> {
  return erro.flatten().fieldErrors as Record<string, string[]>;
}
