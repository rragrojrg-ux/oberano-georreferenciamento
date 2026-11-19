-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ADMINISTRADOR', 'VISUALIZADOR');

-- CreateEnum
CREATE TYPE "TipoPessoa" AS ENUM ('FISICA', 'JURIDICA');

-- CreateEnum
CREATE TYPE "StatusServico" AS ENUM ('AGUARDANDO_INICIO', 'EM_ANDAMENTO', 'PAUSADO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusEtapa" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('PIX', 'TRANSFERENCIA', 'BOLETO', 'DINHEIRO', 'CHEQUE', 'CARTAO', 'OUTRO');

-- CreateEnum
CREATE TYPE "CategoriaDocumento" AS ENUM ('MATRICULA', 'CAR', 'CCIR', 'CONTRATO', 'PLANTA', 'MEMORIAL_DESCRITIVO', 'ARQUIVO_TECNICO', 'COMPROVANTE', 'OUTRO');

-- CreateEnum
CREATE TYPE "AcaoHistorico" AS ENUM ('CRIAR', 'ATUALIZAR', 'EXCLUIR', 'LOGIN', 'LOGIN_FALHA', 'LOGOUT', 'DOWNLOAD');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL DEFAULT 'VISUALIZADOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "tentativasFalhas" INTEGER NOT NULL DEFAULT 0,
    "bloqueadoAte" TIMESTAMP(3),
    "ultimoAcesso" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "tipoPessoa" "TipoPessoa" NOT NULL DEFAULT 'FISICA',
    "nome" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "telefone" TEXT,
    "email" TEXT,
    "municipio" TEXT NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "observacoes" TEXT,
    "dataCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propriedades" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "areaHectares" DECIMAL(14,4) NOT NULL,
    "areaAlqueires" DECIMAL(14,4) NOT NULL,
    "matricula" TEXT,
    "cartorio" TEXT,
    "codigoIncra" TEXT,
    "ccir" TEXT,
    "car" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "propriedades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_servico" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapas_modelo" (
    "id" TEXT NOT NULL,
    "tipoServicoId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "etapas_modelo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipoServicoId" TEXT NOT NULL,
    "descricaoPersonalizada" TEXT,
    "dataContratacao" DATE NOT NULL,
    "valorContratado" DECIMAL(12,2) NOT NULL,
    "prazoPrevisto" DATE,
    "status" "StatusServico" NOT NULL DEFAULT 'AGUARDANDO_INICIO',
    "responsavelTecnico" TEXT,
    "observacoes" TEXT,
    "concluidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicos_propriedades" (
    "servicoId" TEXT NOT NULL,
    "propriedadeId" TEXT NOT NULL,

    CONSTRAINT "servicos_propriedades_pkey" PRIMARY KEY ("servicoId","propriedadeId")
);

-- CreateTable
CREATE TABLE "etapas" (
    "id" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "status" "StatusEtapa" NOT NULL DEFAULT 'PENDENTE',
    "dataInicio" DATE,
    "dataConclusao" DATE,
    "observacoes" TEXT,

    CONSTRAINT "etapas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_despesa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categorias_despesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despesas" (
    "id" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(12,3),
    "valorUnitario" DECIMAL(12,2),
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "observacoes" TEXT,
    "deslocamentoId" TEXT,
    "usoMaterialId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "despesas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deslocamentos" (
    "id" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "origem" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "km" DECIMAL(10,1) NOT NULL,
    "custoPorKm" DECIMAL(10,2) NOT NULL,
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deslocamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_material" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'un',
    "custoUnitarioPadrao" DECIMAL(12,2),
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tipos_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usos_material" (
    "id" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "tipoMaterialId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "custoUnitario" DECIMAL(12,2) NOT NULL,
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usos_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "forma" "FormaPagamento" NOT NULL DEFAULT 'PIX',
    "descricao" TEXT,
    "chaveIdempotencia" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes" (
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descricao" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("chave")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "categoria" "CategoriaDocumento" NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "nomeArmazenado" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "hashSha256" TEXT NOT NULL,
    "descricao" TEXT,
    "clienteId" TEXT,
    "propriedadeId" TEXT,
    "servicoId" TEXT,
    "despesaId" TEXT,
    "enviadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_alteracoes" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "acao" "AcaoHistorico" NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "detalhes" JSONB,
    "ip" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_alteracoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessoes_tokenHash_key" ON "sessoes"("tokenHash");

-- CreateIndex
CREATE INDEX "sessoes_usuarioId_idx" ON "sessoes"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_documento_key" ON "clientes"("documento");

-- CreateIndex
CREATE INDEX "clientes_nome_idx" ON "clientes"("nome");

-- CreateIndex
CREATE INDEX "clientes_municipio_idx" ON "clientes"("municipio");

-- CreateIndex
CREATE INDEX "propriedades_clienteId_idx" ON "propriedades"("clienteId");

-- CreateIndex
CREATE INDEX "propriedades_municipio_idx" ON "propriedades"("municipio");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_servico_nome_key" ON "tipos_servico"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "etapas_modelo_tipoServicoId_ordem_key" ON "etapas_modelo"("tipoServicoId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "servicos_codigo_key" ON "servicos"("codigo");

-- CreateIndex
CREATE INDEX "servicos_clienteId_idx" ON "servicos"("clienteId");

-- CreateIndex
CREATE INDEX "servicos_status_idx" ON "servicos"("status");

-- CreateIndex
CREATE INDEX "servicos_dataContratacao_idx" ON "servicos"("dataContratacao");

-- CreateIndex
CREATE UNIQUE INDEX "etapas_servicoId_ordem_key" ON "etapas"("servicoId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_despesa_nome_key" ON "categorias_despesa"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "despesas_deslocamentoId_key" ON "despesas"("deslocamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "despesas_usoMaterialId_key" ON "despesas"("usoMaterialId");

-- CreateIndex
CREATE INDEX "despesas_servicoId_idx" ON "despesas"("servicoId");

-- CreateIndex
CREATE INDEX "despesas_data_idx" ON "despesas"("data");

-- CreateIndex
CREATE INDEX "deslocamentos_servicoId_idx" ON "deslocamentos"("servicoId");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_material_nome_key" ON "tipos_material"("nome");

-- CreateIndex
CREATE INDEX "usos_material_servicoId_idx" ON "usos_material"("servicoId");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_chaveIdempotencia_key" ON "pagamentos"("chaveIdempotencia");

-- CreateIndex
CREATE INDEX "pagamentos_servicoId_idx" ON "pagamentos"("servicoId");

-- CreateIndex
CREATE INDEX "pagamentos_data_idx" ON "pagamentos"("data");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_nomeArmazenado_key" ON "documentos"("nomeArmazenado");

-- CreateIndex
CREATE INDEX "documentos_clienteId_idx" ON "documentos"("clienteId");

-- CreateIndex
CREATE INDEX "documentos_propriedadeId_idx" ON "documentos"("propriedadeId");

-- CreateIndex
CREATE INDEX "documentos_servicoId_idx" ON "documentos"("servicoId");

-- CreateIndex
CREATE INDEX "historico_alteracoes_entidade_entidadeId_idx" ON "historico_alteracoes"("entidade", "entidadeId");

-- CreateIndex
CREATE INDEX "historico_alteracoes_criadoEm_idx" ON "historico_alteracoes"("criadoEm");

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propriedades" ADD CONSTRAINT "propriedades_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapas_modelo" ADD CONSTRAINT "etapas_modelo_tipoServicoId_fkey" FOREIGN KEY ("tipoServicoId") REFERENCES "tipos_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_tipoServicoId_fkey" FOREIGN KEY ("tipoServicoId") REFERENCES "tipos_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicos_propriedades" ADD CONSTRAINT "servicos_propriedades_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicos_propriedades" ADD CONSTRAINT "servicos_propriedades_propriedadeId_fkey" FOREIGN KEY ("propriedadeId") REFERENCES "propriedades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapas" ADD CONSTRAINT "etapas_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_despesa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_deslocamentoId_fkey" FOREIGN KEY ("deslocamentoId") REFERENCES "deslocamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_usoMaterialId_fkey" FOREIGN KEY ("usoMaterialId") REFERENCES "usos_material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deslocamentos" ADD CONSTRAINT "deslocamentos_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usos_material" ADD CONSTRAINT "usos_material_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usos_material" ADD CONSTRAINT "usos_material_tipoMaterialId_fkey" FOREIGN KEY ("tipoMaterialId") REFERENCES "tipos_material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_propriedadeId_fkey" FOREIGN KEY ("propriedadeId") REFERENCES "propriedades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_despesaId_fkey" FOREIGN KEY ("despesaId") REFERENCES "despesas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_enviadoPorId_fkey" FOREIGN KEY ("enviadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_alteracoes" ADD CONSTRAINT "historico_alteracoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
