/**
 * Cria (ou reativa) um ADMINISTRADOR e cadastra os dados básicos do sistema
 * (tipos de serviço com etapas, categorias de despesa, materiais e custo por km) — SEM dados fictícios.
 *
 * Uso (o .env deve apontar para o banco desejado):
 *   npm run criar-admin -- email@empresa.com.br "Nome Completo"
 *
 * A senha é gerada aleatoriamente e exibida UMA vez neste terminal. Troque-a no primeiro acesso (Minha conta).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import {
  CATEGORIAS_DESPESA, CONFIG_CUSTO_POR_KM, CUSTO_POR_KM_PADRAO, TIPOS_MATERIAL, TIPOS_SERVICO,
} from "../src/lib/dominio";

const prisma = new PrismaClient();

async function cadastrosBasicos() {
  for (const t of TIPOS_SERVICO) {
    const existe = await prisma.tipoServico.findUnique({ where: { nome: t.nome } });
    if (!existe) {
      await prisma.tipoServico.create({
        data: { nome: t.nome, etapasModelo: { create: t.etapas.map((nome, i) => ({ nome, ordem: i + 1 })) } },
      });
    }
  }
  await prisma.categoriaDespesa.createMany({ data: CATEGORIAS_DESPESA, skipDuplicates: true });
  await prisma.tipoMaterial.createMany({
    data: TIPOS_MATERIAL.map((m) => ({ nome: m.nome, unidade: m.unidade, custoUnitarioPadrao: m.custo })),
    skipDuplicates: true,
  });
  await prisma.configuracao.upsert({
    where: { chave: CONFIG_CUSTO_POR_KM },
    update: {},
    create: { chave: CONFIG_CUSTO_POR_KM, valor: CUSTO_POR_KM_PADRAO, descricao: "Custo por quilômetro rodado (R$)" },
  });
}

async function main() {
  const [emailBruto, ...nomePartes] = process.argv.slice(2);
  const email = emailBruto?.trim().toLowerCase();
  const nome = nomePartes.join(" ").trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || nome.length < 3) {
    console.error('Uso: npm run criar-admin -- email@empresa.com.br "Nome Completo"');
    process.exit(1);
  }

  await cadastrosBasicos();
  const senha = randomBytes(12).toString("base64url").slice(0, 16);
  const senhaHash = await bcrypt.hash(senha, 12);
  const existente = await prisma.usuario.findUnique({ where: { email } });

  if (existente) {
    await prisma.usuario.update({ where: { email }, data: { nome, perfil: "ADMINISTRADOR", ativo: true, senhaHash, tentativasFalhas: 0, bloqueadoAte: null } });
    await prisma.sessao.deleteMany({ where: { usuarioId: existente.id } });
  } else {
    await prisma.usuario.create({ data: { nome, email, perfil: "ADMINISTRADOR", senhaHash } });
  }
  await prisma.historicoAlteracao.create({
    data: { acao: existente ? "ATUALIZAR" : "CRIAR", entidade: "Usuario", detalhes: { origem: "script criar-admin", perfil: "ADMINISTRADOR" } },
  });

  console.log("\nAdministrador pronto.");
  console.log(`  E-mail: ${email}`);
  console.log(`  Senha:  ${senha}   (exibida só agora — troque no primeiro acesso, em "Minha conta")\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
