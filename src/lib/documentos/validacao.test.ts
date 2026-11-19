import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizarNome, validarArquivo, TAMANHO_MAXIMO } from "./validacao";

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0x20)]);
const pdf = bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31);

test("aceita PDF verdadeiro", () => {
  const r = validarArquivo("Matrícula 123.PDF", 1000, pdf);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.mime, "application/pdf");
});

test("recusa arquivo com extensão trocada (exe renomeado para .pdf)", () => {
  const exe = bytes(0x4d, 0x5a, 0x90, 0x00);
  assert.equal(validarArquivo("planta.pdf", 1000, exe).ok, false);
});

test("recusa extensões perigosas, arquivos vazios e grandes demais", () => {
  assert.equal(validarArquivo("script.exe", 10, pdf).ok, false);
  assert.equal(validarArquivo("pagina.html", 10, pdf).ok, false);
  assert.equal(validarArquivo("doc.pdf", 0, pdf).ok, false);
  assert.equal(validarArquivo("doc.pdf", TAMANHO_MAXIMO + 1, pdf).ok, false);
});

test("arquivo de texto não pode conter bytes nulos", () => {
  assert.equal(validarArquivo("coordenadas.txt", 10, new TextEncoder().encode("E 123;N 456")).ok, true);
  assert.equal(validarArquivo("coordenadas.txt", 10, new Uint8Array([0x41, 0x00, 0x42])).ok, false);
});

test("sanitiza nome original (sem caminho nem caracteres perigosos)", () => {
  assert.equal(sanitizarNome("..\\..\\windows\\system32\\a.pdf"), "a.pdf");
  assert.equal(sanitizarNome('planta "final"<1>.dwg'), "planta _final__1_.dwg");
});
