"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { EstadoFormulario } from "@/lib/acoes/tipos";
import {
  alternarCategoriaDespesa, alternarTipoMaterial, criarCategoriaDespesa, salvarCustoKm, salvarTipoMaterial, salvarTipoServico,
} from "@/lib/acoes/configuracoes";
import { AvisoErro, Campo } from "@/components/ui/formulario";
import { BotaoEnviar } from "@/components/ui/botoes";

function Retorno({ estado }: { estado: EstadoFormulario }) {
  if (estado.sucesso) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-emerald-700">
        <CheckCircle2 className="size-4" aria-hidden="true" /> {estado.sucesso}
      </p>
    );
  }
  return <AvisoErro mensagem={estado.mensagem} />;
}

export function FormCustoKm({ atual }: { atual: string }) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(salvarCustoKm, {});
  return (
    <form action={acao} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Campo
        nome="custoPorKm"
        rotulo="Custo por quilômetro (R$)"
        inputMode="decimal"
        className="sm:w-60"
        defaultValue={estado.valores?.custoPorKm ?? atual}
        erro={estado.erros?.custoPorKm}
      />
      <BotaoEnviar>Salvar</BotaoEnviar>
      <div className="sm:flex-1"><Retorno estado={estado} /></div>
    </form>
  );
}

export function FormTipoServico({ tipo }: { tipo?: { id: string; nome: string; ativo: boolean; etapas: string[]; emUso: number } }) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(salvarTipoServico, {});
  const v = estado.valores;
  const pref = tipo ? `ts-${tipo.id}-` : "ts-novo-";
  return (
    <form key={!tipo ? (estado.ok ?? "novo") : tipo.id} action={acao} className="space-y-3">
      {tipo && <input type="hidden" name="id" value={tipo.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label htmlFor={`${pref}nome`} className="block text-sm font-medium text-slate-700">Nome do tipo</label>
          <input id={`${pref}nome`} name="nome" defaultValue={v?.nome ?? tipo?.nome ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          {estado.erros?.nome && <p className="mt-1 text-xs text-red-600">{estado.erros.nome[0]}</p>}
        </div>
        {tipo && (
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
            <input type="checkbox" name="ativo" defaultChecked={tipo.ativo} className="size-4 accent-marinho-700" /> Ativo
          </label>
        )}
      </div>
      <div>
        <label htmlFor={`${pref}etapas`} className="block text-sm font-medium text-slate-700">Etapas padrão (uma por linha, na ordem)</label>
        <textarea
          id={`${pref}etapas`}
          name="etapas"
          rows={Math.min(12, Math.max(4, (tipo?.etapas.length ?? 4) + 1))}
          defaultValue={v?.etapas ?? tipo?.etapas.join("\n") ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs leading-5"
        />
        {estado.erros?.etapas && <p className="mt-1 text-xs text-red-600">{estado.erros.etapas[0]}</p>}
        <p className="mt-1 text-xs text-slate-500">
          Alterações valem para serviços criados daqui em diante{tipo?.emUso ? ` (${tipo.emUso} serviço(s) existentes mantêm suas etapas)` : ""}.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Retorno estado={estado} />
        <BotaoEnviar>{tipo ? "Salvar tipo" : "Criar tipo"}</BotaoEnviar>
      </div>
    </form>
  );
}

export function FormNovaCategoria() {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(criarCategoriaDespesa, {});
  return (
    <form key={estado.ok ?? "nova"} action={acao} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <Campo nome="nome" rotulo="Nova categoria" className="flex-1" defaultValue={estado.valores?.nome} erro={estado.erros?.nome} />
      <BotaoEnviar>Adicionar</BotaoEnviar>
    </form>
  );
}

function BotaoAlternar({ acao, id, ativo }: { acao: typeof alternarCategoriaDespesa; id: string; ativo: boolean }) {
  const [estado, executar, pendente] = useActionState<EstadoFormulario, FormData>(acao, {});
  return (
    <form action={executar} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pendente}
        className={`rounded-md border px-2.5 py-1 text-xs font-medium ${ativo ? "border-slate-300 text-slate-600 hover:bg-slate-50" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`}
      >
        {ativo ? "Desativar" : "Reativar"}
      </button>
      {estado.mensagem && <span className="text-xs text-red-600">{estado.mensagem}</span>}
    </form>
  );
}

export function AlternarCategoria({ id, ativo }: { id: string; ativo: boolean }) {
  return <BotaoAlternar acao={alternarCategoriaDespesa} id={id} ativo={ativo} />;
}

export function AlternarMaterial({ id, ativo }: { id: string; ativo: boolean }) {
  return <BotaoAlternar acao={alternarTipoMaterial} id={id} ativo={ativo} />;
}

export function FormTipoMaterial({ material }: { material?: { id: string; nome: string; unidade: string; custo: string } }) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(salvarTipoMaterial, {});
  const v = estado.valores;
  const pref = material ? `tm-${material.id}-` : "tm-novo-";
  const e = estado.erros ?? {};
  const classe = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm";
  return (
    <form key={!material ? (estado.ok ?? "novo") : material.id} action={acao} className="grid gap-2 sm:grid-cols-[1fr_6rem_8rem_auto] sm:items-end">
      {material && <input type="hidden" name="id" value={material.id} />}
      <div>
        <label htmlFor={`${pref}nome`} className="block text-xs font-medium text-slate-600">{material ? "Nome" : "Novo material"}</label>
        <input id={`${pref}nome`} name="nome" defaultValue={v?.nome ?? material?.nome ?? ""} placeholder="Ex.: Marco de concreto" className={classe} />
        {e.nome && <p className="mt-1 text-xs text-red-600">{e.nome[0]}</p>}
      </div>
      <div>
        <label htmlFor={`${pref}un`} className="block text-xs font-medium text-slate-600">Unidade</label>
        <input id={`${pref}un`} name="unidade" defaultValue={v?.unidade ?? material?.unidade ?? "un"} className={classe} />
        {e.unidade && <p className="mt-1 text-xs text-red-600">{e.unidade[0]}</p>}
      </div>
      <div>
        <label htmlFor={`${pref}custo`} className="block text-xs font-medium text-slate-600">Custo padrão (R$)</label>
        <input id={`${pref}custo`} name="custoUnitarioPadrao" inputMode="decimal" defaultValue={v?.custoUnitarioPadrao ?? material?.custo ?? ""} className={classe} />
        {e.custoUnitarioPadrao && <p className="mt-1 text-xs text-red-600">{e.custoUnitarioPadrao[0]}</p>}
      </div>
      <BotaoEnviar>{material ? "Salvar" : "Adicionar"}</BotaoEnviar>
      {(estado.sucesso || estado.mensagem) && <div className="sm:col-span-4"><Retorno estado={estado} /></div>}
    </form>
  );
}
