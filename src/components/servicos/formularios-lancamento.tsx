"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Plus } from "lucide-react";
import type { EstadoFormulario } from "@/lib/acoes/tipos";
import { adicionarEtapa, atualizarEtapa } from "@/lib/acoes/servicos";
import { adicionarDeslocamento, adicionarDespesa, adicionarUsoMaterial, registrarPagamento } from "@/lib/acoes/lancamentos";
import { calcularTotalCentavos, paraCentavos } from "@/lib/financeiro";
import { formatarMoedaCentavos } from "@/lib/formatacao";
import { lerNumero } from "@/lib/validacao/documentos";
import { AvisoErro, Campo, CampoSelecao, CampoTextoLongo } from "@/components/ui/formulario";
import { BotaoEnviar } from "@/components/ui/botoes";

type Acao = (e: EstadoFormulario, f: FormData) => Promise<EstadoFormulario>;

const hojeIso = () => new Date().toLocaleDateString("sv-SE");

function Retorno({ estado }: { estado: EstadoFormulario }) {
  if (estado.sucesso) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" /> {estado.sucesso}
      </p>
    );
  }
  return <AvisoErro mensagem={estado.mensagem} />;
}

/** Painel recolhível com formulário de lançamento. Limpa os campos após sucesso. */
function PainelLancamento({
  titulo,
  acao,
  servicoId,
  children,
}: {
  titulo: string;
  acao: Acao;
  servicoId: string;
  children: (erros: Record<string, string[] | undefined>, valores: Record<string, string>) => React.ReactNode;
}) {
  const [estado, executar] = useActionState<EstadoFormulario, FormData>(acao, {});
  const [aberto, setAberto] = useState(false);
  return (
    <div className="rounded-xl border border-dashed border-marinho-200 bg-marinho-50/40">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-marinho-800"
      >
        <Plus className={`size-4 transition ${aberto ? "rotate-45" : ""}`} aria-hidden="true" /> {titulo}
      </button>
      {aberto && (
        <form key={estado.ok ?? "novo"} action={executar} className="space-y-3 border-t border-marinho-100 px-4 py-4" noValidate>
          <input type="hidden" name="servicoId" value={servicoId} />
          <div className="grid gap-3 sm:grid-cols-6">{children(estado.erros ?? {}, estado.valores ?? {})}</div>
          <Retorno estado={estado} />
          <div className="flex justify-end">
            <BotaoEnviar>Lançar</BotaoEnviar>
          </div>
        </form>
      )}
      {!aberto && estado.sucesso && <div className="px-4 pb-3"><Retorno estado={estado} /></div>}
    </div>
  );
}

export function FormDespesa({ servicoId, categorias }: { servicoId: string; categorias: { id: string; nome: string }[] }) {
  return (
    <PainelLancamento titulo="Lançar despesa" acao={adicionarDespesa} servicoId={servicoId}>
      {(e, v) => <CamposDespesa e={e} v={v} categorias={categorias} />}
    </PainelLancamento>
  );
}

