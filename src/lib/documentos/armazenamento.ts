import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import * as supabase from "./supabase";

/**
 * Armazenamento PRIVADO de arquivos — nunca servido diretamente; só sai pela rota
 * /api/documentos/[id], que verifica sessão e permissão.
 *
 * STORAGE_DRIVER=local    → pasta no disco (STORAGE_DIR, padrão ./storage/documentos). Para PC/VPS.
 * STORAGE_DRIVER=supabase → bucket PRIVADO do Supabase Storage. Obrigatório na Vercel, cujo disco é apagado a cada publicação.
 */
export type Driver = "local" | "supabase";
export const driver: Driver = process.env.STORAGE_DRIVER === "supabase" ? "supabase" : "local";

const DIRETORIO = path.resolve(process.env.STORAGE_DIR || path.join(process.cwd(), "storage", "documentos"));
const NOME_SEGURO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,8}$/;

export function nomeValido(nomeArmazenado: string): boolean {
  return NOME_SEGURO.test(nomeArmazenado);
}

function exigirNomeValido(nomeArmazenado: string) {
  if (!nomeValido(nomeArmazenado)) throw new Error("Nome de arquivo armazenado inválido.");
}

function caminhoLocal(nomeArmazenado: string): string {
  exigirNomeValido(nomeArmazenado);
  const completo = path.join(DIRETORIO, nomeArmazenado);
  if (path.dirname(completo) !== DIRETORIO) throw new Error("Caminho fora do armazenamento.");
  return completo;
}

export const novoNome = (extensao: string) => `${randomUUID()}.${extensao}`;
export const hashDe = (conteudo: Buffer) => createHash("sha256").update(conteudo).digest("hex");

/** Grava o conteúdo (envio passando pelo servidor — usado no modo local). */
export async function salvarArquivo(conteudo: Buffer, extensao: string) {
  const nomeArmazenado = novoNome(extensao);
  if (driver === "supabase") {
    await supabase.enviar(nomeArmazenado, conteudo);
  } else {
    await mkdir(DIRETORIO, { recursive: true });
    // flag "wx": falha se, por absurdo, o nome já existir (nunca sobrescreve).
    await writeFile(caminhoLocal(nomeArmazenado), conteudo, { flag: "wx" });
  }
  return { nomeArmazenado, hashSha256: hashDe(conteudo) };
}

export async function lerArquivo(nomeArmazenado: string): Promise<Buffer> {
  if (driver === "supabase") {
    exigirNomeValido(nomeArmazenado);
    return supabase.baixar(nomeArmazenado);
  }
  return readFile(caminhoLocal(nomeArmazenado));
}

export async function removerArquivo(nomeArmazenado: string): Promise<void> {
  if (driver === "supabase") {
    exigirNomeValido(nomeArmazenado);
    return supabase.remover(nomeArmazenado);
  }
  await unlink(caminhoLocal(nomeArmazenado)).catch((e: NodeJS.ErrnoException) => {
    if (e.code !== "ENOENT") throw e;
  });
}

/** Modo Supabase: URL de envio direto do navegador para o bucket (contorna o limite de 4,5 MB da Vercel). */
export async function criarUrlDeEnvio(extensao: string) {
  if (driver !== "supabase") throw new Error("Envio direto só existe no modo Supabase.");
  const nomeArmazenado = novoNome(extensao);
  return { nomeArmazenado, url: await supabase.urlDeEnvioAssinada(nomeArmazenado) };
}
