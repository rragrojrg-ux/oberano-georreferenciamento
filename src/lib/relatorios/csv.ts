// CSV no padrão do Excel em português: separador ";", UTF-8 com BOM, quebras CRLF.

/** Evita "injeção de fórmula" no Excel: células de texto que começam com = + @ - (exceto números/moeda). */
export function protegerCelula(valor: string): string {
  const v = valor ?? "";
  if (/^[=+@\t\r]/.test(v) || (/^-/.test(v) && !/^-\s?(R\$|\d)/.test(v))) return `'${v}`;
  return v;
}

export function escaparCsv(valor: string): string {
  const v = protegerCelula(valor);
  return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function gerarCsv(cabecalho: string[], linhas: string[][], rodape?: string[]): string {
  const todas = [cabecalho, ...linhas, ...(rodape ? [rodape] : [])];
  return "﻿" + todas.map((l) => l.map(escaparCsv).join(";")).join("\r\n") + "\r\n";
}
