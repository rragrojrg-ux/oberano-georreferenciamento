import { test } from "node:test";
import assert from "node:assert/strict";
import { esquemaDeslocamento, esquemaEtapa, esquemaPagamento, esquemaServico, esquemaTipoServico } from "./esquemas-operacao";

const servicoBase = {
  clienteId: "c1",
  propriedadeIds: ["p1", "p2"],
  tipoServicoId: "t1",
  descricaoPersonalizada: "",
  dataContratacao: "2026-03-10",
  valorContratado: "15.000,00",
  prazoPrevisto: "2026-06-10",
  status: "EM_ANDAMENTO",
  responsavelTecnico: "",
  observacoes: "",
};

test("serviço: aceita várias propriedades e lê valor em pt-BR", () => {
  const r = esquemaServico.parse(servicoBase);
  assert.equal(r.valorContratado, 15000);
  assert.deepEqual(r.propriedadeIds, ["p1", "p2"]);
  assert.equal(r.descricaoPersonalizada, null);
});

test("serviço: exige propriedade e rejeita prazo anterior à contratação", () => {
  assert.equal(esquemaServico.safeParse({ ...servicoBase, propriedadeIds: [] }).success, false);
  const r = esquemaServico.safeParse({ ...servicoBase, prazoPrevisto: "2026-01-01" });
  assert.equal(r.success, false);
});

test("etapa: conclusão não pode ser antes do início", () => {
  const r = esquemaEtapa.safeParse({ status: "CONCLUIDA", dataInicio: "2026-05-10", dataConclusao: "2026-05-01", observacoes: "" });
  assert.equal(r.success, false);
});

test("deslocamento: km com uma casa decimal", () => {
  const r = esquemaDeslocamento.parse({ data: "2026-05-10", origem: "Escritório", destino: "Unaí", km: "125,46", observacoes: "" });
  assert.equal(r.km, 125.5);
});

test("pagamento: exige chave de idempotência válida e valor positivo", () => {
  const base = { data: "2026-05-10", valor: "1.250,00", forma: "PIX", descricao: "" };
  assert.equal(esquemaPagamento.safeParse({ ...base, chaveIdempotencia: "x" }).success, false);
  const ok = esquemaPagamento.parse({ ...base, chaveIdempotencia: "3f1c2d4e-5b6a-4c7d-8e9f-0a1b2c3d4e5f" });
  assert.equal(ok.valor, 1250);
  assert.equal(esquemaPagamento.safeParse({ ...base, valor: "0", chaveIdempotencia: "3f1c2d4e-5b6a-4c7d-8e9f-0a1b2c3d4e5f" }).success, false);
});

test("tipo de serviço: etapas uma por linha, ignorando linhas vazias", () => {
  const r = esquemaTipoServico.parse({ nome: "Teste", etapas: "Contratação\n\n  Campo  \r\nEntrega\n", ativo: "on" });
  assert.deepEqual(r.etapas, ["Contratação", "Campo", "Entrega"]);
  assert.equal(r.ativo, true);
});
