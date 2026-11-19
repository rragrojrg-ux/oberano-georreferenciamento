import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoPagina, Cartao } from "@/components/ui/basicos";
import { FiltroPeriodo } from "@/components/dashboard/filtro-periodo";
import { Paginacao } from "@/components/ui/lista";
import { TabelaSimples } from "@/components/ui/tabela-simples";
import { exigirPermissaoPagina } from "@/lib/auth/guardas";
import { lerPagina } from "@/lib/consultas/cadastros";
import { listarDespesas } from "@/lib/consultas/operacao";
import { formatarData, formatarMoeda, formatarMoedaCentavos } from "@/lib/formatacao";
import { paraIso, resolverPeriodo } from "@/lib/periodo";

export const metadata: Metadata = { title: "Despesas" };

export default async function PaginaDespesas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirPermissaoPagina("despesas");
  const sp = await searchParams;
  const periodo = resolverPeriodo(sp);
  const pagina = lerPagina(sp.pagina);
  const categoriaId = typeof sp.categoria === "string" && sp.categoria ? sp.categoria : undefined;
  const r = await listarDespesas(periodo, categoriaId, pagina);

  const base: Record<string, string> = { periodo: periodo.preset };
  if (periodo.preset === "personalizado" && periodo.inicio) Object.assign(base, { de: paraIso(periodo.inicio), ate: paraIso(periodo.fim) });
  const href = (p: number) => `/despesas?${new URLSearchParams({ ...base, ...(categoriaId ? { categoria: categoriaId } : {}), pagina: String(p) })}`;

  return (
    <>
      <CabecalhoPagina
        titulo="Despesas"
        descricao={`Todas as despesas dos serviços · ${periodo.rotulo}. Para lançar, abra o serviço.`}
        acoes={<FiltroPeriodo preset={periodo.preset} de={periodo.inicio ? paraIso(periodo.inicio) : ""} ate={paraIso(periodo.fim)} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Cartao className="p-5">
          <p className="text-sm text-slate-500">Total no período</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-marinho-900">{formatarMoedaCentavos(r.somaCentavos)}</p>
          <p className="text-xs text-slate-500">{r.total} lançamento(s){categoriaId ? " na categoria filtrada" : ""}</p>
          <h2 className="mb-2 mt-5 text-sm font-semibold text-marinho-900">Por categoria</h2>
          <ul className="space-y-2">
            {r.porCategoria.map((c) => {
              const pct = r.somaCentavos ? (c.centavos / r.somaCentavos) * 100 : 0;
              return (
                <li key={c.nome}>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700">{c.nome}</span>
                    <span className="tabular-nums text-slate-800">{formatarMoedaCentavos(c.centavos)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-marinho-600" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Cartao>

        <Cartao className="overflow-hidden lg:col-span-2">
          <form className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
            {Object.entries(base).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <label htmlFor="categoria" className="text-sm text-slate-600">Categoria</label>
            <select id="categoria" name="categoria" defaultValue={categoriaId ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">
              <option value="">Todas</option>
              {r.categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <button type="submit" className="rounded-lg bg-marinho-900 px-3 py-1.5 text-sm font-medium text-white">Filtrar</button>
          </form>
          <TabelaSimples
            vazio="Nenhuma despesa no período."
            colunas={["Data", "Serviço", "Categoria", "Descrição", "Valor"]}
            linhas={r.itens.map((d) => ({
              id: d.id,
              celulas: [
                formatarData(d.data),
                <Link key="s" href={`/servicos/${d.servico.id}?aba=despesas`} className="text-marinho-700 hover:underline">
                  {d.servico.codigo}
                  <span className="block text-xs text-slate-500">{d.servico.cliente.nome}</span>
                </Link>,
                d.categoria.nome,
                d.descricao,
                formatarMoeda(Number(d.valorTotal)),
              ],
            }))}
          />
          <div className="border-t border-slate-100"><Paginacao pagina={pagina} paginas={r.paginas} total={r.total} montarHref={href} /></div>
        </Cartao>
      </div>
    </>
  );
}
