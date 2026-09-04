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

## O documento de conhecimento

O editor é o **Tiptap** (ProseMirror). Escolhido porque seu modelo de documento
é JSON, que é exatamente o que a coluna `content jsonb` guarda — sem conversão
para HTML ou Markdown no meio, e com blocos novos podendo ser adicionados por
extensão em vez de por migração.

### Uma definição, dois lados

`src/features/knowledge/document.ts` declara o conjunto de extensões e não
importa nada de `@tiptap/react`. Os dois lados usam o mesmo arquivo: o navegador
para rodar o editor, o servidor para renderizar o conteúdo salvo e para derivar
o texto de busca. Assim o editor não consegue produzir um nó que o renderizador
não entenda.

### `content_text` é derivado, não recebido

A aplicação nunca aceita o texto puro do cliente. Ele é calculado no servidor a
partir do documento, a cada escrita.

O motivo é que essa coluna é o índice de busca. Um navegador que enviasse texto
divergente do próprio documento tornaria um registro localizável por palavras
que ele não contém — ou, pior, silenciosamente impossível de achar.

### Sanitização em duas portas

1. **No editor**, o `Link` só aceita `http`, `https` e `mailto`.
2. **No servidor**, `sanitizeDocument` percorre o documento inteiro antes de
   gravar: descarta nós e marcas fora do schema, remove links com protocolo não
   permitido, e impõe limites de profundidade e de número de nós contra payloads
   feitos para estourar a pilha.

A primeira porta é conveniência — ela roda no navegador e não obriga ninguém a
nada. A segunda é a que vale.

O documento é sanitizado **de novo na leitura**, antes de virar HTML. Uma linha
pode ter sido gravada antes de uma mudança de schema, ou ter vindo de um
importador futuro em vez deste editor.

### Renderização no servidor

A página de detalhe usa `generateHTML` do Tiptap no servidor: um leitor recebe
HTML puro, sem nenhum JavaScript de editor. O `dangerouslySetInnerHTML` que isso
exige está justificado no próprio componente — a resposta curta é que
`generateHTML` só emite nós do schema, o texto é escapado pelo serializador, e o
único atributo capaz de executar algo (`href`) passa pela lista de protocolos.

## Busca

O filtro da listagem converte o que a pessoa digita em um `tsquery` de prefixo
(`pand:*`), rodando contra o `search_vector` da Etapa 1.

Vale explicar por que não é `websearch_to_tsquery`, que sanitizaria a entrada de
graça: ele não tem modo de prefixo, e uma caixa de busca em que se digita
precisa encontrar "Pandas" a partir de "pand". A conversão está em
`src/lib/search.ts`, é pura e é testada — `&`, `|`, `!`, `:` e parênteses são
operadores para o Postgres, e um deles solto não dá resultado errado, dá erro.

Ranking por relevância e busca combinada ficam para a Etapa 8.

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
| Tiptap | Markdown em textarea | Modelo de documento em JSON, igual ao que a coluna guarda; blocos novos entram por extensão. |
| `generateHTML` no servidor | Editor em modo leitura | Página de leitura sem JavaScript de editor. |

### Um efeito colateral aceito

Uma rota com `loading.tsx` envia o shell antes de a página resolver. Quando o
registro não existe, `notFound()` acontece depois disso, então a resposta já foi
comprometida como **200** e o usuário recebe a UI de "não encontrado" dentro de
um corpo 200 em vez de um 404 de verdade.

É inerente ao streaming: ou se abre mão do estado de carregamento, ou do código
de status. Para um acervo pessoal, onde nenhum rastreador depende disso, o
estado de carregamento vale mais. Fica registrado para não ser redescoberto como
bug.