function CamposDespesa({ e, v, categorias }: { e: Record<string, string[] | undefined>; v: Record<string, string>; categorias: { id: string; nome: string }[] }) {
  const [qtd, setQtd] = useState(v.quantidade ?? "");
  const [unit, setUnit] = useState(v.valorUnitario ?? "");
  const q = lerNumero(qtd);
  const u = lerNumero(unit);
  const calculado = q && u && !Number.isNaN(q) && !Number.isNaN(u) ? calcularTotalCentavos(q, paraCentavos(u)) : null;
  return (
    <>
      <Campo nome="data" rotulo="Data" type="date" obrigatorio className="sm:col-span-2" defaultValue={v.data ?? hojeIso()} erro={e.data} />
      <CampoSelecao nome="categoriaId" rotulo="Categoria" obrigatorio className="sm:col-span-4" defaultValue={v.categoriaId} vazio="Selecione…" opcoes={categorias.map((c) => ({ valor: c.id, rotulo: c.nome }))} erro={e.categoriaId} ajuda="Quilometragem e marcos têm abas próprias." />
      <Campo nome="descricao" rotulo="Descrição" obrigatorio className="sm:col-span-6" defaultValue={v.descricao} erro={e.descricao} />
      <Campo nome="quantidade" rotulo="Quantidade" inputMode="decimal" className="sm:col-span-2" value={qtd} onChange={(ev) => setQtd(ev.target.value)} erro={e.quantidade} />
      <Campo nome="valorUnitario" rotulo="Valor unitário (R$)" inputMode="decimal" className="sm:col-span-2" value={unit} onChange={(ev) => setUnit(ev.target.value)} erro={e.valorUnitario} />
      {calculado !== null ? (
        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-slate-700">Valor total</p>
          <p className="mt-1 rounded-lg bg-dourado-50 px-3 py-2 text-sm font-semibold tabular-nums text-marinho-900">{formatarMoedaCentavos(calculado)}</p>
        </div>
      ) : (
        <Campo nome="valorTotal" rotulo="Valor total (R$)" inputMode="decimal" className="sm:col-span-2" defaultValue={v.valorTotal} erro={e.valorTotal} ajuda="Ou preencha qtd. × unitário." />
      )}
      <CampoTextoLongo nome="observacoes" rotulo="Observações" rows={2} className="sm:col-span-6" defaultValue={v.observacoes} erro={e.observacoes} />
    </>
  );
}

export function FormDeslocamento({ servicoId, custoKm, destinoPadrao }: { servicoId: string; custoKm: number; destinoPadrao: string }) {
  return (
    <PainelLancamento titulo="Lançar deslocamento" acao={adicionarDeslocamento} servicoId={servicoId}>
      {(e, v) => <CamposDeslocamento e={e} v={v} custoKm={custoKm} destinoPadrao={destinoPadrao} />}
    </PainelLancamento>
  );
}

function CamposDeslocamento({ e, v, custoKm, destinoPadrao }: { e: Record<string, string[] | undefined>; v: Record<string, string>; custoKm: number; destinoPadrao: string }) {
  const [km, setKm] = useState(v.km ?? "");
  const n = lerNumero(km);
  const total = n && !Number.isNaN(n) ? calcularTotalCentavos(n, paraCentavos(custoKm)) : null;
  return (
    <>
      <Campo nome="data" rotulo="Data" type="date" obrigatorio className="sm:col-span-2" defaultValue={v.data ?? hojeIso()} erro={e.data} />
      <Campo nome="origem" rotulo="Origem" obrigatorio className="sm:col-span-2" defaultValue={v.origem ?? "Escritório"} erro={e.origem} />
      <Campo nome="destino" rotulo="Destino" obrigatorio className="sm:col-span-2" defaultValue={v.destino ?? destinoPadrao} erro={e.destino} />
      <Campo nome="km" rotulo="Km percorridos (ida e volta)" obrigatorio inputMode="decimal" className="sm:col-span-3" value={km} onChange={(ev) => setKm(ev.target.value)} erro={e.km} />
      <div className="sm:col-span-3">
        <p className="text-sm font-medium text-slate-700">Valor calculado</p>
        <p className="mt-1 rounded-lg bg-dourado-50 px-3 py-2 text-sm font-semibold tabular-nums text-marinho-900">
          {total !== null ? formatarMoedaCentavos(total) : "—"}
        </p>
        <p className="mt-1 text-xs text-slate-500">Custo vigente: {formatarMoedaCentavos(paraCentavos(custoKm))}/km (Configurações)</p>
      </div>
      <CampoTextoLongo nome="observacoes" rotulo="Observações" rows={2} className="sm:col-span-6" defaultValue={v.observacoes} erro={e.observacoes} />
    </>
  );
}

