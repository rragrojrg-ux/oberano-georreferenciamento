/**
 * Seed de demonstração — SOMENTE DADOS FICTÍCIOS.
 * - Usuários: criados a partir das variáveis SEED_* do .env. Sem senha definida, gera uma aleatória
 *   e a exibe uma única vez. Usuários existentes NÃO têm a senha alterada.
 * - Dados de negócio: apagados e recriados a cada execução (não rode em produção com dados reais!).
 */
import { PrismaClient, Perfil, StatusEtapa, StatusServico, FormaPagamento } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
import {
  CATEGORIAS_DESPESA,
  CATEGORIA_MARCOS,
  CATEGORIA_QUILOMETRAGEM,
  CONFIG_CUSTO_POR_KM,
  CUSTO_POR_KM_PADRAO,
  TIPOS_MATERIAL,
  TIPOS_SERVICO,
} from "../src/lib/dominio";
import { hectaresParaAlqueires } from "../src/lib/financeiro";

const prisma = new PrismaClient();

if (process.env.NODE_ENV === "production" && process.env.SEED_PERMITIR_PRODUCAO !== "sim") {
  console.error("Seed bloqueado em produção. Defina SEED_PERMITIR_PRODUCAO=sim se tiver certeza.");
  process.exit(1);
}

// Gerador pseudoaleatório determinístico (mesmos dados a cada execução).
let semente = 20261119;
function aleatorio(): number {
  semente = (semente * 1664525 + 1013904223) % 4294967296;
  return semente / 4294967296;
}
const inteiro = (min: number, max: number) => Math.floor(aleatorio() * (max - min + 1)) + min;
const escolher = <T,>(lista: readonly T[]): T => lista[Math.floor(aleatorio() * lista.length)];

function gerarCpf(): string {
  const n = Array.from({ length: 9 }, () => inteiro(0, 9));
  const dv = (base: number[]) => {
    const soma = base.reduce((s, d, i) => s + d * (base.length + 1 - i), 0);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  n.push(dv(n));
  n.push(dv(n));
  return n.join("");
}

function gerarCnpj(): string {
  const n = [...Array.from({ length: 8 }, () => inteiro(0, 9)), 0, 0, 0, 1];
  const dv = (base: number[]) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = base.reduce((s, d, i) => s + d * pesos[i], 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  n.push(dv(n));
  n.push(dv(n));
  return n.join("");
}

const hoje = new Date();
function diasAtras(dias: number): Date {
  const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - dias);
  return d;
}
function somarDias(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + dias);
  return d;
}

async function criarUsuarios() {
  const definicoes = [
    { nome: "Administrador (demo)", email: process.env.SEED_ADMIN_EMAIL, senha: process.env.SEED_ADMIN_SENHA, perfil: Perfil.ADMINISTRADOR },
    { nome: "Visualizador 1 (demo)", email: process.env.SEED_VISUALIZADOR1_EMAIL, senha: process.env.SEED_VISUALIZADOR1_SENHA, perfil: Perfil.VISUALIZADOR },
    { nome: "Visualizador 2 (demo)", email: process.env.SEED_VISUALIZADOR2_EMAIL, senha: process.env.SEED_VISUALIZADOR2_SENHA, perfil: Perfil.VISUALIZADOR },
  ];

  const geradas: { email: string; senha: string }[] = [];
  for (const d of definicoes) {
    if (!d.email) throw new Error("Defina SEED_ADMIN_EMAIL, SEED_VISUALIZADOR1_EMAIL e SEED_VISUALIZADOR2_EMAIL no .env");
    const email = d.email.trim().toLowerCase();
    const existente = await prisma.usuario.findUnique({ where: { email } });
    if (existente) continue;

    let senha = d.senha?.trim();
    if (!senha) {
      senha = randomBytes(12).toString("base64url");
      geradas.push({ email, senha });
    } else if (senha.length < 10) {
      throw new Error(`A senha definida para ${email} precisa ter ao menos 10 caracteres.`);
    }
    await prisma.usuario.create({
      data: { nome: d.nome, email, perfil: d.perfil, senhaHash: await bcrypt.hash(senha, 12) },
    });
  }

  if (geradas.length) {
    console.log("\n=== Senhas geradas (anote agora — não serão exibidas novamente) ===");
    for (const g of geradas) console.log(`  ${g.email}  →  ${g.senha}`);
    console.log("===================================================================\n");
  }
}

