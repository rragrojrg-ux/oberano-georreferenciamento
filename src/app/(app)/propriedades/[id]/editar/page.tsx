import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CabecalhoPagina } from "@/components/ui/basicos";
import { FormularioPropriedade } from "@/components/cadastros/formulario-propriedade";
import { exigirPermissaoPagina } from "@/lib/auth/guardas";
import { opcoesClientes } from "@/lib/consultas/cadastros";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Editar propriedade" };

export default async function PaginaEditarPropriedade({ params }: { params: Promise<{ id: string }> }) {
  await exigirPermissaoPagina("propriedades", "escrever");
  const { id } = await params;
  const [p, clientes] = await Promise.all([prisma.propriedade.findUnique({ where: { id } }), opcoesClientes()]);
  if (!p) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <CabecalhoPagina titulo="Editar propriedade" descricao={p.nome} />
      <FormularioPropriedade
        clientes={clientes}
        voltarPara={`/propriedades/${p.id}`}
        inicial={{
          id: p.id,
          clienteId: p.clienteId,
          nome: p.nome,
          municipio: p.municipio,
          uf: p.uf,
          areaHectares: Number(p.areaHectares).toLocaleString("pt-BR", { maximumFractionDigits: 4, useGrouping: false }),
          matricula: p.matricula ?? "",
          cartorio: p.cartorio ?? "",
          codigoIncra: p.codigoIncra ?? "",
          ccir: p.ccir ?? "",
          car: p.car ?? "",
          observacoes: p.observacoes ?? "",
        }}
      />
    </div>
  );
}
