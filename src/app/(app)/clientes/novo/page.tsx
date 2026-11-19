import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/ui/basicos";
import { FormularioCliente } from "@/components/cadastros/formulario-cliente";
import { exigirPermissaoPagina } from "@/lib/auth/guardas";

export const metadata: Metadata = { title: "Novo cliente" };

export default async function PaginaNovoCliente() {
  await exigirPermissaoPagina("clientes", "escrever");
  return (
    <div className="mx-auto max-w-3xl">
      <CabecalhoPagina titulo="Novo cliente" descricao="Campos marcados com * são obrigatórios." />
      <FormularioCliente
        voltarPara="/clientes"
        inicial={{ tipoPessoa: "FISICA", nome: "", documento: "", telefone: "", email: "", municipio: "", uf: "MG", observacoes: "" }}
      />
    </div>
  );
}