async function limparDadosDeNegocio() {
  await prisma.$transaction([
    prisma.documento.deleteMany(),
    prisma.despesa.deleteMany(),
    prisma.deslocamento.deleteMany(),
    prisma.usoMaterial.deleteMany(),
    prisma.pagamento.deleteMany(),
    prisma.etapa.deleteMany(),
    prisma.servicoPropriedade.deleteMany(),
    prisma.servico.deleteMany(),
    prisma.propriedade.deleteMany(),
    prisma.cliente.deleteMany(),
    prisma.etapaModelo.deleteMany(),
    prisma.tipoServico.deleteMany(),
    prisma.categoriaDespesa.deleteMany(),
    prisma.tipoMaterial.deleteMany(),
  ]);
}

async function criarCadastrosBase() {
  for (const t of TIPOS_SERVICO) {
    await prisma.tipoServico.create({
      data: { nome: t.nome, etapasModelo: { create: t.etapas.map((nome, i) => ({ nome, ordem: i + 1 })) } },
    });
  }
  await prisma.categoriaDespesa.createMany({ data: CATEGORIAS_DESPESA });
  await prisma.tipoMaterial.createMany({
    data: TIPOS_MATERIAL.map((m) => ({ nome: m.nome, unidade: m.unidade, custoUnitarioPadrao: m.custo })),
  });
  await prisma.configuracao.upsert({
    where: { chave: CONFIG_CUSTO_POR_KM },
    update: {},
    create: { chave: CONFIG_CUSTO_POR_KM, valor: CUSTO_POR_KM_PADRAO, descricao: "Custo por quilômetro rodado (R$)" },
  });
}

const MUNICIPIOS_MG = [
  "Patos de Minas", "Unaí", "Paracatu", "João Pinheiro", "Presidente Olegário", "Lagoa Grande",
  "Vazante", "Coromandel", "Patrocínio", "Carmo do Paranaíba", "São Gonçalo do Abaeté", "Buritizeiro",
];
const NOMES = [
  "Ana Fictícia Moreira", "Bruno Exemplo Carvalho", "Carla Demonstração Lima", "Diego Teste Ribeiro",
  "Elaine Modelo Souza", "Fábio Amostra Pereira", "Gabriela Simulada Costa", "Hugo Protótipo Alves",
  "Isabela Ensaio Rocha",
];
const EMPRESAS = ["Agropecuária Fictícia Ltda", "Fazendas Exemplo S.A.", "Grãos Demonstração Ltda"];
const NOMES_FAZENDA = [
  "Fazenda Boa Vista", "Sítio Água Limpa", "Fazenda Santa Luzia", "Fazenda Barreiro", "Sítio Recanto",
  "Fazenda Vereda Grande", "Fazenda São José", "Fazenda Capão Seco", "Sítio Bom Jardim", "Fazenda Lagoa Formosa",
  "Fazenda Ribeirão", "Fazenda Cachoeira", "Fazenda Pindaíba", "Sítio Primavera", "Fazenda Esperança",
];
const RESPONSAVEIS = ["Eng. Agrim. (demo) João Técnico", "Téc. (demo) Maria Campo"];

