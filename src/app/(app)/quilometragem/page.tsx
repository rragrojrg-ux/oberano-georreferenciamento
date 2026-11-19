import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoPagina, Cartao } from "@/components/ui/basicos";
import { FiltroPeriodo } from "@/components/dashboard/filtro-periodo";
import { Paginacao } from "@/components/ui/lista";
import { TabelaSimples } from "@/components/ui/tabela-simples";
import { exigirPermissaoPagina } from "@/lib/auth/guardas";
import { pode } from "@/lib/auth/permissoes";
import { lerPagina } from "@/lib/consultas/cadastros";
import { listarDeslocamentos, obterCustoPorKm } from "@/lib/consultas/operacao";
import { formatarData, formatarMoeda, formatarMoedaCentavos } from "@/lib/formatacao";
import { paraIso, resolverPeriodo } from "@/lib/periodo";

export const metadata: Metadata = { title: "Quilometragem" };

export default async function PaginaQuilometragem({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const usuario = await exigirPermissaoPagina("quilometragem");
  const sp = await searchParams;
  const periodo = resolverPeriodo(sp);
  const pagina = lerPagina(sp.pagina);
  const [r, custoKm] = await Promise.all([listarDeslocamentos(periodo, pagina), obterCustoPorKm()]);
  const base: Record<string, string> = { periodo: periodo.preset };
  if (periodo.preset === "personalizado" && periodo.inicio) Object.assign(base, { de: paraIso(periodo.inicio), ate: paraIso(periodo.fim) });
  const href = (p: number) => `/quilometragem?${new URLSearchParams({ ...base, pagina: String(p) })}`;
  const km = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

  return (
    <>
      <CabecalhoPagina
        titulo="Quilometragem"
        descricao={`Deslocamentos da equipe · ${periodo.rotulo}. Para lançar, abra o serviço (aba Quilometragem).`}
        acoes={<FiltroPeriodo preset={periodo.preset} de={periodo.inicio ? paraIso(periodo.inicio) : ""} ate={paraIso(periodo.fim)} />}
      />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Cartao className="p-4">
          <p className="text-sm text-slate-500">Km percorridos</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-marinho-900">{km(r.kmTotal)} km</p>
        </Cartao>
        <Cartao className="p-4">
          <p className="text-sm text-slate-500">Custo no período</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-marinho-900">{formatarMoedaCentavos(r.somaCentavos)}</p>
        </Cartao>
        <Cartao className="p-4">
          <p className="text-sm text-slate-500">Custo por km vigente</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-marinho-900">{formatarMoeda(custoKm)}</p>
          {pode(usuario.perfil, "configuracoes", "escrever") && (
            <Link href="/configuracoes" className="text-xs text-marinho-600 hover:underline">Alterar em Configurações</Link>
          )}
        </Cartao>
      </div>
      <Cartao className="overflow-hidden">
        <TabelaSimples
          vazio="Nenhum deslocamento no período."
          colunas={["Data", "Serviço", "Origem → destino", "Km", "R$/km", "Total"]}
          linhas={r.itens.map((d) => ({
            id: d.id,
            celulas: [
              formatarData(d.data),
              <Link key="s" href={`/servicos/${d.servico.id}?aba=deslocamentos`} className="text-marinho-700 hover:underline">
                {d.servico.codigo}<span className="block text-xs text-slate-500">{d.servico.cliente.nome}</span>
              </Link>,
              `${d.origem} → ${d.destino}`,
              <span key="k" className="tabular-nums">{km(Number(d.km))}</span>,
              <span key="c" className="tabular-nums">{formatarMoeda(Number(d.custoPorKm))}</span>,
              formatarMoeda(Number(d.valorTotal)),
            ],
          }))}
        />
        <div className="border-t border-slate-100"><Paginacao pagina={pagina} paginas={r.paginas} total={r.total} montarHref={href} /></div>
      </Cartao>
      <p className="mt-3 text-xs text-slate-500">
        Cada deslocamento gera uma única despesa na categoria “Quilometragem” do serviço — não lance a mesma viagem também como despesa avulsa.
      </p>
    </>
  );
}
