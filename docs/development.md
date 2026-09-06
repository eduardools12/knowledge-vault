# Desenvolvimento

## Requisitos

- **Node.js 20.9+** — o Next.js 16 não suporta Node 18. Verificado no Node 24.
- Conta no Supabase.

## Setup

```bash
npm install
cp .env.example .env.local
```

### Variáveis de ambiente

| Variável | Obrigatória | Para quê |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sim | Chave anônima/publicável — segura no browser, limitada por RLS |
| `NEXT_PUBLIC_SITE_URL` | em produção | Origem usada nos links dos e-mails de confirmação e recuperação |
| `SUPABASE_SERVICE_ROLE_KEY` | não | Ignora RLS. Só lida por `src/lib/supabase/service.ts`, usada pelo worker de embeddings (Etapa 11). **Nunca** com prefixo `NEXT_PUBLIC_` |
| `ANTHROPIC_API_KEY` | não | Sem ela, "Sugerir com IA" na Inbox mostra um erro amigável em vez de quebrar — o resto do app funciona normalmente. Lida só por `src/lib/ai/anthropic-provider.ts`. **Nunca** com prefixo `NEXT_PUBLIC_` |
| `OPENAI_API_KEY` | não | Sem ela, a fila de embeddings marca cada job como erro e a busca em `/busca` cai só para palavra-chave — nada quebra. Lida só por `src/lib/embeddings/openai-provider.ts`. **Nunca** com prefixo `NEXT_PUBLIC_` |
| `CRON_SECRET` | não | Sem ela, `/api/jobs/embeddings` recusa toda chamada (503) em vez de rodar sem proteção. Configure o mesmo valor no job do Vercel Cron — veja [Deploy](#deploy-vercel) |

As variáveis são validadas por Zod em `src/lib/env.ts` no carregamento do
módulo. Configuração faltando falha na hora, com mensagem legível, em vez de
virar um `Invalid API key` opaco três telas adiante.

`getServerEnv()` lança se for chamada no browser — import errado vira crash
visível, não segredo vazado.

### Banco

```bash
npx supabase link --project-ref SEU_PROJECT_REF
npm run db:push
npm run db:types
```

`db:types` gera `src/types/database.ts`. Rode depois de toda migração e faça
commit do arquivo.

### Configuração do Supabase Auth

Dois ajustes são necessários **antes do primeiro cadastro**, no dashboard.

**1. URLs de redirecionamento** (Authentication → URL Configuration)

Adicione as origens que podem receber links de e-mail:

```
http://localhost:3000/**
https://seu-dominio.vercel.app/**
```

Esta lista é o controle de segurança real dos links de e-mail: uma origem fora
dela é recusada pelo servidor de Auth, independentemente do que a aplicação
enviar.

**2. Templates de e-mail** (Authentication → Email Templates)

O padrão do Supabase usa `{{ .ConfirmationURL }}`, que não passa pelo handler da
aplicação. Troque o link nos templates de **Confirm signup** e **Reset password**
por:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .EmailActionType }}
```

Sem isso, o cadastro funciona mas o clique no e-mail não cria sessão.

## Fluxo diário

```bash
npm run dev
```

Antes de fechar qualquer etapa:

```bash
npm run verify   # lint + typecheck + testes
npm run build
```

Uma etapa não está concluída porque o código foi escrito. Está concluída quando
lint, tipos, testes e build passam.

## Testes

Vitest, ambiente Node. A suíte cobre as funções puras e críticas:

- `tests/routes.test.ts` — classificação público/privado e proteção contra open
  redirect. Erro aqui é bug de segurança.
- `tests/auth-schemas.test.ts` — validação dos formulários de acesso, que é o
  ponto de aplicação no servidor.
- `tests/forms.test.ts` — a ponte entre `FormData` e as Server Actions.
- `tests/dashboard-insights.test.ts` — quais frases o dashboard mostra e a
  concordância de número em português.
- `tests/dates.test.ts` — datas relativas em pt-BR, incluindo o arredondamento
  que não pode transformar 25 horas em "há 2 dias", e que uma data simples
  (`"YYYY-MM-DD"`) não muda de dia conforme o fuso do servidor.
- `tests/knowledge-document.test.ts` — sanitização do documento do editor. É o
  que separa um payload enviado à mão do HTML que o servidor vai renderizar.
- `tests/search.test.ts` — conversão da busca em `tsquery` (operador não
  escapado ali não dá resultado errado, dá erro de banco), e quais filtros da
  busca global se aplicam a conhecimentos e a fontes — errar isso não trava
  nada, só faz um filtro de nível devolver fontes sem filtro nenhum.
- `tests/slug.test.ts` — geração de slug a partir de nome em português, com
  acentuação, e a busca por um slug único quando o nome já existe.
- `tests/area-tree.test.ts` — construção e achatamento da árvore de áreas, e
  quais áreas um seletor de pai deve excluir. É a lógica que, se sutilmente
  errada, não dá resultado errado — trava a página.
- `tests/inbox-schemas.test.ts` — para qual coluna a captura rápida roteia um
  mesmo campo de texto conforme o tipo escolhido, e que a validação do item
  completo exige o mesmo "ao menos um campo" que a constraint do banco.
- `tests/relations-schemas.test.ts` — qual id vira `from_id` e qual vira
  `to_id` a partir da direção escolhida. Inverter isso não trava nada; só
  guarda toda relação com os dois lados trocados.
- `tests/projects-schemas.test.ts` — que a data de término de um projeto não
  pode vir antes da de início, a mesma regra que `projects_date_order` já
  impõe no banco.
- `tests/ai-pricing.test.ts` — o custo real por uso e a estimativa de pior
  caso usada antes de qualquer chamada de IA sair.
- `tests/ai-rate-limit.test.ts` — a janela deslizante do limitador de taxa:
  permite até o limite, esquece chamadas antigas, isola por usuário.
- `tests/inbox-ai-suggestion.test.ts` — o prompt de sugestão (lista áreas e
  tags oferecidas, cai num placeholder sem conteúdo) e o filtro de defesa que
  descarta qualquer área/tag que o modelo alucine fora do que foi oferecido.
- `tests/embeddings-chunking.test.ts` — o empacotamento de parágrafos em
  chunks até o teto de tokens, e o corte forçado de um parágrafo que sozinho
  já estoura o teto.
- `tests/embeddings-pricing.test.ts` — o custo real e a estimativa de pior
  caso para um lote de embeddings, mesmo par de garantias que
  `tests/ai-pricing.test.ts` dá para completions.
- `tests/embeddings-rate-limit.test.ts` — a mesma janela deslizante de
  `tests/ai-rate-limit.test.ts`, verificada de novo porque é uma instância
  separada com seu próprio tipo de erro (`EmbeddingRateLimitError`).
- `tests/search.test.ts` também cobre `reciprocalRankFusion` — que um id
  achado por duas listas supera um achado só por uma, e que o objeto da
  primeira ocorrência vence num empate (é isso que preserva `matchKind` real
  de um resultado de palavra-chave ao mesclar com o semântico).
- `tests/search-rag.test.ts` — o empacotamento de candidatos do RAG até o
  teto de tokens (pulando, não parando, num candidato grande demais), o
  prompt rotulando o contexto como dado e não instrução, e o filtro que
  descarta uma citação para um id nunca oferecido no contexto.
- `tests/graph-filter.test.ts` — o filtro por área do grafo, o alcance exato
  da busca em largura por profundidade (tratando uma relação como não-
  direcional), e os dois fallbacks que evitam uma página em branco por causa
  de um `center` obsoleto na URL.
- `tests/reviews-schedule.test.ts` — o piso de intervalo em confiança baixa
  (sempre amanhã, não importa o histórico), o crescimento do intervalo com
  `review_count`, o teto da escada de dias, e `isDueForReview` para os dois
  casos que contam como vencido (nunca revisado, ou revisado no passado).
- `tests/integration/rls.test.ts` — RLS pela API real (veja abaixo).

```bash
npm test
npm run test:watch
npm run test:coverage
```

Não há teste escrito só para subir cobertura.

### Testes de integração

`tests/integration/rls.test.ts` fala com um Supabase de verdade e prova o que
nenhum teste unitário alcança: que um usuário autenticado, usando o mesmo
cliente da aplicação, não chega às linhas de outro.

Precisa de duas contas em um projeto com as migrações aplicadas. Coloque as
credenciais em `.env.test.local` (git-ignored):

```
TEST_SUPABASE_URL=...
TEST_SUPABASE_ANON_KEY=...
TEST_USER_A_EMAIL=...
TEST_USER_A_PASSWORD=...
TEST_USER_B_EMAIL=...
TEST_USER_B_PASSWORD=...
```

Sem essas variáveis a suíte **pula** em vez de falhar, para que `npm test`
continue verde em uma máquina sem projeto de teste. O primeiro caso do arquivo
confere que as duas contas são mesmo usuários diferentes — sem isso, um
`.env.test.local` mal configurado faria todas as asserções passarem pelo motivo
errado.

## Notas sobre o Next.js 16

Duas mudanças importantes em relação a versões anteriores:

- **`middleware` virou `proxy`.** O arquivo é `src/proxy.ts`, a função exportada
  chama-se `proxy`, e o runtime é sempre Node.js — `edge` não é suportado.
- **Turbopack é o padrão** em `dev` e `build`.

A documentação da versão instalada fica em `node_modules/next/dist/docs/` e é a
referência correta — a versão é recente o bastante para divergir do que
buscadores e modelos de linguagem assumem.

## Notas sobre o shadcn/ui (Base UI)

Esta versão do shadcn/ui roda sobre **Base UI**, não Radix. A API difere em
pontos que custam tempo se descobertos um por um — todos foram encontrados
construindo a Etapa 2:

**`asChild` não existe; use `render`.** Para um botão que é um link:

```tsx
<Button render={<Link href={ROUTES.inbox} />}>Ir para a Inbox</Button>
```

**`DropdownMenuLabel` só vale dentro de um grupo.** Ele é o `Menu.GroupLabel` do
Base UI e lança `MenuGroupContext is missing` se ficar solto no menu. Um rótulo
que nomeia um conjunto de itens vai dentro do `DropdownMenuRadioGroup` ou
`DropdownMenuGroup`; um cabeçalho que não nomeia itens (o nome do usuário, por
exemplo) deve ser um elemento comum.

**`nativeButton` quando o `render` é um `<button>` de verdade.** Sem isso o Base
UI assume que está renderizando um não-botão e duplica `role` e `aria-disabled`.

**Popups fechados podem continuar montados.** O Base UI só desmonta um popup
quando a transição de saída avisa que terminou. Quando o fechamento acontece no
mesmo commit de uma navegação, a transição nunca chega a começar e o painel fica
no DOM com `opacity: 0`, engolindo todos os cliques por cima da página. Por isso
`src/components/ui/sheet.tsx` recebeu `data-closed:pointer-events-none` — o
comentário no arquivo explica o caso.

**Guard de hidratação para tema costuma ser desnecessário.** O conteúdo de menus
e sheets só é montado quando abertos, ou seja, sempre depois da hidratação. Ler
`useTheme()` ali dentro não gera mismatch e dispensa o `mounted` habitual.

## Notas sobre reagraph (Etapa 13)

O grafo (`/grafo`) renderiza através de `@react-three/fiber` (Three.js/WebGL),
não DOM comum. Dois pontos que só apareceram construindo:

**`ssr: false` é obrigatório, não uma otimização.** Uma cena Three.js não tem
como renderizar no servidor — o componente que importa `reagraph`
(`graph-canvas-inner.tsx`) só é carregado via
`next/dynamic(..., { ssr: false })`, a partir de um arquivo `"use client"`
(`knowledge-graph.tsx`). `ssr: false` só é aceito dentro de um Client
Component; um Server Component que tente isso falha o build.

**O container precisa de `position: relative` explícito.** O `Canvas` do
`@react-three/fiber` se dimensiona a `100%` do ancestral posicionado mais
próximo. Sem um `relative` na div que envolve o canvas, essa resolução cai
para o viewport inteiro e o grafo cobre a página por cima de tudo, sidebar
inclusa — descoberto ao ver exatamente isso acontecer no navegador.

## Deploy (Vercel)

1. Importe o repositório.
2. Configure as variáveis de ambiente, incluindo `NEXT_PUBLIC_SITE_URL` com o
   domínio final.
3. Adicione o domínio de produção às URLs de redirecionamento do Supabase.

As migrações não são aplicadas pelo deploy: rode `npm run db:push` contra o
projeto correspondente.

### Cron da fila de embeddings (Etapa 11)

`vercel.json` declara um Vercel Cron Job que chama `/api/jobs/embeddings` uma
vez por dia (`0 3 * * *`). Dois passos manuais, feitos uma vez:

1. Defina `CRON_SECRET` nas variáveis de ambiente do projeto — qualquer
   string aleatória longa. O Vercel Cron a envia sozinho como
   `Authorization: Bearer <valor>`; nenhuma outra configuração é necessária.
2. Defina `OPENAI_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY` também, ou a rota
   roda protegida mas todo job termina em erro.

Uma vez por dia é o padrão porque o plano Hobby do Vercel limita cron jobs a
essa frequência; um plano Pro permite encurtar `schedule` em `vercel.json`
(por exemplo `*/10 * * * *`) para indexação quase imediata, sem nenhuma
mudança de código.

## Convenções de código

- Sem `any` sem justificativa escrita.
- Componente grande demais é sinal para extrair, não para comentar.
- Todo estado de UI precisa de loading, vazio e erro — os três, não só o feliz.
- Comentário explica **por que**, não o que o código já diz.
- Server Action retorna erro; não lança.
- Toda escrita passa por schema Zod no servidor.
- Nenhuma FK composta com `ON DELETE SET NULL` — zera a tupla inteira,
  `user_id` incluso. Use um trigger `BEFORE DELETE` que zera só a coluna certa.
  Contexto completo em
  [architecture.md](architecture.md#a-armadilha-do-on-delete-set-null-composto).
- Uma coluna `date` (sem hora) sempre passa por `formatDate`, nunca por
  `new Date(valor)` direto num componente. `formatDate` trata `"YYYY-MM-DD"`
  como um dia de calendário; `new Date` sozinho o lê como meia-noite UTC, que
  `Intl.DateTimeFormat` exibe no fuso do servidor — um dia a menos em qualquer
  fuso a oeste de UTC. Encontrado na Etapa 7 com `started_at`/`ended_at` de
  projetos; afetava `published_at` de fontes desde a Etapa 4 sem ter sido
  notado.
- Um arquivo com `import "server-only"` não pode ser importado por um teste
  Vitest — o pacote lança incondicionalmente fora da resolução de módulos do
  próprio Next.js (a condição `react-server` do `package.json#exports`, que só
  o build do Next ativa). Por isso lógica que precisa de teste automatizado
  fica num arquivo *sem* `server-only` (`pricing.ts`, `rate-limit.ts`), e o
  arquivo `server-only` que só orquestra essas peças (`client.ts`) é verificado
  por leitura e pelo uso real, não por teste unitário — o mesmo já valia para
  toda Server Action do projeto, só ficou explícito ao tentar testar
  `src/lib/ai/client.ts` na Etapa 9. Mesma divisão aplicada de novo na Etapa
  11: `src/lib/embeddings/chunking.ts` é puro e testado, `worker.ts` é
  `server-only` e verificado por SQL direto contra o projeto Supabase (ver
  docs/roadmap.md).
