// CPF, CNPJ, telefone e UF. Funções puras (usadas no servidor e no navegador).

export const somenteDigitos = (v: string) => v.replace(/\D/g, "");

export function validarCpf(valor: string): boolean {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const dv = (base: string) => {
    const soma = [...base].reduce((s, d, i) => s + Number(d) * (base.length + 1 - i), 0);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(cpf.slice(0, 9)) === Number(cpf[9]) && dv(cpf.slice(0, 10)) === Number(cpf[10]);
}

export function validarCnpj(valor: string): boolean {
  const cnpj = somenteDigitos(valor);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const dv = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = [...base].reduce((s, d, i) => s + Number(d) * pesos[i], 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(cnpj.slice(0, 12)) === Number(cnpj[12]) && dv(cnpj.slice(0, 13)) === Number(cnpj[13]);
}

export function formatarDocumento(valor: string): string {
  const d = somenteDigitos(valor);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return valor;
}

/** LGPD: exibição parcial para perfis de consulta. CPF → ***.456.789-**; CNPJ é dado empresarial e fica visível. */
export function mascararDocumento(valor: string): string {
  const d = somenteDigitos(valor);
  if (d.length === 11) return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
  return formatarDocumento(d);
}

export function formatarTelefone(valor: string): string {
  const d = somenteDigitos(valor);
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return valor;
}

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR",
  "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

/**
 * Converte número digitado em formato brasileiro ou internacional.
 * "1.234,56" → 1234.56 · "12,5" → 12.5 · "12.5" → 12.5 · "" → null · "abc" → NaN
 */
export function lerNumero(valor: string | null | undefined): number | null {
  const t = (valor ?? "").trim().replace(/\s/g, "");
  if (!t) return null;
  let normal = t;
  if (t.includes(",")) normal = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) normal = t.replace(/\./g, "");
  return /^-?\d+(\.\d+)?$/.test(normal) ? Number(normal) : Number.NaN;
}
