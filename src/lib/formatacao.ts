const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const moedaCompacta = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
const numero = new Intl.NumberFormat("pt-BR");
const data = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

export const formatarMoeda = (valor: number) => moeda.format(valor);
export const formatarMoedaCentavos = (centavos: number) => moeda.format(centavos / 100);
export const formatarMoedaCompacta = (valor: number) => moedaCompacta.format(valor);
export const formatarNumero = (valor: number) => numero.format(valor);
export const formatarData = (d: Date | string | null | undefined) => (d ? data.format(new Date(d)) : "—");

export function formatarPercentual(valor: number | null, casas = 1): string {
  if (valor === null || Number.isNaN(valor)) return "—";
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
/** "2026-03" → "mar/26" */
export function rotuloMes(chave: string): string {
  const [ano, mes] = chave.split("-");
  return `${MESES[Number(mes) - 1]}/${ano.slice(2)}`;
}
