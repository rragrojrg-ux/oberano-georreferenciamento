# SOBERANO GEORREFERENCIAMENTO — Sistema de Gestão

> *A solução está em nosso DNA*

Sistema web para gestão administrativa, operacional e financeira de serviços de georreferenciamento,
topografia e regularização fundiária e ambiental. Interface em português, responsiva (computador, tablet e celular).

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL · Prisma ORM · Zod · Recharts · PDFKit · sessões em banco com cookie httpOnly · bcrypt.

---

## Situação do desenvolvimento

| Etapa | Conteúdo | Situação |
|---|---|---|
| **1** | Estrutura, banco de dados (todos os modelos), autenticação, permissões, layout e painel | ✅ Concluída |
| **2** | Cadastro de clientes e propriedades (busca, validação de CPF/CNPJ, conversão ha → alqueire, exclusão protegida, CPF mascarado para visualizadores) | ✅ Concluída |
| **3** | Serviços (N propriedades), etapas configuráveis com progresso, despesas, quilometragem, marcos, pagamentos parciais sem duplicidade, financeiro por serviço, configurações | ✅ Concluída |
| **4** | Documentos (armazenamento privado, validação de conteúdo), relatórios com exportação PDF/CSV, gestão de usuários, troca de senha, histórico, script de backup | ✅ Concluída |

---

## 1. Requisitos

- **Node.js 20.9+** (recomendado 22 LTS) — <https://nodejs.org>
- **PostgreSQL 14+** — via Docker (`docker compose`) ou instalação local

> **Windows:** mantenha o projeto em um caminho curto (ex.: `C:\projetos\soberano`). Caminhos com mais de
> 260 caracteres impedem o Prisma de executar o motor de migração (erro `ENOENT … schema-engine-windows.exe`).
> Com npm 11+, os scripts de instalação do Prisma e do esbuild já estão liberados em `allowScripts` no `package.json`.

## 2. Instalação

```bash
npm install
cp .env.example .env      # no Windows: copy .env.example .env
```

Edite o `.env`:
- `DATABASE_URL` e `POSTGRES_PASSWORD` — use uma senha forte;
- `SEED_*_EMAIL` — e-mails dos três usuários iniciais;
- `SEED_*_SENHA` — opcional (mín. 10 caracteres). **Se ficar em branco, o seed gera senhas aleatórias e as mostra uma única vez no terminal.** Nenhuma senha fica gravada no código.

## 3. Banco de dados

Com Docker:

```bash
docker compose up -d
```

Ou crie manualmente um banco `soberano` com um usuário `soberano` no PostgreSQL local.

Crie as tabelas e carregue os dados **fictícios** de demonstração:

```bash
npx prisma migrate dev --name inicial
npm run db:seed
```

> O seed **apaga e recria** os dados de negócio de demonstração a cada execução (usuários existentes são preservados). Ele é bloqueado com `NODE_ENV=production`.

## 4. Executar localmente

```bash
npm run dev
```

Acesse <http://localhost:3000> e entre com um dos usuários criados.

### Verificações

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # testes das regras financeiras e de conversão de área
npm run build       # build de produção
```

---

## 5. Arquitetura

```
prisma/
  schema.prisma            modelos relacionais (usuários, sessões, clientes, propriedades, serviços,
                           etapas, despesas, deslocamentos, materiais, pagamentos, documentos, histórico)
  seed.ts                  usuários iniciais + dados fictícios
src/
  middleware.ts            1ª barreira: sem cookie de sessão → /login
  app/
    login/                 tela de login (Server Action + Zod)
    (app)/                 área protegida (layout valida a sessão no banco)
      page.tsx             painel (dashboard)
      clientes/ propriedades/ servicos/ despesas/ quilometragem/ marcos/
      financeiro/ documentos/ relatorios/ usuarios/ historico/ configuracoes/ conta/
    api/documentos/[id]    download protegido (sessão + permissão + auditoria)
    api/relatorios         exportação CSV/PDF
  components/              layout, dashboard, ui, cadastros, servicos, documentos, usuarios, configuracoes
  lib/
    auth/                  sessão, permissões (matriz por perfil), guardas, login/logout
    acoes/                 Server Actions (toda escrita passa por aqui: permissão + Zod + auditoria)
    consultas/             leituras do banco
    validacao/             CPF/CNPJ, números pt-BR, esquemas Zod
    documentos/            validação de arquivos e armazenamento privado
    relatorios/            gerador único + CSV + PDF
    financeiro.ts          fórmulas (em centavos) e conversão ha ↔ alqueire mineiro (4,84 ha)
    auditoria.ts           registro no histórico de alterações
