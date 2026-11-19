"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { salvarPropriedade } from "@/lib/acoes/propriedades";
import type { EstadoFormulario } from "@/lib/acoes/tipos";
import { hectaresParaAlqueires } from "@/lib/financeiro";
import { lerNumero, UFS } from "@/lib/validacao/documentos";
import { AvisoErro, Campo, CampoSelecao, CampoTextoLongo, classeBotaoSecundario, Secao } from "@/components/ui/formulario";
import { BotaoEnviar } from "@/components/ui/botoes";

export interface ValoresPropriedade {
  id?: string;
  clienteId: string;
  nome: string;
  municipio: string;
  uf: string;
  areaHectares: string;
  matricula: string;
  cartorio: string;
  codigoIncra: string;
  ccir: string;
  car: string;
  observacoes: string;
}

export function FormularioPropriedade({
  inicial,
  clientes,
  voltarPara,
}: {
  inicial: ValoresPropriedade;
  clientes: { id: string; nome: string; municipio: string; uf: string }[];
  voltarPara: string;
}) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(salvarPropriedade, {});
  const v = { ...inicial, ...estado.valores } as ValoresPropriedade;
  const e = estado.erros ?? {};
  const [area, setArea] = useState(v.areaHectares);
  const ha = lerNumero(area);
  const alqueires = ha !== null && !Number.isNaN(ha) && ha > 0 ? hectaresParaAlqueires(ha) : null;

  return (
    <form action={acao} className="space-y-5" noValidate>
      {inicial.id && <input type="hidden" name="id" value={inicial.id} />}
      <AvisoErro mensagem={estado.mensagem} />

      <Secao titulo="Dados da propriedade">
        <CampoSelecao
          nome="clienteId"
          rotulo="Cliente (proprietário)"
          obrigatorio
          className="sm:col-span-6"
          defaultValue={v.clienteId}
          vazio="Selecione…"
          opcoes={clientes.map((c) => ({ valor: c.id, rotulo: `${c.nome} — ${c.municipio}/${c.uf}` }))}
          erro={e.clienteId}
        />
        <Campo nome="nome" rotulo="Nome da propriedade" obrigatorio className="sm:col-span-6" placeholder="Ex.: Fazenda Boa Vista" defaultValue={v.nome} erro={e.nome} />
        <Campo nome="municipio" rotulo="Município" obrigatorio className="sm:col-span-4" defaultValue={v.municipio} erro={e.municipio} />
        <CampoSelecao
          nome="uf"
          rotulo="Estado"
          obrigatorio
          className="sm:col-span-2"
          defaultValue={v.uf || "MG"}
          opcoes={UFS.map((u) => ({ valor: u, rotulo: u }))}
          erro={e.uf}
        />
        <Campo
          nome="areaHectares"
          rotulo="Área (hectares)"
          obrigatorio
          className="sm:col-span-3"
          inputMode="decimal"
          placeholder="Ex.: 48,4000"
          value={area}
          onChange={(ev) => setArea(ev.target.value)}
          erro={e.areaHectares}
        />
        <div className="sm:col-span-3">
          <p className="block text-sm font-medium text-slate-700">Área (alqueires mineiros)</p>
          <p className="mt-1 rounded-lg border border-dashed border-dourado-300 bg-dourado-50 px-3 py-2 text-sm font-medium tabular-nums text-marinho-900" aria-live="polite">
            {alqueires !== null ? `${alqueires.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} alq.` : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">Calculado automaticamente: 1 alqueire = 4,84 ha</p>
        </div>
      </Secao>

      <Secao titulo="Documentação" descricao="Todos opcionais — preencha o que estiver disponível.">
        <Campo nome="matricula" rotulo="Matrícula" className="sm:col-span-2" defaultValue={v.matricula} erro={e.matricula} />
        <Campo nome="cartorio" rotulo="Cartório de registro de imóveis" className="sm:col-span-4" defaultValue={v.cartorio} erro={e.cartorio} />
        <Campo nome="codigoIncra" rotulo="Código do imóvel no INCRA (SNCR)" className="sm:col-span-3" defaultValue={v.codigoIncra} erro={e.codigoIncra} />
        <Campo nome="ccir" rotulo="CCIR" className="sm:col-span-3" defaultValue={v.ccir} erro={e.ccir} />
        <Campo nome="car" rotulo="CAR (número do recibo)" className="sm:col-span-6" placeholder="UF-0000000-XXXX…" defaultValue={v.car} erro={e.car} />
        <CampoTextoLongo nome="observacoes" rotulo="Observações" className="sm:col-span-6" defaultValue={v.observacoes} erro={e.observacoes} />
      </Secao>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href={voltarPara} className={classeBotaoSecundario}>Cancelar</Link>
        <BotaoEnviar>{inicial.id ? "Salvar alterações" : "Cadastrar propriedade"}</BotaoEnviar>
      </div>
    </form>
  );
}
