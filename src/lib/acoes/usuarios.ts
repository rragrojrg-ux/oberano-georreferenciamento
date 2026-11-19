"use server";

import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registrarHistorico } from "@/lib/auditoria";
import { exigirPermissaoAcao } from "@/lib/auth/guardas";
import { exigirUsuario, obterIpRequisicao } from "@/lib/auth/sessao";
import { errosPorCampo } from "@/lib/validacao/esquemas";
import { sucesso, valoresDoFormulario, type EstadoFormulario } from "./tipos";

const CUSTO_BCRYPT = 12;
const senhaForte = z
  .string()
  .min(10, "A senha precisa ter ao menos 10 caracteres.")
  .max(200)
  .refine((s) => /[A-Za-z]/.test(s) && /\d/.test(s), "Use letras e números.");

const esquemaUsuario = z.object({
  nome: z.string().trim().min(3, "Informe o nome.").max(100),
  email: z.string().trim().toLowerCase().email("E-mail inválido.").max(200),
  perfil: z.enum(["ADMINISTRADOR", "VISUALIZADOR"], { errorMap: () => ({ message: "Selecione o perfil." }) }),
  ativo: z.string().optional().transform((v) => v === "on"),
  senha: z.union([z.literal(""), senhaForte]).optional(),
});

const gerarSenha = () => randomBytes(12).toString("base64url").slice(0, 16);

/** Impede ficar sem nenhum administrador ativo. */
async function restariaAdmin(ignorarId: string) {
  return (await prisma.usuario.count({ where: { perfil: "ADMINISTRADOR", ativo: true, id: { not: ignorarId } } })) > 0;
}

export async function salvarUsuario(_a: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const admin = await exigirPermissaoAcao("usuarios", "escrever");
  const valores = valoresDoFormulario(formData);
  const id = valores.id || null;
  const r = esquemaUsuario.safeParse({ ...valores, ativo: id ? valores.ativo : "on" });
  if (!r.success) return { erros: errosPorCampo(r.error), valores: { ...valores, senha: "" } };
  const { senha, ...dados } = r.data;
  const ip = await obterIpRequisicao();

  try {
    if (id) {
      const antes = await prisma.usuario.findUnique({ where: { id } });
      if (!antes) return { mensagem: "Usuário não encontrado." };
      const perdeAdmin = antes.perfil === "ADMINISTRADOR" && (dados.perfil !== "ADMINISTRADOR" || !dados.ativo);
      if (perdeAdmin && id === admin.id) return { mensagem: "Você não pode remover o seu próprio acesso de administrador.", valores };
      if (perdeAdmin && !(await restariaAdmin(id))) return { mensagem: "É preciso manter ao menos um administrador ativo.", valores };

      await prisma.$transaction([
        prisma.usuario.update({ where: { id }, data: dados }),
        // Perfil alterado ou conta desativada: derruba as sessões para valer imediatamente.
        ...(antes.perfil !== dados.perfil || !dados.ativo ? [prisma.sessao.deleteMany({ where: { usuarioId: id } })] : []),
      ]);
      await registrarHistorico({
        usuarioId: admin.id, acao: "ATUALIZAR", entidade: "Usuario", entidadeId: id, ip,
        detalhes: { perfil: dados.perfil, ativo: dados.ativo, email: antes.email !== dados.email ? "alterado" : "mantido" },
      });
      revalidatePath("/usuarios");
      return sucesso("Usuário atualizado.");
    }

    const senhaFinal = senha || gerarSenha();
    const novo = await prisma.usuario.create({
      data: { ...dados, ativo: true, senhaHash: await bcrypt.hash(senhaFinal, CUSTO_BCRYPT) },
    });
    await registrarHistorico({ usuarioId: admin.id, acao: "CRIAR", entidade: "Usuario", entidadeId: novo.id, detalhes: { perfil: dados.perfil }, ip });
    revalidatePath("/usuarios");
    return sucesso(
      senha
        ? `Usuário ${dados.email} criado com a senha informada.`
        : `Usuário ${dados.email} criado. Senha inicial: ${senhaFinal} — anote e entregue com segurança; ela não será exibida novamente.`,
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { erros: { email: ["Já existe um usuário com este e-mail."] }, valores: { ...valores, senha: "" } };
    }
    throw e;
  }
}

export async function redefinirSenha(_a: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const admin = await exigirPermissaoAcao("usuarios", "escrever");
  const id = String(formData.get("id") ?? "");
  const u = await prisma.usuario.findUnique({ where: { id } });
  if (!u) return { mensagem: "Usuário não encontrado." };
  const nova = gerarSenha();
  await prisma.$transaction([
    prisma.usuario.update({ where: { id }, data: { senhaHash: await bcrypt.hash(nova, CUSTO_BCRYPT), tentativasFalhas: 0, bloqueadoAte: null } }),
    prisma.sessao.deleteMany({ where: { usuarioId: id } }),
  ]);
  await registrarHistorico({ usuarioId: admin.id, acao: "ATUALIZAR", entidade: "Usuario", entidadeId: id, detalhes: { senha: "redefinida" }, ip: await obterIpRequisicao() });
  return sucesso(`Nova senha de ${u.email}: ${nova} — exibida só agora. As sessões abertas foram encerradas.`);
}

export async function encerrarSessoesUsuario(_a: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const admin = await exigirPermissaoAcao("usuarios", "escrever");
  const id = String(formData.get("id") ?? "");
  const { count } = await prisma.sessao.deleteMany({ where: { usuarioId: id } });
  await registrarHistorico({ usuarioId: admin.id, acao: "ATUALIZAR", entidade: "Usuario", entidadeId: id, detalhes: { sessoesEncerradas: count }, ip: await obterIpRequisicao() });
  revalidatePath("/usuarios");
  return sucesso(`${count} sessão(ões) encerrada(s).`);
}

const esquemaTrocaSenha = z
  .object({ atual: z.string().min(1, "Informe a senha atual."), nova: senhaForte, confirmacao: z.string() })
  .refine((d) => d.nova === d.confirmacao, { path: ["confirmacao"], message: "A confirmação não confere." })
  .refine((d) => d.nova !== d.atual, { path: ["nova"], message: "A nova senha deve ser diferente da atual." });

/** Qualquer usuário pode trocar a própria senha (exige a senha atual). */
export async function trocarMinhaSenha(_a: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const eu = await exigirUsuario();
  const r = esquemaTrocaSenha.safeParse(Object.fromEntries(formData));
  if (!r.success) return { erros: errosPorCampo(r.error) };
  const u = await prisma.usuario.findUnique({ where: { id: eu.id } });
  if (!u || !(await bcrypt.compare(r.data.atual, u.senhaHash))) return { erros: { atual: ["Senha atual incorreta."] } };
  await prisma.usuario.update({ where: { id: eu.id }, data: { senhaHash: await bcrypt.hash(r.data.nova, CUSTO_BCRYPT) } });
  await registrarHistorico({ usuarioId: eu.id, acao: "ATUALIZAR", entidade: "Usuario", entidadeId: eu.id, detalhes: { senha: "alterada pelo próprio usuário" }, ip: await obterIpRequisicao() });
  return sucesso("Senha alterada com sucesso.");
}
