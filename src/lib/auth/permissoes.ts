import type { Perfil } from "@prisma/client";

/**
 * Matriz de permissões. Verificada NO SERVIDOR (páginas, Server Actions e rotas de API);
 * a interface usa a mesma matriz apenas para esconder botões.
 * Para novos perfis no futuro, basta acrescentar uma entrada aqui e no enum Perfil do Prisma.
 */
export type Recurso =
  | "dashboard"
  | "clientes"
  | "propriedades"
  | "servicos"
  | "despesas"
  | "quilometragem"
  | "materiais"
  | "financeiro"
  | "documentos"
  | "relatorios"
  | "usuarios"
  | "configuracoes"
  | "historico";

export type Acao = "ler" | "escrever";

const TODOS: Recurso[] = [
  "dashboard", "clientes", "propriedades", "servicos", "despesas", "quilometragem",
  "materiais", "financeiro", "documentos", "relatorios", "usuarios", "configuracoes", "historico",
];

const MATRIZ: Record<Perfil, Record<Acao, ReadonlySet<Recurso>>> = {
  ADMINISTRADOR: {
    ler: new Set(TODOS),
    escrever: new Set(TODOS),
  },
  VISUALIZADOR: {
    // "documentos" fica de fora por padrão (LGPD: matrículas, contratos e CCIR têm dados pessoais).
    // Para liberar a consulta de documentos aos visualizadores, acrescente "documentos" nesta lista.
    ler: new Set<Recurso>([
      "dashboard", "clientes", "propriedades", "servicos", "despesas", "quilometragem",
      "materiais", "financeiro", "relatorios",
    ]),
    escrever: new Set<Recurso>(),
  },
};

export function pode(perfil: Perfil, recurso: Recurso, acao: Acao = "ler"): boolean {
  return MATRIZ[perfil]?.[acao]?.has(recurso) ?? false;
}

export class AcessoNegadoError extends Error {
  constructor(recurso: Recurso, acao: Acao) {
    super(`Acesso negado: ${acao} em ${recurso}`);
    this.name = "AcessoNegadoError";
  }
}

export const ROTULO_PERFIL: Record<Perfil, string> = {
  ADMINISTRADOR: "Administrador",
  VISUALIZADOR: "Visualizador",
};
