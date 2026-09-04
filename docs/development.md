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

```bash
npm test
npm run test:watch
npm run test:coverage
```

Não há teste escrito só para subir cobertura. O que precisa de banco e sessão
real (RLS, permissões) pede teste de integração contra uma instância Supabase —
planejado para quando o CRUD existir, na Etapa 3.

## Notas sobre o Next.js 16

Duas mudanças importantes em relação a versões anteriores:

- **`middleware` virou `proxy`.** O arquivo é `src/proxy.ts`, a função exportada
  chama-se `proxy`, e o runtime é sempre Node.js — `edge` não é suportado.
- **Turbopack é o padrão** em `dev` e `build`.

A documentação da versão instalada fica em `node_modules/next/dist/docs/` e é a
referência correta — a versão é recente o bastante para divergir do que
buscadores e modelos de linguagem assumem.

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