scripts/backup.ps1         backup do banco + documentos (Windows)
```

### Permissões

| Recurso | Administrador | Visualizador |
|---|---|---|
| Painel, clientes, propriedades, serviços, despesas, quilometragem, marcos, financeiro, relatórios | ler e alterar | **somente ler** (CPF mascarado) |
| Documentos | ler e alterar | sem acesso (padrão LGPD; liberável em `permissoes.ts`) |
| Usuários, histórico, configurações | ler e alterar | sem acesso |
| Própria senha (`/conta`) | sim | sim |

### Documentos

- Armazenados em `storage/documentos` (ou `STORAGE_DIR`), **fora de `/public`**, com nome aleatório (UUID) e hash SHA-256.
- Tipos aceitos: PDF, JPG, PNG, DOC/DOCX, XLS/XLSX, KML/KMZ, DWG/DXF, ZIP, CSV, TXT — até 20 MB.
- O **conteúdo** é verificado (assinatura do arquivo), não só a extensão: um `.exe` renomeado para `.pdf` é recusado.
- Download só pela rota protegida, com `Content-Disposition`, `nosniff`, CSP restritiva e registro no histórico.

### Relatórios

Despesas por serviço · Recebimentos · Valores pendentes · Serviços em andamento · Serviços concluídos · Resultado financeiro por serviço.
Filtros por cliente, propriedade, serviço e período. Exportação em **PDF** (A4 paisagem, com marca e rodapé) e **CSV** (`;`, UTF-8 — abre direto no Excel), com proteção contra injeção de fórmulas.

### Regras de negócio já modeladas

- **Alqueire mineiro** = 4,84 ha (área em alqueires calculada a partir dos hectares).
- **Serviço ↔ propriedades**: relação N:N (um serviço pode abranger várias propriedades).
- **Etapas configuráveis**: cada tipo de serviço tem um modelo de etapas copiado para o serviço na criação.
- **Sem dupla contagem**: deslocamentos e usos de marcos geram **uma** despesa vinculada (chave única no banco); o total de despesas do serviço vem de um único livro de despesas.
- **Pagamentos sem duplicidade**: cada lançamento carrega uma chave de idempotência única gerada pelo formulário.
- **Financeiro** (por serviço):
  - Saldo a receber = valor contratado − pagamentos recebidos
  - Resultado estimado = valor contratado − despesas registradas
  - Margem estimada (%) = resultado estimado ÷ valor contratado × 100
  - Fluxo de caixa = recebido − despesas (com data no período)
  - **Lucro contábil não é calculado** pelo sistema (depende de tributos e regime contábil).

---

## 6. Segurança e privacidade (LGPD)

Implementado:
- Senhas com **bcrypt** (custo 12); nenhuma senha no código. Senha mínima de 10 caracteres com letras e números.
- Gestão de usuários: criar, alterar perfil, desativar (derruba as sessões na hora), gerar nova senha, encerrar sessões. O sistema impede ficar sem administrador ativo.
- **Sessões no banco**: o cookie (`httpOnly`, `SameSite=Lax`, `Secure` em produção) guarda um token aleatório de 256 bits; o banco guarda apenas o **hash SHA-256**. Expiração configurável (padrão 8 h). Usuário desativado perde o acesso imediatamente.
- **Bloqueio** de 15 min após 5 senhas erradas; mensagem de erro genérica; tempo de resposta uniforme para e-mails inexistentes.
- **Permissões verificadas no servidor** (`src/lib/auth/permissoes.ts` + `guardas.ts`). Visualizadores não têm nenhuma permissão de escrita; páginas restritas retornam 404.
- Proteção contra **redirecionamento aberto** no login.
- Cabeçalhos de segurança (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, etc.) e `robots: noindex`.
- **Histórico** de login, falha de login, logout, criações, alterações, exclusões, downloads e exportações (com IP), consultável em `/historico`.
- Prisma e lógica de sessão marcados com `server-only` — não podem ir para o navegador.

Diretrizes LGPD adotadas:
- Coletar apenas dados necessários ao serviço (finalidade e necessidade).
- Histórico registra ids e campos alterados — nunca senhas ou documentos completos.
- Documentos em armazenamento **privado** (fora de `/public`), servidos apenas após checagem de permissão; visualizadores não acessam documentos por padrão.
- Relatórios exportados trazem no rodapé o aviso de documento interno com dados pessoais.
- Dados de demonstração são 100% fictícios (e-mails `@exemplo.invalid`, nomes marcados como fictícios).

## 7. Backup e recuperação

Backup diário recomendado (manter cópias fora do servidor, criptografadas).

**Windows (PostgreSQL instalado localmente)** — salva o banco e a pasta de documentos em `backups/`, mantendo 30 dias:

```bash
powershell -ExecutionPolicy Bypass -File scripts\backup.ps1
```

Agende no **Agendador de Tarefas** (diariamente) e copie a pasta `backups` para um HD externo ou nuvem.
Para restaurar o banco: `pg_restore -h localhost -U soberano -d soberano --clean arquivo.dump`; para os documentos, extraia o `.zip` em `storage/`.

**Docker:**

```bash
# backup
docker exec soberano-db pg_dump -U soberano -Fc soberano > backups/soberano_AAAA-MM-DD.dump
# restauração
docker exec -i soberano-db pg_restore -U soberano -d soberano --clean < backups/soberano_AAAA-MM-DD.dump
```

- Em nuvem, prefira um PostgreSQL gerenciado com backup automático e recuperação ponto-no-tempo.
- Arquivos de documentos (pasta `storage/`) também devem entrar na rotina de backup.
- Teste a restauração periodicamente.

## 8. Publicação (produção)

> ⚠️ **Não publique na internet** antes de revisar permissões e segurança, trocar todas as senhas de demonstração e apagar os dados fictícios.

Lista de verificação antes de publicar:
- [ ] HTTPS ativo; `NODE_ENV=production` (cookie `Secure`).
- [ ] Banco com senha forte e acesso restrito (não exposto à internet).
- [ ] `STORAGE_DIR` em volume persistente, incluído no backup.
- [ ] Usuários de demonstração desativados; administradores reais criados em `/usuarios`.
- [ ] Backup automático testado (restauração feita ao menos uma vez).
- [ ] Logomarca oficial aplicada.

1. Provisione PostgreSQL gerenciado e defina `DATABASE_URL` nas variáveis de ambiente do servidor.
2. `npm ci && npx prisma migrate deploy && npm run build && npm start` (ou use Vercel/Render/Railway/VPS com Node).
3. Sirva **somente via HTTPS**.
4. Crie os usuários reais pelo módulo de usuários (Etapa 4) — **não** rode o seed com dados fictícios em produção.
5. Configure backups automáticos e monitoramento de erros.

### 8.1 Publicação gratuita: Vercel + Supabase

> **Atenção aos termos:** o plano gratuito da Vercel (Hobby) é destinado a uso pessoal/não comercial. Para uso
> da empresa, confira os termos atuais — pode ser necessário o plano Pro. O plano gratuito do Supabase pausa o
> projeto após ~1 semana sem acesso (basta reativar no painel).

**A. Supabase (banco + arquivos)** — <https://supabase.com>
1. Crie um projeto (região **South America (São Paulo)**) e anote a senha do banco.
2. *Project Settings → Database → Connection string*:
   - **Transaction pooler** (porta 6543) → será o `DATABASE_URL`. Acrescente ao final `?pgbouncer=true&connection_limit=1`.
   - **Direct connection** ou **Session pooler** (porta 5432) → será o `DIRECT_URL`.
3. *Storage → New bucket*: nome `documentos`, **Public bucket DESMARCADO** (privado).
4. *Project Settings → API Keys*: copie a chave **secreta** (`service_role` ou `sb_secret_…`). Ela dá acesso total — nunca a coloque no código nem em variável `NEXT_PUBLIC_`.

**B. Criar as tabelas e o primeiro administrador** (no seu computador, apontando temporariamente para a nuvem)
1. Num arquivo `.env.producao` (não versionado), coloque `DATABASE_URL` e `DIRECT_URL` do Supabase.
2. Rode, no PowerShell:
   ```powershell
   Get-Content .env.producao | ForEach-Object { if ($_ -match '^(\w+)="?(.*?)"?$') { Set-Item "env:$($Matches[1])" $Matches[2] } }
   npx prisma migrate deploy
   npm run criar-admin -- seu-email@empresa.com.br "Seu Nome"
   ```
   O script cria tipos de serviço, etapas, categorias e materiais, **sem dados fictícios**, e mostra a senha do administrador uma única vez.

**C. GitHub** — crie um repositório **privado** e envie o código (o `.gitignore` já exclui `.env`, `storage/` e `backups/`).

**D. Vercel** — <https://vercel.com> → *Add New Project* → importe o repositório. Em *Environment Variables*:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | conexão *Transaction pooler* (com `?pgbouncer=true&connection_limit=1`) |
| `DIRECT_URL` | conexão direta / *Session pooler* |
| `STORAGE_DRIVER` | `supabase` |
| `SUPABASE_URL` | `https://SEU-PROJETO.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | chave secreta do passo A.4 |
| `SUPABASE_BUCKET` | `documentos` |
| `SESSAO_DURACAO_HORAS` | `8` |

Clique em **Deploy**. O script `vercel-build` gera o Prisma, aplica migrações pendentes e compila.
A cada `git push`, a Vercel publica a nova versão automaticamente.

**Como os documentos funcionam na nuvem:** a Vercel aceita no máximo ~4,5 MB por requisição. Por isso, no modo
`supabase`, o navegador envia o arquivo **direto ao bucket privado** por uma URL assinada de uso único; em seguida
o servidor baixa o arquivo, **confere o conteúdo real** (assinatura, tamanho) e só então registra — se for inválido,
apaga do bucket. O download continua passando pela rota protegida do sistema.

**Backup na nuvem:** o Supabase gratuito não garante backups. Faça periodicamente
`pg_dump "<DIRECT_URL>" -Fc -f soberano.dump` e baixe os arquivos do bucket pelo painel.

## 9. Identidade visual

- Azul-marinho `#0b1f3f` (principal) e dourado `#c9a227` (secundária), definidos em `src/app/globals.css` (`@theme`).
- A marca atual é **provisória** (vetor em `src/components/marca/logo.tsx` e `src/app/icon.svg`). Para usar a logomarca oficial, salve-a em `public/logo-oficial.png` e substitua o `<svg>` do componente `Logo` por `next/image`.
