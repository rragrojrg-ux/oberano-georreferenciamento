"use client";

import { useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
  type TooltipProps,
} from "recharts";
import { formatarMoeda, formatarMoedaCompacta, rotuloMes } from "@/lib/formatacao";
import type { PontoMensal } from "@/lib/dashboard";

// Ordem fixa das séries — a cor acompanha a série, nunca a posição.
// Paleta validada (faixa de luminosidade, croma e separação para daltonismo). O dourado tem
// contraste < 3:1 sobre branco; por isso o gráfico sempre oferece legenda, dica e visão em tabela.
const SERIES = [
  { chave: "contratado", rotulo: "Contratado", cor: "#2f5aa8" },
  { chave: "recebido", rotulo: "Recebido", cor: "#c9a227" },
  { chave: "despesas", rotulo: "Despesas", cor: "#b4533a" },
] as const;

function Dica({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-marinho-900">{rotuloMes(String(label))}</p>
      {payload.map((p) => (
        <p key={p.dataKey as string} className="flex items-center gap-2 text-slate-700">
          <span className="inline-block size-2.5 rounded-sm" style={{ background: p.color }} aria-hidden="true" />
          <span className="flex-1">{p.name}</span>
          <span className="font-medium tabular-nums">{formatarMoeda(Number(p.value))}</span>
        </p>
      ))}
    </div>
  );
}

export function GraficoMensal({ dados }: { dados: PontoMensal[] }) {
  const [verTabela, setVerTabela] = useState(false);
  const vazio = dados.every((d) => !d.contratado && !d.recebido && !d.despesas);

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setVerTabela((v) => !v)}
          className="text-xs font-medium text-marinho-600 underline-offset-2 hover:underline"
        >
          {verTabela ? "Ver gráfico" : "Ver como tabela"}
        </button>
      </div>

      {vazio ? (
        <p className="grid h-72 place-items-center text-sm text-slate-500">Sem lançamentos no período.</p>
      ) : verTabela ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white text-left text-xs text-slate-500">
              <tr>
                <th className="py-2 font-medium">Mês</th>
                {SERIES.map((s) => (
                  <th key={s.chave} className="py-2 text-right font-medium">{s.rotulo}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {dados.map((d) => (
                <tr key={d.mes}>
                  <td className="py-1.5">{rotuloMes(d.mes)}</td>
                  {SERIES.map((s) => (
                    <td key={s.chave} className="py-1.5 text-right">{formatarMoeda(d[s.chave])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barGap={2} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="mes"
                tickFormatter={rotuloMes}
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
                tick={{ fontSize: 12, fill: "#64748b" }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v: number) => formatarMoedaCompacta(v)}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#64748b" }}
                width={72}
              />
              <Tooltip content={<Dica />} cursor={{ fill: "rgba(11,31,63,0.05)" }} />
              <Legend
                iconType="square"
                iconSize={10}
                wrapperStyle={{ fontSize: 12, color: "#334155", paddingTop: 8 }}
              />
              {SERIES.map((s) => (
                <Bar key={s.chave} dataKey={s.chave} name={s.rotulo} fill={s.cor} radius={[4, 4, 0, 0]} maxBarSize={22} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
