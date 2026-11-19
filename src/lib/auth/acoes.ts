"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registrarHistorico } from "@/lib/auditoria";
import { criarSessao, encerrarSessao, obterIpRequisicao, obterUsuarioAtual } from "./sessao";

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MINUTOS = 15;
// Hash fictício usado quando o e-mail não existe, para que o tempo de resposta não revele contas válidas.
const HASH_FICTICIO = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO7nY3cN0dAqQ4D0d8Zp6v1o2Yb8Qm9xS";

const esquemaLogin = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(200),
  senha: z.string().min(1, "Informe a senha.").max(200),
  destino: z.string().optional(),
});

export interface EstadoLogin {
  erro?: string;
  email?: string;
}

/** Aceita apenas caminhos internos (evita redirecionamento aberto). */
function destinoSeguro(destino?: string): string {
  if (!destino || !destino.startsWith("/") || destino.startsWith("//") || destino.startsWith("/\\")) return "/";
  if (destino.startsWith("/login")) return "/";
  return destino;
}

export async function entrar(_anterior: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const dados = esquemaLogin.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
    destino: formData.get("destino") ?? undefined,
  });
  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message ?? "Dados inválidos.", email: String(formData.get("email") ?? "") };
  }

  const { email, senha, destino } = dados.data;
  const ip = await obterIpRequisicao();
  const erroGenerico: EstadoLogin = { erro: "E-mail ou senha incorretos.", email };

  const usuario = await prisma.usuario.findUnique({ where: { email } });

  if (!usuario || !usuario.ativo) {
    await bcrypt.compare(senha, HASH_FICTICIO);
    await registrarHistorico({ acao: "LOGIN_FALHA", entidade: "Usuario", detalhes: { motivo: "usuario_inexistente_ou_inativo" }, ip });
    return erroGenerico;
  }

  if (usuario.bloqueadoAte && usuario.bloqueadoAte > new Date()) {
    return { erro: "Muitas tentativas incorretas. Aguarde alguns minutos e tente novamente.", email };
  }

  const senhaOk = await bcrypt.compare(senha, usuario.senhaHash);
  if (!senhaOk) {
    const tentativas = usuario.tentativasFalhas + 1;
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        tentativasFalhas: tentativas >= MAX_TENTATIVAS ? 0 : tentativas,
        bloqueadoAte: tentativas >= MAX_TENTATIVAS ? new Date(Date.now() + BLOQUEIO_MINUTOS * 60_000) : null,
      },
    });
    await registrarHistorico({ usuarioId: usuario.id, acao: "LOGIN_FALHA", entidade: "Usuario", entidadeId: usuario.id, ip });
    return erroGenerico;
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { tentativasFalhas: 0, bloqueadoAte: null, ultimoAcesso: new Date() },
  });
  // Limpeza oportunista de sessões expiradas deste usuário.
  await prisma.sessao.deleteMany({ where: { usuarioId: usuario.id, expiraEm: { lt: new Date() } } });
  await criarSessao(usuario.id);
  await registrarHistorico({ usuarioId: usuario.id, acao: "LOGIN", entidade: "Usuario", entidadeId: usuario.id, ip });

  redirect(destinoSeguro(destino));
}

export async function sair(): Promise<void> {
  const usuario = await obterUsuarioAtual();
  await encerrarSessao();
  if (usuario) {
    await registrarHistorico({ usuarioId: usuario.id, acao: "LOGOUT", entidade: "Usuario", entidadeId: usuario.id, ip: await obterIpRequisicao() });
  }
  redirect("/login");
}
