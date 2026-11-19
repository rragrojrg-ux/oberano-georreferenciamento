import type { Metadata } from "next";
import type { AcaoHistorico, Prisma } from "@prisma/client";
import { CabecalhoPagina, Cartao } from "@/components/ui/basicos";
import { Paginacao } from "@/components/ui/lista";
import { TabelaSimples } from "@/components/ui/tabela-simples";
import { exigirPermissaoPagina } from "@/lib/auth/guardas";
import { lerPagina } from "@/lib/consultas/cadastros";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Histórico" };

const ACOES: Record<AcaoHistorico, string> = {
  CRIAR: "Criação", ATUALIZAR: "Alteração", EXCLUIR: "Exclusão", LOGIN: "Login",
  LOGIN_FALHA: "Falha de login", LOGOUT: "Saída", DOWNLOAD: "Download/exportação",
};
const COR: Partial<Record<AcaoHistorico, string>> = {
  EXCLUIR: "bg-red-50 text-red-700", LOGIN_FALHA: "bg-amber-50 text-amber-800", CRIAR: "bg-emerald-50 text-emerald-700",
  DOWNLOAD: "bg-marinho-50 text-marinho-700",
};
const POR_PAGINA_HIST = 50;

function resumo(detalhes: Prisma.JsonValue): string {
  if (!detalhes || typeof detalhes !== "object" || Array.isArray(detalhes)) return "";
  return Object.entries(detalhes)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") || "—" : typeof v === "object" && v !== null ? JSON.stringify(v) : String(v)}`)
    .join(" · ")
    .slice(0, 240);
}

export default async function PaginaHistorico({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirPermissaoPagina("historico");
  const sp = await searchParams;
  const pagina = lerPagina(sp.pagina);
  const usuarioId = typeof sp.usuario === "string" && sp.usuario ? sp.usuario : undefined;
  const acao = typeof sp.acao === "string" && sp.acao in ACOES ? (sp.acao as AcaoHistorico) : undefined;
  const entidade = typeof sp.entidade === "string" && sp.entidade ? sp.entidade.slice(0, 40) : undefined;
  const de = typeof sp.de === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.de) ? sp.de : undefined;
  const ate = typeof sp.ate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.ate) ? sp.ate : undefined;

  const where: Prisma.HistoricoAlteracaoWhereInput = {
    ...(usuarioId ? { usuarioId } : {}),
    ...(acao ? { acao } : {}),
    ...(entidade ? { entidade } : {}),
    ...(de || ate
      ? { criadoEm: { ...(de ? { gte: new Date(`${de}T00:00:00-03:00`) } : {}), ...(ate ? { lte: new Date(`${ate}T23:59:59.999-03:00`) } : {}) } }
      : {}),
  };

  const [total, itens, usuarios, entidades] = await Promise.all([
    prisma.historicoAlteracao.count({ where }),
    prisma.historicoAlteracao.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      skip: (pagina - 1) * POR_PAGINA_HIST,
      take: POR_PAGINA_HIST,
      include: { usuario: { select: { nome: true } } },
    }),
    prisma.usuario.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.historicoAlteracao.findMany({ distinct: ["entidade"], select: { entidade: true }, orderBy: { entidade: "asc" } }),
  ]);
  const manter = Object.fromEntries(Object.entries({ usuario: usuarioId, acao, entidade, de, ate }).filter(([, v]) => v) as [string, string][]);
  const href = (p: number) => `/historico?${new URLSearchParams({ ...manter, pagina: String(p) })}`;
  const sel = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm";

  return (
    <>
      <CabecalhoPagina titulo="Histórico de alterações" descricao="Registro de acessos, alterações, exclusões e exportações. Somente leitura." />
      <form className="mb-4 grid gap-2 sm:grid-cols-3 2xl:grid-cols-6">
        <label className="sr-only" htmlFor="usuario">Usuário</label>
        <select id="usuario" name="usuario" defaultValue={usuarioId ?? ""} className={sel}>
          <option value="">Todos os usuários</option>
          {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>
        <label className="sr-only" htmlFor="acao">Ação</label>
        <select id="acao" name="acao" defaultValue={acao ?? ""} className={sel}>
          <option value="">Todas as ações</option>
          {Object.entries(ACOES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="sr-only" htmlFor="entidade">Registro</label>
        <select id="entidade" name="entidade" defaultValue={entidade ?? ""} className={sel}>
          <option value="">Todos os registros</option>
          {entidades.map((e) => <option key={e.entidade} value={e.entidade}>{e.entidade}</option>)}
        </select>
        <label className="sr-only" htmlFor="de">De</label>
        <input id="de" name="de" type="date" defaultValue={de} className={sel} />
        <label className="sr-only" htmlFor="ate">Até</label>
        <input id="ate" name="ate" type="date" defaultValue={ate} className={sel} />
        <button type="submit" className="rounded-lg bg-marinho-900 px-4 py-2 text-sm font-medium text-white">Filtrar</button>
      </form>

      <Cartao className="overflow-hidden">
        <TabelaSimples
          vazio="Nenhum registro."
          colunas={["Data/hora", "Usuário", "Ação", "Registro", "Detalhes", "IP"]}
          linhas={itens.map((h) => ({
            id: h.id,
            celulas: [
              h.criadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
              h.usuario?.nome ?? "—",
              <span key="a" className={`whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${COR[h.acao] ?? "bg-slate-100 text-slate-700"}`}>{ACOES[h.acao]}</span>,
              <span key="e" className="text-xs">{h.entidade}{h.entidadeId ? <span className="block text-slate-400">{h.entidadeId}</span> : null}</span>,
              <span key="d" className="text-xs text-slate-600">{resumo(h.detalhes)}</span>,
              <span key="ip" className="text-xs font-normal text-slate-500">{h.ip ?? "—"}</span>,
            ],
          }))}
        />
        <div className="border-t border-slate-100">
          <Paginacao pagina={pagina} paginas={Math.max(1, Math.ceil(total / POR_PAGINA_HIST))} total={total} montarHref={href} />
        </div>
      </Cartao>
    </>
  );
}
