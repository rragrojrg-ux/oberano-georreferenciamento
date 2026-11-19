"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { salvarCliente } from "@/lib/acoes/clientes";
import type { EstadoFormulario } from "@/lib/acoes/tipos";
import { formatarDocumento, formatarTelefone, UFS } from "@/lib/validacao/documentos";
import { AvisoErro, Campo, CampoSelecao, CampoTextoLongo, classeBotaoSecundario, Secao } from "@/components/ui/formulario";
import { BotaoEnviar } from "@/components/ui/botoes";

export interface ValoresCliente {
  id?: string;
  tipoPessoa: string;
  nome: string;
  documento: string;
  telefone: string;
  email: string;
  municipio: string;
  uf: string;
  observacoes: string;
}

export function FormularioCliente({ inicial, voltarPara }: { inicial: ValoresCliente; voltarPara: string }) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(salvarCliente, {});
  const v = { ...inicial, ...estado.valores } as ValoresCliente;
  const e = estado.erros ?? {};
  const [tipo, setTipo] = useState(v.tipoPessoa || "FISICA");
  const pf = tipo === "FISICA";

  return (
    <form action={acao} className="space-y-5" noValidate>
      {inicial.id && <input type="hidden" name="id" value={inicial.id} />}
      <AvisoErro mensagem={estado.mensagem} />

      <Secao titulo="Identificação">
        <CampoSelecao
          nome="tipoPessoa"
          rotulo="Tipo"
          obrigatorio
          className="sm:col-span-2"
          value={tipo}
          onChange={(ev) => setTipo(ev.target.value)}
          opcoes={[
            { valor: "FISICA", rotulo: "Pessoa física" },
            { valor: "JURIDICA", rotulo: "Pessoa jurídica" },
          ]}
          erro={e.tipoPessoa}
        />
        <Campo
          nome="documento"
          rotulo={pf ? "CPF" : "CNPJ"}
          obrigatorio
          className="sm:col-span-4"
          inputMode="numeric"
          placeholder={pf ? "000.000.000-00" : "00.000.000/0000-00"}
          defaultValue={v.documento ? formatarDocumento(v.documento) : ""}
          erro={e.documento}
        />
        <Campo
          nome="nome"
          rotulo={pf ? "Nome completo" : "Razão social"}
          obrigatorio
          className="sm:col-span-6"
          autoComplete="off"
          defaultValue={v.nome}
          erro={e.nome}
        />
      </Secao>

      <Secao titulo="Contato e localização">
        <Campo
          nome="telefone"
          rotulo="Telefone"
          className="sm:col-span-2"
          type="tel"
          inputMode="tel"
          placeholder="(34) 99999-0000"
          defaultValue={v.telefone ? formatarTelefone(v.telefone) : ""}
          erro={e.telefone}
        />
        <Campo nome="email" rotulo="E-mail" className="sm:col-span-4" type="email" defaultValue={v.email} erro={e.email} />
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
        <CampoTextoLongo nome="observacoes" rotulo="Observações" className="sm:col-span-6" defaultValue={v.observacoes} erro={e.observacoes} />
      </Secao>

      <p className="text-xs text-slate-500">
        Dados pessoais tratados conforme a LGPD, somente para execução dos serviços contratados.
      </p>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href={voltarPara} className={classeBotaoSecundario}>Cancelar</Link>
        <BotaoEnviar>{inicial.id ? "Salvar alterações" : "Cadastrar cliente"}</BotaoEnviar>
      </div>
    </form>
  );
}
