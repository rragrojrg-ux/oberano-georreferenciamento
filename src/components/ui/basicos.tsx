import type { LucideIcon } from "lucide-react";
import { STATUS_SERVICO_ROTULO, type StatusServicoChave } from "@/lib/dominio";

export function CabecalhoPagina({
  titulo,
  descricao,
  acoes,
}: {
  titulo: string;
  descricao?: string;
  acoes?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-marinho-900">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-slate-500">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

export function Cartao({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

type Tom = "marinho" | "dourado" | "verde" | "vermelho" | "neutro";

const TONS: Record<Tom, string> = {
  marinho: "bg-marinho-50 text-marinho-700",
  dourado: "bg-dourado-50 text-dourado-700",
  verde: "bg-emerald-50 text-emerald-700",
  vermelho: "bg-red-50 text-red-700",
  neutro: "bg-slate-100 text-slate-600",
};

export function CartaoIndicador({
  titulo,
  valor,
  detalhe,
  icone: Icone,
  tom = "marinho",
  destaque = false,
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  icone: LucideIcon;
  tom?: Tom;
  destaque?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-4 shadow-sm sm:p-5 ${
        destaque ? "border-marinho-900 bg-marinho-900 text-white" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={`text-sm font-medium ${destaque ? "text-marinho-100" : "text-slate-500"}`}>{titulo}</p>
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${destaque ? "bg-white/10 text-dourado-400" : TONS[tom]}`}>
          <Icone className="size-[18px]" aria-hidden="true" />
        </span>
      </div>
      <p className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight ${destaque ? "text-white" : "text-marinho-900"}`}>
        {valor}
      </p>
      {detalhe && <p className={`mt-1 text-xs ${destaque ? "text-marinho-200" : "text-slate-500"}`}>{detalhe}</p>}
      {destaque && <div className="absolute inset-x-0 bottom-0 h-1 bg-dourado-500" />}
    </div>
  );
}

const ESTILO_STATUS: Record<StatusServicoChave, string> = {
  AGUARDANDO_INICIO: "bg-slate-100 text-slate-700 ring-slate-300",
  EM_ANDAMENTO: "bg-marinho-50 text-marinho-700 ring-marinho-200",
  PAUSADO: "bg-amber-50 text-amber-800 ring-amber-200",
  CONCLUIDO: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELADO: "bg-red-50 text-red-700 ring-red-200",
};

export function SeloStatus({ status }: { status: StatusServicoChave }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${ESTILO_STATUS[status]}`}>
      {STATUS_SERVICO_ROTULO[status]}
    </span>
  );
}

export function BarraProgresso({ valor, rotulo }: { valor: number; rotulo?: string }) {
  const v = Math.max(0, Math.min(100, valor));
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2 min-w-20 flex-1 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={rotulo ?? "Progresso"}
      >
        <div
          className={`h-full rounded-full ${v === 100 ? "bg-emerald-600" : "bg-gradient-to-r from-marinho-700 to-dourado-500"}`}
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-slate-600">{v}%</span>
    </div>
  );
}
