import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CabecalhoPagina } from "@/components/ui/basicos";
import { FormularioServico } from "@/components/servicos/formulario-servico";
import { exigirPermissaoPagina } from "@/lib/auth/guardas";
import { opcoesServico } from "@/lib/consultas/operacao";
import { paraIso } from "@/lib/periodo";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Editar serviço" };

export default async function PaginaEditarServico({ params }: { params: Promise<{ id: string }> }) {
  await exigirPermissaoPagina("servicos", "escrever");
  const { id } = await params;
  const [s, opcoes] = await Promise.all([
    prisma.servico.findUnique({ where: { id }, include: { propriedades: { select: { propriedadeId: true } }, tipoServico: true } }),
    opcoesServico(),
  ]);
  if (!s) notFound();
  // Tipo inativo continua aparecendo para o serviço que já o usa.
  if (!opcoes.tipos.some((t) => t.id === s.tipoServicoId)) opcoes.tipos.push({ id: s.tipoServico.id, nome: s.tipoServico.nome });

  return (
    <div className="mx-auto max-w-3xl">
      <CabecalhoPagina titulo="Editar serviço" descricao={s.codigo} />
      <FormularioServico
        opcoes={opcoes}
        voltarPara={`/servicos/${s.id}`}
        inicial={{
          id: s.id,
          clienteId: s.clienteId,
          propriedadeIds: s.propriedades.map((p) => p.propriedadeId),
          tipoServicoId: s.tipoServicoId,
          descricaoPersonalizada: s.descricaoPersonalizada ?? "",
          dataContratacao: paraIso(s.dataContratacao),
          valorContratado: Number(s.valorContratado).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
          prazoPrevisto: s.prazoPrevisto ? paraIso(s.prazoPrevisto) : "",
          status: s.status,
          responsavelTecnico: s.responsavelTecnico ?? "",
          observacoes: s.observacoes ?? "",
        }}
      />
    </div>
  );
}
