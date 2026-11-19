import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/ui/basicos";
import { FormularioServico } from "@/components/servicos/formulario-servico";
import { exigirPermissaoPagina } from "@/lib/auth/guardas";
import { opcoesServico } from "@/lib/consultas/operacao";
import { hojeLocalIso } from "@/lib/periodo";

export const metadata: Metadata = { title: "Novo serviço" };

export default async function PaginaNovoServico({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  await exigirPermissaoPagina("servicos", "escrever");
  const [{ cliente }, opcoes] = await Promise.all([searchParams, opcoesServico()]);
  const c = opcoes.clientes.find((x) => x.id === cliente);

  return (
    <div className="mx-auto max-w-3xl">
      <CabecalhoPagina titulo="Novo serviço" descricao="Campos marcados com * são obrigatórios." />
      <FormularioServico
        opcoes={opcoes}
        voltarPara={c ? `/clientes/${c.id}` : "/servicos"}
        inicial={{
          clienteId: c?.id ?? "",
          propriedadeIds: c?.propriedades.length === 1 ? [c.propriedades[0].id] : [],
          tipoServicoId: "",
          descricaoPersonalizada: "",
          dataContratacao: hojeLocalIso(),
          valorContratado: "",
          prazoPrevisto: "",
          status: "AGUARDANDO_INICIO",
          responsavelTecnico: "",
          observacoes: "",
        }}
      />
    </div>
  );
}
