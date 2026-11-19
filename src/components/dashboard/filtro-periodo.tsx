"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarRange } from "lucide-react";
import { PRESETS, type Preset } from "@/lib/periodo";

export function FiltroPeriodo({ preset, de, ate }: { preset: Preset; de: string; ate: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [selecionado, setSelecionado] = useState<Preset>(preset);
  const [inicio, setInicio] = useState(de);
  const [fim, setFim] = useState(ate);
  const [pendente, iniciar] = useTransition();

  function aplicar(novo: Preset, d = inicio, a = fim) {
    const params = new URLSearchParams({ periodo: novo });
    if (novo === "personalizado") {
      if (!d || !a) return;
      params.set("de", d);
      params.set("ate", a);
    }
    iniciar(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pendente}>
      <label className="sr-only" htmlFor="filtro-periodo">Período</label>
      <div className="relative">
        <CalendarRange className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <select
          id="filtro-periodo"
          value={selecionado}
          onChange={(e) => {
            const v = e.target.value as Preset;
            setSelecionado(v);
            if (v !== "personalizado") aplicar(v);
          }}
          className="rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-8 text-sm text-slate-700 shadow-sm focus:border-marinho-600 focus:outline-none"
        >
          {Object.entries(PRESETS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {selecionado === "personalizado" && (
        <>
          <label className="sr-only" htmlFor="filtro-de">Data inicial</label>
          <input
            id="filtro-de"
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm shadow-sm"
          />
          <span className="text-sm text-slate-500">a</span>
          <label className="sr-only" htmlFor="filtro-ate">Data final</label>
          <input
            id="filtro-ate"
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm shadow-sm"
          />
          <button
            type="button"
            onClick={() => aplicar("personalizado")}
            disabled={!inicio || !fim}
            className="rounded-lg bg-marinho-900 px-3 py-2 text-sm font-medium text-white hover:bg-marinho-800 disabled:opacity-50"
          >
            Aplicar
          </button>
        </>
      )}
      {pendente && <span className="text-xs text-slate-500">Atualizando…</span>}
    </div>
  );
}
