import type { Metadata } from "next";
import Link from "next/link";
import type { CategoriaDocumento, Prisma } from "@prisma/client";
import { Download, Eye, FileText } from "lucide-react";
import { CabecalhoPagina, Cartao } from "@/components/ui/basicos";
import { BotaoExcluir } from "@/components/ui/botoes";
import { Paginacao, Vazio } from "@/components/ui/lista";
import { FormularioDocumento } from "@/components/documentos/formulario-documento";
import { excluirDocumento } from "@/lib/acoes/documentos";
import { exigirPermissaoPagina } from "@/lib/auth/guardas";
import { pode } from "@/lib/auth/permissoes";
import { lerBusca, lerPagina, POR_PAGINA } from "@/lib/consultas/cadastros";
import { CATEGORIAS_DOCUMENTO, formatarTamanho } from "@/lib/documentos/validacao";
import { driver as driverArmazenamento } from "@/lib/documentos/armazenamento";
import { formatarData } from "@/lib/formatacao";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Documentos" };

const texto = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

export default async function PaginaDocumentos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const usuario = await exigirPermissaoPagina("documentos");
  const sp = await searchParams;
  const busca = lerBusca(sp.q);
  const pagina = lerPagina(sp.pagina);
  const categoria = texto(sp.categoria) && texto(sp.categoria)! in CATEGORIAS_DOCUMENTO ? (sp.categoria as CategoriaDocumento) : undefined;
  const clienteId = texto(sp.cliente);
  const propriedadeId = texto(sp.propriedade);
  const servicoId = texto(sp.servico);

  const filtros: Prisma.DocumentoWhereInput[] = [];
  if (categoria) filtros.push({ categoria });
  if (clienteId) filtros.push({ clienteId });
  if (propriedadeId) filtros.push({ propriedadeId });
  if (servicoId) filtros.push({ servicoId });
  if (busca) {
    filtros.push({
      OR: [
        { nomeOriginal: { contains: busca, mode: "insensitive" } },
        { descricao: { contains: busca, mode: "insensitive" } },
        { cliente: { nome: { contains: busca, mode: "insensitive" } } },
        { propriedade: { nome: { contains: busca, mode: "insensitive" } } },
        { servico: { codigo: { contains: busca, mode: "insensitive" } } },
      ],
    });
  }
  const where: Prisma.DocumentoWhereInput = filtros.length ? { AND: filtros } : {};
  const podeEditar = pode(usuario.perfil, "documentos", "escrever");

  const [total, docs, clientes] = await Promise.all([
    prisma.documento.count({ where }),
    prisma.documento.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        cliente: { select: { id: true, nome: true } },
        propriedade: { select: { id: true, nome: true } },
        servico: { select: { id: true, codigo: true } },
        enviadoPor: { select: { nome: true } },
      },
    }),
    podeEditar
      ? prisma.cliente.findMany({
          orderBy: { nome: "asc" },
          select: {
            id: true, nome: true,
            propriedades: { orderBy: { nome: "asc" }, select: { id: true, nome: true } },
            servicos: { orderBy: { dataContratacao: "desc" }, select: { id: true, codigo: true, descricaoPersonalizada: true, tipoServico: { select: { nome: true } } } },
          },
        })
      : Promise.resolve([]),
  ]);

  // Pré-seleção a partir do contexto (?servico= / ?propriedade= / ?cliente=)
  let clienteInicial = clienteId;
  if (!clienteInicial && (servicoId || propriedadeId)) {
    clienteInicial = clientes.find((c) => c.servicos.some((s) => s.id === servicoId) || c.propriedades.some((p) => p.id === propriedadeId))?.id;
  }
  const contexto = servicoId || propriedadeId || clienteId;
  const manter: Record<string, string> = Object.fromEntries(
    Object.entries({ q: busca, categoria, cliente: clienteId, propriedade: propriedadeId, servico: servicoId }).filter(([, v]) => v) as [string, string][],
  );
  const href = (p: number) => `/documentos?${new URLSearchParams({ ...manter, pagina: String(p) })}`;

  return (
    <>
      <CabecalhoPagina
        titulo="Documentos"
        descricao="Arquivos de clientes, propriedades e serviços — armazenamento privado, download somente para usuários autorizados."
      />

      {podeEditar && (
        <Cartao className="mb-6 p-5">
          <h2 className="mb-4 font-semibold text-marinho-900">Enviar documento</h2>
          <FormularioDocumento
            clientes={clientes.map((c) => ({
              id: c.id,
              nome: c.nome,
              propriedades: c.propriedades,
              servicos: c.servicos.map((s) => ({ id: s.id, codigo: s.codigo, tipo: s.descricaoPersonalizada || s.tipoServico.nome })),
            }))}
            inicial={{ clienteId: clienteInicial, propriedadeId, servicoId }}
            envioDireto={driverArmazenamento === "supabase"}
          />
        </Cartao>
      )}

      <form className="mb-4 flex flex-col gap-2 sm:flex-row" role="search">
        {clienteId && <input type="hidden" name="cliente" value={clienteId} />}
        {propriedadeId && <input type="hidden" name="propriedade" value={propriedadeId} />}
        {servicoId && <input type="hidden" name="servico" value={servicoId} />}
        <label htmlFor="q" className="sr-only">Pesquisar</label>
        <input id="q" name="q" type="search" defaultValue={busca} placeholder="Nome do arquivo, descrição, cliente, propriedade ou código" className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" />
        <label htmlFor="categoria-filtro" className="sr-only">Categoria</label>
        <select id="categoria-filtro" name="categoria" defaultValue={categoria ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm">
          <option value="">Todas as categorias</option>
          {Object.entries(CATEGORIAS_DOCUMENTO).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
        </select>
        <button type="submit" className="rounded-lg bg-marinho-900 px-4 py-2 text-sm font-medium text-white">Buscar</button>
      </form>
      {contexto && (
        <p className="mb-3 text-sm text-slate-600">
          Filtrando pelo registro selecionado. <Link href="/documentos" className="text-marinho-700 underline">Ver todos</Link>
        </p>
      )}

      <Cartao className="overflow-hidden">
        {docs.length === 0 ? (
          <Vazio>Nenhum documento encontrado.</Vazio>
        ) : (
          <ul className="divide-y divide-slate-100">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center">
                <FileText className="hidden size-8 shrink-0 text-marinho-300 sm:block" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-marinho-900" title={d.nomeOriginal}>{d.nomeOriginal}</p>
                  <p className="text-xs text-slate-500">
                    <span className="rounded bg-dourado-50 px-1.5 py-0.5 font-medium text-dourado-700">{CATEGORIAS_DOCUMENTO[d.categoria]}</span>{" "}
                    {formatarTamanho(d.tamanhoBytes)} · {formatarData(d.criadoEm)} · por {d.enviadoPor.nome}
                  </p>
                  {d.descricao && <p className="text-xs text-slate-600">{d.descricao}</p>}
                  <p className="text-xs text-slate-500">
                    {d.cliente && <Link href={`/clientes/${d.cliente.id}`} className="hover:underline">{d.cliente.nome}</Link>}
                    {d.propriedade && <> · <Link href={`/propriedades/${d.propriedade.id}`} className="hover:underline">{d.propriedade.nome}</Link></>}
                    {d.servico && <> · <Link href={`/servicos/${d.servico.id}`} className="hover:underline">{d.servico.codigo}</Link></>}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {/^(application\/pdf|image\/)/.test(d.mimeType) && (
                    <a href={`/api/documentos/${d.id}?ver=1`} target="_blank" rel="noopener noreferrer" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-marinho-900" title="Visualizar" aria-label={`Visualizar ${d.nomeOriginal}`}>
                      <Eye className="size-4" />
                    </a>
                  )}
                  <a href={`/api/documentos/${d.id}`} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-marinho-900" title="Baixar" aria-label={`Baixar ${d.nomeOriginal}`}>
                    <Download className="size-4" />
                  </a>
                  {podeEditar && (
                    <BotaoExcluir acao={excluirDocumento} id={d.id} compacto rotulo="Excluir documento" confirmacao={`Excluir "${d.nomeOriginal}"? O arquivo será apagado do armazenamento.`} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-slate-100"><Paginacao pagina={pagina} paginas={Math.max(1, Math.ceil(total / POR_PAGINA))} total={total} montarHref={href} /></div>
      </Cartao>
    </>
  );
}
