import "server-only";
import { notFound } from "next/navigation";
import { exigirUsuario, type UsuarioSessao } from "./sessao";
import { AcessoNegadoError, pode, type Acao, type Recurso } from "./permissoes";

/** Para páginas: exige login e permissão. Sem permissão → 404 (não revela que a página existe). */
export async function exigirPermissaoPagina(recurso: Recurso, acao: Acao = "ler"): Promise<UsuarioSessao> {
  const usuario = await exigirUsuario();
  if (!pode(usuario.perfil, recurso, acao)) notFound();
  return usuario;
}

/** Para Server Actions e rotas de API: exige login e permissão; lança erro se negado. */
export async function exigirPermissaoAcao(recurso: Recurso, acao: Acao): Promise<UsuarioSessao> {
  const usuario = await exigirUsuario();
  if (!pode(usuario.perfil, recurso, acao)) throw new AcessoNegadoError(recurso, acao);
  return usuario;
}
