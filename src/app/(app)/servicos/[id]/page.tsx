import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { ArrowLeft, CheckCircle2, Circle, CircleDot, FolderOpen, Pencil } from "lucide-react";
import { BarraProgresso, Cartao, SeloStatus } from "@/components/ui/basicos";
import { BotaoExcluir } from "@/components/ui/botoes";
import { classeBotaoSecundario } from "@/components/ui/formulario";
import { AvisoSucesso, Dado, Vazio } from "@/components/ui/lista";
import {
  FormDeslocamento, FormDespesa, FormEtapa, FormMaterial, FormNovaEtapa, FormPagamento,
} from "@/components/servicos/formularios-lancamento";
import { excluirServico, removerEtapa } from "@/lib/acoes/servicos";
import { removerDeslocamento, removerDespesa, removerPagamento, removerUsoMaterial } from "@/lib/acoes/lancamentos";
import { exigirPermissaoPagina } from "@/lib/auth/guardas";
import { pode } from "@/lib/auth/permissoes";
import { obterServico, opcoesLancamentos } from "@/lib/consultas/operacao";
import { formatarData, formatarMoeda, formatarMoedaCentavos, formatarPercentual } from "@/lib/formatacao";
import { paraIso } from "@/lib/periodo";

export const metadata: Metadata = { title: "Serviço" };

const ABAS = [
  { id: "etapas", rotulo: "Etapas" },
  { id: "despesas", rotulo: "Despesas" },
  { id: "deslocamentos", rotulo: "Quilometragem" },
  { id: "materiais", rotulo: "Marcos" },
  { id: "pagamentos", rotulo: "Pagamentos" },
] as const;
type Aba = (typeof ABAS)[number]["id"];

const FORMA: Record<string, string> = {
  PIX: "PIX", TRANSFERENCIA: "Transferência", BOLETO: "Boleto", DINHEIRO: "Dinheiro", CHEQUE: "Cheque", CARTAO: "Cartão", OUTRO: "Outro",
};
const num = (n: number | { toString(): string }, casas = 2) => Number(n.toString()).toLocaleString("pt-BR", { maximumFractionDigits: casas });

