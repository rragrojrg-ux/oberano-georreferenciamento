import type { Metadata } from "next";
import Link from "next/link";
import type { StatusServico } from "@prisma/client";
import { CabecalhoPagina, Cartao, SeloStatus } from "@/components/ui/basicos";
import { TabelaSimples } from "@/components/ui/tabela-simples";
import { exigirPermissaoPagina } from "@/lib/auth/guardas";
import { financeiroPorServico } from "@/lib/consultas/operacao";
import { STATUS_SERVICO_ROTULO } from "@/lib/dominio";
import { formatarMoedaCentavos, formatarPercentual } from "@/lib/formatacao";

export const metadata: Metadata = { title: "Financeiro" };

export default async function PaginaFinanceiro({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; pendentes?: string }>;
}) {
  await exigirPermissaoPagina("financeiro");
  const sp = await searchParams;
  const status = sp.status && sp.status in STATUS_SERVICO_ROTULO ? (sp.status as StatusServico) : undefined;
  const somentePendentes = sp.pendentes === "1";
  const { linhas: todas, totais } = await financeiroPorServico(status);
  const linhas = somentePendentes ? todas.filter((l) => l.financeiro.saldoAReceberCentavos > 0) : todas;
  const margem = totais.contratado ? Math.round((totais.resultado / totais.contratado) * 1000) / 10 : null;

  return (
    <>
      <CabecalhoPagina titulo="Financeiro" descricao="Situação financeira por serviço (valores acumulados desde a contratação)." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-5">
        {[
          { r: "Contratado", v: totais.contratado },
          { r: "Recebido", v: totais.recebido, c: "text-emerald-700" },
          { r: "Saldo a receber", v: totais.saldo, c: "text-dourado-700" },
          { r: "Despesas", v: totais.despesas, c: "text-red-700" },
          { r: `Resultado estimado (${formatarPercentual(margem)})`, v: totais.resultado },
        ].map((k) => (
          <Cartao key={k.r} className="p-4">
            <p className="text-xs text-slate-500">{k.r}</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${k.c ?? "text-marinho-900"}`}>{formatarMoedaCentavos(k.v)}</p>
          </Cartao>
        ))}
      </div>

      <Cartao className="mt-4 overflow-hidden">
        <form className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
          <label htmlFor="status" className="text-sm text-slate-600">Situação</label>
          <select id="status" name="status" defaultValue={status ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">
            <option value="">Todas (exceto canceladas)</option>
            {Object.entries(STATUS_SERVICO_ROTULO).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="pendentes" value="1" defaultChecked={somentePendentes} className="size-4 accent-marinho-700" />
            Só com saldo a receber
          </label>
          <button type="submit" className="rounded-lg bg-marinho-900 px-3 py-1.5 text-sm font-medium text-white">Filtrar</button>
        </form>
        <TabelaSimples
          vazio="Nenhum serviço."
          colunas={["Serviço", "Situação", "Contratado", "Recebido", "A receber", "Despesas", "Resultado", "Margem"]}
          linhas={linhas.map((l) => {
            const f = l.financeiro;
            return {
              id: l.id,
              celulas: [
                <Link key="s" href={`/servicos/${l.id}?aba=pagamentos`} className="whitespace-normal text-marinho-700 hover:underline">
                  {l.codigo}
                  <span className="block text-xs text-slate-500">{l.descricaoPersonalizada || l.tipoServico.nome} · {l.cliente.nome}</span>
                </Link>,
                <SeloStatus key="st" status={l.status} />,
                <span key="c" className="tabular-nums">{formatarMoedaCentavos(f.contratadoCentavos)}</span>,
                <span key="r" className="tabular-nums text-emerald-700">{formatarMoedaCentavos(f.recebidoCentavos)}</span>,
                <span key="p" className="tabular-nums text-dourado-700">{formatarMoedaCentavos(f.saldoAReceberCentavos)}</span>,
                <span key="d" className="tabular-nums text-red-700">{formatarMoedaCentavos(f.despesasCentavos)}</span>,
                <span key="re" className={`tabular-nums ${f.resultadoEstimadoCentavos < 0 ? "text-red-700" : ""}`}>{formatarMoedaCentavos(f.resultadoEstimadoCentavos)}</span>,
                formatarPercentual(f.margemEstimadaPercentual),
              ],
            };
          })}
        />
      </Cartao>

      <details className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <summary className="cursor-pointer font-medium text-marinho-900">Resultado estimado × fluxo de caixa × lucro contábil</summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li><strong>Saldo a receber</strong> = valor contratado − pagamentos recebidos.</li>
          <li><strong>Resultado estimado</strong> = valor contratado − despesas registradas. Considera o contrato inteiro, mesmo o que ainda não foi recebido.</li>
          <li><strong>Margem estimada</strong> = resultado estimado ÷ valor contratado × 100.</li>
          <li><strong>Fluxo de caixa</strong> = dinheiro que entrou (pagamentos) − dinheiro que saiu (despesas), visível no painel por período.</li>
          <li><strong>Lucro contábil</strong> não é apurado aqui: depende de impostos, pró-labore, depreciação de equipamentos e regime tributário.</li>
        </ul>
      </details>
    </>
  );
}
