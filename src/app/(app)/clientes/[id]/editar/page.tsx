import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CabecalhoPagina } from "@/components/ui/basicos";
import { FormularioCliente } from "@/components/cadastros/formulario-cliente";
import { exigirPermissaoPagina } from "@/lib/auth/guardas";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Editar cliente" };

export default async function PaginaEditarCliente({ params }: { params: Promise<{ id: string }> }) {
  await exigirPermissaoPagina("clientes", "escrever");
  const { id } = await params;
  const c = await prisma.cliente.findUnique({ where: { id } });
  if (!c) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <CabecalhoPagina titulo="Editar cliente" descricao={c.nome} />
      <FormularioCliente
        voltarPara={`/clientes/${c.id}`}
        inicial={{
          id: c.id,
          tipoPessoa: c.tipoPessoa,
          nome: c.nome,
          documento: c.documento,
          telefone: c.telefone ?? "",
          email: c.email ?? "",
          municipio: c.municipio,
          uf: c.uf,
          observacoes: c.observacoes ?? "",
        }}
      />
    </div>
  );
}
