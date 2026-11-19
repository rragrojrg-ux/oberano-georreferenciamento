import type { Metadata } from "next";
import {
  AlertCircle, Banknote, Briefcase, CheckCircle2, FileSignature, Map, Receipt, TrendingUp, Users,
} from "lucide-react";
import { CabecalhoPagina, Cartao, CartaoIndicador } from "@/components/ui/basicos";
import { FiltroPeriodo } from "@/components/dashboard/filtro-periodo";
import { GraficoMensal } from "@/components/dashboard/grafico-mensal";
import { DistribuicaoStatus } from "@/components/dashboard/distribuicao-status";
import { ServicosRecentes } from "@/components/dashboard/servicos-recentes";
import { exigirPermissaoPagina } from "@/lib/auth/guardas";
import { obterResumoDashboard } from "@/lib/dashboard";
import { formatarMoedaCentavos, formatarNumero, formatarPercentual } from "@/lib/formatacao";
import { paraIso, resolverPeriodo } from "@/lib/periodo";

export const metadata: Metadata = { title: "Painel" };

export default async function PaginaPainel({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const usuario = await exigirPermissaoPagina("dashboard");
  const periodo = resolverPeriodo(await searchParams);
  const r = await obterResumoDashboard(periodo);
  const primeiroNome = usuario.nome.split(" ")[0];

  return (
    <>
      <CabecalhoPagina
        titulo="Painel"
        descricao={`Olá, ${primeiroNome}. Indicadores de ${periodo.rotulo.toLowerCase()}.`}
        acoes={
          <FiltroPeriodo
            preset={periodo.preset}
            de={periodo.inicio ? paraIso(periodo.inicio) : ""}
            ate={paraIso(periodo.fim)}
          />
        }
      />

      <section aria-labelledby="titulo-operacional">
        <h2 id="titulo-operacional" className="sr-only">Indicadores operacionais</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <CartaoIndicador titulo="Clientes" valor={formatarNumero(r.totalClientes)} detalhe="Total cadastrado" icone={Users} />
          <CartaoIndicador titulo="Propriedades" valor={formatarNumero(r.totalPropriedades)} detalhe="Total cadastrado" icone={Map} />
          <CartaoIndicador titulo="Em andamento" valor={formatarNumero(r.servicosEmAndamento)} detalhe="Serviços contratados no período" icone={Briefcase} tom="dourado" />
          <CartaoIndicador titulo="Concluídos" valor={formatarNumero(r.servicosConcluidos)} detalhe="Serviços contratados no período" icone={CheckCircle2} tom="verde" />
        </div>
      </section>

      <section aria-labelledby="titulo-financeiro" className="mt-4">
        <h2 id="titulo-financeiro" className="sr-only">Indicadores financeiros</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-5">
          <CartaoIndicador titulo="Valor dos contratos" valor={formatarMoedaCentavos(r.contratadoCentavos)} detalhe="Contratados no período (sem cancelados)" icone={FileSignature} />
          <CartaoIndicador titulo="Pagamentos recebidos" valor={formatarMoedaCentavos(r.recebidoCentavos)} detalhe="Entradas com data no período" icone={Banknote} tom="verde" />
          <CartaoIndicador titulo="Pendente de recebimento" valor={formatarMoedaCentavos(r.pendenteCentavos)} detalhe="Saldo dos contratos do período" icone={AlertCircle} tom="dourado" />
          <CartaoIndicador titulo="Despesas acumuladas" valor={formatarMoedaCentavos(r.despesasCentavos)} detalhe="Lançamentos com data no período" icone={Receipt} tom="vermelho" />
          <CartaoIndicador
            titulo="Resultado estimado"
            valor={formatarMoedaCentavos(r.resultadoEstimadoCentavos)}
            detalhe={`Margem ${formatarPercentual(r.margemEstimada)} · Caixa ${formatarMoedaCentavos(r.fluxoCaixaCentavos)}`}
            icone={TrendingUp}
            destaque
          />
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Cartao className="p-5 lg:col-span-2">
          <h2 className="font-semibold text-marinho-900">Movimento mensal</h2>
          <p className="text-xs text-slate-500">Contratos fechados, pagamentos recebidos e despesas lançadas por mês</p>
          <div className="mt-2">
            <GraficoMensal dados={r.mensal} />
          </div>
        </Cartao>
        <Cartao className="p-5">
          <h2 className="font-semibold text-marinho-900">Serviços por situação</h2>
          <p className="mb-4 text-xs text-slate-500">Contratados no período</p>
          <DistribuicaoStatus porStatus={r.porStatus} />
        </Cartao>
      </div>

      <Cartao className="mt-6 overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-marinho-900">Serviços recentes</h2>
          <p className="text-xs text-slate-500">Últimos contratos registrados</p>
        </div>
        <ServicosRecentes servicos={r.recentes} />
      </Cartao>

      <details className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <summary className="cursor-pointer font-medium text-marinho-900">Como os valores são calculados</summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li><strong>Resultado estimado</strong> = valor contratado − despesas registradas dos serviços do período. É uma estimativa gerencial.</li>
          <li><strong>Margem estimada</strong> = resultado estimado ÷ valor contratado × 100.</li>
          <li><strong>Fluxo de caixa</strong> (“Caixa”) = pagamentos recebidos − despesas pagas, ambos com data no período.</li>
          <li><strong>Lucro contábil</strong> não é calculado pelo sistema: depende de impostos, pró-labore, depreciação e regime contábil — consulte a contabilidade.</li>
        </ul>
      </details>
    </>
  );
}
