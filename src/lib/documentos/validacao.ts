// Validação de arquivos enviados. Pura (sem acesso a disco) — testável.

export const TAMANHO_MAXIMO = 20 * 1024 * 1024; // 20 MB

type Assinatura = (b: Uint8Array) => boolean;

const comeca = (...bytes: number[]): Assinatura => (b) => bytes.every((v, i) => b[i] === v);
const PDF = comeca(0x25, 0x50, 0x44, 0x46); // %PDF
const PNG = comeca(0x89, 0x50, 0x4e, 0x47);
const JPG = comeca(0xff, 0xd8, 0xff);
const ZIP = comeca(0x50, 0x4b, 0x03, 0x04); // docx, xlsx, kmz, zip
const OLE = comeca(0xd0, 0xcf, 0x11, 0xe0); // doc, xls antigos
const DWG = comeca(0x41, 0x43, 0x31, 0x30); // "AC10"
/** Arquivo de texto: sem bytes nulos nos primeiros 4 KB. */
const TEXTO: Assinatura = (b) => !b.subarray(0, 4096).includes(0);

/** Extensões permitidas, com o tipo MIME servido no download e a assinatura esperada no conteúdo. */
export const TIPOS_PERMITIDOS: Record<string, { mime: string; assinatura: Assinatura; rotulo: string }> = {
  pdf: { mime: "application/pdf", assinatura: PDF, rotulo: "PDF" },
  jpg: { mime: "image/jpeg", assinatura: JPG, rotulo: "Imagem JPG" },
  jpeg: { mime: "image/jpeg", assinatura: JPG, rotulo: "Imagem JPG" },
  png: { mime: "image/png", assinatura: PNG, rotulo: "Imagem PNG" },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", assinatura: ZIP, rotulo: "Word" },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", assinatura: ZIP, rotulo: "Excel" },
  doc: { mime: "application/msword", assinatura: OLE, rotulo: "Word (antigo)" },
  xls: { mime: "application/vnd.ms-excel", assinatura: OLE, rotulo: "Excel (antigo)" },
  kmz: { mime: "application/vnd.google-earth.kmz", assinatura: ZIP, rotulo: "KMZ" },
  kml: { mime: "application/vnd.google-earth.kml+xml", assinatura: TEXTO, rotulo: "KML" },
  zip: { mime: "application/zip", assinatura: ZIP, rotulo: "ZIP (ex.: shapefile)" },
  dwg: { mime: "application/acad", assinatura: DWG, rotulo: "DWG" },
  dxf: { mime: "application/dxf", assinatura: TEXTO, rotulo: "DXF" },
  csv: { mime: "text/csv", assinatura: TEXTO, rotulo: "CSV" },
  txt: { mime: "text/plain", assinatura: TEXTO, rotulo: "Texto (ex.: coordenadas)" },
};

export const EXTENSOES_ACEITAS = Object.keys(TIPOS_PERMITIDOS).map((e) => `.${e}`).join(",");

export function extensaoDe(nome: string): string {
  const m = /\.([a-z0-9]{1,8})$/i.exec(nome.trim());
  return m ? m[1].toLowerCase() : "";
}

/** Remove caminhos e caracteres problemáticos do nome original (exibição e Content-Disposition). */
export function sanitizarNome(nome: string): string {
  const base = nome.split(/[\\/]/).pop() ?? "arquivo";
  const limpo = base.normalize("NFC").replace(/[\u0000-\u001f\u007f"<>:|?*]/g, "_").replace(/\s+/g, " ").trim();
  return (limpo || "arquivo").slice(0, 180);
}

export type ResultadoValidacao = { ok: true; extensao: string; mime: string } | { ok: false; erro: string };

export function validarArquivo(nome: string, tamanho: number, inicio: Uint8Array): ResultadoValidacao {
  if (tamanho <= 0) return { ok: false, erro: "Arquivo vazio." };
  if (tamanho > TAMANHO_MAXIMO) return { ok: false, erro: "Arquivo maior que 20 MB." };
  const extensao = extensaoDe(nome);
  const tipo = TIPOS_PERMITIDOS[extensao];
  if (!tipo) return { ok: false, erro: `Tipo de arquivo não permitido. Aceitos: ${Object.keys(TIPOS_PERMITIDOS).join(", ")}.` };
  if (!tipo.assinatura(inicio)) return { ok: false, erro: `O conteúdo não corresponde a um arquivo ${tipo.rotulo} válido.` };
  return { ok: true, extensao, mime: tipo.mime };
}

export const CATEGORIAS_DOCUMENTO = {
  MATRICULA: "Matrícula",
  CAR: "CAR",
  CCIR: "CCIR",
  CONTRATO: "Contrato",
  PLANTA: "Planta",
  MEMORIAL_DESCRITIVO: "Memorial descritivo",
  ARQUIVO_TECNICO: "Arquivo técnico",
  COMPROVANTE: "Comprovante",
  OUTRO: "Outro",
} as const;

export type CategoriaDocumentoChave = keyof typeof CATEGORIAS_DOCUMENTO;

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}
