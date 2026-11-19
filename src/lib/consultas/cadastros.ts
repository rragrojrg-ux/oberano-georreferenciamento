import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { somenteDigitos } from "@/lib/validacao/documentos";

export const POR_PAGINA = 20;

export function lerPagina(v: string | string[] | undefined): number {
  const n = Number(typeof v === "string" ? v : 1);
  return Number.isInteger(n) && n > 0 && n < 10_000 ? n : 1;
}

export function lerBusca(v: string | string[] | undefined): string {
  return (typeof v === "string" ? v : "").trim().slice(0, 100);
}

// ───────────── Clientes ─────────────

export async function listarClientes(busca: string, pagina: number) {
  const digitos = somenteDigitos(busca);
  const where: Prisma.ClienteWhereInput = busca
    ? {
        OR: [
          { nome: { contains: busca, mode: "insensitive" } },
          { municipio: { contains: busca, mode: "insensitive" } },
          ...(digitos.length >= 3 ? [{ documento: { contains: digitos } }] : []),
        ],
      }
    : {};

  const [total, itens] = await Promise.all([
    prisma.cliente.count({ where }),
    prisma.cliente.findMany({
      where,
      orderBy: { nome: "asc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true, nome: true, tipoPessoa: true, documento: true, telefone: true, municipio: true, uf: true,
        _count: { select: { propriedades: true, servicos: true } },
      },
    }),
  ]);
  return { total, itens, paginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
}

export async function obterCliente(id: string) {
  return prisma.cliente.findUnique({
    where: { id },
    include: {
      propriedades: { orderBy: { nome: "asc" } },
      servicos: {
        orderBy: { dataContratacao: "desc" },
        select: {
          id: true, codigo: true, status: true, dataContratacao: true, valorContratado: true,
          descricaoPersonalizada: true, tipoServico: { select: { nome: true } },
          etapas: { select: { status: true } },
        },
      },
    },
  });
}

export async function opcoesClientes() {
  return prisma.cliente.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true, municipio: true, uf: true } });
}

// ───────────── Propriedades ─────────────

export async function listarPropriedades(busca: string, pagina: number, clienteId?: string) {
  const filtros: Prisma.PropriedadeWhereInput[] = [];
  if (clienteId) filtros.push({ clienteId });
  if (busca) {
    filtros.push({
      OR: [
        { nome: { contains: busca, mode: "insensitive" } },
        { municipio: { contains: busca, mode: "insensitive" } },
        { matricula: { contains: busca, mode: "insensitive" } },
        { car: { contains: busca, mode: "insensitive" } },
        { codigoIncra: { contains: busca, mode: "insensitive" } },
        { cliente: { nome: { contains: busca, mode: "insensitive" } } },
      ],
    });
  }
  const where: Prisma.PropriedadeWhereInput = filtros.length ? { AND: filtros } : {};

  const [total, itens, soma] = await Promise.all([
    prisma.propriedade.count({ where }),
    prisma.propriedade.findMany({
      where,
      orderBy: [{ nome: "asc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true, nome: true, municipio: true, uf: true, areaHectares: true, areaAlqueires: true,
        matricula: true, car: true, codigoIncra: true, ccir: true,
        cliente: { select: { id: true, nome: true } },
        _count: { select: { servicos: true } },
      },
    }),
    prisma.propriedade.aggregate({ where, _sum: { areaHectares: true } }),
  ]);
  return {
    total,
    itens,
    paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    areaTotalHa: Number(soma._sum.areaHectares ?? 0),
  };
}

export async function obterPropriedade(id: string) {
  return prisma.propriedade.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nome: true } },
      servicos: {
        orderBy: { servico: { dataContratacao: "desc" } },
        select: {
          servico: {
            select: {
              id: true, codigo: true, status: true, dataContratacao: true, valorContratado: true,
              descricaoPersonalizada: true, tipoServico: { select: { nome: true } },
              etapas: { select: { status: true } },
            },
          },
        },
      },
    },
  });
}
