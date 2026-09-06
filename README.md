# Knowledge Vault

Acervo pessoal de conhecimento. Não é um app de notas: é uma **rede** de
conhecimentos, fontes, áreas, projetos e relações, construída para durar e
crescer.

O fluxo que o produto persegue:

```
capturar → organizar → compreender → relacionar → consultar → aplicar
```

## Estado atual

**Etapas 1 a 13 concluídas** — arquitetura, banco, autenticação, casca da
aplicação, dashboard, CRUD de conhecimentos com editor rico, áreas, tags e
fontes com upload de arquivo, a Inbox de captura rápida com fila de
processamento, relacionamentos entre conhecimentos, projetos com vínculo a
conhecimentos, busca global ranqueada com fallback trigram, a fundação de
acesso a IA, sugestão de título/resumo/nível/área/tags ao transformar um item
da Inbox em conhecimento, busca híbrida — todo conhecimento e fonte é
indexado em vetores automaticamente e `/busca` combina palavra-chave com
significado — RAG: um botão "Perguntar à IA" na própria busca, que responde
citando os conhecimentos e fontes realmente usados, com expansão de contexto
pelo grafo de relações — e `/grafo`: o acervo como rede interativa, com
filtro por área e por profundidade a partir de um nó focado — tudo verificado
ponta a ponta.

O banco já contempla o produto inteiro (grafo, revisão espaçada, embeddings,
projetos), mesmo que a interface ainda cubra pouco dele. Isso é intencional:
mudar schema depois que existem dados é caro; mudar tela é barato.

As dez seções da sidebar já existem como rota. As que ainda não foram
construídas dizem em qual etapa entram e o que vão permitir — uma seção honesta
sobre estar inacabada confunde menos do que uma que parece quebrada.

Veja [docs/roadmap.md](docs/roadmap.md) para as 14 etapas.

## Stack

| Camada | Escolha |
| --- | --- |
| Aplicação | Next.js 16 (App Router, Server Components) + TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui (Base UI) |
| Editor | Tiptap (ProseMirror), documento em JSONB |
| Backend | Server Actions e Route Handlers no próprio Next.js |
| Banco | PostgreSQL via Supabase |
| Auth | Supabase Auth (e-mail + senha) |
| Arquivos | Supabase Storage (bucket privado) |
| Busca | Híbrida: `tsvector` + `pg_trgm` (palavra-chave) e `pgvector` (semântica), combinadas com Reciprocal Rank Fusion |
| Embeddings | OpenAI `text-embedding-3-small`, indexado por fila (Vercel Cron) |
| Grafo | `reagraph` (WebGL via Three.js), layout de força |
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
> as 15 migrações aplicadas. O `.env.local` da máquina onde foi feito o setup já
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
│   ├── api/jobs/embeddings/  Worker da fila de indexação, chamado pelo Vercel Cron
│   └── layout.tsx         Fontes, tema e providers globais
├── components/
│   ├── ui/                Primitivas do shadcn/ui
│   ├── forms/             Campo, alerta, cor, arquivo e botão de submit acessíveis
│   ├── common/            Cabeçalho de página, estado vazio, paginação
│   ├── knowledge/         Indicador de nível de maturidade
│   ├── areas/             Seletor de área (compartilhado por área e conhecimento)
│   ├── tags/              Badge e seletor de tags (checkbox)
│   ├── sources/           Seletor de fontes (checkbox)
│   └── layout/            Sidebar, navegação mobile, menu de usuário
├── features/
│   ├── auth/              Server Actions e schemas de validação
│   ├── dashboard/         Consultas, insights e componentes do dashboard
│   ├── knowledge/         CRUD, editor, sanitização do documento e busca
│   ├── areas/             CRUD, árvore e guarda de ciclo da hierarquia
│   ├── tags/              CRUD e criação rápida em lote
│   ├── sources/           CRUD, upload direto ao Storage e caminho assinado
│   ├── inbox/             Captura rápida, fila de estados, transformação em conhecimento e sugestão por IA
│   ├── relations/         Arestas do grafo entre conhecimentos, com direção e tipo
│   ├── projects/          CRUD de projetos e vínculo com conhecimentos, com nota por par
│   ├── search/            Busca híbrida (palavra-chave + semântica) e RAG ("Perguntar à IA"), com filtros combinados e fallback trigram
│   └── graph/             Visualização interativa das relações, com filtro por área e profundidade
├── lib/
│   ├── auth/dal.ts        Data Access Layer — checagem autoritativa de sessão
│   ├── ai/                Acesso a LLM: provedor, custo, erro e limite de taxa
│   ├── embeddings/        Geração de vetores, chunking e o worker da fila de indexação
│   ├── supabase/          Clientes de browser, servidor, serviço (bypassa RLS) e proxy
│   ├── domain.ts          Enums do banco ↔ rótulos em português
│   ├── routes.ts          Rotas e classificação público/privado
│   ├── navigation.ts      Itens da sidebar e estado de item ativo
│   ├── search.ts          Conversão da busca em tsquery de prefixo e Reciprocal Rank Fusion
│   ├── slug.ts            Geração de slug com suporte a acentuação
│   ├── palette.ts         Paleta fixa de cores para áreas e tags
│   ├── dates.ts           Datas relativas em pt-BR
│   ├── env.ts             Validação das variáveis de ambiente
│   ├── forms.ts           Contrato compartilhado dos formulários
│   ├── storage.ts         Regras do bucket privado, compartilhadas entre features
│   └── storage-server.ts  URL assinada e remoção de arquivo (só servidor)
└── proxy.ts               Refresh de sessão e redirecionamento otimista

supabase/migrations/       Schema versionado, aplicado em ordem
docs/                      Arquitetura, banco, IA, desenvolvimento, roadmap
tests/                     Testes das funções críticas
vercel.json                Cron job diário que dispara a indexação de embeddings
```

## Documentação

- [docs/architecture.md](docs/architecture.md) — camadas, segurança e decisões
- [docs/database.md](docs/database.md) — modelo de dados e convenções
- [docs/ai.md](docs/ai.md) — estratégia de IA, embeddings e RAG
- [docs/development.md](docs/development.md) — setup, Supabase e workflow
- [docs/roadmap.md](docs/roadmap.md) — as 14 etapas
