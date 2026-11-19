"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { salvarServico } from "@/lib/acoes/servicos";
import type { EstadoFormulario } from "@/lib/acoes/tipos";
import { STATUS_SERVICO_ROTULO } from "@/lib/dominio";
import { AvisoErro, Campo, CampoSelecao, CampoTextoLongo, classeBotaoSecundario, Secao } from "@/components/ui/formulario";
import { BotaoEnviar } from "@/components/ui/botoes";

export interface ValoresServico {
  id?: string;
  clienteId: string;
  propriedadeIds: string[];
  tipoServicoId: string;
  descricaoPersonalizada: string;
  dataContratacao: string;
  valorContratado: string;
  prazoPrevisto: string;
  status: string;
  responsavelTecnico: string;
  observacoes: string;
}

interface Opcoes {
  clientes: { id: string; nome: string; propriedades: { id: string; nome: string; municipio: string; uf: string }[] }[];
  tipos: { id: string; nome: string }[];
}

export function FormularioServico({ inicial, opcoes, voltarPara }: { inicial: ValoresServico; opcoes: Opcoes; voltarPara: string }) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(salvarServico, {});
  const enviados = estado.valores;
  const v: ValoresServico = enviados
    ? { ...inicial, ...enviados, propriedadeIds: enviados.propriedadeIds ? enviados.propriedadeIds.split(",") : [] }
    : inicial;
  const e = estado.erros ?? {};

  const [clienteId, setClienteId] = useState(v.clienteId);
  const [selecionadas, setSelecionadas] = useState<string[]>(v.propriedadeIds);
  const [tipoId, setTipoId] = useState(v.tipoServicoId);
  const cliente = opcoes.clientes.find((c) => c.id === clienteId);
  const tipoNome = opcoes.tipos.find((t) => t.id === tipoId)?.nome ?? "";
  const editando = Boolean(inicial.id);

  function trocarCliente(id: string) {
    setClienteId(id);
    const props = opcoes.clientes.find((c) => c.id === id)?.propriedades ?? [];
    setSelecionadas(props.length === 1 ? [props[0].id] : []);
  }

  return (
    <form action={acao} className="space-y-5" noValidate>
      {inicial.id && <input type="hidden" name="id" value={inicial.id} />}
      <AvisoErro mensagem={estado.mensagem} />

      <Secao titulo="Cliente e propriedades">
        <CampoSelecao
          nome="clienteId"
          rotulo="Cliente"
          obrigatorio
          className="sm:col-span-6"
          value={clienteId}
          onChange={(ev) => trocarCliente(ev.target.value)}
          vazio="Selecione…"
          opcoes={opcoes.clientes.map((c) => ({ valor: c.id, rotulo: c.nome }))}
          erro={e.clienteId}
        />
        <fieldset className="sm:col-span-6" aria-describedby={e.propriedadeIds ? "prop-erro" : undefined}>
          <legend className="text-sm font-medium text-slate-700">
            Propriedades vinculadas<span className="ml-0.5 text-red-600" aria-hidden="true">*</span>
          </legend>
          {!cliente ? (
            <p className="mt-1 text-sm text-slate-500">Selecione o cliente para ver as propriedades.</p>
          ) : cliente.propriedades.length === 0 ? (
            <p className="mt-1 text-sm text-amber-700">
              Este cliente não tem propriedades.{" "}
              <Link href={`/propriedades/nova?cliente=${cliente.id}`} className="underline">Cadastrar propriedade</Link>
            </p>
          ) : (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {cliente.propriedades.map((p) => (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                    selecionadas.includes(p.id) ? "border-marinho-600 bg-marinho-50" : "border-slate-300 bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="propriedadeIds"
                    value={p.id}
                    checked={selecionadas.includes(p.id)}
                    onChange={(ev) =>
                      setSelecionadas((s) => (ev.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))
                    }
                    className="mt-0.5 size-4 accent-marinho-700"
                  />
                  <span>
                    <span className="font-medium text-marinho-900">{p.nome}</span>
                    <span className="block text-xs text-slate-500">{p.municipio}/{p.uf}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
          {e.propriedadeIds && <p id="prop-erro" className="mt-1 text-xs text-red-600">{e.propriedadeIds[0]}</p>}
          <p className="mt-1 text-xs text-slate-500">Um mesmo serviço pode abranger mais de uma propriedade.</p>
        </fieldset>
      </Secao>

      <Secao titulo="Serviço">
        <CampoSelecao
          nome="tipoServicoId"
          rotulo="Tipo de serviço"
          obrigatorio
          className="sm:col-span-3"
          value={tipoId}
          onChange={(ev) => setTipoId(ev.target.value)}
          disabled={editando}
          vazio="Selecione…"
          opcoes={opcoes.tipos.map((t) => ({ valor: t.id, rotulo: t.nome }))}
          ajuda={editando ? "O tipo não muda depois de criado (define as etapas)." : "As etapas padrão do tipo serão criadas automaticamente."}
          erro={e.tipoServicoId}
        />
        {editando && <input type="hidden" name="tipoServicoId" value={tipoId} />}
        <Campo
          nome="descricaoPersonalizada"
          rotulo={tipoNome.startsWith("Outros") ? "Descrição do serviço" : "Descrição (opcional)"}
          className="sm:col-span-3"
          placeholder="Ex.: Locação de área para APP"
          defaultValue={v.descricaoPersonalizada}
          erro={e.descricaoPersonalizada}
        />
        <Campo nome="dataContratacao" rotulo="Data de contratação" type="date" obrigatorio className="sm:col-span-2" defaultValue={v.dataContratacao} erro={e.dataContratacao} />
        <Campo nome="prazoPrevisto" rotulo="Prazo previsto" type="date" className="sm:col-span-2" defaultValue={v.prazoPrevisto} erro={e.prazoPrevisto} />
        <Campo
          nome="valorContratado"
          rotulo="Valor contratado (R$)"
          obrigatorio
          inputMode="decimal"
          placeholder="Ex.: 15.000,00"
          className="sm:col-span-2"
          defaultValue={v.valorContratado}
          erro={e.valorContratado}
        />
        <CampoSelecao
          nome="status"
          rotulo="Situação"
          obrigatorio
          className="sm:col-span-3"
          defaultValue={v.status}
          opcoes={Object.entries(STATUS_SERVICO_ROTULO).map(([valor, rotulo]) => ({ valor, rotulo }))}
          erro={e.status}
        />
        <Campo nome="responsavelTecnico" rotulo="Responsável técnico" className="sm:col-span-3" defaultValue={v.responsavelTecnico} erro={e.responsavelTecnico} />
        <CampoTextoLongo nome="observacoes" rotulo="Observações" className="sm:col-span-6" defaultValue={v.observacoes} erro={e.observacoes} />
      </Secao>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href={voltarPara} className={classeBotaoSecundario}>Cancelar</Link>
        <BotaoEnviar>{editando ? "Salvar alterações" : "Cadastrar serviço"}</BotaoEnviar>
      </div>
    </form>
  );
}
