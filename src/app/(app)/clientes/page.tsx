import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { CabecalhoPagina, Cartao } from "@/components/ui/basicos";
import { classeBotaoPrimario } from "@/components/ui/formulario";
import { AvisoSucesso, CampoBusca, Paginacao, Vazio } from "@/components/ui/lista";
import { exigirPermissaoPagina } from "@/lib/auth/guardas";
import { pode } from "@/lib/auth/permissoes";
import { lerBusca, lerPagina, listarClientes } from "@/lib/consultas/cadastros";
import { formatarDocumento, formatarTelefone, mascararDocumento } from "@/lib/validacao/documentos";

export const metadata: Metadata = { title: "Clientes" };

type Params = Promise<Record<string, string | string[] | undefined>>;

export default async function PaginaClientes({ searchParams }: { searchParams: Params }) {
  const usuario = await exigirPermissaoPagina("clientes");
  const sp = await searchParams;
  const busca = lerBusca(sp.q);
  const pagina = lerPagina(sp.pagina);
  const { itens, total, paginas } = await listarClientes(busca, pagina);
  const podeEditar = pode(usuario.perfil, "clientes", "escrever");
  const doc = podeEditar ? formatarDocumento : mascararDocumento;

  const href = (p: number) => `/clientes?${new URLSearchParams({ ...(busca ? { q: busca } : {}), pagina: String(p) })}`;

  return (
    <>
      <CabecalhoPagina
        titulo="Clientes"
        descricao="Pessoas físicas e jurídicas atendidas."
        acoes={
          podeEditar && (
            <Link href="/clientes/novo" className={classeBotaoPrimario}>
              <Plus className="size-4" aria-hidden="true" /> Novo cliente
            </Link>
          )
        }
      />
      <AvisoSucesso codigo={sp.ok} />

      <div className="mb-4">
        <CampoBusca valor={busca} placeholder="Nome, CPF/CNPJ ou município" />
      </div>

      <Cartao className="overflow-hidden">
        {itens.length === 0 ? (
          <Vazio>{busca ? `Nenhum cliente encontrado para “${busca}”.` : "Nenhum cliente cadastrado."}</Vazio>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Nome / razão social</th>
                    <th className="px-3 py-3 font-medium">CPF/CNPJ</th>
                    <th className="px-3 py-3 font-medium">Município</th>
                    <th className="px-3 py-3 font-medium">Telefone</th>
                    <th className="px-3 py-3 text-center font-medium">Propriedades</th>
                    <th className="px-3 py-3 text-center font-medium">Serviços</th>
                    <th className="w-8 px-3 py-3"><span className="sr-only">Abrir</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itens.map((c) => (
                    <tr key={c.id} className="group hover:bg-slate-50/70">
                      <td className="px-5 py-3">
                        <Link href={`/clientes/${c.id}`} className="font-medium text-marinho-900 hover:underline">{c.nome}</Link>
                        <p className="text-xs text-slate-500">{c.tipoPessoa === "FISICA" ? "Pessoa física" : "Pessoa jurídica"}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-700">{doc(c.documento)}</td>
                      <td className="px-3 py-3 text-slate-700">{c.municipio}/{c.uf}</td>
                      <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-700">{c.telefone ? formatarTelefone(c.telefone) : "—"}</td>
                      <td className="px-3 py-3 text-center tabular-nums">{c._count.propriedades}</td>
                      <td className="px-3 py-3 text-center tabular-nums">{c._count.servicos}</td>
                      <td className="px-3 py-3">
                        <Link href={`/clientes/${c.id}`} aria-label={`Abrir ${c.nome}`}>
                          <ChevronRight className="size-4 text-slate-400 group-hover:text-marinho-700" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 lg:hidden">
              {itens.map((c) => (
                <li key={c.id}>
                  <Link href={`/clientes/${c.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-marinho-900">{c.nome}</p>
                      <p className="truncate text-xs text-slate-500">{doc(c.documento)} · {c.municipio}/{c.uf}</p>
                      <p className="text-xs text-slate-500">{c._count.propriedades} propriedade(s) · {c._count.servicos} serviço(s)</p>
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
