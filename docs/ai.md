# Inteligência artificial

> A Etapa 9 construiu a fundação (interface de acesso a modelo, controle de
> custo, tratamento de erro, limite de taxa) sem nenhuma feature visível. A
> Etapa 10 construiu a primeira feature sobre ela: sugestão de título, resumo,
> nível, área e tags ao transformar um item da Inbox em conhecimento. Este
> documento registra a estratégia completa e o que já existe — no schema desde
> a Etapa 1, na aplicação desde a Etapa 9 — para que as Etapas 11–12 sejam
> construção sobre isso, não redesenho.

## Princípio

**A IA sugere; o usuário decide.**

Um acervo de conhecimento vale pela confiança que se tem nele. Conteúdo gerado
automaticamente e salvo sem revisão contamina a base de forma difícil de
detectar depois — e uma base em que não se confia deixa de ser consultada.

O fluxo é sempre este:

```
Fonte → IA analisa → IA sugere estrutura → Usuário revisa → Usuário confirma → Salva
```

Consequências de design que decorrem disso:

- Sugestão da IA nunca grava direto em `knowledge`. Vai para uma área de revisão.
- Todo campo sugerido é editável antes de confirmar.
- O que veio da IA fica marcado como tal, para poder ser reavaliado depois.
- Resposta de RAG cita as fontes internas usadas. Sem citação, não é resposta.

## Onde a IA entra

**✅ Etapa 10 — processamento de conteúdo**

Construído: sobre um item da Inbox, resumir, sugerir área e tags (só entre as
já cadastradas), sugerir o nível de maturidade, e detectar duplicata provável
reaproveitando a busca ranqueada da Etapa 8. Detalhes em
[`src/features/inbox/ai-suggestion.ts`](../src/features/inbox/ai-suggestion.ts)
e [`ai-suggestion-prompt.ts`](../src/features/inbox/ai-suggestion-prompt.ts).

Duas reduções de escopo deliberadas, não esquecimentos:

