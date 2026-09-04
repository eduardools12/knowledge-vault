# Arquitetura

## Princípio que orienta o resto

O sistema é uma **rede de conhecimento**, não um CRUD de notas. Toda decisão
abaixo existe para que relações entre conhecimentos sejam baratas de criar,
consultar e percorrer — hoje em SQL, depois em grafo e em RAG.

A consequência prática: o **modelo de dados foi construído inteiro na Etapa 1**,
enquanto a interface avança por etapas. Mudar schema com dados dentro é caro e
arriscado; mudar tela é barato. Onde havia dúvida, a dúvida foi resolvida a
favor do banco.

## Camadas

```
Navegador
   │
   ├── Server Components ── leitura de dados no servidor
   ├── Client Components ── apenas onde há interação real
   │
proxy.ts ─────────────── refresh de sessão + redirecionamento otimista
   │
Server Actions ───────── escrita, validada com Zod
   │
Data Access Layer ────── requireUser(): checagem autoritativa
   │
Supabase (PostgreSQL) ── Row Level Security
```

Nada no navegador fala com o banco por padrão. O cliente de browser existe para
os casos em que ele é realmente necessário (realtime, upload direto), e mesmo
ele só carrega a chave anônima, limitada por RLS.

## Segurança em três camadas

Autenticação aparece em três lugares, de propósito. Cada camada cobre uma falha
diferente.

### 1. `proxy.ts` — otimista

Roda antes de qualquer render, renova o token de sessão e redireciona visitante
anônimo para o login.

Duas coisas importam aqui:

- **É a única camada que pode renovar a sessão.** Server Components não escrevem
  cookies. Sem isso, o token expira no meio da navegação e o usuário é
  deslogado "aleatoriamente".
- **Não é fronteira de segurança.** Roda em todo request, inclusive prefetch,
  então não toca no banco. Usa `getClaims()`, que verifica a assinatura do JWT
  localmente quando o projeto usa chaves assimétricas.

O Next.js 16 renomeou `middleware` para `proxy`; o runtime é sempre Node.js.

### 2. Data Access Layer — autoritativa

`src/lib/auth/dal.ts` expõe `requireUser()`. Toda página privada, Server Action
e Route Handler passa por ela.

Usa `getUser()`, que revalida o token **no servidor de Auth**, e não
`getSession()`, que apenas decodifica o cookie. Cookie é armazenamento
controlado pelo usuário: confiar no conteúdo sem verificar permitiria forjar uma
sessão.

`cache()` do React memoiza a verificação dentro de um render, então vários
componentes na mesma página compartilham uma checagem só.

O arquivo importa `server-only`: um import acidental a partir de um Client
Component vira erro de build, não vazamento em runtime.

### 3. Row Level Security — última linha

Mesmo que as duas camadas acima falhem, o Postgres não devolve linha de outro
usuário. Detalhes em [database.md](database.md#row-level-security).

### Por que três

Uma só não basta. O proxy é rápido mas não é confiável como fronteira (o
CVE-2025-29927 do Next.js foi exatamente isso). O DAL é confiável mas depende de
o desenvolvedor lembrar de chamá-lo. O RLS não depende de ninguém lembrar de
nada, mas não redireciona nem dá boa mensagem de erro. Juntas, cobrem o buraco
uma da outra.

## Isolamento entre usuários no próprio schema

Além do RLS, o schema torna referência cruzada **estruturalmente impossível**.
Cada tabela carrega `user_id` e uma chave `unique (user_id, id)`; as tabelas
filhas referenciam o pai por chave estrangeira composta:

```sql
foreign key (user_id, area_id) references areas (user_id, id)
```

Um conhecimento não consegue apontar para a área de outra pessoa nem que o
código da aplicação tente. Isso transforma uma classe inteira de bug de
autorização em erro de constraint.

## Organização do código

Três diretórios com papéis distintos:

- **`app/`** — roteamento e composição de página. Fina por escolha.
- **`features/<domínio>/`** — regra de negócio de um domínio: `schemas.ts`
  (validação), `actions.ts` (escrita), `queries.ts` (leitura, a partir da Etapa
  3). É o que cresce conforme o produto cresce.
- **`lib/`** — infraestrutura sem domínio: clientes, rotas, ambiente, utilidades.

Os grupos de rota `(auth)` e `(app)` separam público de privado no sistema de
arquivos. O layout de `(app)` chama `requireUser()` uma vez e protege toda a
subárvore, então uma página nova nasce protegida em vez de nascer aberta.

## Validação e erros

Todo formulário passa por um schema Zod que roda **no servidor**. Validação no
cliente é conveniência; o navegador pode ser contornado com um POST manual.

Server Actions **retornam** erro em vez de lançar. `useActionState` renderiza o
retorno, o que preserva o que o usuário digitou — lançar substituiria a página
por um error boundary e perderia o formulário inteiro.

Mensagens de falha em login e recuperação de senha são deliberadamente vagas.
Dizer "este e-mail não existe" transformaria os dois formulários em oráculo de
enumeração de contas.

## Idioma

**Identificadores em inglês, interface em português.** Tabelas, colunas, valores
de enum e nomes de função são em inglês; todo texto visível é traduzido na UI.

`src/lib/domain.ts` é o único ponto onde os dois se encontram. Assim o SQL
permanece idiomático e portável, tradução nunca vaza para dentro de query, e
renomear um rótulo não muda um valor gravado no banco.

## Preparado, não construído

Três coisas existem no schema sem terem UI:

- **Grafo de conhecimento** — `knowledge_relations` já é a tabela de arestas.
- **Revisão espaçada** — `reviews` é log append-only; os contadores em
  `knowledge` são cache mantido por trigger.
- **Busca semântica e RAG** — `embeddings` com `pgvector` e índice HNSW.

Nenhuma delas tem código de aplicação ainda. O custo de criá-las agora foi uma
migração; o custo de criá-las depois seria re-embedar o acervo inteiro e migrar
dados em produção.

## Decisões e o que foi recusado

| Decisão | Alternativa recusada | Por quê |
| --- | --- | --- |
| Server Actions | API REST separada | Uma fronteira a menos, tipos de ponta a ponta. Route Handlers ficam para o que precisa de HTTP de verdade (callbacks de e-mail). |
| Supabase | Postgres próprio + Auth próprio | Auth é onde erro artesanal custa caro. Continua sendo Postgres puro — sem lock-in de schema. |
| `pgvector` no mesmo banco | Vector database dedicado | Um acervo pessoal não justifica outra infraestrutura, e o join entre vetor e metadado fica trivial. |
| `content` em JSONB | Markdown em texto | Novos tipos de bloco no editor não exigem migração. `content_text` espelha o texto puro para busca. |
| Enums do Postgres | Texto com CHECK | Valor inválido vira erro no banco, não linha ruim. Adicionar valor é `ALTER TYPE ... ADD VALUE`. |
| FKs compostas | Só RLS | Erro de autorização vira erro de constraint. |
| `portuguese` como dicionário | `simple`, ou `unaccent` | Stemming e stop-words no idioma principal do acervo. `unaccent` exige configuração customizada e fica como evolução. |