async function criarDadosFicticios() {
  const tipos = await prisma.tipoServico.findMany({ include: { etapasModelo: { orderBy: { ordem: "asc" } } } });
  const categorias = Object.fromEntries((await prisma.categoriaDespesa.findMany()).map((c) => [c.nome, c.id]));
  const materiais = await prisma.tipoMaterial.findMany();
  const custoKm = Number(CUSTO_POR_KM_PADRAO);

  // Clientes
  const clientes = [];
  const pessoas = [
    ...NOMES.map((nome) => ({ nome, pj: false })),
    ...EMPRESAS.map((nome) => ({ nome, pj: true })),
  ];
  for (const [i, p] of pessoas.entries()) {
    const municipio = escolher(MUNICIPIOS_MG);
    clientes.push(
      await prisma.cliente.create({
        data: {
          nome: p.nome,
          tipoPessoa: p.pj ? "JURIDICA" : "FISICA",
          documento: p.pj ? gerarCnpj() : gerarCpf(),
          telefone: `(34) 9${inteiro(8000, 9999)}-${inteiro(1000, 9999)}`,
          email: `cliente${i + 1}@exemplo.invalid`,
          municipio,
          uf: "MG",
          observacoes: "Cliente fictício para demonstração.",
          dataCadastro: diasAtras(inteiro(20, 400)),
        },
      }),
    );
  }

  // Propriedades (1 a 3 por cliente)
  const propriedadesPorCliente = new Map<string, string[]>();
  let idxFazenda = 0;
  for (const c of clientes) {
    const qtd = inteiro(1, c.tipoPessoa === "JURIDICA" ? 3 : 2);
    const ids: string[] = [];
    for (let k = 0; k < qtd; k++) {
      const ha = inteiro(1500, 95000) / 100;
      const temDocs = aleatorio() > 0.3;
      const p = await prisma.propriedade.create({
        data: {
          clienteId: c.id,
          nome: NOMES_FAZENDA[idxFazenda++ % NOMES_FAZENDA.length],
          municipio: c.municipio,
          uf: "MG",
          areaHectares: ha,
          areaAlqueires: hectaresParaAlqueires(ha),
          matricula: temDocs ? String(inteiro(1000, 60000)) : null,
          cartorio: temDocs ? `Cartório de Registro de Imóveis de ${c.municipio} (fictício)` : null,
          codigoIncra: aleatorio() > 0.5 ? `950.${inteiro(100, 999)}.${inteiro(100, 999)}.${inteiro(100, 999)}-${inteiro(0, 9)}` : null,
          ccir: aleatorio() > 0.5 ? String(inteiro(10000000000, 99999999999)) : null,
          car: aleatorio() > 0.4 ? `MG-${inteiro(3100000, 3172000)}-DEMO${randomUUID().slice(0, 8).toUpperCase()}` : null,
          observacoes: "Propriedade fictícia.",
        },
      });
      ids.push(p.id);
    }
    propriedadesPorCliente.set(c.id, ids);
  }

  // Serviços
  const ano = hoje.getUTCFullYear();
  for (let s = 0; s < 22; s++) {
    const cliente = escolher(clientes);
    const props = propriedadesPorCliente.get(cliente.id)!;
    const tipo = s < 8 ? tipos.find((t) => t.nome === "Georreferenciamento")! : escolher(tipos);
    const dataContratacao = diasAtras(inteiro(5, 360));
    const idade = Math.round((hoje.getTime() - dataContratacao.getTime()) / 86_400_000);
    const valor = tipo.nome === "Georreferenciamento" ? inteiro(60, 280) * 100 : inteiro(15, 120) * 100;

    let status: StatusServico;
    if (idade > 200) status = aleatorio() > 0.15 ? "CONCLUIDO" : "EM_ANDAMENTO";
    else if (idade > 30) status = escolher(["EM_ANDAMENTO", "EM_ANDAMENTO", "CONCLUIDO", "PAUSADO"] as const);
    else status = escolher(["AGUARDANDO_INICIO", "EM_ANDAMENTO"] as const);
    if (s === 21) status = "CANCELADO";

    const totalEtapas = tipo.etapasModelo.length;
    const concluidas =
      status === "CONCLUIDO" ? totalEtapas
      : status === "AGUARDANDO_INICIO" ? 0
      : status === "CANCELADO" ? 1
      : Math.min(totalEtapas - 1, Math.max(1, Math.round((idade / 240) * totalEtapas)));

    const vinculadas = props.length > 1 && aleatorio() > 0.6 ? props.slice(0, 2) : [escolher(props)];

    const servico = await prisma.servico.create({
      data: {
        codigo: `SRV-${ano}-${String(s + 1).padStart(4, "0")}`,
        clienteId: cliente.id,
        tipoServicoId: tipo.id,
        dataContratacao,
        valorContratado: valor,
        prazoPrevisto: somarDias(dataContratacao, inteiro(60, 180)),
        status,
        responsavelTecnico: escolher(RESPONSAVEIS),
        observacoes: "Serviço fictício para demonstração.",
        concluidoEm: status === "CONCLUIDO" ? somarDias(dataContratacao, Math.min(idade, inteiro(60, 200))) : null,
        propriedades: { create: vinculadas.map((propriedadeId) => ({ propriedadeId })) },
        etapas: {
          create: tipo.etapasModelo.map((e, i) => {
            const inicio = somarDias(dataContratacao, i * 7);
            const st: StatusEtapa = i < concluidas ? "CONCLUIDA" : i === concluidas && status === "EM_ANDAMENTO" ? "EM_ANDAMENTO" : "PENDENTE";
            return {
              ordem: e.ordem,
              nome: e.nome,
              status: st,
              dataInicio: st === "PENDENTE" ? null : inicio,
              dataConclusao: st === "CONCLUIDA" ? somarDias(inicio, inteiro(2, 7)) : null,
            };
          }),
        },
      },
    });

    if (status === "CANCELADO" || status === "AGUARDANDO_INICIO") continue;

    // Pagamentos: entrada + parcelas
    const parcelas = status === "CONCLUIDO" ? [0.4, 0.3, 0.3] : [0.4, ...(aleatorio() > 0.5 ? [0.3] : [])];
    for (const [i, frac] of parcelas.entries()) {
      const data = somarDias(dataContratacao, i * 45);
      if (data > hoje) break;
      await prisma.pagamento.create({
        data: {
          servicoId: servico.id,
          data,
          valor: Math.round(valor * frac * 100) / 100,
          forma: escolher(Object.values(FormaPagamento)),
          descricao: i === 0 ? "Entrada" : `Parcela ${i + 1}`,
          chaveIdempotencia: randomUUID(),
        },
      });
    }

    // Deslocamentos → despesa vinculada (única)
    const viagens = inteiro(1, 3);
    for (let v = 0; v < viagens; v++) {
      const data = somarDias(dataContratacao, 14 + v * 10);
      if (data > hoje) break;
      const km = inteiro(60, 420);
      const total = Math.round(km * custoKm * 100) / 100;
      await prisma.deslocamento.create({
        data: {
          servicoId: servico.id,
          data,
          origem: "Escritório (Patos de Minas)",
          destino: cliente.municipio,
          km,
          custoPorKm: custoKm,
          valorTotal: total,
          despesa: {
            create: {
              servicoId: servico.id,
              categoriaId: categorias[CATEGORIA_QUILOMETRAGEM],
              data,
              descricao: `Deslocamento até ${cliente.municipio} (${km} km)`,
              quantidade: km,
              valorUnitario: custoKm,
              valorTotal: total,
            },
          },
        },
      });
    }

    // Marcos → despesa vinculada (única)
    if (tipo.nome === "Georreferenciamento" || aleatorio() > 0.6) {
      const material = materiais[inteiro(0, 1)];
      const qtd = inteiro(4, 16);
      const custo = Number(material.custoUnitarioPadrao ?? 0);
      const data = somarDias(dataContratacao, 20);
      if (data <= hoje) {
        const total = Math.round(qtd * custo * 100) / 100;
        await prisma.usoMaterial.create({
          data: {
            servicoId: servico.id,
            tipoMaterialId: material.id,
            data,
            quantidade: qtd,
            custoUnitario: custo,
            valorTotal: total,
            despesa: {
              create: {
                servicoId: servico.id,
                categoriaId: categorias[CATEGORIA_MARCOS],
                data,
                descricao: `${qtd} × ${material.nome}`,
                quantidade: qtd,
                valorUnitario: custo,
                valorTotal: total,
              },
            },
          },
        });
      }
    }

    // Despesas avulsas
    const avulsas = ["Alimentação", "Hospedagem", "Pedágio", "Combustível", "Taxas"];
    for (let d = 0; d < inteiro(1, 4); d++) {
      const data = somarDias(dataContratacao, inteiro(10, 60));
      if (data > hoje) continue;
      const cat = escolher(avulsas);
      const valorDesp = inteiro(30, 650);
      await prisma.despesa.create({
        data: {
          servicoId: servico.id,
          categoriaId: categorias[cat],
          data,
          descricao: `${cat} — equipe de campo`,
          valorTotal: valorDesp,
        },
      });
    }
  }
}

async function main() {
  console.log("→ Criando usuários iniciais…");
  await criarUsuarios();
  console.log("→ Limpando dados de demonstração anteriores…");
  await limparDadosDeNegocio();
  console.log("→ Criando cadastros base (tipos de serviço, etapas, categorias, materiais)…");
  await criarCadastrosBase();
  console.log("→ Criando clientes, propriedades e serviços FICTÍCIOS…");
  await criarDadosFicticios();
  console.log("✓ Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
