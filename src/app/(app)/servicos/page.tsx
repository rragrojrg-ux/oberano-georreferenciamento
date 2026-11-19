import type { Metadata } from "next";
import Link from "next/link";
import type { StatusServico } from "@prisma/client";
import { ChevronRight, Plus } from "lucide-react";
import { BarraProgresso, CabecalhoPagina, Cartao, SeloStatus } from "@/components/ui/basicos";
import { classeBotaoPrimario } from "@/components/ui/formulario";
import { AvisoSucesso, Paginacao, Vazio } from "@/components/ui/lista";
import { exigirPermissaoPagina } from "@/lib/auth/guardas";
import { pode } from "@/lib/auth/permissoes";
import { lerBusca, lerPagina } from "@/lib/consultas/cadastros";
import { listarServicos } from "@/lib/consultas/operacao";
import { STATUS_SERVICO_ROTULO } from "@/lib/dominio";
import { formatarData, formatarMoedaCentavos } from "@/lib/formatacao";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Serviços" };

export default async function PaginaServicos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const usuario = await exigirPermissaoPagina("servicos");
  const sp = await searchParams;
  const busca = lerBusca(sp.q);
  const pagina = lerPagina(sp.pagina);
  const status = typeof sp.status === "string" && sp.status in STATUS_SERVICO_ROTULO ? (sp.status as StatusServico) : undefined;
  const tipoId = typeof sp.tipo === "string" && sp.tipo ? sp.tipo : undefined;

  const [{ itens, total, paginas }, tipos] = await Promise.all([
    listarServicos({ busca, status, tipoId, pagina }),
    prisma.tipoServico.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);
  const podeEditar = pode(usuario.perfil, "servicos", "escrever");
  const params = (p: number) =>
    `/servicos?${new URLSearchParams({ ...(busca ? { q: busca } : {}), ...(status ? { status } : {}), ...(tipoId ? { tipo: tipoId } : {}), pagina: String(p) })}`;

  return (
    <>
      <CabecalhoPagina
        titulo="Serviços e etapas"
        descricao="Contratos, andamento das etapas e situação financeira."
        acoes={
          podeEditar && (
            <Link href="/servicos/novo" className={classeBotaoPrimario}>
              <Plus className="size-4" aria-hidden="true" /> Novo serviço
            </Link>
          )
        }
      />
      <AvisoSucesso codigo={sp.ok} />

      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]" role="search">
        <label className="sr-only" htmlFor="q">Pesquisar</label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={busca}
          placeholder="Código, cliente, propriedade ou responsável"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-marinho-600 focus:outline-none"
        />
        <label className="sr-only" htmlFor="status">Situação</label>
        <select id="status" name="status" defaultValue={status ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm">
          <option value="">Todas as situações</option>
          {Object.entries(STATUS_SERVICO_ROTULO).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
        </select>
        <label className="sr-only" htmlFor="tipo">Tipo</label>
        <select id="tipo" name="tipo" defaultValue={tipoId ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm">
          <option value="">Todos os tipos</option>
          {tipos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <button type="submit" className="rounded-lg bg-marinho-900 px-4 py-2 text-sm font-medium text-white hover:bg-marinho-800">Filtrar</button>
      </form>

      <Cartao className="overflow-hidden">
        {itens.length === 0 ? (
          <Vazio>Nenhum serviço encontrado.</Vazio>
        ) : (
          <ul className="divide-y divide-slate-100">
            {itens.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/servicos/${s.id}`}
                  className="grid gap-x-4 gap-y-2 px-5 py-4 hover:bg-slate-50 lg:grid-cols-[minmax(0,1.6fr)_auto_9rem_minmax(0,1fr)_1rem] lg:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-marinho-900">{s.descricaoPersonalizada || s.tipoServico.nome}</p>
                    <p className="truncate text-xs text-slate-500">
                      {s.codigo} · {s.cliente.nome} · {s.propriedades.map((p) => p.propriedade.nome).join(", ")}
                    </p>
                    <p className="text-xs text-slate-500">
                      Contratado em {formatarData(s.dataContratacao)}
                      {s.prazoPrevisto ? ` · prazo ${formatarData(s.prazoPrevisto)}` : ""}
                    </p>
                  </div>
                  <div><SeloStatus status={s.status} /></div>
                  <BarraProgresso valor={s.progresso} rotulo={`Progresso de ${s.codigo}`} />
                  <div className="grid grid-cols-2 gap-x-3 text-xs lg:text-right">
                    <span className="text-slate-500">Contratado</span>
                    <span className="text-right font-medium tabular-nums text-slate-800">{formatarMoedaCentavos(s.financeiro.contratadoCentavos)}</span>
                    <span className="text-slate-500">A receber</span>
                    <span className="text-right tabular-nums text-dourado-700">{formatarMoedaCentavos(s.financeiro.saldoAReceberCentavos)}</span>
                  </div>
                  <ChevronRight className="hidden size-4 text-slate-400 lg:block" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-slate-100">
          <Paginacao pagina={pagina} paginas={paginas} total={total} montarHref={params} />
        </div>
      </Cartao>
    </>
  );
}
