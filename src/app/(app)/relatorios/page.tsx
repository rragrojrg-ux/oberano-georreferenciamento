import type { Metadata } from "next";
import { FileSpreadsheet, FileText } from "lucide-react";
import { CabecalhoPagina, Cartao } from "@/components/ui/basicos";
import { classeBotaoSecundario } from "@/components/ui/formulario";
import { Vazio } from "@/components/ui/lista";
import { exigirPermissaoPagina } from "@/lib/auth/guardas";
import { prisma } from "@/lib/prisma";
import { gerarRelatorio, lerFiltros, TIPOS_RELATORIO } from "@/lib/relatorios/gerar";

export const metadata: Metadata = { title: "Relatórios" };

const LIMITE_TELA = 300;

export default async function PaginaRelatorios({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirPermissaoPagina("relatorios");
  const filtros = lerFiltros(await searchParams);
  const [r, clientes, propriedades, servicos] = await Promise.all([
    gerarRelatorio(filtros),
    prisma.cliente.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.propriedade.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true, cliente: { select: { nome: true } } } }),
    prisma.servico.findMany({ orderBy: { codigo: "desc" }, select: { id: true, codigo: true, cliente: { select: { nome: true } } } }),
  ]);

  const query = new URLSearchParams(
    Object.entries(filtros).filter(([, v]) => v) as [string, string][],
  ).toString();
  const sel = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm";
  const lbl = "block text-xs font-medium text-slate-600";

  return (
    <>
      <CabecalhoPagina titulo="Relatórios" descricao="Escolha o relatório e os filtros; exporte em PDF ou CSV (abre no Excel)." />

      <Cartao className="mb-6 p-5">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label htmlFor="tipo" className={lbl}>Relatório</label>
            <select id="tipo" name="tipo" defaultValue={filtros.tipo} className={sel}>
              {Object.entries(TIPOS_RELATORIO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="cliente" className={lbl}>Cliente</label>
            <select id="cliente" name="cliente" defaultValue={filtros.cliente ?? ""} className={sel}>
              <option value="">Todos</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="propriedade" className={lbl}>Propriedade</label>
            <select id="propriedade" name="propriedade" defaultValue={filtros.propriedade ?? ""} className={sel}>
              <option value="">Todas</option>
              {propriedades.map((p) => <option key={p.id} value={p.id}>{p.nome} — {p.cliente.nome}</option>)}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="servico" className={lbl}>Serviço</label>
            <select id="servico" name="servico" defaultValue={filtros.servico ?? ""} className={sel}>
              <option value="">Todos</option>
              {servicos.map((s) => <option key={s.id} value={s.id}>{s.codigo} — {s.cliente.nome}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="de" className={lbl}>De</label>
            <input id="de" name="de" type="date" defaultValue={filtros.de} className={sel} />
          </div>
          <div>
            <label htmlFor="ate" className={lbl}>Até</label>
            <input id="ate" name="ate" type="date" defaultValue={filtros.ate} className={sel} />
          </div>
          <div className="flex items-end lg:col-span-2">
            <button type="submit" className="w-full rounded-lg bg-marinho-900 px-4 py-2 text-sm font-medium text-white hover:bg-marinho-800">
              Gerar relatório
            </button>
          </div>
        </form>
      </Cartao>

      <Cartao className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-semibold text-marinho-900">{r.titulo}</h2>
            <p className="text-xs text-slate-500">{r.filtrosDescricao} · {r.linhas.length} linha(s)</p>
          </div>
          <div className="flex gap-2">
            <a href={`/api/relatorios?${query}&formato=pdf`} className={classeBotaoSecundario}>
              <FileText className="size-4 text-red-600" aria-hidden="true" /> PDF
            </a>
            <a href={`/api/relatorios?${query}&formato=csv`} className={classeBotaoSecundario}>
              <FileSpreadsheet className="size-4 text-emerald-600" aria-hidden="true" /> CSV
            </a>
          </div>
        </div>
        {r.linhas.length === 0 ? (
          <Vazio>Nenhum registro para os filtros escolhidos.</Vazio>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {r.colunas.map((c) => (
                    <th key={c.rotulo} className={`px-4 py-2.5 font-medium ${c.numerico ? "text-right" : "text-left"}`}>{c.rotulo}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {r.linhas.slice(0, LIMITE_TELA).map((l, i) => (
                  <tr key={i}>
                    {l.map((v, j) => (
                      <td key={j} className={`px-4 py-2 ${r.colunas[j]?.numerico ? "whitespace-nowrap text-right tabular-nums" : ""}`}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {r.total && (
                <tfoot className="border-t-2 border-dourado-300 bg-dourado-50 font-semibold text-marinho-900">
                  <tr>
                    {r.total.map((v, j) => (
                      <td key={j} className={`px-4 py-2.5 ${r.colunas[j]?.numerico ? "whitespace-nowrap text-right tabular-nums" : ""}`}>{v}</td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
        {r.linhas.length > LIMITE_TELA && (
          <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            Mostrando {LIMITE_TELA} de {r.linhas.length} linhas. Exporte para ver tudo.
          </p>
        )}
        {r.observacao && <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">{r.observacao}</p>}
      </Cartao>
    </>
  );
}
