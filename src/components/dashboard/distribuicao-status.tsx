import type { StatusServico } from "@prisma/client";
import { STATUS_SERVICO_ROTULO } from "@/lib/dominio";

// Barras horizontais simples: rótulo + valor sempre visíveis (identidade não depende só da cor).
const ORDEM: StatusServico[] = ["AGUARDANDO_INICIO", "EM_ANDAMENTO", "PAUSADO", "CONCLUIDO", "CANCELADO"];
const COR: Record<StatusServico, string> = {
  AGUARDANDO_INICIO: "bg-slate-400",
  EM_ANDAMENTO: "bg-marinho-700",
  PAUSADO: "bg-amber-500",
  CONCLUIDO: "bg-emerald-600",
  CANCELADO: "bg-red-500",
};

export function DistribuicaoStatus({ porStatus }: { porStatus: Record<StatusServico, number> }) {
  const total = ORDEM.reduce((t, s) => t + porStatus[s], 0);
  const max = Math.max(1, ...ORDEM.map((s) => porStatus[s]));

  if (!total) return <p className="py-8 text-center text-sm text-slate-500">Nenhum serviço no período.</p>;

  return (
    <ul className="space-y-3">
      {ORDEM.map((s) => (
        <li key={s}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-slate-700">{STATUS_SERVICO_ROTULO[s]}</span>
            <span className="font-medium tabular-nums text-marinho-900">{porStatus[s]}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${COR[s]}`} style={{ width: `${(porStatus[s] / max) * 100}%` }} />
          </div>
        </li>
      ))}
      <li className="border-t border-slate-100 pt-3 text-right text-xs text-slate-500">
        Total no período: <span className="font-semibold text-marinho-900">{total}</span>
      </li>
    </ul>
  );
}
