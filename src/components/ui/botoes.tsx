"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Trash2 } from "lucide-react";
import type { EstadoFormulario } from "@/lib/acoes/tipos";
import { classeBotaoPrimario } from "./formulario";

export function BotaoEnviar({ children, pendente = "Salvando…" }: { children: React.ReactNode; pendente?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={classeBotaoPrimario}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {pending ? pendente : children}
    </button>
  );
}

/** Botão de exclusão com confirmação. A ação valida permissão e vínculos no servidor. */
export function BotaoExcluir({
  acao,
  id,
  confirmacao,
  compacto = false,
  rotulo = "Excluir",
}: {
  acao: (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  id: string;
  confirmacao: string;
  compacto?: boolean;
  rotulo?: string;
}) {
  const [estado, executar, pendente] = useActionState(acao, {});
  return (
    <div className={`flex flex-col gap-2 ${compacto ? "items-end" : "items-end"}`}>
      <form
        action={executar}
        onSubmit={(e) => {
          if (!window.confirm(confirmacao)) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        {compacto ? (
          <button
            type="submit"
            disabled={pendente}
            title={rotulo}
            aria-label={rotulo}
            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          >
            {pendente ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          </button>
        ) : (
          <button
            type="submit"
            disabled={pendente}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-60"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {pendente ? "Excluindo…" : rotulo}
          </button>
        )}
      </form>
      {estado.mensagem && (
        <p role="alert" className="max-w-sm rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-800">
          {estado.mensagem}
        </p>
      )}
    </div>
  );
}
