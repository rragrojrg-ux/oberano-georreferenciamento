import { test } from "node:test";
import assert from "node:assert/strict";
import { escaparCsv, gerarCsv, protegerCelula } from "./csv";

test("protege contra injeção de fórmula, mas preserva valores negativos", () => {
  assert.equal(protegerCelula("=HYPERLINK(\"x\")"), "'=HYPERLINK(\"x\")");
  assert.equal(protegerCelula("@SUM(A1)"), "'@SUM(A1)");
  assert.equal(protegerCelula("-cmd"), "'-cmd");
  assert.equal(protegerCelula("-R$ 120,00"), "-R$ 120,00");
  assert.equal(protegerCelula("-12"), "-12");
});

test("escapa separador, aspas e quebras de linha", () => {
  assert.equal(escaparCsv("Fazenda; Boa Vista"), '"Fazenda; Boa Vista"');
  assert.equal(escaparCsv('Sítio "Recanto"'), '"Sítio ""Recanto"""');
});

test("gera CSV com BOM e CRLF", () => {
  const csv = gerarCsv(["A", "B"], [["1", "2"]], ["T", "3"]);
  assert.ok(csv.startsWith("﻿A;B\r\n1;2\r\nT;3"));
});
