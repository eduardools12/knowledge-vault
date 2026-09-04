# Knowledge Vault

Acervo pessoal de conhecimento. Não é um app de notas: é uma **rede** de
conhecimentos, fontes, áreas, projetos e relações, construída para durar e
crescer.

O fluxo que o produto persegue:

```
capturar → organizar → compreender → relacionar → consultar → aplicar
```

## Estado atual

**Etapa 1 concluída** — arquitetura, modelo de dados e autenticação, com o
banco provisionado e o fluxo de acesso verificado ponta a ponta.

O banco já contempla o produto inteiro (grafo, revisão espaçada, embeddings,
projetos), mesmo que a interface ainda cubra apenas o acesso. Isso é
intencional: mudar schema depois que existem dados é caro; mudar tela é barato.

Veja [docs/roadmap.md](docs/roadmap.md) para as 14 etapas.

## Stack

| Camada | Escolha |
| --- | --- |
| Aplicação | Next.js 16 (App Router, Server Components) + TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui (Base UI) |
| Backend | Server Actions e Route Handlers no próprio Next.js |
| Banco | PostgreSQL via Supabase |
| Auth | Supabase Auth (e-mail + senha) |
| Arquivos | Supabase Storage (bucket privado) |
| Busca | `tsvector` + `pg_trgm` agora; `pgvector` já provisionado |
| Testes | Vitest |
| Deploy | Vercel |

## Como executar

Requer **Node.js 20.9+** (o projeto foi verificado no Node 24).

```bash
npm install
```

Copie o template de variáveis e preencha com os dados do seu projeto Supabase
(Dashboard → Project Settings → API):

```bash
cp .env.example .env.local
```

> O projeto Supabase `knowledge-vault` (região `sa-east-1`) já existe e está com
> as 9 migrações aplicadas. O `.env.local` da máquina onde foi feito o setup já
> está preenchido; em outra máquina, copie os valores do dashboard.

Para aplicar migrações novas a partir daqui:

```bash
npx supabase login
npx supabase link --project-ref amxwjeouqmikjvrrqbvz
npm run db:push
```

E suba a aplicação:

```bash
npm run dev
```

Depois de criar o banco, gere os tipos do Postgres para o TypeScript:

```bash
npm run db:types
```

> **Antes do primeiro cadastro**, ajuste os templates de e-mail no Supabase para
> apontarem para `/auth/confirm`. O passo a passo está em
> [docs/development.md](docs/development.md#configuração-do-supabase-auth).

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sem emitir arquivos |
| `npm test` | Testes (Vitest) |
| `npm run verify` | Lint + typecheck + testes — rode antes de fechar uma etapa |
| `npm run db:push` | Aplica as migrações no banco linkado |
| `npm run db:types` | Regenera `src/types/database.ts` a partir do banco |

## Estrutura

```
src/
├── app/
│   ├── (auth)/            Páginas públicas de acesso e handlers de e-mail
│   ├── (app)/             Páginas privadas (exigem sessão)
│   └── layout.tsx         Fontes, tema e providers globais
├── components/
│   ├── ui/                Primitivas do shadcn/ui
│   ├── forms/             Campo, alerta e botão de submit acessíveis
│   └── layout/            Elementos de casca da aplicação
├── features/
│   └── auth/              Server Actions e schemas de validação
├── lib/
│   ├── auth/dal.ts        Data Access Layer — checagem autoritativa de sessão
│   ├── supabase/          Clientes de browser, servidor e proxy
│   ├── domain.ts          Enums do banco ↔ rótulos em português
│   ├── routes.ts          Rotas e classificação público/privado
│   ├── env.ts             Validação das variáveis de ambiente
│   └── forms.ts           Contrato compartilhado dos formulários
└── proxy.ts               Refresh de sessão e redirecionamento otimista

supabase/migrations/       Schema versionado, aplicado em ordem
docs/                      Arquitetura, banco, IA, desenvolvimento, roadmap
tests/                     Testes das funções críticas
```

## Documentação

- [docs/architecture.md](docs/architecture.md) — camadas, segurança e decisões
- [docs/database.md](docs/database.md) — modelo de dados e convenções
- [docs/ai.md](docs/ai.md) — estratégia de IA, embeddings e RAG
- [docs/development.md](docs/development.md) — setup, Supabase e workflow
- [docs/roadmap.md](docs/roadmap.md) — as 14 etapas
