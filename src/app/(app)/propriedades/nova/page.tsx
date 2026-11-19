import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoPagina, Cartao } from "@/components/ui/basicos";
import { classeBotaoPrimario } from "@/components/ui/formulario";
import { FormularioPropriedade } from "@/components/cadastros/formulario-propriedade";
import { exigirPermissaoPagina } from "@/lib/auth/guardas";
import { opcoesClientes } from "@/lib/consultas/cadastros";

export const metadata: Metadata = { title: "Nova propriedade" };

export default async function PaginaNovaPropriedade({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  await exigirPermissaoPagina("propriedades", "escrever");
  const { cliente } = await searchParams;
  const clientes = await opcoesClientes();
  const selecionado = clientes.find((c) => c.id === cliente);

  if (clientes.length === 0) {
    return (
      <Cartao className="mx-auto max-w-xl p-8 text-center">
        <p className="text-sm text-slate-600">Cadastre um cliente antes de cadastrar propriedades.</p>
        <Link href="/clientes/novo" className={`${classeBotaoPrimario} mt-4`}>Novo cliente</Link>
      </Cartao>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <CabecalhoPagina titulo="Nova propriedade" descricao="Campos marcados com * são obrigatórios." />
      <FormularioPropriedade
        clientes={clientes}
        voltarPara={selecionado ? `/clientes/${selecionado.id}` : "/propriedades"}
        inicial={{
          clienteId: selecionado?.id ?? "",
          nome: "",
          municipio: selecionado?.municipio ?? "",
          uf: selecionado?.uf ?? "MG",
          areaHectares: "",
          matricula: "",
          cartorio: "",
          codigoIncra: "",
          ccir: "",
          car: "",
          observacoes: "",
        }}
      />
    </div>
  );
}
