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
| `SUPABASE_SERVICE_ROLE_KEY` | não (Etapa 11) | Ignora RLS. Só em job de servidor. **Nunca** com prefixo `NEXT_PUBLIC_` |

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
  que não pode transformar 25 horas em "há 2 dias".
- `tests/knowledge-document.test.ts` — sanitização do documento do editor. É o
  que separa um payload enviado à mão do HTML que o servidor vai renderizar.
- `tests/search.test.ts` — conversão da busca em `tsquery`. Operador não
  escapado ali não dá resultado errado: dá erro de banco.
- `tests/slug.test.ts` — geração de slug a partir de nome em português, com
  acentuação, e a busca por um slug único quando o nome já existe.
- `tests/area-tree.test.ts` — construção e achatamento da árvore de áreas, e
  quais áreas um seletor de pai deve excluir. É a lógica que, se sutilmente
  errada, não dá resultado errado — trava a página.
- `tests/inbox-schemas.test.ts` — para qual coluna a captura rápida roteia um
  mesmo campo de texto conforme o tipo escolhido, e que a validação do item
  completo exige o mesmo "ao menos um campo" que a constraint do banco.
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

## Deploy (Vercel)

1. Importe o repositório.
2. Configure as variáveis de ambiente, incluindo `NEXT_PUBLIC_SITE_URL` com o
   domínio final.
3. Adicione o domínio de produção às URLs de redirecionamento do Supabase.

As migrações não são aplicadas pelo deploy: rode `npm run db:push` contra o
projeto correspondente.

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
