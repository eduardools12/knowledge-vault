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

### `knowledge_relations`

As arestas do grafo. Direcionais: `from_id --type--> to_id` lê-se
"from **depende de** to".

Uma linha só descreve os dois lados. `RELATION_TYPE_META` em
`src/lib/domain.ts` guarda o rótulo inverso, então a página do alvo mostra "é
pré-requisito de" sem que exista uma segunda linha para manter em sincronia.

Constraints: sem auto-referência (`from_id <> to_id`) e sem duplicata do mesmo
par com o mesmo tipo.

### `reviews`

Log append-only. É a fonte da verdade; os contadores em `knowledge` são cache
mantidos pelo trigger `apply_review_to_knowledge`. Assim o histórico fica
auditável e a página do conhecimento continua sendo uma leitura de uma linha.

### `embeddings`

Vazia no MVP. Existe porque criar depois significaria re-embedar o acervo
inteiro.

- Chunked: uma fonte longa vira várias linhas. `content` guarda o texto exato
  que gerou o vetor, para que uma resposta de RAG possa citar a passagem.
- `model` faz parte da identidade do chunk, então dois modelos coexistem durante
  uma troca em vez de exigir reindexação de uma vez só.
- Owner polimórfico (`owner_type` + `owner_id`), o que impede chave estrangeira.
  A integridade é mantida pelo trigger `delete_orphaned_embeddings` — que é
  `security definer` por necessidade: `authenticated` não tem policy de DELETE
  em `embeddings`, então um trigger rodando como o chamador teria o DELETE
  filtrado silenciosamente pelo RLS.

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

Dois mecanismos complementares.

**Coluna gerada `tsvector`** em `knowledge` e `sources`, com pesos:
`A` = título, `B` = resumo/autor, `C` = corpo. É `GENERATED`, não trigger, então
não tem como sair de sincronia com a linha.

O dicionário é o `portuguese` embutido. Passado como argumento `regconfig`
explícito porque a forma de um argumento de `to_tsvector()` é apenas `STABLE` e
não pode ser usada em coluna gerada.

**Índices trigram** (`pg_trgm`) nos títulos e nomes, para que um título mal
lembrado ainda encontre a nota.

Busca semântica não é tentada aqui: chega na Etapa 11 sobre `embeddings`, e
**complementa** esta busca em vez de substituí-la. Palavra-chave continua melhor
para termo exato — nome de biblioteca, sigla, número de versão.

### Evolução possível

Busca sensível a acento pode virar insensível com uma configuração customizada
combinando `unaccent` com `portuguese_stem`. Ficou de fora do MVP porque exige
criar uma text search configuration e qualificar o dicionário pelo schema —
fragilidade que não se paga antes de haver acervo.

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
