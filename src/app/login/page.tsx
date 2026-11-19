import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/marca/logo";
import { obterUsuarioAtual } from "@/lib/auth/sessao";
import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ de?: string }> }) {
  if (await obterUsuarioAtual()) redirect("/");
  const { de } = await searchParams;

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-marinho-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo />
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-semibold leading-tight">
            Gestão de georreferenciamento, topografia e regularização fundiária.
          </h1>
          <p className="mt-6 text-lg text-dourado-400">A solução está em nosso DNA</p>
        </div>
        <p className="text-xs text-marinho-300">Acesso restrito a usuários autorizados.</p>
        {/* grade decorativa */}
        <svg className="pointer-events-none absolute -right-24 -bottom-24 size-[520px] opacity-15" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="90" fill="none" stroke="#c9a227" strokeWidth="1" />
          <ellipse cx="100" cy="100" rx="40" ry="90" fill="none" stroke="#c9a227" strokeWidth="1" />
          <ellipse cx="100" cy="100" rx="70" ry="90" fill="none" stroke="#c9a227" strokeWidth="1" />
          <path d="M10 100h180M22 55h156M22 145h156" stroke="#c9a227" strokeWidth="1" />
        </svg>
      </section>

      <section className="flex items-center justify-center bg-fundo px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center rounded-2xl bg-marinho-950 p-4 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-semibold text-marinho-900">Entrar no sistema</h2>
          <p className="mt-1 text-sm text-slate-500">Use o e-mail e a senha cadastrados pelo administrador.</p>
          <FormularioLogin destino={de} />
        </div>
      </section>
    </main>
  );
}
