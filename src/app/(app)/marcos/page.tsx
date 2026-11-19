import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoPagina, Cartao } from "@/components/ui/basicos";
import { FiltroPeriodo } from "@/components/dashboard/filtro-periodo";
import { Paginacao } from "@/components/ui/lista";
import { TabelaSimples } from "@/components/ui/tabela-simples";
import { exigirPermissaoPagina } from "@/lib/auth/guardas";
import { pode } from "@/lib/auth/permissoes";
import { lerPagina } from "@/lib/consultas/cadastros";
import { listarUsosMaterial } from "@/lib/consultas/operacao";
import { formatarData, formatarMoeda, formatarMoedaCentavos } from "@/lib/formatacao";
import { paraIso, resolverPeriodo } from "@/lib/periodo";

export const metadata: Metadata = { title: "Marcos e materiais" };

export default async function PaginaMarcos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const usuario = await exigirPermissaoPagina("materiais");
  const sp = await searchParams;
  const periodo = resolverPeriodo(sp);
  const pagina = lerPagina(sp.pagina);
  const r = await listarUsosMaterial(periodo, pagina);
  const base: Record<string, string> = { periodo: periodo.preset };
  if (periodo.preset === "personalizado" && periodo.inicio) Object.assign(base, { de: paraIso(periodo.inicio), ate: paraIso(periodo.fim) });
  const href = (p: number) => `/marcos?${new URLSearchParams({ ...base, pagina: String(p) })}`;
  const q = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });

  return (
    <>
      <CabecalhoPagina
        titulo="Marcos e materiais"
        descricao={`Materiais utilizados em campo · ${periodo.rotulo}. Para lançar, abra o serviço (aba Marcos).`}
        acoes={<FiltroPeriodo preset={periodo.preset} de={periodo.inicio ? paraIso(periodo.inicio) : ""} ate={paraIso(periodo.fim)} />}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Cartao className="p-5">
          <p className="text-sm text-slate-500">Custo no período</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-marinho-900">{formatarMoedaCentavos(r.somaCentavos)}</p>
          <h2 className="mb-2 mt-5 text-sm font-semibold text-marinho-900">Consumo por tipo</h2>
          {r.porTipo.length === 0 ? (
            <p className="text-sm text-slate-500">Sem uso no período.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {r.porTipo.map((t) => (
                <li key={t.nome} className="flex justify-between py-2 text-sm">
                  <span className="text-slate-700">{t.nome}</span>
                  <span className="text-right tabular-nums">
                    {q(t.quantidade)} {t.unidade}
                    <span className="block text-xs text-slate-500">{formatarMoedaCentavos(t.centavos)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {pode(usuario.perfil, "configuracoes", "escrever") && (
            <Link href="/configuracoes#materiais" className="mt-4 inline-block text-xs text-marinho-600 hover:underline">
              Cadastrar tipos de marcos e materiais
            </Link>
          )}
        </Cartao>
        <Cartao className="overflow-hidden lg:col-span-2">
          <TabelaSimples
            vazio="Nenhum material lançado no período."
            colunas={["Data", "Serviço", "Material", "Quantidade", "Total"]}
            linhas={r.itens.map((u) => ({
              id: u.id,
              celulas: [
                formatarData(u.data),
                <Link key="s" href={`/servicos/${u.servico.id}?aba=materiais`} className="text-marinho-700 hover:underline">
                  {u.servico.codigo}<span className="block text-xs text-slate-500">{u.servico.cliente.nome}</span>
                </Link>,
                u.tipoMaterial.nome,
                <span key="q" className="tabular-nums">{q(Number(u.quantidade))} {u.tipoMaterial.unidade} × {formatarMoeda(Number(u.custoUnitario))}</span>,
                formatarMoeda(Number(u.valorTotal)),
              ],
            }))}
          />
          <div className="border-t border-slate-100"><Paginacao pagina={pagina} paginas={r.paginas} total={r.total} montarHref={href} /></div>
        </Cartao>
      </div>
    </>
  );
}
