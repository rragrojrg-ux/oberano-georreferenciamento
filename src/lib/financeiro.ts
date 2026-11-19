// Regras financeiras e de conversão de área. Funções puras, sem acesso a banco — testáveis.
// Todos os cálculos monetários são feitos em CENTAVOS (inteiros) para evitar erros de ponto flutuante.

export const HECTARES_POR_ALQUEIRE_MINEIRO = 4.84;

export function hectaresParaAlqueires(hectares: number): number {
  return arredondar(hectares / HECTARES_POR_ALQUEIRE_MINEIRO, 4);
}

export function alqueiresParaHectares(alqueires: number): number {
  return arredondar(alqueires * HECTARES_POR_ALQUEIRE_MINEIRO, 4);
}

export function arredondar(valor: number, casas = 2): number {
  const f = 10 ** casas;
  return Math.round((valor + Number.EPSILON) * f) / f;
}

/** Converte qualquer valor numérico (inclusive Prisma.Decimal) em centavos inteiros. */
export function paraCentavos(valor: number | string | { toString(): string }): number {
  return Math.round(Number(valor.toString()) * 100);
}

export function deCentavos(centavos: number): number {
  return centavos / 100;
}

export interface FinanceiroServico {
  /** Valor contratado − pagamentos recebidos (nunca negativo). */
  saldoAReceberCentavos: number;
  /** Valor contratado − despesas registradas. NÃO é fluxo de caixa nem lucro contábil. */
  resultadoEstimadoCentavos: number;
  /** Resultado estimado ÷ valor contratado × 100. `null` quando não há valor contratado. */
  margemEstimadaPercentual: number | null;
  /** Pagamentos recebidos − despesas registradas (dinheiro que efetivamente entrou e saiu). */
  fluxoDeCaixaCentavos: number;
}

export function calcularFinanceiroServico(entrada: {
  contratadoCentavos: number;
  recebidoCentavos: number;
  despesasCentavos: number;
}): FinanceiroServico {
  const { contratadoCentavos, recebidoCentavos, despesasCentavos } = entrada;
  const resultado = contratadoCentavos - despesasCentavos;
  return {
    saldoAReceberCentavos: Math.max(0, contratadoCentavos - recebidoCentavos),
    resultadoEstimadoCentavos: resultado,
    margemEstimadaPercentual:
      contratadoCentavos > 0 ? arredondar((resultado / contratadoCentavos) * 100, 1) : null,
    fluxoDeCaixaCentavos: recebidoCentavos - despesasCentavos,
  };
}

/** Valor total = quantidade × valor unitário, em centavos. */
export function calcularTotalCentavos(quantidade: number, valorUnitarioCentavos: number): number {
  return Math.round(quantidade * valorUnitarioCentavos);
}

export function percentualProgresso(concluidas: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((concluidas / total) * 100);
}
