import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FolderOpen, Pencil } from "lucide-react";
import { BarraProgresso, Cartao, SeloStatus } from "@/components/ui/basicos";
import { BotaoExcluir } from "@/components/ui/botoes";
import { classeBotaoSecundario } from "@/components/ui/formulario";
import { AvisoSucesso, Dado, Vazio } from "@/components/ui/lista";
import { excluirPropriedade } from "@/lib/acoes/propriedades";
import { exigirPermissaoPagina } from "@/lib/auth/guardas";
import { pode } from "@/lib/auth/permissoes";
import { obterPropriedade } from "@/lib/consultas/cadastros";
import { percentualProgresso } from "@/lib/financeiro";
import { formatarData, formatarMoeda } from "@/lib/formatacao";

export const metadata: Metadata = { title: "Propriedade" };

export default async function PaginaPropriedade({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const usuario = await exigirPermissaoPagina("propriedades");
  const [{ id }, { ok }] = await Promise.all([params, searchParams]);
  const p = await obterPropriedade(id);
  if (!p) notFound();
  const podeEditar = pode(usuario.perfil, "propriedades", "escrever");

  return (
    <>
      <Link href="/propriedades" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-marinho-900">
        <ArrowLeft className="size-4" aria-hidden="true" /> Propriedades
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-marinho-900">{p.nome}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {p.municipio}/{p.uf} · Proprietário:{" "}
            <Link href={`/clientes/${p.cliente.id}`} className="text-marinho-700 hover:underline">{p.cliente.nome}</Link>
          </p>
        </div>
        {podeEditar && (
          <div className="flex flex-wrap items-start gap-2">
            {pode(usuario.perfil, "documentos", "ler") && (
              <Link href={`/documentos?propriedade=${p.id}`} className={classeBotaoSecundario}>
                <FolderOpen className="size-4" aria-hidden="true" /> Documentos
              </Link>
            )}
            <Link href={`/propriedades/${p.id}/editar`} className={classeBotaoSecundario}>
              <Pencil className="size-4" aria-hidden="true" /> Editar
            </Link>
            <BotaoExcluir acao={excluirPropriedade} id={p.id} confirmacao={`Excluir a propriedade "${p.nome}"? Esta ação não pode ser desfeita.`} />
          </div>
        )}
      </div>
      <AvisoSucesso codigo={ok} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Cartao className="p-5">
          <p className="text-sm text-slate-500">Área</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-marinho-900">
            {Number(p.areaHectares).toLocaleString("pt-BR", { maximumFractionDigits: 4 })} ha
          </p>
          <p className="text-sm tabular-nums text-dourado-700">
            {Number(p.areaAlqueires).toLocaleString("pt-BR", { maximumFractionDigits: 4 })} alqueires mineiros
          </p>
        </Cartao>
        <Cartao className="p-5">
          <dl className="grid grid-cols-2 gap-4">
            <Dado rotulo="Matrícula">{p.matricula}</Dado>
            <Dado rotulo="Código INCRA">{p.codigoIncra}</Dado>
            <Dado rotulo="CCIR">{p.ccir}</Dado>
            <Dado rotulo="CAR">{p.car}</Dado>
            <div className="col-span-2"><Dado rotulo="Cartório">{p.cartorio}</Dado></div>
          </dl>
        </Cartao>
      </div>

      {p.observacoes && (
        <Cartao className="mt-4 p-5">
          <Dado rotulo="Observações"><span className="whitespace-pre-line">{p.observacoes}</span></Dado>
        </Cartao>
      )}

      <Cartao className="mt-6 overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-marinho-900">Serviços nesta propriedade ({p.servicos.length})</h2>
        </div>
        {p.servicos.length === 0 ? (
          <Vazio>Nenhum serviço vinculado.</Vazio>
        ) : (
          <ul className="divide-y divide-slate-100">
            {p.servicos.map(({ servico: s }) => (
              <li key={s.id}>
                <Link href={`/servicos/${s.id}`} className="grid gap-2 px-5 py-3 hover:bg-slate-50 sm:grid-cols-[1fr_auto_10rem_8rem] sm:items-center sm:gap-4">
                <div>
                  <p className="font-medium text-marinho-900">{s.descricaoPersonalizada || s.tipoServico.nome}</p>
                  <p className="text-xs text-slate-500">{s.codigo} · {formatarData(s.dataContratacao)}</p>
                </div>
                <SeloStatus status={s.status} />
                <BarraProgresso
                  valor={percentualProgresso(s.etapas.filter((e) => e.status === "CONCLUIDA").length, s.etapas.length)}
                  rotulo={`Progresso de ${s.codigo}`}
                />
                <p className="text-sm font-medium tabular-nums text-slate-800 sm:text-right">{formatarMoeda(Number(s.valorContratado))}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </>
  );
}