export function FormMaterial({
  servicoId,
  materiais,
}: {
  servicoId: string;
  materiais: { id: string; nome: string; unidade: string; custoUnitarioPadrao: number | null }[];
}) {
  return (
    <PainelLancamento titulo="Lançar marcos / materiais" acao={adicionarUsoMaterial} servicoId={servicoId}>
      {(e, v) => <CamposMaterial e={e} v={v} materiais={materiais} />}
    </PainelLancamento>
  );
}

function CamposMaterial({
  e, v, materiais,
}: {
  e: Record<string, string[] | undefined>;
  v: Record<string, string>;
  materiais: { id: string; nome: string; unidade: string; custoUnitarioPadrao: number | null }[];
}) {
  const [tipo, setTipo] = useState(v.tipoMaterialId ?? "");
  const [qtd, setQtd] = useState(v.quantidade ?? "");
  const [custo, setCusto] = useState(v.custoUnitario ?? "");
  const q = lerNumero(qtd);
  const c = lerNumero(custo);
  const total = q && c !== null && !Number.isNaN(q) && !Number.isNaN(c) ? calcularTotalCentavos(q, paraCentavos(c)) : null;
  return (
    <>
      <CampoSelecao
        nome="tipoMaterialId"
        rotulo="Material"
        obrigatorio
        className="sm:col-span-4"
        value={tipo}
        onChange={(ev) => {
          setTipo(ev.target.value);
          const m = materiais.find((x) => x.id === ev.target.value);
          if (m?.custoUnitarioPadrao != null) setCusto(m.custoUnitarioPadrao.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
        }}
        vazio="Selecione…"
        opcoes={materiais.map((m) => ({ valor: m.id, rotulo: `${m.nome} (${m.unidade})` }))}
        erro={e.tipoMaterialId}
      />
      <Campo nome="data" rotulo="Data de utilização" type="date" obrigatorio className="sm:col-span-2" defaultValue={v.data ?? hojeIso()} erro={e.data} />
      <Campo nome="quantidade" rotulo="Quantidade" obrigatorio inputMode="decimal" className="sm:col-span-2" value={qtd} onChange={(ev) => setQtd(ev.target.value)} erro={e.quantidade} />
      <Campo nome="custoUnitario" rotulo="Custo unitário (R$)" obrigatorio inputMode="decimal" className="sm:col-span-2" value={custo} onChange={(ev) => setCusto(ev.target.value)} erro={e.custoUnitario} />
      <div className="sm:col-span-2">
        <p className="text-sm font-medium text-slate-700">Valor total</p>
        <p className="mt-1 rounded-lg bg-dourado-50 px-3 py-2 text-sm font-semibold tabular-nums text-marinho-900">{total !== null ? formatarMoedaCentavos(total) : "—"}</p>
      </div>
      <CampoTextoLongo nome="observacoes" rotulo="Observações" rows={2} className="sm:col-span-6" defaultValue={v.observacoes} erro={e.observacoes} />
    </>
  );
}

export function FormPagamento({ servicoId, chave, saldoCentavos }: { servicoId: string; chave: string; saldoCentavos: number }) {
  return (
    <PainelLancamento titulo="Registrar pagamento recebido" acao={registrarPagamento} servicoId={servicoId}>
      {(e, v) => (
        <>
          {/* Chave única por formulário: um duplo envio não grava o pagamento duas vezes. */}
          <input type="hidden" name="chaveIdempotencia" value={v.chaveIdempotencia ?? chave} />
          <Campo nome="data" rotulo="Data do recebimento" type="date" obrigatorio className="sm:col-span-2" defaultValue={v.data ?? hojeIso()} erro={e.data} />
          <Campo
            nome="valor"
            rotulo="Valor (R$)"
            obrigatorio
            inputMode="decimal"
            className="sm:col-span-2"
            defaultValue={v.valor}
            erro={e.valor ?? e.chaveIdempotencia}
            ajuda={`Saldo a receber: ${formatarMoedaCentavos(saldoCentavos)}`}
          />
          <CampoSelecao
            nome="forma"
            rotulo="Forma"
            obrigatorio
            className="sm:col-span-2"
            defaultValue={v.forma ?? "PIX"}
            opcoes={[
              { valor: "PIX", rotulo: "PIX" }, { valor: "TRANSFERENCIA", rotulo: "Transferência" }, { valor: "BOLETO", rotulo: "Boleto" },
              { valor: "DINHEIRO", rotulo: "Dinheiro" }, { valor: "CHEQUE", rotulo: "Cheque" }, { valor: "CARTAO", rotulo: "Cartão" },
              { valor: "OUTRO", rotulo: "Outro" },
            ]}
            erro={e.forma}
          />
          <Campo nome="descricao" rotulo="Descrição" placeholder="Ex.: Entrada, 2ª parcela" className="sm:col-span-6" defaultValue={v.descricao} erro={e.descricao} />
        </>
      )}
    </PainelLancamento>
  );
}

// ───────────── Etapas ─────────────

const ROTULO_ETAPA = { PENDENTE: "Pendente", EM_ANDAMENTO: "Em andamento", CONCLUIDA: "Concluída" } as const;

export function FormEtapa({
  etapa,
}: {
  etapa: { id: string; status: keyof typeof ROTULO_ETAPA; dataInicio: string; dataConclusao: string; observacoes: string };
}) {
  const [estado, executar] = useActionState<EstadoFormulario, FormData>(atualizarEtapa, {});
  const v = { ...etapa, ...estado.valores };
  const e = estado.erros ?? {};
  const p = `etapa-${etapa.id}-`;
  return (
    <form action={executar} className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-6" noValidate>
      <input type="hidden" name="etapaId" value={etapa.id} />
      <div className="sm:col-span-2">
        <label htmlFor={`${p}status`} className="block text-xs font-medium text-slate-600">Situação</label>
        <select id={`${p}status`} name="status" defaultValue={v.status} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
          {Object.entries(ROTULO_ETAPA).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${p}inicio`} className="block text-xs font-medium text-slate-600">Início</label>
        <input id={`${p}inicio`} type="date" name="dataInicio" defaultValue={v.dataInicio} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${p}fim`} className="block text-xs font-medium text-slate-600">Conclusão</label>
        <input id={`${p}fim`} type="date" name="dataConclusao" defaultValue={v.dataConclusao} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" />
        {e.dataConclusao && <p className="mt-1 text-xs text-red-600">{e.dataConclusao[0]}</p>}
      </div>
      <div className="sm:col-span-6">
        <label htmlFor={`${p}obs`} className="block text-xs font-medium text-slate-600">Observações</label>
        <textarea id={`${p}obs`} name="observacoes" rows={2} defaultValue={v.observacoes} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-6">
        <span className="text-xs text-slate-500">Datas em branco são preenchidas com hoje ao iniciar/concluir.</span>
        <BotaoEnviar>Salvar etapa</BotaoEnviar>
      </div>
      {(estado.sucesso || estado.mensagem) && <div className="sm:col-span-6"><Retorno estado={estado} /></div>}
    </form>
  );
}

export function FormNovaEtapa({ servicoId }: { servicoId: string }) {
  const [estado, executar] = useActionState<EstadoFormulario, FormData>(adicionarEtapa, {});
  return (
    <form key={estado.ok ?? "nova"} action={executar} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <input type="hidden" name="servicoId" value={servicoId} />
      <Campo nome="nome" rotulo="Adicionar etapa extra a este serviço" className="flex-1" placeholder="Ex.: Notificação de confrontantes" erro={estado.erros?.nome} />
      <BotaoEnviar>Adicionar</BotaoEnviar>
    </form>
  );
}
