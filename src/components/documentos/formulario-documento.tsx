"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Upload } from "lucide-react";
import { confirmarEnvioDocumento, enviarDocumento, prepararEnvioDocumento } from "@/lib/acoes/documentos";
import type { EstadoFormulario } from "@/lib/acoes/tipos";
import { CATEGORIAS_DOCUMENTO, EXTENSOES_ACEITAS, TAMANHO_MAXIMO } from "@/lib/documentos/validacao";
import { AvisoErro, CampoSelecao, Campo } from "@/components/ui/formulario";
import { BotaoEnviar } from "@/components/ui/botoes";

interface OpcoesCliente {
  id: string;
  nome: string;
  propriedades: { id: string; nome: string }[];
  servicos: { id: string; codigo: string; tipo: string }[];
}

const CAMPOS = ["categoria", "descricao", "clienteId", "propriedadeId", "servicoId"] as const;

/**
 * Envio direto ao bucket privado (modo Supabase): o servidor valida e assina a URL, o navegador
 * envia o arquivo direto ao armazenamento, e o servidor confere o conteúdo antes de registrar.
 */
async function enviarDireto(_anterior: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const arquivo = fd.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erros: { arquivo: ["Selecione um arquivo."] } };
  const meta = new FormData();
  for (const c of CAMPOS) meta.set(c, String(fd.get(c) ?? ""));
  meta.set("nome", arquivo.name);
  meta.set("tamanho", String(arquivo.size));

  const preparo = await prepararEnvioDocumento(meta);
  if (!preparo.ok) return preparo.estado;

  const corpo = new FormData();
  corpo.append("cacheControl", "3600");
  corpo.append("", arquivo);
  try {
    const r = await fetch(preparo.url, { method: "PUT", body: corpo, headers: { "x-upsert": "false" } });
    if (!r.ok) return { mensagem: `Falha ao enviar o arquivo ao armazenamento (${r.status}). Tente novamente.` };
  } catch {
    return { mensagem: "Sem conexão com o armazenamento. Verifique a internet e tente novamente." };
  }
  meta.set("nomeArmazenado", preparo.nomeArmazenado);
  return confirmarEnvioDocumento(meta);
}

export function FormularioDocumento({
  clientes,
  inicial,
  envioDireto = false,
}: {
  clientes: OpcoesCliente[];
  inicial: { clienteId?: string; propriedadeId?: string; servicoId?: string };
  envioDireto?: boolean;
}) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(envioDireto ? enviarDireto : enviarDocumento, {});
  const [clienteId, setClienteId] = useState(inicial.clienteId ?? "");
  const [erroLocal, setErroLocal] = useState<string>();
  const cliente = clientes.find((c) => c.id === clienteId);
  const e = estado.erros ?? {};
  const v = estado.valores ?? {};

  return (
    <form key={estado.ok ?? "novo"} action={acao} className="grid gap-4 sm:grid-cols-6" noValidate>
      <div className="sm:col-span-6">
        <label htmlFor="arquivo" className="block text-sm font-medium text-slate-700">
          Arquivo<span className="ml-0.5 text-red-600" aria-hidden="true">*</span>
        </label>
        <input
          id="arquivo"
          name="arquivo"
          type="file"
          accept={EXTENSOES_ACEITAS}
          onChange={(ev) => {
            const f = ev.target.files?.[0];
            setErroLocal(f && f.size > TAMANHO_MAXIMO ? "Arquivo maior que 20 MB." : undefined);
          }}
          className="mt-1 block w-full rounded-lg border border-dashed border-marinho-300 bg-marinho-50/40 px-3 py-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-marinho-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
        />
        <p className={`mt-1 text-xs ${erroLocal || e.arquivo ? "text-red-600" : "text-slate-500"}`}>
          {erroLocal ?? e.arquivo?.[0] ?? "PDF, imagens, Word, Excel, KML/KMZ, DWG/DXF, ZIP, CSV ou TXT — até 20 MB. O conteúdo é verificado no servidor."}
        </p>
      </div>
      <CampoSelecao
        nome="categoria"
        rotulo="Categoria"
        obrigatorio
        className="sm:col-span-2"
        vazio="Selecione…"
        defaultValue={v.categoria}
        opcoes={Object.entries(CATEGORIAS_DOCUMENTO).map(([valor, rotulo]) => ({ valor, rotulo }))}
        erro={e.categoria}
      />
      <Campo nome="descricao" rotulo="Descrição" className="sm:col-span-4" placeholder="Ex.: Matrícula atualizada 2026" defaultValue={v.descricao} />
      <CampoSelecao
        nome="clienteId"
        rotulo="Cliente"
        className="sm:col-span-2"
        value={clienteId}
        onChange={(ev) => setClienteId(ev.target.value)}
        vazio="Selecione…"
        opcoes={clientes.map((c) => ({ valor: c.id, rotulo: c.nome }))}
        erro={e.clienteId}
      />
      <CampoSelecao
        nome="propriedadeId"
        rotulo="Propriedade (opcional)"
        className="sm:col-span-2"
        defaultValue={v.propriedadeId ?? inicial.propriedadeId}
        disabled={!cliente}
        vazio={cliente ? "Nenhuma específica" : "Escolha o cliente"}
        opcoes={(cliente?.propriedades ?? []).map((p) => ({ valor: p.id, rotulo: p.nome }))}
        erro={e.propriedadeId}
      />
      <CampoSelecao
        nome="servicoId"
        rotulo="Serviço (opcional)"
        className="sm:col-span-2"
        defaultValue={v.servicoId ?? inicial.servicoId}
        disabled={!cliente}
        vazio={cliente ? "Nenhum específico" : "Escolha o cliente"}
        opcoes={(cliente?.servicos ?? []).map((s) => ({ valor: s.id, rotulo: `${s.codigo} · ${s.tipo}` }))}
        erro={e.servicoId}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-6">
        {estado.sucesso ? (
          <p role="status" className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="size-4" aria-hidden="true" /> {estado.sucesso}
          </p>
        ) : (
          <AvisoErro mensagem={estado.mensagem} />
        )}
        <BotaoEnviar pendente="Enviando…">
          <Upload className="size-4" aria-hidden="true" /> Enviar documento
        </BotaoEnviar>
      </div>
    </form>
  );
}
