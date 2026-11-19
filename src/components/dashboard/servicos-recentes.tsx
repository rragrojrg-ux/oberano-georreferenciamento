import Link from "next/link";
import { BarraProgresso, SeloStatus } from "@/components/ui/basicos";
import { formatarData, formatarMoeda } from "@/lib/formatacao";
import type { ServicoRecente } from "@/lib/dashboard";

export function ServicosRecentes({ servicos }: { servicos: ServicoRecente[] }) {
  if (!servicos.length) {
    return <p className="px-5 py-10 text-center text-sm text-slate-500">Nenhum serviço cadastrado ainda.</p>;
  }

  return (
    <>
      {/* Tabela (tablet/desktop) */}
      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Serviço</th>
              <th className="px-3 py-3 font-medium">Cliente / propriedade</th>
              <th className="px-3 py-3 font-medium">Contratação</th>
              <th className="px-3 py-3 font-medium">Situação</th>
              <th className="w-40 px-3 py-3 font-medium">Progresso</th>
              <th className="px-5 py-3 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {servicos.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/70">
                <td className="px-5 py-3">
                  <Link href={`/servicos/${s.id}`} className="font-medium text-marinho-900 hover:underline">{s.tipo}</Link>
                  <p className="text-xs text-slate-500">{s.codigo}</p>
                </td>
                <td className="px-3 py-3">
                  <p className="text-slate-800">{s.cliente}</p>
                  <p className="text-xs text-slate-500">{s.propriedades.join(", ") || "—"}</p>
                </td>
                <td className="px-3 py-3 tabular-nums text-slate-600">{formatarData(s.dataContratacao)}</td>
                <td className="px-3 py-3"><SeloStatus status={s.status} /></td>
                <td className="px-3 py-3"><BarraProgresso valor={s.progresso} rotulo={`Progresso de ${s.codigo}`} /></td>
                <td className="px-5 py-3 text-right font-medium tabular-nums text-slate-800">{formatarMoeda(s.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cartões (celular) */}
      <ul className="divide-y divide-slate-100 xl:hidden">
        {servicos.map((s) => (
          <li key={s.id} className="space-y-2 px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/servicos/${s.id}`} className="block truncate font-medium text-marinho-900 hover:underline">{s.tipo}</Link>
                <p className="truncate text-xs text-slate-500">{s.cliente} · {s.codigo}</p>
              </div>
              <SeloStatus status={s.status} />
            </div>
            <BarraProgresso valor={s.progresso} rotulo={`Progresso de ${s.codigo}`} />
            <div className="flex justify-between text-xs text-slate-500">
              <span>{formatarData(s.dataContratacao)}</span>
              <span className="font-medium tabular-nums text-slate-800">{formatarMoeda(s.valor)}</span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