- **Só sobre um item da Inbox, não sobre uma fonte.** O ponto de entrada mais
  central e o que a Etapa 5 já deixou pronto (a página de "transformar em
  conhecimento"); resumir uma fonte é uma extensão natural, mas de um
  formulário diferente, e ficou para quando fizer sentido por si.
- **"Rascunho estruturado" virou metadados, não prosa.** A sugestão preenche
  título, resumo, nível, área e tags; o corpo do conhecimento continua vindo
  do texto que o usuário realmente capturou. Gerar o conteúdo em si é um
  escopo maior — mais tokens, mais risco de alucinação, e um texto longo é
  mais difícil de revisar num relance do que meia dúzia de campos curtos.
- **Nenhuma marca persistente de "isto veio da IA".** O princípio geral acima
  pede isso para conteúdo de IA em geral, mas aqui o usuário já revisa e
  frequentemente edita cada campo antes de "Criar conhecimento" — o mesmo
  botão, a mesma validação de uma criação manual. Uma coluna de proveniência
  em `knowledge` fica para quando uma feature futura precisar mostrá-la (por
  exemplo, uma tela de "revisar sugestões pendentes" de verdade), não como
  extensão de schema não usada por ninguém ainda.

**Etapa 11 — embeddings e busca semântica**

Indexar conhecimentos e fontes em vetores; buscar por significado.

O caso que motiva: buscar *"como avaliar a qualidade das finalizações de um
jogador"* deve encontrar notas sobre xG, shot quality e expected goals mesmo que
nenhuma dessas palavras esteja na consulta.

Busca semântica **complementa** a busca por palavra-chave, não a substitui.
Palavra-chave continua melhor para termo exato — nome de biblioteca, sigla,
número de versão. O destino é busca híbrida, combinando as duas com Reciprocal
Rank Fusion.

**Etapa 12 — RAG**

Perguntar ao próprio acervo:

```
1. Busca híbrida recupera candidatos
2. Expansão pelo grafo: conhecimentos vizinhos entram no contexto
3. Monta o contexto respeitando o limite de tokens
4. Consulta o modelo
5. Responde citando os conhecimentos e fontes usados
```

O passo 2 é o que diferencia este RAG de um genérico sobre documentos: as
arestas em `knowledge_relations` são curadoria humana, e um vizinho de grafo
costuma ser mais relevante que o quinto resultado por similaridade de cosseno.

**Etapa 14 — revisão**

Gerar perguntas de revisão a partir do conteúdo e ajustar intervalos.

## O que já existe na aplicação

`src/lib/ai/` é o único ponto de acesso a um modelo — nenhum outro arquivo
importa `@anthropic-ai/sdk`. É a peça central do princípio "não depender de um
único fornecedor a ponto de não poder trocar": um segundo provedor, ou um
modelo local, é um segundo arquivo implementando a mesma interface
`AiProvider`, não uma mudança em quem chama.

```
src/lib/ai/
├── types.ts               AiProvider, AiCompletionRequest/Result — as formas
│                           que atravessam a fronteira, sem nada específico da
│                           Anthropic
├── errors.ts               Hierarquia própria (AiConfigError,
│                           AiRateLimitError, AiBudgetExceededError,
│                           AiProviderError) — quem chama nunca captura uma
│                           exceção do SDK diretamente
├── pricing.ts               Preço por token, cálculo do custo real
│                           (`costForUsage`) e a estimativa de pior caso usada
│                           antes de qualquer chamada (`estimateMaxCost`)
├── rate-limit.ts            Limitador de janela deslizante, por usuário, em
│                           memória
├── anthropic-provider.ts   A única implementação de `AiProvider` hoje, e o
│                           único arquivo que importa o SDK da Anthropic
└── client.ts               completeWithAi / completeStructuredWithAi —
                            as funções que toda feature deve chamar
```

**Duas formas de completude, uma única porta de entrada.** `completeWithAi`
devolve texto livre; `completeStructuredWithAi` devolve um objeto validado
contra um schema Zod (`output_config.format` da Anthropic — a API recusa
qualquer resposta fora do formato, em vez de a aplicação pedir JSON no prompt
e torcer). A Etapa 10 só precisou da segunda: uma sugestão de conhecimento é
sempre `{title, summary, level, areaId, tagIds}`, nunca uma frase solta.

**Custo é um limite, verificado antes da chamada, não uma métrica só
observada depois.** `completeWithAi` estima o pior caso — todo caractere do
texto de entrada contado como um token, o `maxTokens` pedido inteiro gasto na
saída — e recusa a chamada com `AiBudgetExceededError` se isso passar do
teto (`request.maxCostUsd`, com um padrão conservador). O custo real, sempre
calculado a partir do `usage` que o provedor devolve de verdade, volta em
`AiCompletionResult.costUsd` para quem chamou agregar ou logar como quiser —
esta etapa não grava um histórico de gastos; fazer isso fica para quando uma
feature de verdade precisar mostrá-lo.

**O limitador de taxa é por usuário, em memória, de propósito simples.** Ele
existe para pegar um loop acidental — um bug que chama a IA dentro de um
`while`, uma retentativa em cascata — não para policiar um SaaS
multi-tenant. Cada instância do servidor guarda seus próprios contadores, o
que em produção (Vercel, várias instâncias) significa que o teto real por
usuário é `maxRequests × número de instâncias`, não um número único. Um
armazenamento compartilhado (Redis, ou uma tabela no Postgres) fecha essa
lacuna, se algum dia importar.

**Toda escrita de IA no futuro passa por `completeWithAi`, nunca por
`AnthropicProvider` diretamente.** É essa função que aplica o limite de taxa e
o teto de custo antes de delegar ao provedor — chamar o provedor por fora
pula as duas proteções.

`ANTHROPIC_API_KEY` é opcional em `src/lib/env.ts` até que uma feature de
verdade chame `completeWithAi` — a Etapa 9 não tem nenhuma, de propósito.

## O que já existe no schema

### `embeddings`

```sql
owner_type  -- 'knowledge' | 'source' | 'inbox_item'
owner_id
chunk_index
content     -- o texto exato que gerou o vetor
model       -- parte da identidade do chunk
embedding   vector(1536)
```

Quatro decisões que já estão tomadas:

- **Chunked.** Uma fonte longa vira várias linhas, e `content` guarda o trecho
  exato — é o que permite citar a passagem em vez do documento inteiro.
- **`model` na identidade.** Dois modelos coexistem durante uma migração, em vez
  de exigir reindexação de uma vez só.
- **Índice HNSW**, distância de cosseno. Escolhido sobre IVFFlat porque não
  precisa de passo de treino e não perde precisão numa tabela que cresce poucas
  linhas por vez — exatamente o formato de um acervo pessoal.
- **Dimensão 1536**, compatível com os modelos de embedding usuais. Mudar exige
  migração da coluna; por isso está documentado aqui.

RLS permite ao usuário **ler** os próprios vetores, nunca escrever. Vetor
controlado pelo cliente permitiria envenenar o próprio contexto de RAG, e não há
razão legítima para o navegador produzir um.

### Grafo

`knowledge_relations` já é a tabela de arestas, com tipo e direção. Serve tanto à
visualização (Etapa 13) quanto à expansão de contexto do RAG.

## Segurança

- **Chave de API só no servidor.** Nunca `NEXT_PUBLIC_`. Toda chamada a modelo
  sai de Server Action ou Route Handler.
- **Conteúdo do acervo é dado, não instrução.** Texto vindo de fonte externa
  pode conter tentativa de injeção de prompt; entra no contexto delimitado e
  identificado como dado.
- **Nada sai do acervo sem intenção do usuário.** Enviar conteúdo para um modelo
  externo é publicar aquele conteúdo em um terceiro. Deve ser explícito, e a
  arquitetura precisa permitir trocar para um modelo local sem reescrever a
  aplicação — por isso o acesso a LLM fica atrás de uma interface própria, e não
  espalhado pelo código.
- **Custo é limite, não detalhe.** Reindexação em massa precisa de fila e
  limite; nada de embedar o acervo inteiro num request HTTP.

## O que deliberadamente não será feito

- Organizar automaticamente sem confirmação.
- Apagar ou fundir conhecimentos por decisão da IA.
- Reescrever o que o usuário escreveu, sem pedido explícito.
- Depender de um único fornecedor de modelo a ponto de não poder trocar.
