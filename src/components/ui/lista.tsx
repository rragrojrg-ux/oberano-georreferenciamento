import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight, Search } from "lucide-react";

/** Busca via GET: funciona sem JavaScript e mantém o filtro na URL. */
export function CampoBusca({
  valor,
  placeholder,
  ocultos = {},
}: {
  valor: string;
  placeholder: string;
  ocultos?: Record<string, string | undefined>;
}) {
  return (
    <form role="search" className="flex w-full gap-2 sm:max-w-md">
      {Object.entries(ocultos).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label htmlFor="q" className="sr-only">Pesquisar</label>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={valor}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-marinho-600 focus:outline-none focus:ring-2 focus:ring-marinho-600/20"
        />
      </div>
      <button type="submit" className="rounded-lg bg-marinho-900 px-4 py-2 text-sm font-medium text-white hover:bg-marinho-800">
        Buscar
      </button>
    </form>
  );
}

export function Paginacao({
  pagina,
  paginas,
  total,
  montarHref,
}: {
  pagina: number;
  paginas: number;
  total: number;
  montarHref: (p: number) => string;
}) {
  if (paginas <= 1) return <p className="px-5 py-3 text-xs text-slate-500">{total} registro(s)</p>;
  const link = "inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm";
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-2 px-5 py-3 text-sm">
      <span className="text-xs text-slate-500">{total} registro(s) · página {pagina} de {paginas}</span>
      <div className="flex gap-2">
        {pagina > 1 ? (
          <Link href={montarHref(pagina - 1)} className={`${link} hover:bg-slate-50`}><ChevronLeft className="size-4" />Anterior</Link>
        ) : (
          <span className={`${link} opacity-40`} aria-disabled="true"><ChevronLeft className="size-4" />Anterior</span>
        )}
        {pagina < paginas ? (
          <Link href={montarHref(pagina + 1)} className={`${link} hover:bg-slate-50`}>Próxima<ChevronRight className="size-4" /></Link>
        ) : (
          <span className={`${link} opacity-40`} aria-disabled="true">Próxima<ChevronRight className="size-4" /></span>
        )}
      </div>
    </nav>
  );
}

const MENSAGENS: Record<string, string> = {
  salvo: "Registro salvo com sucesso.",
  excluido: "Registro excluído.",
  "propriedade-excluida": "Propriedade excluída.",
};

export function AvisoSucesso({ codigo }: { codigo?: string | string[] }) {
  const msg = typeof codigo === "string" ? MENSAGENS[codigo] : undefined;
  if (!msg) return null;
  return (
    <p role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
      {msg}
    </p>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-12 text-center text-sm text-slate-500">{children}</p>;
}

/** Linha "rótulo: valor" para telas de detalhe. */
export function Dado({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{rotulo}</dt>
      <dd className="mt-0.5 break-words text-sm text-slate-900">{children || <span className="text-slate-400">—</span>}</dd>
    </div>
  );
}
