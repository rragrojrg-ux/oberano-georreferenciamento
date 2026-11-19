import type { Metadata } from "next";
import { CabecalhoPagina, Cartao } from "@/components/ui/basicos";
import { FormTrocarSenha } from "@/components/usuarios/formularios";
import { Dado } from "@/components/ui/lista";
import { exigirUsuario } from "@/lib/auth/sessao";
import { ROTULO_PERFIL } from "@/lib/auth/permissoes";

export const metadata: Metadata = { title: "Minha conta" };

export default async function PaginaConta() {
  const u = await exigirUsuario();
  return (
    <div className="mx-auto max-w-xl">
      <CabecalhoPagina titulo="Minha conta" />
      <Cartao className="mb-6 p-5">
        <dl className="grid gap-4 sm:grid-cols-3">
          <Dado rotulo="Nome">{u.nome}</Dado>
          <Dado rotulo="E-mail">{u.email}</Dado>
          <Dado rotulo="Perfil">{ROTULO_PERFIL[u.perfil]}</Dado>
        </dl>
      </Cartao>
      <Cartao className="p-5">
        <h2 className="mb-4 font-semibold text-marinho-900">Alterar senha</h2>
        <FormTrocarSenha />
      </Cartao>
    </div>
  );
}
