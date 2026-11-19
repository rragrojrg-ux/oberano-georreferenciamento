import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcularFinanceiroServico,
  calcularTotalCentavos,
  hectaresParaAlqueires,
  paraCentavos,
  percentualProgresso,
} from "./financeiro";

test("converte hectares em alqueires mineiros (1 alq = 4,84 ha)", () => {
  assert.equal(hectaresParaAlqueires(4.84), 1);
  assert.equal(hectaresParaAlqueires(48.4), 10);
  assert.equal(hectaresParaAlqueires(100), 20.6612);
});

test("calcula saldo, resultado, margem e fluxo de caixa", () => {
  const r = calcularFinanceiroServico({
    contratadoCentavos: 1_000_000, // R$ 10.000,00
    recebidoCentavos: 400_000, // R$ 4.000,00
    despesasCentavos: 250_000, // R$ 2.500,00
  });
  assert.equal(r.saldoAReceberCentavos, 600_000);
  assert.equal(r.resultadoEstimadoCentavos, 750_000);
  assert.equal(r.margemEstimadaPercentual, 75);
  assert.equal(r.fluxoDeCaixaCentavos, 150_000);
});

test("saldo a receber nunca fica negativo e margem é nula sem contrato", () => {
  const r = calcularFinanceiroServico({ contratadoCentavos: 0, recebidoCentavos: 100, despesasCentavos: 50 });
  assert.equal(r.saldoAReceberCentavos, 0);
  assert.equal(r.margemEstimadaPercentual, null);
});

test("evita erro de ponto flutuante em valores monetários", () => {
  assert.equal(paraCentavos("0.1") + paraCentavos("0.2"), 30);
  assert.equal(calcularTotalCentavos(3, paraCentavos(1.2)), 360);
});

test("percentual de progresso das etapas", () => {
  assert.equal(percentualProgresso(0, 0), 0);
  assert.equal(percentualProgresso(4, 11), 36);
  assert.equal(percentualProgresso(11, 11), 100);
});
