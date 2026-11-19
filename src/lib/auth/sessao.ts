import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import type { Perfil } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { COOKIE_SESSAO } from "./constantes";

export interface UsuarioSessao {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
}

const DURACAO_HORAS = Number(process.env.SESSAO_DURACAO_HORAS ?? 8) || 8;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function obterIpRequisicao(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

/** Cria a sessão no banco e grava o cookie httpOnly. Chamar somente em Server Actions/Route Handlers. */
export async function criarSessao(usuarioId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiraEm = new Date(Date.now() + DURACAO_HORAS * 3600_000);
  const h = await headers();

  await prisma.sessao.create({
    data: {
      tokenHash: hashToken(token),
      usuarioId,
      expiraEm,
      ip: await obterIpRequisicao(),
      userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
    },
  });

  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiraEm,
  });
}

export async function encerrarSessao(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESSAO)?.value;
  if (token) await prisma.sessao.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(COOKIE_SESSAO);
}

/**
 * Valida o cookie contra o banco. Memoizado por requisição (React cache).
 * Retorna null se não houver sessão válida, se tiver expirado ou se o usuário estiver inativo.
 */
export const obterUsuarioAtual = cache(async (): Promise<UsuarioSessao | null> => {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return null;

  const sessao = await prisma.sessao.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { usuario: { select: { id: true, nome: true, email: true, perfil: true, ativo: true } } },
  });
  if (!sessao) return null;

  if (sessao.expiraEm < new Date() || !sessao.usuario.ativo) {
    await prisma.sessao.delete({ where: { id: sessao.id } }).catch(() => undefined);
    return null;
  }
  const { id, nome, email, perfil } = sessao.usuario;
  return { id, nome, email, perfil };
});

/** Garante usuário autenticado; caso contrário redireciona ao login. Use em toda página/ação protegida. */
export async function exigirUsuario(): Promise<UsuarioSessao> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/login");
  return usuario;
}
