import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { CabecalhoPagina, Cartao } from "@/components/ui/basicos";
import { classeBotaoPrimario } from "@/components/ui/formulario";
import { AvisoSucesso, CampoBusca, Paginacao, Vazio } from "@/components/ui/lista";
import { exigirPermissaoPagina } from "@/lib/auth/guardas";
import { pode } from "@/lib/auth/permissoes";
import { lerBusca, lerPagina, listarPropriedades } from "@/lib/consultas/cadastros";
import { hectaresParaAlqueires } from "@/lib/financeiro";

export const metadata: Metadata = { title: "Propriedades" };

const fmt = (n: number, casas = 2) => n.toLocaleString("pt-BR", { maximumFractionDigits: casas });

function Selo({ ok, rotulo }: { ok: boolean; rotulo: string }) {
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium ${ok ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400 line-through"}`}
      title={`${rotulo}: ${ok ? "informado" : "não informado"}`}
    >
      {rotulo}
    </span>
  );
}

export default async function PaginaPropriedades({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const usuario = await exigirPermissaoPagina("propriedades");
  const sp = await searchParams;
  const busca = lerBusca(sp.q);
  const pagina = lerPagina(sp.pagina);
  const { itens, total, paginas, areaTotalHa } = await listarPropriedades(busca, pagina);
  const podeEditar = pode(usuario.perfil, "propriedades", "escrever");
  const href = (p: number) => `/propriedades?${new URLSearchParams({ ...(busca ? { q: busca } : {}), pagina: String(p) })}`;

  return (
    <>
      <CabecalhoPagina
        titulo="Propriedades"
        descricao={`${total} imóvel(is) · ${fmt(areaTotalHa)} ha · ${fmt(hectaresParaAlqueires(areaTotalHa))} alqueires mineiros`}
        acoes={
          podeEditar && (
            <Link href="/propriedades/nova" className={classeBotaoPrimario}>
              <Plus className="size-4" aria-hidden="true" /> Nova propriedade
            </Link>
          )
        }
      />
      <AvisoSucesso codigo={sp.ok} />
      <div className="mb-4">
        <CampoBusca valor={busca} placeholder="Nome, município, cliente, matrícula, CAR ou INCRA" />
      </div>

      <Cartao className="overflow-hidden">
        {itens.length === 0 ? (
          <Vazio>{busca ? `Nenhuma propriedade encontrada para “${busca}”.` : "Nenhuma propriedade cadastrada."}</Vazio>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Propriedade</th>
                    <th className="px-3 py-3 font-medium">Cliente</th>
                    <th className="px-3 py-3 text-right font-medium">Hectares</th>
                    <th className="px-3 py-3 text-right font-medium">Alqueires</th>
                    <th className="px-3 py-3 font-medium">Documentos</th>
                    <th className="px-3 py-3 text-center font-medium">Serviços</th>
                    <th className="w-8 px-3 py-3"><span className="sr-only">Abrir</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itens.map((p) => (
                    <tr key={p.id} className="group hover:bg-slate-50/70">
                      <td className="px-5 py-3">
                        <Link href={`/propriedades/${p.id}`} className="font-medium text-marinho-900 hover:underline">{p.nome}</Link>
                        <p className="text-xs text-slate-500">{p.municipio}/{p.uf}</p>
                      </td>
                      <td className="px-3 py-3">
                        <Link href={`/clientes/${p.cliente.id}`} className="text-slate-700 hover:underline">{p.cliente.nome}</Link>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{fmt(Number(p.areaHectares), 4)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{fmt(Number(p.areaAlqueires))}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Selo ok={!!p.matricula} rotulo="Matr." />
                          <Selo ok={!!p.codigoIncra} rotulo="INCRA" />
                          <Selo ok={!!p.ccir} rotulo="CCIR" />
                          <Selo ok={!!p.car} rotulo="CAR" />
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums">{p._count.servicos}</td>
                      <td className="px-3 py-3">
                        <Link href={`/propriedades/${p.id}`} aria-label={`Abrir ${p.nome}`}>
                          <ChevronRight className="size-4 text-slate-400 group-hover:text-marinho-700" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 lg:hidden">
              {itens.map((p) => (
                <li key={p.id}>
                  <Link href={`/propriedades/${p.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-slate-50">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate font-medium text-marinho-900">{p.nome}</p>
                      <p className="truncate text-xs text-slate-500">{p.cliente.nome} · {p.municipio}/{p.uf}</p>
                      <p className="text-xs tabular-nums text-slate-700">{fmt(Number(p.areaHectares), 4)} ha · {fmt(Number(p.areaAlqueires))} alq.</p>
                      <div className="flex flex-wrap gap-1">
                        <Selo ok={!!p.matricula} rotulo="Matr." />
                        <Selo ok={!!p.codigoIncra} rotulo="INCRA" />
                        <Selo ok={!!p.ccir} rotulo="CCIR" />
                        <Selo ok={!!p.car} rotulo="CAR" />
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="border-t border-slate-100">
          <Paginacao pagina={pagina} paginas={paginas} total={total} montarHref={href} />
        </div>
      </Cartao>
    </>
  );
}
