# Banco de dados

PostgreSQL via Supabase. O schema está em `supabase/migrations/`, aplicado em
ordem de nome de arquivo.

| Migração | Conteúdo |
| --- | --- |
| `...000100_extensions_and_enums.sql` | Extensões e tipos enumerados |
| `...000200_core_schema.sql` | `profiles`, `areas`, `tags`, `sources`, `projects`, `knowledge` |
| `...000300_relations.sql` | Tabelas de ligação, `knowledge_relations`, `inbox_items`, `reviews` |
| `...000400_functions_and_triggers.sql` | `updated_at`, perfil no cadastro, colunas derivadas |
| `...000500_row_level_security.sql` | Políticas de RLS |
| `...000600_search.sql` | `tsvector` e índices trigram |
| `...000700_embeddings.sql` | `pgvector`, tabela de vetores, índice HNSW |
| `...000800_storage.sql` | Bucket privado e políticas de arquivo |
| `...000900_index_and_execute_hardening.sql` | Índices alinhados às FKs compostas; EXECUTE revogado das funções de trigger |
| `...001000_dashboard_summary.sql` | Função de agregados do dashboard |
| `...001100_area_hierarchy_guard.sql` | Trigger que impede ciclos na hierarquia de áreas |
| `...001200_fix_composite_fk_set_null.sql` | Corrige `ON DELETE SET NULL` em FK composta (ver [architecture.md](architecture.md#a-armadilha-do-on-delete-set-null-composto)) |
| `...001300_search_ranking.sql` | `search_knowledge` e `search_sources`, busca ranqueada com fallback trigram (ver [Busca](#busca-ranqueada-search_knowledge-e-search_sources)) |
| `...000100_embedding_jobs_and_semantic_search.sql` (05/09) | `embedding_jobs` (fila de indexação), `search_knowledge_semantic` e `search_sources_semantic` (ver [Busca semântica](#busca-híbrida-search_knowledge_semantic-e-search_sources_semantic)) |
| `...000200_embedding_jobs_user_id_index.sql` (05/09) | Índice em `embedding_jobs.user_id`, apontado pelo advisor do Supabase logo após a migração anterior |

## Modelo

```
auth.users
    │
    ├── profiles           (1:1)
    │
    ├── areas ────────────┐  hierárquicas via parent_id
    ├── tags              │
    ├── sources           │
    ├── projects          │
    │                     │
    └── knowledge ────────┘  area_id
            │
            ├── knowledge_tags ──────── tags
            ├── knowledge_sources ───── sources
            ├── knowledge_projects ──── projects
            ├── knowledge_relations ─── knowledge   ← arestas do grafo
            └── reviews                             ← log de revisões

    inbox_items ──→ knowledge   (o que a captura virou)
    embeddings  ──→ owner polimórfico
```

### `knowledge`

A entidade central.

- `content` (JSONB) — documento do editor. JSONB para que novos tipos de bloco
  não exijam migração.
- `content_text` — espelho em texto puro, escrito pela aplicação a cada save.
  Entrada única da busca e, depois, dos embeddings.
- `level` — maturidade: `discovered` → `understood` → `practiced` → `mastered`.
  A ordem é significativa; métricas e revisão dependem dela.
- `status` — `draft`, `active`, `archived`.
- `archived_at` — derivada de `status` por trigger. A aplicação nunca escreve
  nesta coluna, e uma constraint garante que as duas não divergem.
- Campos de revisão (`last_reviewed_at`, `next_review_at`, `review_count`,
  `difficulty`, `confidence`) — cache de `reviews`, mantido por trigger.

### `areas`

Hierárquica via `parent_id`, auto-referenciando `(user_id, id)`. Duas garantias
além da chave composta:

- **Sem ciclos.** `areas_prevent_cycle` (trigger `BEFORE INSERT OR UPDATE OF
  parent_id`) sobe a cadeia de ancestrais antes de aceitar um novo pai; achar a
  própria linha no caminho rejeita a escrita. `src/features/areas/tree.ts`
  espelha essa regra do lado da aplicação (`excludedParentIds`), para que o
  seletor de área superior nunca ofereça uma opção que o banco recusaria — um
  erro de "não é possível" depois de escolher é pior do que não oferecer a
  escolha.
- **Excluir não apaga o que está dentro.** `parent_id` de subáreas e `area_id`
  de conhecimentos vinculados viram `NULL` (via trigger, não FK — ver
  [architecture.md](architecture.md#a-armadilha-do-on-delete-set-null-composto)).
  Uma área é um rótulo; removê-lo não remove o que foi rotulado.

### `tags`

Sem hierarquia — de propósito, para cruzar áreas livremente (`#dados` serve
tanto a uma nota de programação quanto a uma de futebol). Excluir uma tag
remove os vínculos em `knowledge_tags` e `source_tags` (`on delete cascade`,
que aqui não tem o problema acima: a linha de vínculo inteira desaparece, não
uma coluna dela).

### `sources`

`storage_path` aponta para um objeto no bucket privado `vault`; ver
[Storage](#storage). Conteúdo extraído ou colado fica em `content` e entra na
mesma busca full-text de `knowledge`.

### `knowledge_relations`

As arestas do grafo. Direcionais: `from_id --type--> to_id` lê-se
"from **depende de** to".

Uma linha só descreve os dois lados. `RELATION_TYPE_META` em
`src/lib/domain.ts` guarda o rótulo inverso, então a página do alvo mostra "é
pré-requisito de" sem que exista uma segunda linha para manter em sincronia.

Constraints: sem auto-referência (`from_id <> to_id`) e sem duplicata do mesmo
par com o mesmo tipo. Os dois lados aceitam mais de um tipo de relação
simultaneamente — a constraint é `unique (from_id, to_id, type)`, não
`unique (from_id, to_id)`.

Como `from_id` e `to_id` apontam para a mesma tabela, um select que embute os
dois lados precisa nomear a constraint em cada um (`knowledge!knowledge_relations_to_fk`,
`knowledge!knowledge_relations_from_fk`) — sem isso o PostgREST não sabe qual
das duas FKs seguir e recusa a consulta. `src/features/relations/queries.ts`
faz duas consultas em vez de uma por isso: uma por `from_id` embutindo o `to`,
outra por `to_id` embutindo o `from`, cada uma com o alias `knowledge` para
que as duas voltem no mesmo formato.

Desde a Etapa 12, `listRelationsForKnowledge` também alimenta o RAG: os
vizinhos dos conhecimentos mais bem ranqueados por `search()` entram no
contexto da pergunta, sem nenhuma consulta nova — ver
[ai.md](ai.md#onde-a-ia-entra).

### `projects` e `knowledge_projects`

Um projeto é onde o conhecimento é aplicado. O vínculo com `knowledge` carrega
uma nota por par — como aquele conhecimento foi usado ali — o que não cabe num
seletor de checkboxes como o de tags: cada marcação precisaria do seu próprio
campo de texto. Por isso o vínculo é gerenciado na página do próprio projeto
(criar, remover e anotar), não no formulário de conhecimento; a página do
conhecimento só lê o outro lado, sem editá-lo.

A chave primária de `knowledge_projects` é o par `(knowledge_id, project_id)`,
não um `id` próprio — diferente de `knowledge_relations`. Remover um vínculo
específico exige as duas colunas na cláusula `where`, não um único id.

### `reviews`

Log append-only. É a fonte da verdade; os contadores em `knowledge` são cache
mantidos pelo trigger `apply_review_to_knowledge`. Assim o histórico fica
auditável e a página do conhecimento continua sendo uma leitura de uma linha.

### `embeddings`

Criada vazia na Etapa 1 — porque criar depois significaria re-embedar o
acervo inteiro — e populada desde a Etapa 11 pelo worker em
`src/lib/embeddings/worker.ts`, o único código que escreve nela (com a chave
de serviço; veja [Fila de indexação](#fila-de-indexação-embedding_jobs)
abaixo).

- Chunked: uma fonte longa vira várias linhas. `content` guarda o texto exato
  que gerou o vetor, para que uma resposta de RAG possa citar a passagem.
- `model` faz parte da identidade do chunk, então dois modelos coexistem durante
  uma troca em vez de exigir reindexação de uma vez só.
- Owner polimórfico (`owner_type` + `owner_id`), o que impede chave estrangeira.
  A integridade é mantida pelo trigger `delete_orphaned_embeddings` — que é
  `security definer` por necessidade: `authenticated` não tem policy de DELETE
  em `embeddings`, então um trigger rodando como o chamador teria o DELETE
  filtrado silenciosamente pelo RLS.

### Fila de indexação: `embedding_jobs`

Etapa 11. Registra "isto precisa ser (re)indexado", sem chamar nenhum modelo —
quem chama o modelo é o worker, assíncrono, em outro processo (o Route
Handler `src/app/api/jobs/embeddings`, disparado pelo Vercel Cron).

- **Enfileirado por trigger, não pela aplicação.** `enqueue_embedding_job()`
  roda `after insert or update of` só as colunas que realmente compõem o texto
  indexado (`title, summary, content_text` em `knowledge`; `title,
  description, content` em `sources`) — editar o `status` ou o `archived_at`
  de um conhecimento, bem mais frequente que editar seu conteúdo, não gasta
  uma chamada de embedding à toa. Mesma razão de ser `security definer` que
  `delete_orphaned_embeddings`: `authenticated` não tem policy de INSERT em
  `embedding_jobs`.
- **Um job por owner, para sempre.** `unique (owner_type, owner_id)` mais um
  `on conflict ... do update` fazem cinco edições seguidas, antes do worker
  rodar uma vez, resetarem a mesma linha para `pending` em vez de empilhar
  cinco jobs redundantes.
- **Sem `FOR UPDATE SKIP LOCKED`.** O worker lê os `pending` mais antigos e já
  marca `processing` antes de processar, mas não há claim atômico no banco.
  Aceitável para um cron disparado um de cada vez sobre um acervo pessoal, e
  processar o mesmo job duas vezes é inofensivo — a escrita em `embeddings` é
  *replace* (apaga e reinsere), não *merge*.
- **RLS permite só leitura ao dono.** Mesma política de `embeddings`: sem
  policy de escrita para `authenticated`, porque não há razão legítima para o
  cliente enfileirar ou concluir um job por conta própria.

## Convenções

- **UUID** como chave primária em tudo (`gen_random_uuid()`).
- **`timestamptz`**, nunca `timestamp`. Fuso é problema resolvido no banco.
- **`created_at` / `updated_at`** em toda tabela mutável, com trigger.
- **Identificadores em inglês.** Tradução vive em `src/lib/domain.ts`.
- **Enums do Postgres** para conjuntos fechados. Adicionar valor é
  `ALTER TYPE ... ADD VALUE`, e é preciso adicionar também em `domain.ts`.
- **`search_path = ''` em toda função**, com objetos qualificados por schema.
  Sem isso, uma função é resolvível através de um `search_path` controlado pelo
  chamador — vetor de escalada de privilégio nas funções `security definer`.

## Isolamento entre usuários

Duas defesas independentes.

### Chaves estrangeiras compostas

Cada tabela tem `user_id` e `unique (user_id, id)`. As filhas referenciam assim:

```sql
constraint knowledge_area_fk
  foreign key (user_id, area_id) references public.areas (user_id, id)
```

Apontar para linha de outro usuário deixa de ser possível, mesmo com bug na
aplicação ou em uma policy. FKs compostas nulas usam `MATCH SIMPLE`, então a
constraint é pulada quando a coluna filha é `NULL` — que é o comportamento
desejado para relações opcionais.

### Row Level Security

Habilitado em todas as tabelas. Uma policy por operação:

```sql
create policy areas_select_own on public.areas
  for select to authenticated
  using ((select auth.uid()) = user_id);
```

Dois detalhes:

- **`(select auth.uid())`, não `auth.uid()`.** Envolver em subquery faz o
  Postgres avaliar uma vez como InitPlan, em vez de uma vez por linha. A
  diferença aparece assim que uma tabela passa de alguns milhares de linhas.
- **`revoke all ... from anon`.** O RLS já bloqueia, porque toda policy mira
  `authenticated`. Remover o grant garante que uma policy acidentalmente
  permissiva ainda não exponha nada antes do login.

`profiles` é tratada à parte: a chave é `id` (o id de `auth.users`), e não há
policy de INSERT nem DELETE. Perfis nascem do trigger `handle_new_user` e morrem
por cascade — um cliente não consegue fabricar nem orfanar um perfil.

## Busca

Três mecanismos complementares desde a Etapa 11: palavra-chave (`tsvector`),
fallback trigram, e busca semântica (`embeddings`).

**Coluna gerada `tsvector`** em `knowledge` e `sources`, com pesos:
`A` = título, `B` = resumo/autor, `C` = corpo. É `GENERATED`, não trigger, então
não tem como sair de sincronia com a linha.

O dicionário é o `portuguese` embutido. Passado como argumento `regconfig`
explícito porque a forma de um argumento de `to_tsvector()` é apenas `STABLE` e
não pode ser usada em coluna gerada.

**Índices trigram** (`pg_trgm`) nos títulos e nomes, para que um título mal
lembrado ainda encontre a nota.

Busca semântica (abaixo) **complementa** esta busca, não a substitui.
Palavra-chave continua melhor para termo exato — nome de biblioteca, sigla,
número de versão; semântica encontra o que não usa nenhuma dessas palavras.

### Busca ranqueada: `search_knowledge` e `search_sources`

A busca global (`/busca`) usa duas funções, não o `.textSearch()` comum do
PostgREST. O motivo é `ts_rank()`: o cliente PostgREST pode filtrar por
`tsvector` (`@@`), mas não tem como pedir para ordenar por uma expressão como
`ts_rank(...)` — não existe coluna para `.order()` apontar. A mesma razão que
já tinha criado `dashboard_summary()`.

Cada função tenta primeiro a busca por palavra-chave, ranqueada pelos pesos do
`tsvector`. Só quando isso não encontra nada, cai para similaridade trigram no
título — um *fallback*, não um ranking concorrente, então um resultado exato
nunca perde lugar para um título apenas parecido. A coluna `match_kind`
(`exact` ou `fuzzy`) que cada função devolve é o que deixa a interface avisar
"nenhum resultado exato, mostrando títulos parecidos" em vez de misturar os
dois silenciosamente.

Dois detalhes que só apareceram testando com um título de verdade:

- **`word_similarity()`, não `similarity()`.** Uma palavra digitada errada
  comparada com o *título inteiro* dilui demais a sobreposição de trigramas —
  "padnas" contra "Pandas para análise de dados" pontua 0.10 em `similarity`,
  abaixo de qualquer limiar razoável. `word_similarity()` compara contra o
  melhor trecho alinhado por palavra dentro do título, o que já é o suficiente
  para encontrar o título certo.
- **O limiar é um `>= 0.3` literal, não o operador `<%`.** O operador de
  `word_similarity` depende do parâmetro `pg_trgm.word_similarity_threshold`
  (padrão 0.6), e o Supabase recusa uma função que tente ajustá-lo
  (`permission denied to set parameter`). A comparação direta com o valor de
  retorno da função contorna isso ao custo de não usar o índice GIN nesse
  passo — aceitável porque ele só roda depois que a busca por palavra-chave,
  essa sim indexada, já não encontrou nada.

Nenhum filtro é obrigatório nas duas funções — sem palavra e sem filtro
nenhum, cada uma lista o mais recente. Filtrar sem digitar nada (por
exemplo, só por nível) é, portanto, uma decisão de quem chama: `search()` em
`src/features/search/queries.ts` só invoca `search_sources` quando o filtro
dado realmente diz algo sobre fontes (`tag` ou tipo), e o mesmo vale ao
contrário — sem essa checagem, filtrar por nível chamaria `search_sources`
sem filtro nenhum e listaria toda fonte do acervo junto.

### Busca híbrida: `search_knowledge_semantic` e `search_sources_semantic`

Etapa 11. Mesmo motivo de existir que as duas funções acima — PostgREST não
ordena por expressão — mas ranqueando por distância de cosseno sobre
`embeddings` em vez de `ts_rank`.

```sql
select k.id, ..., min(e.embedding operator (extensions.<=>) query_embedding) as distance
from knowledge k
join embeddings e on e.owner_type = 'knowledge' and e.owner_id = k.id
group by k.id, ...
order by distance asc
```

Três decisões que valem registrar:

- **`min(...)`, uma linha por registro.** Um conhecimento vira vários chunks;
  isto devolve um resultado ranqueado por registro, pelo chunk mais próximo —
  a mesma forma que o RAG (Etapa 12) vai reaproveitar para decidir qual trecho
  citar.
- **`OPERATOR(extensions.<=>)`, não `<=>` puro.** Com `search_path = ''` (toda
  função aqui), a resolução de operador precisa do mesmo schema explícito que
  uma chamada de função exigiria — um símbolo isolado não carrega isso.
  Descoberto direto: a primeira versão desta função falhou ao aplicar com
  `operator does not exist: extensions.vector <=> extensions.vector`.
- **Ranking combinado em código, não em SQL.** `ts_rank` e distância de
  cosseno não são a mesma escala, e não há forma correta de o Postgres
  comparar os dois numa única `ORDER BY`. `search()` em
  `src/features/search/queries.ts` chama as duas famílias de função em
  paralelo e combina os resultados com Reciprocal Rank Fusion
  (`reciprocalRankFusion` em `src/lib/search.ts`) — um método agnóstico à
  escala de cada ranking, que soma `1 / (k + posição)` em cada lista em vez de
  comparar os escores diretamente.

Chamada pelo cliente Supabase autenticado comum (`security invoker`, RLS
completo em `embeddings` e na tabela unida), nunca pela chave de serviço — só
a *escrita* em `embeddings` precisa dela.

### Evolução possível

Busca sensível a acento pode virar insensível com uma configuração customizada
combinando `unaccent` com `portuguese_stem`. Ficou de fora do MVP porque exige
criar uma text search configuration e qualificar o dicionário pelo schema —
fragilidade que não se paga antes de haver acervo.

## Agregados do dashboard

`dashboard_summary()` devolve, em uma chamada, todos os números do dashboard.

Existe por dois motivos. O primeiro é latência: uma dúzia de contagens via
PostgREST seriam doze idas e voltas até São Paulo. O segundo é que duas delas
não se expressam bem em PostgREST — "conhecimentos sem nenhuma fonte" é um
anti-join e "área mais movimentada da semana" é um group by com ordenação.

O detalhe que sustenta a segurança: a função é **`security invoker`**. Ela roda
como quem chamou, então cada `select` interno continua filtrado por RLS. Uma
versão `security definer` somaria o banco inteiro, de todos os usuários, sem
erro nenhum — silenciosamente. Por isso não existe `where user_id = ...` dentro
dela: o RLS acrescenta essa condição, e repeti-la à mão sugeriria que a policy é
opcional.

`revoke execute ... from anon` completa: sem sessão não há nada para contar.

O retorno é `jsonb` e é validado com Zod em `src/features/dashboard/queries.ts`,
o que restaura um tipo real na fronteira — mudança no SQL sem ajuste no schema
falha alto, em vez de virar card vazio.

## Storage

Bucket único e privado, `vault`, limite de 50 MB por arquivo e lista de MIME
types permitidos.

A convenção de caminho é funcional, não cosmética:

```
{user_id}/{entidade}/{uuid}.{ext}
```

Toda policy compara o primeiro segmento com `auth.uid()`. Um usuário não lê,
sobrescreve nem apaga objeto fora do próprio prefixo nem adivinhando o nome
completo. Arquivos são servidos por URL assinada de vida curta, nunca pública.

## Tipos no TypeScript

`npm run db:types` regenera `src/types/database.ts` a partir do banco linkado.
Rode depois de toda migração e faça commit do resultado.

Os três clientes (`server`, `client`, `proxy`) já são parametrizados com
`Database`, então uma coluna inexistente ou um tipo errado em uma query vira
erro de compilação.

O fim de `src/lib/domain.ts` fecha o ciclo: uma asserção de tipo compara cada
união escrita à mão com o enum gerado do banco e falha o `typecheck` se as duas
divergirem. Ou seja, adicionar um valor de enum numa migração e esquecer de
adicioná-lo em `domain.ts` quebra o build logo depois de `npm run db:types`, em
vez de virar um rótulo em branco meses depois.