export default async function PaginaServico({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; aba?: string }>;
}) {
  const usuario = await exigirPermissaoPagina("servicos");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const s = await obterServico(id);
  if (!s) notFound();
  const aba: Aba = ABAS.some((a) => a.id === sp.aba) ? (sp.aba as Aba) : "etapas";
  const p = usuario.perfil;
  const opcoes = await opcoesLancamentos();
  const f = s.financeiro;
  const titulo = s.descricaoPersonalizada || s.tipoServico.nome;
  const destino = s.propriedades[0]?.propriedade.municipio ?? "";

  const contagem: Record<Aba, number> = {
    etapas: s.etapas.length,
    despesas: s.despesas.length,
    deslocamentos: s.deslocamentos.length,
    materiais: s.usosMaterial.length,
    pagamentos: s.pagamentos.length,
  };

  return (
    <>
      <Link href="/servicos" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-marinho-900">
        <ArrowLeft className="size-4" aria-hidden="true" /> Serviços
      </Link>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-marinho-900">{titulo}</h1>
            <SeloStatus status={s.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {s.codigo} · <Link href={`/clientes/${s.cliente.id}`} className="text-marinho-700 hover:underline">{s.cliente.nome}</Link>
          </p>
        </div>
        {pode(p, "servicos", "escrever") && (
          <div className="flex flex-wrap items-start gap-2">
            {pode(p, "documentos", "ler") && (
              <Link href={`/documentos?servico=${s.id}`} className={classeBotaoSecundario}>
                <FolderOpen className="size-4" aria-hidden="true" /> Documentos
              </Link>
            )}
            <Link href={`/servicos/${s.id}/editar`} className={classeBotaoSecundario}>
              <Pencil className="size-4" aria-hidden="true" /> Editar
            </Link>
            <BotaoExcluir acao={excluirServico} id={s.id} confirmacao={`Excluir o serviço ${s.codigo}? Esta ação não pode ser desfeita.`} />
          </div>
        )}
      </div>
      <AvisoSucesso codigo={sp.ok} />

      {/* Financeiro do serviço */}
      <section aria-labelledby="fin" className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <h2 id="fin" className="sr-only">Financeiro do serviço</h2>
        {[
          { r: "Valor contratado", v: formatarMoedaCentavos(f.contratadoCentavos) },
          { r: "Total recebido", v: formatarMoedaCentavos(f.recebidoCentavos), c: "text-emerald-700" },
          { r: "Saldo a receber", v: formatarMoedaCentavos(f.saldoAReceberCentavos), c: "text-dourado-700" },
          { r: "Total de despesas", v: formatarMoedaCentavos(f.despesasCentavos), c: "text-red-700" },
          { r: "Resultado estimado", v: formatarMoedaCentavos(f.resultadoEstimadoCentavos), c: f.resultadoEstimadoCentavos < 0 ? "text-red-700" : "text-marinho-900" },
          { r: "Margem estimada", v: formatarPercentual(f.margemEstimadaPercentual) },
        ].map((k) => (
          <div key={k.r} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-xs text-slate-500">{k.r}</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${k.c ?? "text-marinho-900"}`}>{k.v}</p>
          </div>
        ))}
      </section>
      <p className="mt-2 text-xs text-slate-500">
        Fluxo de caixa do serviço (recebido − despesas): <strong className="tabular-nums">{formatarMoedaCentavos(f.fluxoDeCaixaCentavos)}</strong>.
        Resultado e margem são estimativas gerenciais — não equivalem a lucro contábil.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Cartao className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-marinho-900">Progresso</h2>
            <span className="text-xs text-slate-500">
              {s.etapas.filter((e) => e.status === "CONCLUIDA").length} de {s.etapas.length} etapas concluídas
            </span>
          </div>
          <BarraProgresso valor={s.progresso} rotulo="Progresso do serviço" />
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <Dado rotulo="Contratação">{formatarData(s.dataContratacao)}</Dado>
            <Dado rotulo="Prazo previsto">{s.prazoPrevisto ? formatarData(s.prazoPrevisto) : null}</Dado>
            <Dado rotulo="Responsável técnico">{s.responsavelTecnico}</Dado>
            {s.observacoes && <div className="sm:col-span-3"><Dado rotulo="Observações"><span className="whitespace-pre-line">{s.observacoes}</span></Dado></div>}
          </dl>
        </Cartao>
        <Cartao className="p-5">
          <h2 className="mb-3 font-semibold text-marinho-900">Propriedades ({s.propriedades.length})</h2>
          <ul className="space-y-2">
            {s.propriedades.map(({ propriedade: pr }) => (
              <li key={pr.id}>
                <Link href={`/propriedades/${pr.id}`} className="block rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">
                  <p className="text-sm font-medium text-marinho-900">{pr.nome}</p>
                  <p className="text-xs text-slate-500">{pr.municipio}/{pr.uf} · {num(pr.areaHectares, 4)} ha · {num(pr.areaAlqueires)} alq.</p>
                </Link>
              </li>
            ))}
          </ul>
        </Cartao>
      </div>

      {/* Abas */}
      <nav aria-label="Seções do serviço" className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {ABAS.map((a) => (
          <Link
            key={a.id}
            href={`/servicos/${s.id}?aba=${a.id}`}
            scroll={false}
            aria-current={aba === a.id ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium ${
              aba === a.id ? "border-dourado-500 text-marinho-900" : "border-transparent text-slate-500 hover:text-marinho-800"
            }`}
          >
            {a.rotulo} <span className="ml-1 rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{contagem[a.id]}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-4 space-y-4">
        {aba === "etapas" && (
          <>
            <Cartao className="divide-y divide-slate-100">
              {s.etapas.length === 0 && <Vazio>Nenhuma etapa.</Vazio>}
              {s.etapas.map((e) => {
                const Icone = e.status === "CONCLUIDA" ? CheckCircle2 : e.status === "EM_ANDAMENTO" ? CircleDot : Circle;
                const cor = e.status === "CONCLUIDA" ? "text-emerald-600" : e.status === "EM_ANDAMENTO" ? "text-dourado-600" : "text-slate-300";
                const rotulo = e.status === "CONCLUIDA" ? "Concluída" : e.status === "EM_ANDAMENTO" ? "Em andamento" : "Pendente";
                return (
                  <details key={e.id} className="group px-5 py-3">
                    <summary className="flex cursor-pointer list-none items-center gap-3">
                      <Icone className={`size-5 shrink-0 ${cor}`} aria-hidden="true" />
                      <span className="w-6 text-xs tabular-nums text-slate-400">{e.ordem}.</span>
                      <span className="flex-1 text-sm font-medium text-slate-800">{e.nome}</span>
                      <span className="hidden text-xs text-slate-500 sm:inline">
                        {e.dataInicio ? formatarData(e.dataInicio) : ""}
                        {e.dataConclusao ? ` → ${formatarData(e.dataConclusao)}` : ""}
                      </span>
                      <span className="text-xs text-slate-500">{rotulo}</span>
                    </summary>
                    {e.observacoes && <p className="ml-14 mt-1 whitespace-pre-line text-xs text-slate-600">{e.observacoes}</p>}
                    {pode(p, "servicos", "escrever") && (
                      <div className="ml-0 sm:ml-14">
                        <FormEtapa
                          etapa={{
                            id: e.id,
                            status: e.status,
                            dataInicio: e.dataInicio ? paraIso(e.dataInicio) : "",
                            dataConclusao: e.dataConclusao ? paraIso(e.dataConclusao) : "",
                            observacoes: e.observacoes ?? "",
                          }}
                        />
                        {e.status === "PENDENTE" && (
                          <div className="mt-2 flex justify-end">
                            <BotaoExcluir acao={removerEtapa} id={e.id} compacto rotulo="Remover etapa" confirmacao={`Remover a etapa "${e.nome}" deste serviço?`} />
                          </div>
                        )}
                      </div>
                    )}
                  </details>
                );
              })}
            </Cartao>
            {pode(p, "servicos", "escrever") && <Cartao className="p-4"><FormNovaEtapa servicoId={s.id} /></Cartao>}
          </>
        )}

        {aba === "despesas" && (
          <>
            {pode(p, "despesas", "escrever") && <FormDespesa servicoId={s.id} categorias={opcoes.categorias} />}
            <TabelaLancamentos
              vazio="Nenhuma despesa lançada."
              total={formatarMoedaCentavos(f.despesasCentavos)}
              colunas={["Data", "Categoria", "Descrição", "Qtd × unit.", "Total"]}
              linhas={s.despesas.map((d) => ({
                id: d.id,
                celulas: [
                  formatarData(d.data),
                  d.categoria.nome,
                  <span key="d">{d.descricao}{(d.deslocamentoId || d.usoMaterialId) && <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] text-slate-500">automático</span>}</span>,
                  d.quantidade && d.valorUnitario ? `${num(d.quantidade, 3)} × ${formatarMoeda(Number(d.valorUnitario))}` : "—",
                  formatarMoeda(Number(d.valorTotal)),
                ],
                excluir:
                  pode(p, "despesas", "escrever") && !d.deslocamentoId && !d.usoMaterialId ? (
                    <BotaoExcluir acao={removerDespesa} id={d.id} compacto rotulo="Excluir despesa" confirmacao={`Excluir a despesa "${d.descricao}"?`} />
                  ) : null,
              }))}
            />
            <p className="text-xs text-slate-500">
              Despesas marcadas como “automático” vêm de Quilometragem e Marcos — são contadas uma única vez e só podem ser excluídas na aba de origem.
            </p>
          </>
        )}

        {aba === "deslocamentos" && (
          <>
            {pode(p, "quilometragem", "escrever") && <FormDeslocamento servicoId={s.id} custoKm={opcoes.custoKm} destinoPadrao={destino} />}
            <TabelaLancamentos
              vazio="Nenhum deslocamento lançado."
              total={`${num(s.deslocamentos.reduce((t, d) => t + Number(d.km), 0), 1)} km · ${formatarMoeda(s.deslocamentos.reduce((t, d) => t + Number(d.valorTotal), 0))}`}
              colunas={["Data", "Origem → destino", "Km", "R$/km", "Total"]}
              linhas={s.deslocamentos.map((d) => ({
                id: d.id,
                celulas: [formatarData(d.data), `${d.origem} → ${d.destino}`, num(d.km, 1), formatarMoeda(Number(d.custoPorKm)), formatarMoeda(Number(d.valorTotal))],
                excluir: pode(p, "quilometragem", "escrever") ? (
                  <BotaoExcluir acao={removerDeslocamento} id={d.id} compacto rotulo="Excluir deslocamento" confirmacao="Excluir este deslocamento? A despesa vinculada também será removida." />
                ) : null,
              }))}
            />
          </>
        )}

        {aba === "materiais" && (
          <>
            {pode(p, "materiais", "escrever") && <FormMaterial servicoId={s.id} materiais={opcoes.materiais} />}
            <TabelaLancamentos
              vazio="Nenhum marco ou material lançado."
              total={formatarMoeda(s.usosMaterial.reduce((t, u) => t + Number(u.valorTotal), 0))}
              colunas={["Data", "Material", "Quantidade", "Custo unit.", "Total"]}
              linhas={s.usosMaterial.map((u) => ({
                id: u.id,
                celulas: [formatarData(u.data), u.tipoMaterial.nome, `${num(u.quantidade, 3)} ${u.tipoMaterial.unidade}`, formatarMoeda(Number(u.custoUnitario)), formatarMoeda(Number(u.valorTotal))],
                excluir: pode(p, "materiais", "escrever") ? (
                  <BotaoExcluir acao={removerUsoMaterial} id={u.id} compacto rotulo="Excluir lançamento" confirmacao="Excluir este lançamento? A despesa vinculada também será removida." />
                ) : null,
              }))}
            />
          </>
        )}

        {aba === "pagamentos" && (
          <>
            {pode(p, "financeiro", "escrever") && f.saldoAReceberCentavos > 0 && (
              <FormPagamento servicoId={s.id} chave={randomUUID()} saldoCentavos={f.saldoAReceberCentavos} />
            )}
            {f.saldoAReceberCentavos === 0 && f.contratadoCentavos > 0 && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Serviço totalmente recebido.</p>
            )}
            <TabelaLancamentos
              vazio="Nenhum pagamento registrado."
              total={formatarMoedaCentavos(f.recebidoCentavos)}
              colunas={["Data", "Descrição", "Forma", "", "Valor"]}
              linhas={s.pagamentos.map((pg) => ({
                id: pg.id,
                celulas: [formatarData(pg.data), pg.descricao ?? "—", FORMA[pg.forma] ?? pg.forma, "", formatarMoeda(Number(pg.valor))],
                excluir: pode(p, "financeiro", "escrever") ? (
                  <BotaoExcluir acao={removerPagamento} id={pg.id} compacto rotulo="Excluir pagamento" confirmacao={`Excluir o pagamento de ${formatarMoeda(Number(pg.valor))}?`} />
                ) : null,
              }))}
            />
          </>
        )}
      </div>
    </>
  );
}

function TabelaLancamentos({
  colunas,
  linhas,
  total,
  vazio,
}: {
  colunas: string[];
  linhas: { id: string; celulas: React.ReactNode[]; excluir: React.ReactNode }[];
  total: string;
  vazio: string;
}) {
  return (
    <Cartao className="overflow-hidden">
      {linhas.length === 0 ? (
        <Vazio>{vazio}</Vazio>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {colunas.map((c, i) => (
                  <th key={i} className={`px-4 py-2.5 font-medium ${i === colunas.length - 1 ? "text-right" : ""}`}>{c}</th>
                ))}
                <th className="w-10"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map((l) => (
                <tr key={l.id}>
                  {l.celulas.map((c, i) => (
                    <td key={i} className={`px-4 py-2.5 ${i === 0 ? "whitespace-nowrap tabular-nums text-slate-600" : ""} ${i === l.celulas.length - 1 ? "text-right font-medium tabular-nums" : ""}`}>{c}</td>
                  ))}
                  <td className="px-2 py-1 text-right">{l.excluir}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50">
              <tr>
                <td colSpan={colunas.length} className="px-4 py-2.5 text-right text-sm font-semibold text-marinho-900">Total: <span className="tabular-nums">{total}</span></td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Cartao>
  );
}
