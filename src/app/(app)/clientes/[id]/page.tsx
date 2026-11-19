import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FolderOpen, Pencil, Plus } from "lucide-react";
import { BarraProgresso, Cartao, SeloStatus } from "@/components/ui/basicos";
import { BotaoExcluir } from "@/components/ui/botoes";
import { classeBotaoPrimario, classeBotaoSecundario } from "@/components/ui/formulario";
import { AvisoSucesso, Dado, Vazio } from "@/components/ui/lista";
import { excluirCliente } from "@/lib/acoes/clientes";
import { exigirPermissaoPagina } from "@/lib/auth/guardas";
import { pode } from "@/lib/auth/permissoes";
import { obterCliente } from "@/lib/consultas/cadastros";
import { percentualProgresso } from "@/lib/financeiro";
import { formatarData, formatarMoeda, formatarNumero } from "@/lib/formatacao";
import { formatarDocumento, formatarTelefone, mascararDocumento } from "@/lib/validacao/documentos";

export const metadata: Metadata = { title: "Cliente" };

export default async function PaginaCliente({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const usuario = await exigirPermissaoPagina("clientes");
  const [{ id }, { ok }] = await Promise.all([params, searchParams]);
  const c = await obterCliente(id);
  if (!c) notFound();

  const podeEditar = pode(usuario.perfil, "clientes", "escrever");
  const podeEditarProp = pode(usuario.perfil, "propriedades", "escrever");
  const areaTotal = c.propriedades.reduce((t, p) => t + Number(p.areaHectares), 0);
  const ehPf = c.tipoPessoa === "FISICA";

  return (
    <>
      <Link href="/clientes" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-marinho-900">
        <ArrowLeft className="size-4" aria-hidden="true" /> Clientes
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-marinho-900">{c.nome}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {ehPf ? "Pessoa física" : "Pessoa jurídica"} · {c.municipio}/{c.uf}
          </p>
        </div>
        {podeEditar && (
          <div className="flex flex-wrap items-start gap-2">
            {pode(usuario.perfil, "documentos", "ler") && (
              <Link href={`/documentos?cliente=${c.id}`} className={classeBotaoSecundario}>
                <FolderOpen className="size-4" aria-hidden="true" /> Documentos
              </Link>
            )}
            <Link href={`/clientes/${c.id}/editar`} className={classeBotaoSecundario}>
              <Pencil className="size-4" aria-hidden="true" /> Editar
            </Link>
            <BotaoExcluir
              acao={excluirCliente}
              id={c.id}
              confirmacao={`Excluir o cliente "${c.nome}"? Esta ação não pode ser desfeita.`}
            />
          </div>
        )}
      </div>
      <AvisoSucesso codigo={ok} />

      <Cartao className="p-5">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Dado rotulo={ehPf ? "CPF" : "CNPJ"}>{podeEditar ? formatarDocumento(c.documento) : mascararDocumento(c.documento)}</Dado>
          <Dado rotulo="Telefone">{c.telefone ? formatarTelefone(c.telefone) : null}</Dado>
          <Dado rotulo="E-mail">{c.email}</Dado>
          <Dado rotulo="Cliente desde">{formatarData(c.dataCadastro)}</Dado>
          {c.observacoes && (
            <div className="sm:col-span-2 lg:col-span-4">
              <Dado rotulo="Observações"><span className="whitespace-pre-line">{c.observacoes}</span></Dado>
            </div>
          )}
        </dl>
      </Cartao>

      <Cartao className="mt-6 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-marinho-900">Propriedades ({c.propriedades.length})</h2>
            <p className="text-xs text-slate-500">
              Área total: {formatarNumero(Math.round(areaTotal * 100) / 100)} ha
            </p>
          </div>
          {podeEditarProp && (
            <Link href={`/propriedades/nova?cliente=${c.id}`} className={classeBotaoPrimario}>
              <Plus className="size-4" aria-hidden="true" /> Nova propriedade
            </Link>
          )}
        </div>
        {c.propriedades.length === 0 ? (
          <Vazio>Nenhuma propriedade cadastrada para este cliente.</Vazio>
        ) : (
          <ul className="divide-y divide-slate-100">
            {c.propriedades.map((p) => (
              <li key={p.id}>
                <Link href={`/propriedades/${p.id}`} className="flex flex-col gap-1 px-5 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-marinho-900">{p.nome}</p>
                    <p className="text-xs text-slate-500">
                      {p.municipio}/{p.uf}{p.matricula ? ` · Matrícula ${p.matricula}` : ""}{p.car ? " · CAR ✓" : ""}
                    </p>
                  </div>
                  <p className="text-sm tabular-nums text-slate-700">
                    {Number(p.areaHectares).toLocaleString("pt-BR", { maximumFractionDigits: 4 })} ha ·{" "}
                    {Number(p.areaAlqueires).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} alq.
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <Cartao className="mt-6 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-marinho-900">Serviços contratados ({c.servicos.length})</h2>
          {pode(usuario.perfil, "servicos", "escrever") && c.propriedades.length > 0 && (
            <Link href={`/servicos/novo?cliente=${c.id}`} className={classeBotaoPrimario}>
              <Plus className="size-4" aria-hidden="true" /> Novo serviço
            </Link>
          )}
        </div>
        {c.servicos.length === 0 ? (
          <Vazio>Nenhum serviço contratado.</Vazio>
        ) : (
          <ul className="divide-y divide-slate-100">
            {c.servicos.map((s) => (
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
