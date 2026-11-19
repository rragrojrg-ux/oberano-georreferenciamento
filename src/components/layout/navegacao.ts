import {
  BarChart3, Briefcase, Car, FileText, FolderOpen, LayoutDashboard, Map, Milestone,
  Receipt, Settings, Users, UserCog, Wallet, type LucideIcon,
} from "lucide-react";
import type { Recurso } from "@/lib/auth/permissoes";

export interface ItemNavegacao {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  recurso: Recurso;
}

export interface GrupoNavegacao {
  titulo?: string;
  itens: ItemNavegacao[];
}

export const NAVEGACAO: GrupoNavegacao[] = [
  { itens: [{ href: "/", rotulo: "Painel", icone: LayoutDashboard, recurso: "dashboard" }] },
  {
    titulo: "Cadastros",
    itens: [
      { href: "/clientes", rotulo: "Clientes", icone: Users, recurso: "clientes" },
      { href: "/propriedades", rotulo: "Propriedades", icone: Map, recurso: "propriedades" },
    ],
  },
  {
    titulo: "Operação",
    itens: [
      { href: "/servicos", rotulo: "Serviços e etapas", icone: Briefcase, recurso: "servicos" },
      { href: "/despesas", rotulo: "Despesas", icone: Receipt, recurso: "despesas" },
      { href: "/quilometragem", rotulo: "Quilometragem", icone: Car, recurso: "quilometragem" },
      { href: "/marcos", rotulo: "Marcos e materiais", icone: Milestone, recurso: "materiais" },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { href: "/financeiro", rotulo: "Financeiro", icone: Wallet, recurso: "financeiro" },
      { href: "/documentos", rotulo: "Documentos", icone: FolderOpen, recurso: "documentos" },
      { href: "/relatorios", rotulo: "Relatórios", icone: BarChart3, recurso: "relatorios" },
    ],
  },
  {
    titulo: "Administração",
    itens: [
      { href: "/usuarios", rotulo: "Usuários", icone: UserCog, recurso: "usuarios" },
      { href: "/historico", rotulo: "Histórico", icone: FileText, recurso: "historico" },
      { href: "/configuracoes", rotulo: "Configurações", icone: Settings, recurso: "configuracoes" },
    ],
  },
];
