import "server-only";

/**
 * Cliente mínimo da API do Supabase Storage (sem SDK). Usa a chave secreta do servidor,
 * que NUNCA vai para o navegador. O bucket deve ser PRIVADO.
 *
 * Variáveis: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET (padrão "documentos").
 */
function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_BUCKET || "documentos";
  if (!url || !chave) throw new Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para usar STORAGE_DRIVER=supabase.");
  if (!/^[a-z0-9-_]+$/i.test(bucket)) throw new Error("SUPABASE_BUCKET inválido.");
  // Chaves novas (sb_secret_…) vão só no cabeçalho apikey; as antigas (JWT service_role) também como Bearer.
  const headers: Record<string, string> = { apikey: chave };
  if (!chave.startsWith("sb_")) headers.Authorization = `Bearer ${chave}`;
  return { base: `${url}/storage/v1`, bucket, headers };
}

async function falha(resp: Response, acao: string): Promise<never> {
  const corpo = await resp.text().catch(() => "");
  throw new Error(`Supabase Storage: falha ao ${acao} (${resp.status}) ${corpo.slice(0, 200)}`);
}

export async function enviar(nome: string, conteudo: Buffer): Promise<void> {
  const { base, bucket, headers } = config();
  const resp = await fetch(`${base}/object/${bucket}/${nome}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/octet-stream", "x-upsert": "false" },
    body: new Uint8Array(conteudo),
  });
  if (!resp.ok) await falha(resp, "enviar arquivo");
}

export async function baixar(nome: string): Promise<Buffer> {
  const { base, bucket, headers } = config();
  const resp = await fetch(`${base}/object/${bucket}/${nome}`, { headers, cache: "no-store" });
  if (!resp.ok) await falha(resp, "baixar arquivo");
  return Buffer.from(await resp.arrayBuffer());
}

export async function remover(nome: string): Promise<void> {
  const { base, bucket, headers } = config();
  const resp = await fetch(`${base}/object/${bucket}`, {
    method: "DELETE",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [nome] }),
  });
  if (!resp.ok && resp.status !== 404) await falha(resp, "remover arquivo");
}

/** URL assinada (válida por pouco tempo, só para ESTE nome) para o navegador enviar o arquivo direto ao bucket. */
export async function urlDeEnvioAssinada(nome: string): Promise<string> {
  const { base, bucket, headers } = config();
  const resp = await fetch(`${base}/object/upload/sign/${bucket}/${nome}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!resp.ok) await falha(resp, "criar URL de envio");
  const dados = (await resp.json()) as { url?: string };
  if (!dados.url) throw new Error("Supabase Storage: resposta sem URL de envio.");
  return `${base}${dados.url}`;
}
