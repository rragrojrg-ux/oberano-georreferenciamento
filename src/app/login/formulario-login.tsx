"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { entrar, type EstadoLogin } from "@/lib/auth/acoes";

export function FormularioLogin({ destino }: { destino?: string }) {
  const [estado, acao, enviando] = useActionState<EstadoLogin, FormData>(entrar, {});

  return (
    <form action={acao} className="mt-8 space-y-5" noValidate>
      <input type="hidden" name="destino" value={destino ?? ""} />
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">E-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={estado.email}
          className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm focus:border-marinho-600 focus:outline-none focus:ring-2 focus:ring-marinho-600/20"
        />
      </div>
      <div>
        <label htmlFor="senha" className="block text-sm font-medium text-slate-700">Senha</label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm focus:border-marinho-600 focus:outline-none focus:ring-2 focus:ring-marinho-600/20"
        />
      </div>

      {estado.erro && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-marinho-900 px-4 py-2.5 font-medium text-white shadow transition hover:bg-marinho-800 disabled:opacity-60"
      >
        <LogIn className="size-4" aria-hidden="true" />
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
