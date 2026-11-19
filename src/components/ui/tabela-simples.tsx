import { Vazio } from "./lista";

/** Tabela responsiva genérica para listagens somente leitura. A última coluna é alinhada à direita. */
export function TabelaSimples({
  colunas,
  linhas,
  vazio,
  rodape,
}: {
  colunas: string[];
  linhas: { id: string; celulas: React.ReactNode[] }[];
  vazio: string;
  rodape?: React.ReactNode;
}) {
  if (linhas.length === 0) return <Vazio>{vazio}</Vazio>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {colunas.map((c, i) => (
              <th key={c} className={`px-4 py-2.5 font-medium ${i === colunas.length - 1 ? "text-right" : ""}`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {linhas.map((l) => (
            <tr key={l.id} className="hover:bg-slate-50/70">
              {l.celulas.map((c, i) => (
                <td
                  key={i}
                  className={`px-4 py-2.5 ${i === 0 ? "whitespace-nowrap tabular-nums text-slate-600" : ""} ${
                    i === l.celulas.length - 1 ? "whitespace-nowrap text-right font-medium tabular-nums" : ""
                  }`}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {rodape && (
          <tfoot className="border-t border-slate-200 bg-slate-50">
            <tr>
              <td colSpan={colunas.length} className="px-4 py-2.5 text-right text-sm font-semibold text-marinho-900">{rodape}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
