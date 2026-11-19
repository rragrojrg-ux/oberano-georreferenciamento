import { EstruturaApp } from "@/components/layout/estrutura-app";
import { exigirUsuario } from "@/lib/auth/sessao";
import { pode, ROTULO_PERFIL, type Recurso } from "@/lib/auth/permissoes";

const RECURSOS: Recurso[] = [
  "dashboard", "clientes", "propriedades", "servicos", "despesas", "quilometragem", "materiais",
  "financeiro", "documentos", "relatorios", "usuarios", "historico", "configuracoes",
];

// Todas as páginas internas dependem da sessão: nunca gerar estaticamente.
export const dynamic = "force-dynamic";

export default async function LayoutProtegido({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();

  return (
    <EstruturaApp
      usuario={{
        nome: usuario.nome,
        perfilRotulo: ROTULO_PERFIL[usuario.perfil],
        somenteLeitura: !pode(usuario.perfil, "clientes", "escrever"),
      }}
      recursosPermitidos={RECURSOS.filter((r) => pode(usuario.perfil, r, "ler"))}
    >
      {children}
    </EstruturaApp>
  );
}
