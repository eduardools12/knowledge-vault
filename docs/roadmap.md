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

## ✅ Etapa 3 — CRUD de conhecimentos

- Criar, editar, arquivar, restaurar e excluir, com confirmação só na exclusão —
  confirmar o que é reversível ensina a clicar sem ler
- Editor rico (Tiptap): títulos, negrito, itálico, tachado, destaque, código,
  listas, checklists, citação, bloco de código, tabelas, links e linha divisória
- Listagem com busca por prefixo, filtros de nível e status, e paginação
- Página de detalhe renderizada no servidor, sem enviar o editor para quem só lê
- Estados de carregamento, vazio e "não encontrado" para cada rota
- 10 testes de integração contra o Supabase real, exercitando RLS pela API de
  verdade — o que os testes unitários não alcançam

Decisões que sustentam o resto:

- **`content_text` é derivado no servidor**, nunca aceito do cliente. É o índice
  de busca; um navegador que enviasse texto divergente do próprio documento
  tornaria registros localizáveis por palavras que não contêm.
- **Sanitização em duas portas**, e de novo na renderização. Detalhes em
  [architecture.md](architecture.md#o-documento-de-conhecimento).
- **Uma definição de schema** compartilhada entre editor e renderizador, para
  que o editor não consiga produzir um nó que o servidor não entenda.

Ainda não incluídos aqui porque pertencem à Etapa 4: escolher área e tags no
formulário, e vincular fontes. O schema já suporta os três.

## ✅ Etapa 4 — Áreas, tags e fontes

- CRUD completo dos três. Áreas com hierarquia (seletor indentado, sem oferecer
  a própria área nem suas descendentes como pai); tags sem hierarquia, criação
  rápida em lote na própria listagem; fontes com upload de arquivo.
- Fecha o formulário de conhecimento: área, tags e fontes agora se escolhem ao
  criar ou editar, e a página de detalhe mostra os três, com o lado inverso
  (fonte → conhecimentos que a citam) também visível.
- Upload direto do navegador para o Storage — não passa pelo servidor Next —
  com o caminho revalidado no servidor contra o prefixo do próprio usuário
  antes de qualquer gravação no banco.
- Guarda contra ciclo na hierarquia de áreas, e o seletor da interface já
  exclui as opções que o banco recusaria.
- 26 testes novos (130 no total): construção e achatamento da árvore de áreas,
  geração de slug com acentuação em português.

**Bug real encontrado e corrigido durante a verificação:** `ON DELETE SET
NULL` numa chave estrangeira composta zera a tupla inteira, inclusive
`user_id` — que é `NOT NULL`. Toda exclusão de uma área ou conhecimento com
dependentes falhava. Detalhes e a correção em
[architecture.md](architecture.md#a-armadilha-do-on-delete-set-null-composto).
Só apareceu agora porque a Etapa 4 foi a primeira a excluir uma linha com
dependentes de verdade.

## ✅ Etapa 5 — Inbox

- Captura rápida no topo da própria listagem: um tipo (link, nota, ideia,
  referência ou arquivo) e um campo cujo significado muda com o tipo — sem
  redirecionar, para capturar em série sem perder o lugar.
- Fila com os quatro estados (não processado, em análise, processado,
  arquivado) como abas que mostram a contagem de cada um, porque uma fila se
  trabalha um estado de cada vez.
- Transformar em conhecimento reaproveita o próprio formulário de
  conhecimento, pré-preenchido com o que a captura trouxe (link, texto ou
  nota viram um rascunho de conteúdo), e usa a mesma função de inserção que a
  criação comum — não uma segunda cópia que pudesse divergir dela.
- O item continua na inbox depois de processado, marcado e apontando para o
  conhecimento que ele virou; excluir o item não afeta esse conhecimento, e
  excluir o conhecimento (trigger de Etapa 4) desfaz só o vínculo.
- Nenhuma migração nova: `inbox_items`, seus quatro estados e o trigger que
  desfaz o vínculo já existiam desde as Etapas 1 e 4. Só a camada de aplicação
  faltava.
- Upload de arquivo na captura e na edição reaproveita a mesma peça de
  formulário das fontes (`FileField`, movida para `components/forms`), com as
  regras do bucket (`vault`) generalizadas em `src/lib/storage.ts` em vez de
  duplicadas por feature.
- 17 testes novos (147 no total): a montagem de um documento a partir de texto
  puro, e o roteamento de um mesmo campo de captura para `url`, `content` ou
  `storage_path` dependendo do tipo escolhido — o tipo de lógica que não trava
  quando está errada, só arquiva a coisa certa na coluna errada.

## ✅ Etapa 6 — Relacionamentos

- Seção "Relacionamentos" na página de um conhecimento: lista o que ele aponta
  e o que aponta para ele, e um formulário para criar uma nova aresta —
  conhecimento de destino, um dos oito tipos, direção (este conhecimento como
  sujeito ou como objeto do tipo escolhido) e uma nota opcional.
- Uma linha descreve os dois lados. A página do destino mostra o rótulo
  inverso (`RELATION_TYPE_META`, de Etapa 1) automaticamente — nenhuma
  segunda linha para manter em sincronia.
- Sem migração nova: `knowledge_relations` e seus oito tipos já existiam
  desde a Etapa 1.
- 8 testes novos (155 no total): a função que decide qual id vira `from_id` e
  qual vira `to_id` a partir da direção escolhida — inverter isso guardaria
  toda relação com os dois lados trocados, silenciosamente.

**Detalhe de banco que vale registrar:** como `knowledge_relations` tem duas
chaves estrangeiras para a mesma tabela (`from_id` e `to_id`, ambas para
`knowledge`), o PostgREST exige o nome da constraint em cada embed
(`knowledge!knowledge_relations_to_fk`) — sem isso a consulta é recusada por
ambiguidade. Detalhes em
[database.md](database.md#knowledge_relations).

## ✅ Etapa 7 — Projetos

- CRUD completo, com nome, descrição, status (ideia, em andamento, pausado,
  concluído, arquivado) e período — mesmo padrão de slug único por usuário de
  áreas e tags.
- Vínculo com conhecimentos gerenciado a partir da página do projeto: escolher
  um conhecimento e anotar como ele foi usado ali. Diferente de tags e fontes,
  esse vínculo carrega uma nota por par, o que não cabe num seletor de
  checkboxes compartilhado — por isso vive na página do projeto, não no
  formulário de conhecimento.
- Responde as duas perguntas do roadmap: a página do projeto lista *"o que usei
  aqui"*; a página do conhecimento ganha uma seção "Projetos" somente leitura
  respondendo *"em que projetos usei isto"*.
- Sem migração nova: `projects` e `knowledge_projects` já existiam desde a
  Etapa 1, "projects" já estava na lista de tabelas com slug único desde a
  Etapa 4.
- 6 testes novos (163 no total), sobre a checagem de que a data de término não
  vem antes da de início — a mesma regra que a constraint `projects_date_order`
  já impõe no banco.

**Bug real encontrado e corrigido durante a verificação:** `formatDate`
recebia uma data simples (`"2026-08-01"`, sem hora) e a interpretava como
meia-noite UTC; `Intl.DateTimeFormat` então renderizava esse instante no fuso
local do servidor, exibindo o dia anterior em qualquer fuso a oeste de UTC —
"31 de jul." para uma data salva como 1º de agosto. Afetava `started_at` e
`ended_at` de projetos e, desde a Etapa 4, `published_at` de fontes, sem ter
sido notado porque nada comparava a data exibida com a digitada. Corrigido
tratando uma data no formato `YYYY-MM-DD` como um dia de calendário, não um
instante; um timestamp completo continua se comportando como antes.

## ✅ Etapa 8 — Busca avançada

- Página `/busca`: uma caixa de busca sobre conhecimentos e fontes ao mesmo
  tempo, ranqueada pelos pesos do `tsvector` (título > resumo/autor > corpo),
  combinável com área, tag, nível, status e tipo de fonte — cada filtro só
  se aplica ao lado a que pertence, e "tag" vale para os dois.
- Fallback trigram: quando a busca por palavra-chave não encontra nada, um
  título parecido ainda aparece ("padnas" encontra "Pandas..."), com um aviso
  de que o resultado é aproximado.
- Filtrar sem digitar nada também funciona — lista o mais recente, sem
  ranking, já que não há o que ranquear.
- Duas funções no banco (`search_knowledge`, `search_sources`) fazem o
  ranking: PostgREST não tem como ordenar por `ts_rank(...)`, a mesma razão
  que já existia por trás de `dashboard_summary()`. Detalhes, inclusive o
  ajuste de `word_similarity()` e por que o limiar é um valor literal em vez
  do operador `<%`, em
  [database.md](database.md#busca-ranqueada-search_knowledge-e-search_sources).
- 5 testes novos (171 no total): que cada filtro só se aplica à busca a que
  pertence — o tipo de erro que não trava nada, só faz uma busca por nível
  devolver toda fonte do acervo junto.

**Bug real encontrado e corrigido durante a verificação:** um filtro que só
faz sentido para conhecimento (nível, status, área) fazia a busca de fontes
rodar sem filtro nenhum — que as funções do banco tratam como "liste tudo".
Filtrar só por nível devolvia, silenciosamente, toda fonte do acervo junto.
Corrigido checando, antes de cada chamada, se o conjunto de filtros realmente
diz algo sobre aquele lado.

## ✅ Etapa 9 — Base para IA

- `src/lib/ai/`: interface própria de acesso a modelo (`AiProvider`), com
  `AnthropicProvider` como única implementação hoje — um segundo provedor é um
  segundo arquivo com a mesma forma, não uma mudança em quem chama.
- Controle de custo: toda chamada passa por uma estimativa de pior caso antes
  de sair, recusada com `AiBudgetExceededError` se passar do teto pedido; o
  custo real, do `usage` que o provedor devolve, volta em todo resultado.
- Limite de taxa por usuário, em memória — pega um loop acidental, não
  substitui um limitador de verdade se o produto crescer para múltiplos
  usuários simultâneos de peso.
- Hierarquia de erro própria (`AiConfigError`, `AiRateLimitError`,
  `AiBudgetExceededError`, `AiProviderError`) — quem chama nunca captura uma
  exceção do SDK da Anthropic diretamente.
- Nenhuma feature visível, como o próprio roadmap já previa: sem tela, sem
  rota nova. Detalhes completos em
  [ai.md](ai.md#o-que-já-existe-na-aplicação).
- 15 testes novos (184 no total), sobre o cálculo de custo e o limitador de
  taxa — a orquestração fina em `client.ts` fica sem teste automatizado pelo
  mesmo motivo de toda Server Action do projeto: `server-only` lança fora do
  próprio build do Next.js, então essas peças são verificadas por leitura e
  pela primeira feature real que as usar (Etapa 10), não por teste unitário.

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
