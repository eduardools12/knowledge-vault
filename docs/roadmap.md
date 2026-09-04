# Roadmap

Uma etapa só está concluída quando `npm run verify` e `npm run build` passam.
Código escrito não é etapa concluída.

## ✅ Etapa 1 — Arquitetura, banco e autenticação

- Modelo de dados completo do produto, em 9 migrações
- Isolamento por usuário: FKs compostas + RLS em todas as tabelas
- Cadastro, login, logout, recuperação e redefinição de senha
- Proteção de rotas em três camadas (proxy → DAL → RLS)
- Bucket privado de Storage com políticas por prefixo de usuário
- Validação de ambiente, contrato de formulários, camada de domínio
- 31 testes nas funções críticas; lint, tipos e build limpos
- Banco provisionado (`knowledge-vault`, sa-east-1), 9 migrações aplicadas,
  advisors de segurança do Supabase sem achados
- Tipos gerados do schema real e clientes tipados, com uma checagem em tempo de
  compilação que impede `src/lib/domain.ts` de divergir dos enums do banco
- Fluxo de acesso verificado ponta a ponta no navegador: cadastro, confirmação
  pendente, login, `redirectTo`, logout, recuperação de senha e links de e-mail
  inválidos ou expirados
- Isolamento entre usuários verificado no próprio Postgres: RLS e chaves
  estrangeiras compostas, cada um testado de forma independente

## ✅ Etapa 2 — Layout, navegação e dashboard

- Casca da aplicação: sidebar fixa no desktop, sheet no mobile, menu de usuário
  com tema claro/escuro/sistema
- As dez seções existem como rota e página; as ainda não construídas dizem em
  qual etapa entram e o que vão permitir, em vez de "em breve"
- Dashboard que responde perguntas em vez de enfeitar: contagens, frases
  acionáveis com link, distribuição de maturidade e atividade recente
- Insight com contagem zero não é renderizado — card que marca "0" todo dia
  ensina a não olhar
- Estado vazio de primeiro uso, skeleton de carregamento e estado vazio por lista
- `dashboard_summary()` resolve todos os agregados em uma chamada, com RLS ainda
  escopando cada contagem
- 29 testes novos (60 no total) sobre as frases do dashboard e as datas em pt-BR

Três bugs encontrados na verificação e corrigidos: `DropdownMenuLabel` fora de um
grupo derrubava o menu de usuário no Base UI; o sheet mobile ficava montado com
`opacity: 0` depois de navegar, engolindo todos os cliques; e as linhas de
insight quebravam deixando o ícone sozinho numa linha no celular.

## Etapa 3 — CRUD de conhecimentos (próxima)

Listagem com filtros, página de detalhe, editor rico (títulos, listas, citação,
código, links, tabelas, checklists), arquivar, nível de maturidade.

O editor grava `content` em JSONB e `content_text` em texto puro no mesmo save —
o segundo é o que alimenta busca e, depois, embeddings.

Aqui entram os primeiros testes de integração contra Supabase real, para exercer
RLS de verdade.

Já verificado na Etapa 2: o PostgREST resolve embeds através das chaves
estrangeiras compostas, inclusive o self-join de `knowledge_relations`. Ou seja,
`areas!knowledge_area_fk(...)`, `knowledge_tags(tags(...))` e
`knowledge_sources(sources(...))` funcionam, e a listagem não precisa de SQL
próprio.

## Etapa 4 — Áreas, tags e fontes

CRUD dos três, incluindo hierarquia de áreas e vínculo de fontes a conhecimentos.
Upload de arquivo para o bucket privado.

## Etapa 5 — Inbox

Captura rápida: URL, texto, arquivo, ideia. Fila com os quatro estados e o fluxo
de transformar um item em conhecimento estruturado, preservando o vínculo de
origem.

## Etapa 6 — Relacionamentos

UI para criar arestas entre conhecimentos, com os oito tipos e direção. Exibição
do lado inverso na página do alvo.

## Etapa 7 — Projetos

CRUD e vínculo com conhecimentos. Responde *"o que usei neste projeto?"* e *"em
que projetos usei isto?"*.

## Etapa 8 — Busca avançada

Busca global sobre `tsvector` com ranking por peso, filtros combinados por área,
tag, nível, status e tipo de fonte. Fallback trigram para título mal lembrado.

## Etapa 9 — Base para IA

Interface própria de acesso a LLM: abstração de provedor, controle de custo,
tratamento de erro e limite de taxa. Nenhuma feature visível — é a fundação que
evita espalhar chamada de modelo pelo código.

## Etapa 10 — IA para processamento de conteúdo

Resumo, extração de conceitos, sugestão de área e tags, detecção de duplicata.
Sempre com revisão do usuário antes de salvar.

## Etapa 11 — Embeddings e busca semântica

Pipeline de chunking e indexação com fila. Busca vetorial sobre `pgvector` e
busca híbrida combinando com palavra-chave.

## Etapa 12 — RAG

Perguntas em linguagem natural sobre o acervo, com expansão de contexto pelo
grafo e resposta citando os conhecimentos e fontes usados.

## Etapa 13 — Knowledge Graph

Visualização interativa das relações, com filtro por área e profundidade.
Biblioteca de grafo escolhida só aqui — não antes.

## Etapa 14 — Revisão

Repetição espaçada sobre a tabela `reviews`, fila do dia e perguntas geradas
pela IA.

---

## Fora de escopo por enquanto

Compartilhamento e colaboração, aplicativo móvel nativo, extensão de navegador,
importação de Notion/Obsidian, versionamento de conteúdo, API pública.

Nenhuma delas está descartada; nenhuma delas justifica complicar a base antes de
o núcleo estar em uso real.
