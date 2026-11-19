/** Estado devolvido pelas Server Actions de formulário. */
export interface EstadoFormulario {
  erros?: Record<string, string[] | undefined>;
  mensagem?: string;
  /** Valores enviados, para repreencher o formulário quando há erro. */
  valores?: Record<string, string>;
  /** Marca de sucesso (timestamp) — usada para limpar formulários de lançamento. */
  ok?: number;
  sucesso?: string;
}

export function sucesso(mensagem: string): EstadoFormulario {
  return { ok: Date.now(), sucesso: mensagem };
}

export function valoresDoFormulario(formData: FormData): Record<string, string> {
  const v: Record<string, string> = {};
  for (const [k, val] of formData.entries()) if (typeof val === "string" && !k.startsWith("$")) v[k] = val;
  return v;
}

/** Campos alterados entre dois objetos (somente os nomes — LGPD: o histórico não guarda valores pessoais). */
export function camposAlterados(antes: Record<string, unknown>, depois: Record<string, unknown>): string[] {
  return Object.keys(depois).filter((k) => String(antes[k] ?? "") !== String(depois[k] ?? ""));
}
