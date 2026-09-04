# Inteligência artificial

> Nada de IA está implementado. Este documento registra a estratégia e o que já
> existe no schema para sustentá-la, para que as Etapas 9–12 sejam construção e
> não redesenho.

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

**Etapa 10 — processamento de conteúdo**

Sobre um item da Inbox ou uma fonte: resumir, extrair conceitos, sugerir área e
tags, propor um rascunho estruturado, detectar duplicata provável.

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
