"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { Logo } from "@/components/marca/logo";
import { sair } from "@/lib/auth/acoes";
import type { Recurso } from "@/lib/auth/permissoes";
import { NAVEGACAO } from "./navegacao";

interface Props {
  usuario: { nome: string; perfilRotulo: string; somenteLeitura: boolean };
  recursosPermitidos: Recurso[];
  children: React.ReactNode;
}

function ativo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function EstruturaApp({ usuario, recursosPermitidos, children }: Props) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const permitidos = new Set(recursosPermitidos);

  // Fecha o menu móvel ao navegar
  useEffect(() => setMenuAberto(false), [pathname]);

  const grupos = NAVEGACAO.map((g) => ({ ...g, itens: g.itens.filter((i) => permitidos.has(i.recurso)) })).filter(
    (g) => g.itens.length > 0,
  );

  const iniciais = usuario.nome
    .split(" ")
    .filter((p) => /^[A-Za-zÀ-ú]/.test(p))
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const menuLateral = (
    <nav aria-label="Menu principal" className="flex h-full flex-col bg-marinho-950 text-marinho-100">
      <div className="flex h-16 items-center justify-between px-5">
        <Logo />
        <button
          type="button"
          onClick={() => setMenuAberto(false)}
          className="rounded-md p-1.5 text-marinho-200 hover:bg-white/10 lg:hidden"
          aria-label="Fechar menu"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="mx-5 h-px bg-gradient-to-r from-dourado-500/60 via-dourado-500/20 to-transparent" />

      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {grupos.map((grupo, gi) => (
          <div key={gi}>
            {grupo.titulo && (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-marinho-400">
                {grupo.titulo}
              </p>
            )}
            <ul className="space-y-0.5">
              {grupo.itens.map((item) => {
                const estaAtivo = ativo(pathname, item.href);
                const Icone = item.icone;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={estaAtivo ? "page" : undefined}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                        estaAtivo
                          ? "bg-white/10 font-medium text-white shadow-[inset_3px_0_0_var(--color-dourado-500)]"
                          : "text-marinho-200 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icone
                        className={`size-[18px] shrink-0 ${estaAtivo ? "text-dourado-400" : "text-marinho-300 group-hover:text-dourado-300"}`}
                        aria-hidden="true"
                      />
                      {item.rotulo}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <p className="px-5 pb-5 text-[11px] italic text-dourado-500/80">A solução está em nosso DNA</p>
    </nav>
  );

  return (
    <div className="min-h-dvh">
      {/* Menu lateral fixo (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{menuLateral}</aside>

      {/* Menu móvel (gaveta) */}
      {menuAberto && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-marinho-950/60"
            aria-label="Fechar menu"
            onClick={() => setMenuAberto(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl">{menuLateral}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            className="rounded-md p-2 text-marinho-900 hover:bg-slate-100 lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1" />
          {usuario.somenteLeitura && (
            <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline">
              Somente consulta
            </span>
          )}
          <div className="flex items-center gap-3">
            <Link href="/conta" className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-slate-50" title="Minha conta">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium leading-tight text-marinho-900">{usuario.nome}</p>
                <p className="text-xs text-slate-500">{usuario.perfilRotulo}</p>
              </div>
              <div
                className="grid size-9 place-items-center rounded-full bg-marinho-900 text-sm font-semibold text-dourado-400"
                aria-hidden="true"
              >
                {iniciais || "?"}
              </div>
              <span className="sr-only">Minha conta</span>
            </Link>
            <form action={sair}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-marinho-900"
                title="Sair"
              >
                <LogOut className="size-4" aria-hidden="true" />
                <span className="hidden md:inline">Sair</span>
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
