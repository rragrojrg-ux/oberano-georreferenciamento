import { test } from "node:test";
import assert from "node:assert/strict";
import { formatarDocumento, lerNumero, mascararDocumento, validarCnpj, validarCpf } from "./documentos";

test("valida CPF", () => {
  assert.equal(validarCpf("529.982.247-25"), true);
  assert.equal(validarCpf("52998224725"), true);
  assert.equal(validarCpf("529.982.247-24"), false);
  assert.equal(validarCpf("111.111.111-11"), false);
  assert.equal(validarCpf("123"), false);
});

test("valida CNPJ", () => {
  assert.equal(validarCnpj("11.222.333/0001-81"), true);
  assert.equal(validarCnpj("11222333000180"), false);
  assert.equal(validarCnpj("00.000.000/0000-00"), false);
});

test("formata e mascara documentos", () => {
  assert.equal(formatarDocumento("52998224725"), "529.982.247-25");
  assert.equal(formatarDocumento("11222333000181"), "11.222.333/0001-81");
  assert.equal(mascararDocumento("52998224725"), "***.982.247-**");
});

test("lê números em formato brasileiro", () => {
  assert.equal(lerNumero("1.234,56"), 1234.56);
  assert.equal(lerNumero("12,5"), 12.5);
  assert.equal(lerNumero("12.5"), 12.5);
  assert.equal(lerNumero("1.234"), 1234);
  assert.equal(lerNumero(""), null);
  assert.ok(Number.isNaN(lerNumero("abc")));
});
