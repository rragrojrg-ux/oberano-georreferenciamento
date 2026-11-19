import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO } from "@/lib/auth/constantes";

/**
 * Primeira barreira: sem cookie de sessão → redireciona ao login.
 * A validação real (token no banco, expiração, usuário ativo, permissões) acontece no servidor
 * em cada página e ação (ver src/lib/auth/sessao.ts e guardas.ts).
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const temSessao = Boolean(req.cookies.get(COOKIE_SESSAO)?.value);

  if (pathname === "/login") return NextResponse.next();

  if (!temSessao) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname !== "/" ? `?de=${encodeURIComponent(pathname + search)}` : "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.svg|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
