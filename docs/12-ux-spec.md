# Especificação UX/UI operacional

**Versão:** 0.1 (FASE 0)  
**Status:** spec oficial de telas (integrator). Origem: SUBAGENT 6 — FRONTEND.  
**Não é mock pixel-perfect.** Contrato operacional de telas, hierarquia, estados, ações e o que a interface **não** pode fazer.

- **UI em português (pt-BR).** Código/schema em inglês (A3).
- **Desktop-first, tabela central, pouco clique, sem animação excessiva (A36, seção 33).**
- Stack de UI de referência: Next.js App Router, shadcn/ui, TanStack Table, React Hook Form + Zod. Este documento não prescreve CSS.

---

## 1. Escopo e não-escopo

### 1.1 Escopo desta spec

Nove superfícies do MVP (DoD até FASE 5; FASE 1 ainda sem WhatsApp — A33):

1. Lista de matrizes
2. Visão Geral (agregada)
3. Tela da matriz (TanStack Table)
4. Detalhe da tarefa + timeline
5. Dashboard
6. Caixa de Entrada / Central de Pendências
7. Cadastro de responsáveis
8. Formulários de prazo (6 tipos), com clareza de `WAITING_FOR_TRIGGER`
9. Configurações mínimas (timezone, feriados, notification rules, notification targets)

Mais: navegação, padrões compartilhados, estados vazios/erro/loading, o que não fazer, riscos de usabilidade.

### 1.2 Fora de escopo (não desenhar agora)

- Quick capture em linguagem natural, import DOCX/CSV, templates de matriz (FASE 7 — A34)
- Chatbot, conversa livre autônoma, bolhas estilo WhatsApp Web como UI principal
- Multi-organização, OAuth, temas elaborados, onboarding animado
- Mock visual, design system de marketing, ilustrações, microinterações

---

## 2. Princípios operacionais (lei)

| # | Princípio | Consequência na UI |
|---|-----------|-------------------|
| P1 | Reduzir cliques do administrador | Ação frequente na própria linha/tabela; detalhe é aprofundamento, não pré-requisito |
| P2 | Tabela é o objeto central | Matriz, Visão Geral e listas densas usam tabela. Cards só onde a seção 22 pede métricas |
| P3 | Feedback imediato | Toast + atualização otimista com rollback; nunca “silêncio” após salvar |
| P4 | Três camadas de status visíveis | Operacional persistido ≠ prazo calculado ≠ prorrogação. Nunca fundir num único badge “Atrasado” |
| P5 | `sequence_number` não é prioridade | Coluna Ordem = cadastro. “Prioridade de atenção” é ranking calculado distinto (A11) |
| P6 | Dependência só se cadastrada | UI nunca sugere “#3 depende de #2” só pela ordem |
| P7 | Observações = projeção + notas | Não é um textarea único da verdade (A27) |
| P8 | Múltiplos responsáveis, sem primário | Todos visíveis; notificação por pessoa (A20) |
| P9 | Nunca esconder automação | Origem `AUTOMATION` / `SYSTEM` / `AI_SUGGESTION` / `WHATSAPP` rotulada na timeline e no histórico (seção 25) |
| P10 | Inbox deixa óbvio quando o sistema **não** decidiu | Banner permanente no item: nenhuma mutação de domínio foi feita (A15, seção 21) |
| P11 | IA não é a UI | Inbox mostra classificação + sugestão. Humano confirma. Sem “assistente” flutuante |
| P12 | Funciona sem WhatsApp e sem IA | Telas de conversa/inbox degradam com estados explícitos; prazos e tabelas continuam |

---

## 3. Arquitetura de informação e navegação

### 3.1 Shell desktop (layout persistente)

```
┌─────────────────────────────────────────────────────────────────┐
│ App bar: [Logo] Matriz de Responsabilidade    🔔 inbox (N)  user │
├──────────────┬──────────────────────────────────────────────────┤
│ Sidebar      │  Conteúdo (título + ações primárias + filtros)   │
│              │                                                  │
│ Dashboard    │  Área de trabalho (tabela / detalhe / forms)     │
│ Caixa de     │                                                  │
│   Entrada N  │                                                  │
│ Matrizes     │                                                  │
│ Visão Geral  │                                                  │
│ Responsáveis │                                                  │
│ Configurações│                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

- Sidebar fixa em desktop (≥1280px). Recolhível (ícones + tooltip) entre 1024–1279px.
- Badge numérico **somente** em Caixa de Entrada e no sino da app bar = itens abertos não adiados.
- Item ativo = texto + fundo discreto. Sem ícones ilustrativos pesados.

**Ordem da sidebar (hierarquia de atenção, não de cadastro):**

1. Dashboard — “o que olhar hoje”
2. Caixa de Entrada — exceções humanas
3. Matrizes — trabalho por contexto
4. Visão Geral — consulta agregada (não duplica tarefas — A17)
5. Responsáveis — cadastro reutilizável
6. Configurações — timezone, feriados, regras, destinos

**Não** criar item “Chat”, “Assistente” ou “WhatsApp” no menu principal. Conversa vive **dentro da tarefa**.

### 3.2 Rotas conceituais (UI)

| Rota | Tela |
|------|------|
| `/` | Dashboard |
| `/inbox` | Caixa de Entrada |
| `/inbox/:itemId` | Inbox com painel de contexto aberto |
| `/matrices` | Lista de matrizes |
| `/matrices/:matrixId` | Tela da matriz (tabela) |
| `/matrices/:matrixId/tasks/:taskId` | Detalhe da tarefa |
| `/overview` | Visão Geral agregada |
| `/responsibles` | Lista de responsáveis |
| `/responsibles/:id` | Detalhe / edição de responsável |
| `/settings` | Configurações (abas) |
| `/tasks/:taskId` | Atalho: redireciona para a rota da matriz da tarefa |

Breadcrumb obrigatório a partir da matriz:

`Matrizes / OD Academy / #3 Elaborar versão 1`

### 3.3 Distinções de nomenclatura (I7, A18)

| Termo na UI | Significado | Não confundir com |
|-------------|-------------|-------------------|
| **Visão Geral** | Consulta agregada de demandas de **todas** as matrizes | Tipo de matriz `GENERAL` |
| **Matriz Geral** | Uma matriz cujo tipo é `GENERAL` (ex.: “Matriz Geral”) | A rota `/overview` |
| **Ordem (#)** | `sequence_number`, imutável, identidade da demanda | Prioridade de atenção |
| **Ordem de exibição** | `display_order`, editável, só rearranjo visual | Dependência |
| **Prioridade de atenção** | Ranking calculado no Dashboard | Qualquer número da tabela |

Na lista de matrizes, o tipo aparece como rótulo (“Geral”, “Projeto”, “Curso”…). A Visão Geral nunca se chama “Matriz Geral”.

---

## 4. Papéis na interface (A9, Q1)

Dois papéis. A UI **esconde ou desabilita** ações, nunca “quebra” com 403 opaco sem contexto.

| Capacidade | ADMIN | OPERATOR |
|------------|-------|----------|
| Ver dashboard, matrizes, visão geral, detalhe, histórico | sim | sim |
| Criar/editar matriz, tarefa, responsável, dependência, prazo | sim | sim (assumption; Q1 pode restringir) |
| Alterar status operacional (exceto COMPLETED) | sim | sim |
| Confirmar entrega → COMPLETED | sim | não — botão visível desabilitado: “Somente administrador confirma entrega” |
| Aprovar / ajustar / rejeitar prorrogação | sim | não — pode **abrir** o pedido e comentar |
| Responder WhatsApp pelo inbox | sim | não no MVP (assumption) |
| Marcar inbox como resolvido / adiar | sim | OPERATOR: só “ver contexto”; ações de decisão desabilitadas |
| Configurações (timezone, feriados, regras, destinos) | sim | leitura; edição bloqueada |
| Arquivar matriz | sim | não |

Até Q1 ser respondida: tratar o usuário inicial como ADMIN único; OPERATOR pode existir no modelo sem tela de convite elaborada.

---

## 5. Padrões compartilhados

### 5.1 Densidade, tipografia, cor (operacional)

- Densidade **compacta** em tabelas (linha ~40–44px). Detalhe e forms: densidade confortável.
- Fonte de interface do sistema / sans neutra. Números tabulares para datas e `#`.
- Cor **não é o único** canal: badge sempre tem texto.
- Acento de linha (barra esquerda 3px), não fundo saturado:
  - vermelho: `OVERDUE` e não bloqueada-por-gatilho
  - âmbar: `DUE_TODAY` / `DUE_SOON`
  - azul-acinzentado: `WAITING_FOR_TRIGGER`
  - violeta: `EXTENSION REQUESTED`
  - verde discreto: `COMPLETED`
  - cinza: `CANCELLED`
- Sem gradientes, glassmorphism, skeletons dançantes, page transitions.

### 5.2 Três camadas de status (seção 7, I4)

A UI **sempre** separa:

1. **Status operacional** (persistido): Pendente, Em andamento, Bloqueada, Aguardando informação, Aguardando validação, Concluída, Cancelada
2. **Situação de prazo** (calculada, nunca editada direto): Aguardando gatilho, No prazo, Vence em breve, Vence hoje, Atrasada, Não se aplica
3. **Prorrogação** (persistido): Nenhuma, Solicitada, Aprovada (histórico), Rejeitada (histórico da última)

`NOT_APPLICABLE` (I4): quando operacional é Concluída ou Cancelada, **não** mostrar “No prazo” nem “Atrasada”. Mostrar “—” ou “Não se aplica” em tipografia secundária.

**Combinações típicas (legenda curta na UI, não um quarto status):**

- `IN_PROGRESS` + `OVERDUE` → badges “Em andamento” + “Atrasada há N dias”
- `BLOCKED` + `ON_TIME` → “Bloqueada” + “No prazo” + texto “bloqueio não é atraso do responsável”
- `PENDING` + `WAITING_FOR_TRIGGER` → “Pendente” + “Aguardando gatilho” — **sem** linguagem de cobrança

### 5.3 Responsáveis múltiplos (A20, I5)

- Chips empilhados na horizontal, truncar com `+N` e tooltip/lista no hover.
- Ordem: alfabética por nome (sem “primário”).
- Avatar inicial + nome. Telefone **não** aparece na tabela (LGPD / ruído). Telefone no detalhe do responsável e no cadastro.
- Tarefa com 0 responsáveis: chip vazio “Sem responsável” + ação “Atribuir” (estado inválido operacional, visível).
- Filtro “Responsável” é multi-select. Linha aparece se **qualquer** responsável bater.

### 5.4 Coluna Observações — projeção estruturada + notas (A27, seção 11)

A célula **não** é o campo `notes` cru. É uma composição de até 3 linhas, nesta ordem:

**Linha 1 — situação (gerada):** um dos textos abaixo, nunca editável in-place:

- “Pendente”
- “Em andamento”
- “Bloqueada por #2 e #4”
- “Aguardando gatilho: conclusão de #2 Definir data da live”
- “Aguardando validação da entrega”
- “Entregue em 27/08/2026”
- “Atrasada há 3 dias”
- “Vence hoje”
- “Vence em 2 dias úteis”
- “Prazo ainda não definido”

**Linha 2 — prorrogações (gerada, se count > 0):**

- “Prorrogado 1 vez. Novo prazo: 05/09/2026.”
- “Prorrogado 2 vezes. Última solicitada por Matheus.” (quando status = REQUESTED, **ainda não aprovada**)
- Pedido em aberto usa verbo **solicitada**, nunca “prorrogado” como fato consumado

**Linha 3 — notas manuais:** até 1–2 notas mais recentes, truncadas. Ícone discreto se houver mais. Clique abre o painel de notas.

Separador visual mínimo entre linhas geradas e notas (tipografia secundária nas geradas, primária nas manuais). **Não** misturar num parágrafo único.

### 5.5 Origem da ação — nunca esconder automação (seção 25, P9)

Toda entrada de timeline, histórico e inbox mostra **origem** com rótulo textual:

| Origin | Rótulo na UI |
|--------|----------------|
| `USER` | “Você” / nome do usuário |
| `AUTOMATION` | “Automação” |
| `SYSTEM` | “Sistema” |
| `WHATSAPP` | “WhatsApp · {nome do responsável}” |
| `AI_SUGGESTION` | “Sugestão da IA” (nunca “IA alterou”) |

Sugestão da IA usa fundo/borda **diferente** de ação executada. Texto padrão: “Sugestão — não aplicada”.

### 5.6 Prazo na tabela e `WAITING_FOR_TRIGGER`

Célula Prazo tem duas linhas:

1. **Valor vigente** ou estado de espera
2. **Regra em linguagem natural** (gerada da `DeadlineRule`, não texto solto salvo)

| Tipo | Linha 1 (tabela) | Linha 2 |
|------|------------------|---------|
| `FIXED_DATE` | `28/08/2026` | “Data fixa” |
| `BUSINESS_DAYS_AFTER_CREATION` | data calculada | “15 dias úteis após cadastro (12/08)” |
| `BUSINESS_DAYS_AFTER_DEPENDENCY` **antes do gatilho** | **“Aguardando #2”** (não inventar data) | “15 dias úteis após conclusão de #2” |
| `BUSINESS_DAYS_AFTER_DEPENDENCY` **depois** | data calculada | “15 dias úteis após #2 concluída em 20/08” |
| `CALENDAR_DAYS_AFTER_TRIGGER` | análogo ao anterior, “dias corridos” | idem |
| `RECURRING_BUSINESS_DAY` | próxima ocorrência | “3º dia útil de cada mês · vigência ago/2026” |
| `MANUAL` / indefinido | **“A definir”** | “Prazo manual” |

Regras anti-engano (A26):

- `WAITING_FOR_TRIGGER` **nunca** usa cor/texto de atraso
- Tooltip: “Não há vencimento enquanto a demanda gatilho não for **validada como concluída**. Dizer ‘entreguei’ na gatilho **não** dispara o prazo (A14, A29).”
- Recorrência: uma linha só; a vigência do período atual aparece na linha 2 (A16)

### 5.7 Feedback imediato

| Evento | UI |
|--------|-----|
| Salvar campo | Toast curto “Salvo” (2s) + valor na tabela |
| Erro de validação | Inline no campo; foco no primeiro erro; sem toast genérico |
| Erro de servidor | Toast persistente + manter form sujo; botão “Tentar de novo” |
| Ação destrutiva | Dialog de confirmação com nome da entidade |
| Ação irreversível de negócio (COMPLETED, aprovar prorrogação) | Dialog com resumo do efeito (libera dependentes, avisa sócios) |
| Automação disparada | Toast “Lembrete enfileirado” — não “Mensagem entregue” até status do provider |
| Conflito / stale | Banner “Dados atualizados por outro usuário ou pela automação. Recarregue.” |

Otimista só em: nota, comentário, filtro, mark-as-read. **Não** otimista em: COMPLETED, aprovação de prazo, exclusão, alteração de dependência.

### 5.8 Estados vazios, loading, erro (padrão global)

Toda tela declara os três. Regras:

- **Loading inicial:** skeleton da **tabela** (linhas cinza), não spinner de página inteira. Tempo alvo percebido: conteúdo em < 1s no desktop local.
- **Loading de ação:** botão em `pending`; tabela permanece visível.
- **Vazio:** título + 1 frase + 1 CTA. Sem ilustração mascote.
- **Erro de carga:** título “Não foi possível carregar”, mensagem técnica curta, “Tentar de novo”. Não apagar a navegação.
- **Erro parcial (WhatsApp/IA):** banner no topo da tela afetada; o resto opera (A32).
- **Filtro sem resultado:** “Nenhuma demanda com esses filtros” + “Limpar filtros”. Distinto de vazio real.

### 5.9 Contrato da tabela (TanStack Table)

Aplicável à tela da matriz e à Visão Geral.

- Colunas redimensionáveis; persistir largura em `localStorage` por tela.
- Sort client-side no conjunto já carregado; se paginado no servidor, sort server-side explícito.
- Filtros acima da tabela, sempre visíveis (não dentro de “mais filtros” no MVP, exceto campos raros).
- Busca textual: título, descrição, nome de responsável, `#` / `sequence_number`, texto de notas. Debounce 300ms. Highlight opcional só na célula Tarefa.
- Paginação: 50 / 100 / todas (máx. razoável). Default 100. Rodapé com “N demandas”.
- Seleção múltipla: checkbox para ações em lote **mínimas** no MVP: atribuir responsável, exportar depois (FASE 7). Sem excluir em lote.
- Expand da linha: chevron na primeira coluna. Não navega. `Enter` na linha focada expande.
- Clique no **título da tarefa** abre detalhe (navegação). Clique no restante da linha seleciona/expande — não os dois no mesmo alvo.
- Coluna Ordem: sort default = `display_order` crescente, fallback `sequence_number`. Header com tooltip: “Ordem de cadastro. Não é prioridade nem dependência.”
- Sticky header. Coluna Tarefa min-width suficiente para leitura.
- Acessibilidade: teclado (Tab, setas no grid se o kit permitir), `aria-sort`, caption “Demandas da matriz {nome}”.

### 5.10 Datas, locale, timezone (A2)

- Exibir `dd/MM/yyyy`. Hora só quando o evento tiver hora (timeline, mensagem WhatsApp): `dd/MM/yyyy HH:mm`.
- Timezone de exibição = `system_settings` (default `America/Sao_Paulo`). Rodapé discreto em Configurações e no form de prazo: “Datas em America/Sao_Paulo”.
- Relativo só como complemento: “há 3 dias”, “vence em 2 dias úteis”. Nunca sozinho na coluna Prazo.
- “Dias úteis” escrito por extenso na regra; não omitir “úteis” vs “corridos”.

---

## 6. Telas

---

### 6.1 Lista de matrizes

**Objetivo:** achar e abrir uma matriz; ver saúde operacional sem abrir cada uma.

**Não é** galeria de cards. É **tabela densa** (P2).

#### Hierarquia de informação

| Nível | Conteúdo |
|-------|----------|
| 0 | Título “Matrizes” + busca + filtro tipo/ativa + CTA “Nova matriz” |
| 1 | Contadores globais compactos (opcional, uma linha): ativas, arquivadas, demandas atrasadas no conjunto |
| 2 | Tabela de matrizes |
| 3 | Ações por linha (abrir, arquivar) |

**Colunas da tabela:**

| Coluna | Conteúdo | Sort |
|--------|----------|------|
| Nome | Nome + descrição em uma linha truncada | sim |
| Tipo | rótulo (Geral, Projeto, Curso, Produto, Evento, Outro) | sim |
| Demandas | total ativas (não canceladas) | sim |
| Atenção | chips numéricos: atrasadas, vencem hoje, bloqueadas, inbox aberto desta matriz | não (é agregado) |
| Atualizada | `updated_at` relativo + absoluto no title | sim |
| Ações | Abrir (primário), ⋯ Arquivar / Duplicar (duplicar = FASE 7, oculto) | |

Linha clicável → `/matrices/:id`.

**Filtros:** busca por nome; tipo (multi); “Incluir arquivadas” (default off — alinhado à Visão Geral, A17).

#### Estados

| Estado | UI |
|--------|-----|
| Vazio (zero matrizes) | “Nenhuma matriz ainda.” CTA: “Criar primeira matriz”. Texto: “A Matriz Geral, cursos e projetos entram aqui. A Visão Geral aparece depois da primeira demanda.” |
| Vazio filtrado | “Nenhuma matriz com esses filtros.” Limpar |
| Loading | skeleton 8 linhas |
| Erro | padrão global |
| Arquivada | nome em tipografia secundária + badge “Arquivada”; some do default |

#### Formulário “Nova matriz” (dialog ou página curta)

Campos: nome (obrigatório), tipo (select + “Outro” com texto se extensível — A18), descrição (opcional). **Não** pedir prazo/tarefas aqui.

Salvar → navega para a matriz vazia (estado vazio da tabela de demandas).

#### O que não fazer nesta tela

- Cards com ícones de pasta
- Estatísticas em gráficos
- Preview da tabela de tarefas no hover

---

### 6.2 Visão Geral (agregada)

**Objetivo:** uma consulta de **todas** as demandas de matrizes ativas (default), sem duplicar registros (A17). Responde “onde está cada demanda no universo”, não “o que olhar hoje” (isso é o Dashboard).

#### Hierarquia

| Nível | Conteúdo |
|-------|----------|
| 0 | Título “Visão Geral” + subtítulo “Consulta agregada — as demandas não são copiadas” |
| 1 | Filtros (matriz, responsável, status operacional, situação de prazo, prorrogação, busca) + “Incluir arquivadas” |
| 2 | **A mesma tabela canônica de 6 colunas**, mais coluna **Matriz** à esquerda de Ordem |
| 3 | Expand / detalhe iguais à tela da matriz |

Colunas: **Matriz | Ordem | Responsável | Tarefa | Prazo | Pré-requisito | Observações**

- Coluna Matriz: nome da matriz + tipo em tipografia secundária. Clique → abre a matriz (não a tarefa).
- Ordem é o `#` **daquela** matriz (pode repetir #3 em matrizes diferentes — sempre prefixar visualmente com a matriz no expand).
- Default sort: situação de prazo (atrasadas primeiro), **depois** due date, **nunca** `sequence_number` global.

Filtro de matriz: multi-select das ativas. Default: todas ativas.

#### Estados

| Estado | UI |
|--------|-----|
| Vazio real (zero tarefas no sistema) | “Ainda não há demandas. Abra uma matriz e cadastre a primeira.” CTA para Lista de matrizes |
| Vazio filtrado | Limpar filtros |
| Loading / erro | padrão |
| Só matrizes arquivadas no filtro | aviso “Exibindo demandas de matrizes arquivadas” |

#### O que não fazer

- Transformar em kanban
- Duplicar tarefa se ela aparece em duas matrizes (não existe esse caso; uma tarefa tem um `matrix_id`)
- Chamar esta tela de “Matriz Geral”

---

### 6.3 Tela da matriz (TanStack Table) — superfície principal

**Objetivo:** operar a matriz como o Word operava, com superpoderes (filtro, sort, expand, ações) sem virar dashboard.

Contexto no header (nível 0):

```
[breadcrumb] Matrizes / OD Academy
Título: OD Academy          tipo: Curso     [Arquivar]
Descrição (1 linha, expandível)
Ações: [+ Demanda]  [Filtros ativos N]
```

Sem cards de métrica nesta tela (métricas ficam no Dashboard). Opcional: uma **linha de resumo** textual, não card:

`34 demandas · 3 atrasadas · 1 aguardando validação · 2 pedidos de prorrogação`

Clique em cada trecho aplica filtro local.

#### 6.3.1 Colunas canônicas (seção 23)

| Coluna | Largura relativa | Conteúdo |
|--------|------------------|----------|
| (expand) | 32px | Chevron |
| **Ordem** | estreita | `#sequence_number`. Se `display_order ≠ sequence_number`, mostrar `#3` como identidade e handle discreto para reordenar exibição. Tooltip do handle: “Só altera a ordem visual. Não cria dependência.” |
| **Responsável** | média | chips múltiplos (5.3) |
| **Tarefa** | flex | título (link para detalhe). Descrição truncada em 1 linha se houver |
| **Prazo** | média | padrão 5.6 |
| **Pré-requisito** | média | `#2, #4` como links. Vazio: “—”. Se gatilho não concluído: `#2` + ícone de cadeado + tooltip “bloqueada até #2 ser validada” |
| **Observações** | flex | projeção 5.4 |

**Não** adicionar coluna “Prioridade”. **Não** usar Ordem como proxy de atenção.

Coluna extra **opcional** (toggle “Mostrar situação”, default **ligado** no desktop): badges operacionais + prazo na mesma célula, para scan rápido. Pode ser desligada para ficar fiel às 6 colunas do Word. Estado do toggle persistido.

#### 6.3.2 Filtro, busca, sort

**Barra de filtros (sempre visível):**

- Busca (placeholder: “Buscar tarefa, responsável, #…”)
- Status operacional (multi)
- Situação de prazo (multi) — incluir `WAITING_FOR_TRIGGER` com o rótulo “Aguardando gatilho”
- Responsável (multi)
- “Somente com prorrogação em aberto”
- “Somente bloqueadas por pré-requisito”
- Limpar tudo

**Sort permitido:** Ordem (display), Tarefa (A–Z), Prazo (data vigente; `WAITING_FOR_TRIGGER` e “A definir” vão para o fim ou início — default: fim), Status. Responsável: sort pelo primeiro nome alfabético do conjunto (documentar; é convencional, não “primário”).

#### 6.3.3 Expand da linha (não é o detalhe completo)

Expande **abaixo** da linha, mesma tabela (subcomponente). Conteúdo em 3 blocos horizontais:

**Esquerda — contexto**

- Descrição completa (ou “Sem descrição”)
- Pré-requisitos com status de cada um
- Dependentes (“#5 e #8 aguardam esta”)
- Regra de prazo por extenso

**Centro — conversa e notas (preview)**

- Últimas 3 mensagens WhatsApp **ou** “Ainda não há conversa nesta demanda”
- Últimas notas manuais
- Se IA classificou a última resposta: chip da classificação + “Sugestão não aplicada”

**Direita — ações (pouco clique)**

Botões compactos, nesta ordem de frequência:

1. Alterar status (select imediato; COMPLETED não aparece aqui — vai para “Confirmar entrega”)
2. Adicionar comentário / nota (inline textarea + Salvar)
3. Registrar prorrogação (abre form; humano)
4. Ver conversa (abre drawer ou âncora no detalhe)
5. Ver histórico (drawer)
6. Abrir detalhe (link)

Mudança de status: select com os estados **válidos** a partir do atual. Transição ilegal: item desabilitado com motivo (“Concluir só após validar entrega no detalhe / inbox”).

#### 6.3.4 Ações da seção 23 — mapeamento

| Ação | Onde | Cliques alvo |
|------|------|----------------|
| Filtrar / pesquisar / ordenar | barra + headers | 1 |
| Expandir linha | chevron ou teclado | 1 |
| Abrir detalhes | clique no título ou botão | 1 |
| Alterar status | expand ou menu ⋯ da linha | 2 (abrir + escolher) |
| Adicionar comentário | expand | 2 (texto + salvar) |
| Visualizar histórico | expand → drawer | 2 |
| Visualizar conversa | expand → drawer / detalhe âncora | 2 |
| Registrar prorrogação | expand ou detalhe | 2–3 (form + confirmar) |

Menu ⋯ da linha (sempre visível no hover/foco): as mesmas ações para quem não quer expandir. Não esconder ações só no hover: o ⋯ permanece.

#### 6.3.5 Reordenar exibição

- Handle na coluna Ordem (ADMIN).
- Persistência de `display_order` com audit (`USER`).
- Dialog zero: soltar já salva, toast “Ordem de exibição atualizada. A numeração # não mudou.”
- Bloquear interpretação: após reorder, **não** perguntar “criar dependência em cadeia?”

#### 6.3.6 Criar demanda (`+ Demanda`)

Painel direito (drawer) ou página `/matrices/:id/tasks/new`. Campos mínimos na primeira dobra:

1. Título *
2. Responsáveis * (multi-combobox; “criar responsável” inline se não existir)
3. Prazo * (widget dos 6 tipos — seção 6.8)
4. Pré-requisitos (multi, tarefas da **mesma** matriz)
5. Descrição (opcional)
6. Nota inicial (opcional → `task_notes`)

Salvar: 1 clique. `sequence_number` gerado; toast “Demanda #N criada”. Foco na nova linha.

Validação de dependência: erro inline se ciclo / auto-dependência (A12).

#### 6.3.7 Estados da tela da matriz

| Estado | UI |
|--------|-----|
| Matriz sem demandas | “Nenhuma demanda nesta matriz.” CTA `+ Demanda`. Texto: “O número (#) será a ordem de cadastro, não prioridade.” |
| Todas filtradas para fora | “Nenhuma demanda com esses filtros.” |
| Matriz arquivada | banner “Arquivada — somente leitura” + CTA desarquivar (ADMIN) |
| Loading | skeleton da tabela no header já preenchido (nome da matriz vem no layout) |
| Erro ao salvar status | toast + célula reverte |
| Tarefa recorrente | badge “Recorrente” na célula Prazo; uma linha apenas |

#### 6.3.8 Conversa (drawer)

**Não é chatbot.**

- Lista cronológica de mensagens (in/out), timestamps, status de entrega do provider (enviada, entregue, falhou, lida se disponível).
- Cada mensagem automática rotulada “Modelo: Lembrete D-3” etc.
- Composer **só** quando o ADMIN escolhe “Responder” (humano). Placeholder: “Sua resposta será enviada uma vez. O sistema não continuará a conversa sozinho.”
- Sem typing indicator de bot, sem “IA está digitando”, sem sugestões em carrossel no composer (a sugestão vive no inbox).

---

### 6.4 Detalhe da tarefa + timeline (seção 24)

**Objetivo:** uma demanda, tudo que o administrador precisa para decidir, com história auditável.

#### Hierarquia (de cima para baixo, uma coluna + trilho)

**Nível 0 — identidade**

- Breadcrumb
- `#sequence_number` + título (editável inline, ADMIN/OPERATOR)
- Matriz (link)
- Ações primárias à direita, conforme estado:
  - Se `WAITING_FOR_VALIDATION`: botão destacado **Confirmar entrega** (ADMIN) + **Não está entregue** (volta a IN_PROGRESS / PENDING conforme regra de domínio)
  - Se `EXTENSION REQUESTED`: **Analisar prorrogação**
  - Sempre: ⋯ (cancelar, editar regra de prazo)

**Nível 1 — precisa de ação agora** (só se houver)

Banner único, prioridade:

1. Inbox vinculado (ex.: “Pedido de prorrogação — nenhuma alteração foi feita”)
2. Falha de WhatsApp
3. Classificação pendente (IA indisponível)

**Nível 2 — fatos operacionais** (grid 2 colunas, labels à esquerda)

| Campo | Exibição |
|-------|----------|
| Responsáveis | chips + “Adicionar / remover” |
| Status operacional | badge + select |
| Situação do prazo | badge calculado, **não editável**. Texto “calculado em {computed_at}” no title |
| Prazo original | `original_due_date` ou “—” se nunca houve data (WAITING_FOR_TRIGGER / MANUAL) |
| Prazo atual | vigente |
| Regra de prazo | linguagem natural + botão “Editar regra” |
| Nº de prorrogações | inteiro + link âncora para histórico de prorrogações |
| Pré-requisitos | lista com status e prazo de cada uma; CTA “Adicionar pré-requisito” |
| Dependentes | lista “estas demandas aguardam esta”; vazio: “Nenhuma demanda depende desta” |
| Descrição | bloco de texto |

**Nível 3 — Observações**

- Bloco “Situação (gerada)” = mesma projeção da tabela, somente leitura
- Bloco “Notas manuais” = lista + composer

**Nível 4 — TIMELINE** (protagonista inferior)

Lista vertical, mais recente **embaixo** (leitura cronológica natural do processo) **ou** mais recente no topo com toggle “Mais recente primeiro” (default: cronológico crescente, como o exemplo da seção 24). Default desta spec: **crescente** (igual ao Word mental: história de cima para baixo). Toggle persistido.

Cada evento:

```
26/08/2026 14:12
Prorrogação aprovada
Prazo 28/08/2026 → 02/09/2026
Origem: Você (ADMIN)
```

Eventos mínimos a renderizar (não omitir automação):

- Tarefa criada (`created_by`)
- Responsáveis alterados
- Dependência adicionada/removida
- Status operacional alterado (de → para)
- Regra de prazo alterada
- Prazo calculado / recalculado (incluir motivo: gatilho, prorrogação, edição)
- Lembrete enfileirado / enviado / falhou
- Mensagem recebida (trecho)
- Classificação da IA (classification, confidence, “não alterou o domínio”)
- Bloqueio identificado
- Prorrogação solicitada / aprovada / rejeitada / ajustada
- Entrega informada
- Entrega validada
- Ocorrência recorrente fechada / próxima aberta (A16)

Filtro da timeline: Todos | Pessoas | Automação | WhatsApp | IA. Default Todos. **Filtro “Automação” nunca é o default ocultando o resto** — e o default Todos **inclui** automação.

**Nível 5 — conversa completa** (aba ou seção abaixo da timeline)

Mesmas regras do drawer. Se WhatsApp ainda não está na fase (A33): seção visível com estado “WhatsApp será ativado na FASE 3. O histórico aparecerá aqui.”

#### Estados do detalhe

| Estado | UI |
|--------|-----|
| Loading | header com # e título skeleton; não flash de “não encontrada” |
| 404 | “Demanda não encontrada” + voltar à matriz |
| Sem timeline (recém-criada) | um evento “Tarefa criada” — nunca timeline vazia absoluta |
| Sem conversa | “Nenhuma mensagem ainda. Lembretes aparecerão aqui quando a automação enviar.” |
| WAITING_FOR_TRIGGER | card informativo (não erro): ver 6.8.3 |
| Recorrente | card do período atual + próxima data prevista; “Concluir este período” ≠ “Encerrar recorrência” |

#### Confirmar entrega (A14, Q5)

Dialog:

- Título: “Confirmar entrega da demanda #N?”
- Corpo: responsáveis (todos), aviso “A tarefa é una: a confirmação vale para a demanda inteira, mesmo que um responsável tenha dito que entregou (Q5).”
- Efeito: “Isso pode liberar: #5, #8” (nomes). Se ninguém depende: “Nenhuma demanda será desbloqueada.”
- CTA primário: Confirmar entrega. Secundário: Cancelar.
- **Não** há CTA “Confiar na IA”.

---

### 6.5 Dashboard (seção 22)

**Objetivo:** em segundos, “O que preciso olhar hoje?” Não é BI. Não é a Visão Geral.

#### Hierarquia

| Nível | Conteúdo |
|-------|----------|
| 0 | “Hoje, {data por extenso}” + timezone |
| 1 | **Cards de atenção** (contagens clicáveis) |
| 2 | **Prioridade de atenção** (lista ranqueada ≠ `sequence_number`) |
| 3 | Atalhos: Caixa de Entrada, Visão Geral filtrada |

#### 6.5.1 Cards (exatamente os da seção 22)

Grid 4×2 desktop. Cada card: **número grande + rótulo + 1 linha de contexto**. Clique aplica destino.

| Card | Conta | Clique leva a |
|------|-------|----------------|
| Vencem hoje | `DUE_TODAY` e não COMPLETED/CANCELLED e não `WAITING_FOR_TRIGGER` | Visão Geral pré-filtrada |
| Vencem nos próximos dias | `DUE_SOON` (janela = regra de notificação, default D-3 úteis) | Visão Geral |
| Atrasadas | `OVERDUE` | Visão Geral |
| Bloqueadas | operacional `BLOCKED` **ou** pré-requisito AND não satisfeito | Visão Geral |
| Pedidos de prorrogação | extension `REQUESTED` | Inbox filtrada nesse tipo |
| Aguardando minha resposta | inbox aberto tipos “precisa de informação”, “não compreendida”, “depende de outra pessoa” | Inbox |
| Aguardando validação | `WAITING_FOR_VALIDATION` | Inbox + Visão Geral (priorizar Inbox) |
| Automações com erro | jobs/outbox falhos (WhatsApp, scheduler) | Inbox tipo falha **e/ou** lista no próprio dashboard se zero inbox |

Card com zero: continua visível, número `0`, estilo inerte, **não** some (scan estável).

**Não** usar sparkline, donut, “saúde 82%”.

#### 6.5.2 Lista “Prioridade de atenção”

Título com subtítulo obrigatório:

> Ordenado pelo que exige intervenção agora. **Não** é o número da demanda (`#`).

**Ranking (estável, documentado na UI via “Como ordenamos?” link curto):**

1. Automações com erro (sistema quebrado)
2. Aguardando validação (libera dependentes — A14)
3. Pedido de prorrogação em aberto
4. Resposta não compreendida / IA pendente
5. Bloqueio que pede ação do admin (`NEEDS_INPUT`, `NEEDS_ANOTHER_PERSON`, `BLOCKED`)
6. Atrasadas **cobráveis** (não `WAITING_FOR_TRIGGER`; não tratar bloqueio como atraso do responsável — A26)
7. Vencem hoje
8. Vencem em breve
9. Demais inbox HIGH

Desempate: `due_date` mais cedo; se sem data, `updated_at` mais recente. **Proibido** desempate por `sequence_number` salvo igualdade total — mesmo assim preferir `updated_at`.

**Colunas da lista (tabela estreita, não cards):**

| Atenção (motivo em 1 frase) | Matriz | # | Tarefa | Responsáveis | Prazo | Ação |

Ação: “Abrir” (detalhe) ou “Resolver” (inbox) conforme o motivo.

Máximo 15 itens na home; “Ver todos na Caixa de Entrada / Visão Geral”.

#### Estados do Dashboard

| Estado | UI |
|--------|-----|
| Tudo zero (sistema novo) | Cards em 0 + vazio da lista: “Nada pede a sua atenção. Quando houver prazos e respostas, eles aparecem aqui.” CTA: ir às Matrizes |
| Tudo zero (operando, dia calmo) | “Nenhuma prioridade agora.” **Não** usar copy de onboarding |
| Loading | skeleton dos 8 cards + 5 linhas da lista. Alvo: “responder em segundos” (seção 22) — queries pré-agregadas, não N+1 |
| Erro de um card | o card mostra “—” e “Falha ao contar”; os outros seguem |
| WhatsApp/IA down | banner no topo: “WhatsApp indisponível — prazos seguem corretos.” / “IA indisponível — respostas entram na caixa como ‘pendente de classificação’.” |

#### O que não fazer no Dashboard

- Lista “próximas demandas” ordenada por `#`
- Feed estilo rede social
- Gráfico de burndown
- Widget de chat

---

### 6.6 Caixa de Entrada / Central de Pendências (seção 20)

**Nome na UI:** **Caixa de Entrada**. Subtítulo: “Central de pendências — o sistema organiza; você decide.”

**Objetivo:** fila do administrador. Não é a lista de tarefas. Não é o chat.

#### 6.6.1 Princípio “o sistema NÃO decidiu” (P10, seção 21)

Todo item, no topo do painel de contexto, tem um **callout permanente** (não dismissível por “entendi” no MVP):

> **Nenhuma alteração foi feita automaticamente.** Prazo, responsáveis e conclusão permanecem como estavam. A IA no máximo sugeriu. Sua ação é necessária.

Exceções visuais (ainda honestas):

- Falha de WhatsApp: “O sistema **tentou** enviar e **falhou**. Nada foi inventado no domínio.”
- Item de atraso crítico: “O atraso foi **calculado** pelo calendário, não pela IA. Nenhuma cobrança extra foi negociada.”

Se `requires_human_action` e `confidence` baixa: linha extra “Classificação pouco segura — leia a mensagem original.”

Nunca usar copy “Resolvemos para você” / “A IA já prorrogou”.

#### 6.6.2 Tipos de item (filas)

Cada tipo tem ícone discreto + rótulo + cor de acento (texto sempre presente):

| Tipo | Origem típica | Ação primária sugerida |
|------|----------------|------------------------|
| Pedido de prorrogação | IA `EXTENSION_REQUEST` ou registro manual | Aprovar ação (aprovar/ajustar/rejeitar) |
| Bloqueio | `BLOCKED` / classificação | Ver contexto → responder ou marcar resolvido após agir na tarefa |
| Precisa de informação | `NEEDS_INPUT` | Responder |
| Depende de outra pessoa | `NEEDS_ANOTHER_PERSON` | Ver contexto; talvez criar dependência / avisar terceiro |
| Resposta não compreendida | `UNCLEAR` / confidence baixa / IA down | Ver contexto; classificar manualmente ou responder |
| Entrega informada | `CLAIMS_DELIVERED` → `WAITING_FOR_VALIDATION` | Aprovar ação = confirmar entrega |
| Tarefa crítica atrasada | scheduler + regra | Ver contexto; não é “aprovar atraso” |
| Falha de envio WhatsApp | outbox/provider | Ver contexto; reenviar ou copiar mensagem |

Filtros: tipo, matriz, urgência (LOW/MEDIUM/HIGH da classificação ou regra), “Somente não adiados”. Default: abertos, não adiados, mais urgentes primeiro.

**Inbox ≠ `WAITING_FOR_INPUT` (I9):** o status da tarefa pode ser `WAITING_FOR_INPUT` **e** existir item de inbox. A caixa mostra o item; a tabela mostra o status. Não esconder um no outro. Texto de ajuda no filtro: “Isto é a sua fila. O status da demanda continua visível na matriz.”

#### 6.6.3 Layout master-detail (desktop)

```
┌──────────────┬─────────────────────────────────────────────┐
│ Lista        │ Painel de contexto                          │
│ (itens)      │ Callout “nada foi alterado”                 │
│              │ Tarefa # · matriz · responsáveis · prazo    │
│              │ Mensagem original                           │
│              │ Classificação IA (ou “pendente”)            │
│              │ Sugestão (rótulo explícito)                 │
│              │ Ações                                       │
└──────────────┴─────────────────────────────────────────────┘
```

Lista (cada row):

- Tipo (rótulo)
- Matriz · `#N` · título truncado
- Responsável(is)
- Há quanto tempo
- Urgência
- Indicador “Adiado até {data}”

Teclas: `j`/`k` próximo/anterior (documentar em atalhos `?`).

#### 6.6.4 Ações (seção 20) — comportamento exato

Todas visíveis no painel. Desabilitar com motivo, não esconder.

**VER CONTEXTO**  
Já é o painel. Inclui: link “Abrir demanda”, trecho da conversa, payload resumido, `correlation_id` em tipografia monoespaçada pequena (suporte/debug, não destaque).

**APROVAR AÇÃO**  
Depende do tipo — nunca genérico demais:

| Tipo | Dialog de Aprovar ação |
|------|------------------------|
| Prorrogação | Aprovar data sugerida **ou** ajustar data **ou** rejeitar (três caminhos no mesmo dialog, rádios). Mostra prazo atual vs novo. Aviso: “Ao aprovar, sócios configurados serão notificados (A30). Se o grupo WhatsApp não existir, usaremos destinos individuais ou texto para copiar (A24).” |
| Entrega informada | Confirmar entrega (mesmo dialog do detalhe) |
| Outros | Se não houver mutação de domínio segura, o botão vira desabilitado: “Não há ação automática para aprovar. Use Responder ou Resolvido.” |

**RESPONDER**  
Composer de **uma** mensagem humana. Preview do destinatário (todos os responsáveis ativos? default: quem falou por último; checkbox para incluir os demais — A20). Envio = outbox. Copy: “Uma mensagem. Sem conversa automática em seguida.”

**ADIAR**  
Opções: 1 hora, amanhã 9:00 (timezone do sistema), data/hora. Item some da fila default e reaparece. Toast “Adiado. Não resolve a demanda.”

**MARCAR COMO RESOLVIDO**  
Dialog: “Isto só tira da sua fila. Não altera prazo nem status da demanda.” Checkbox de confirmação. Se o estado da tarefa ainda exige ação (ex. ainda `WAITING_FOR_VALIDATION`), warning forte: “A demanda #N ainda aguarda validação.”

#### 6.6.5 Classificação e sugestão

Bloco “Leitura da IA”:

- classification em português
- summary
- reason
- requested_new_deadline
- mentioned_people
- confidence como texto (“alta/média/baixa”), não só número
- suggested_reply em caixa **não editada ainda**, botão “Usar no responder” (copia para o composer; envio continua humano)

Se IA caiu (A8, seção 39):

- classification = “Pendente de classificação”
- callout extra: “A mensagem está guardada. O sistema não interpretou.”
- CTA: “Tratar manualmente”

#### 6.6.6 Estados da Caixa de Entrada

| Estado | UI |
|--------|-----|
| Vazio | “Nada pendente. As demandas seguem na matriz; isto só lista o que precisa de você.” Sem balões de chat |
| Tudo adiado | “Itens adiados: N. Mostrar.” |
| Loading lista | skeleton à esquerda |
| Loading contexto | painel direito skeleton; lista permanece |
| Erro | padrão; não marcar itens como lidos |
| FASE 1 (sem WhatsApp) | a rota existe; tipos de WhatsApp/IA vazios; tipos “atraso crítico” e (futuro) validação manual ainda operam. Banner: “Lembretes WhatsApp entram a partir da FASE 3.” |

#### O que não fazer no Inbox

- UI de messenger (avatar grande, ticks azuis como produto)
- Auto-reply
- Swipe cards estilo Tinder
- Agrupar de forma que o callout “não decidimos” suma

---

### 6.7 Cadastro de responsáveis

**Objetivo:** pessoa reutilizável (seção 5). Não é “assignee” solto na tarefa.

#### Lista (`/responsibles`) — tabela, não cards

| Coluna | Conteúdo |
|--------|----------|
| Nome | |
| Papel | texto livre com sugestões (A19): Professor, Diretoria Executiva, … |
| WhatsApp | número mascarado na lista (`+55 ••••••7890`); completo no detalhe |
| Opt-in / status WhatsApp | quando aplicável; senão “—” |
| Tarefas ativas | contagem (link para Visão Geral filtrada) |
| Ativo | sim/não |
| Ações | Editar |

CTA: “Novo responsável”.

Busca: nome, papel, telefone.

#### Formulário criar/editar

| Campo | Regra UX |
|-------|----------|
| Nome * | |
| Papel | combobox: sugestões + texto livre |
| WhatsApp | entrada nacional; normalização E.164 visível como preview “será salvo como +55…” |
| E-mail | opcional; “futuro” não precisa de copy de roadmap |
| Notas | livres, internas |
| Ativo | toggle. Desativar: “Não receberá novos lembretes. Permanece no histórico das demandas.” |

Não exigir WhatsApp se ainda FASE 1; quando FASE 3: aviso se ativo em tarefa e sem número: “Lembretes WhatsApp não serão enviados a esta pessoa.”

#### Estados

| Estado | UI |
|--------|-----|
| Vazio | “Cadastre pessoas uma vez e reutilize nas demandas. Ex.: Giovanni Pacelli e Francisco Netto na mesma tarefa.” CTA criar |
| Duplicata de telefone | erro inline, link para o cadastro existente |
| Responsável em tarefas ao desativar | confirmação com lista das tarefas ativas (até 10 + “e mais N”) |

#### O que não fazer

- Organograma
- “Responsável primário”
- Importar da agenda do celular

---

### 6.8 Formulários de prazo (6 tipos) e `WAITING_FOR_TRIGGER`

**Objetivo:** o administrador entende **quando existe data**, **quando a tarefa espera**, e **o que o sistema ainda não sabe**. Prazo não é um `<input type="date">` único (seção 9).

Componente único `DeadlineRuleField` usado em: criar demanda, editar no detalhe, registrar/ajustar prorrogação (subconjunto).

#### 6.8.1 Escolha do tipo (rádio vertical com 1 exemplo cada)

| Tipo | Rótulo UI | Ajuda (uma linha) |
|------|-----------|-------------------|
| `FIXED_DATE` | Data fixa | “Vence neste dia, independentemente de outras demandas.” |
| `BUSINESS_DAYS_AFTER_CREATION` | Dias úteis após o cadastro | “Conta a partir de hoje (ou da data de criação), pulando fins de semana e feriados.” |
| `BUSINESS_DAYS_AFTER_DEPENDENCY` | Dias úteis após outra demanda | “**Sem data até a demanda gatilho ser validada como concluída.**” |
| `CALENDAR_DAYS_AFTER_TRIGGER` | Dias corridos após gatilho | “Igual ao anterior, mas conta sábado/domingo. Feriado não pausa.” |
| `RECURRING_BUSINESS_DAY` | Recorrente (dia útil do mês) | “Uma demanda só; cada mês gera uma ocorrência. Ex.: 3º dia útil.” |
| `MANUAL` | Ainda não definido | “Aparece como ‘A definir’. Sem lembretes de vencimento.” |

O rádio **já** comunica WAITING_FOR_TRIGGER no rótulo do tipo 3 (e 4). Não deixar essa informação só num tooltip.

#### 6.8.2 Campos por tipo

**Data fixa**  
- Date picker `dd/MM/yyyy`  
- Preview: “Situação de prazo hoje: {calculado}.”  
- Aviso se data no passado: “Ficará atrasada ao salvar.” Confirmar.

**Dias úteis após cadastro**  
- Inteiro `amount` *  
- Unidade travada: dias úteis  
- Preview da data calculada com calendário do sistema  
- Mostrar feriados atravessados em lista curta (“pula 07/09, 12/10”)

**Dias úteis após dependência**  
- `amount` *  
- Seletor da tarefa gatilho * (lista da mesma matriz; se o pré-requisito já existe, sugerir marcar o mesmo — **não** criar dependência escondida sem checkbox)  
- Checkbox: “Também cadastrar como pré-requisito” (default **ligado** se ainda não houver)  
- Preview **binário**:
  - Se gatilho não COMPLETED:  
    **“Esta demanda ficará em Aguardando gatilho (`WAITING_FOR_TRIGGER`). Não há vencimento. Não haverá lembrete de atraso. Cobrar o responsável agora seria um erro.”**  
    Preview: “Quando #2 for **validada** (não basta alguém dizer que entregou), o prazo será {N} dias úteis após a data da conclusão.”
  - Se gatilho já COMPLETED: mostrar data calculada imediatamente.
- Limitação I6 visível: “No MVP o gatilho é a **conclusão validada** da demanda, não um campo ‘data da live’ avulso.”

**Dias corridos após gatilho**  
- Mesmos campos; copy troca “úteis” por “corridos”; aviso “fins de semana contam”.

**Recorrente**  
- “N-ésimo dia útil de cada mês” (N inteiro, default 3)  
- Preview: “Próxima ocorrência: {data} (mês corrente / seguinte)”  
- Copy: “Concluir um mês não apaga a demanda; abre o próximo período (A16, Q3).”  
- Não clonar linhas na tabela.

**Manual / indefinido**  
- Sem date picker  
- Copy: “Use quando o prazo ainda será negociado. A demanda **não** entra em atrasadas.”  
- CTA secundário: “Definir prazo depois no detalhe”

Timezone e calendário: texto de rodapé do widget: “Cálculo: {calendar} · {timezone}”. Link para Configurações.

#### 6.8.3 Superfície `WAITING_FOR_TRIGGER` (todas as telas)

Onde a tarefa aparece, o estado de espera é **primeiro cidadão**:

| Superfície | Como aparece |
|------------|----------------|
| Tabela / Observações | Linha 1: “Aguardando gatilho: conclusão de #2 …” |
| Tabela / Prazo | “Aguardando #2” — **sem** data fantasma |
| Badge prazo | “Aguardando gatilho” (azul-cinza), nunca “No prazo” enganoso |
| Dashboard cards | **Não** entra em atrasadas, vencem hoje, vencem em breve |
| Inbox atraso crítico | **Não** gera item de atraso |
| Detalhe | Card: título “Sem prazo ainda”; corpo: gatilho, o que falta (validação), o que acontecerá depois |
| Timeline | Evento futuro previsto? Não. Só fato: “Aguardando gatilho desde {data}” na criação/edição da regra |

**Proibido:** mostrar `01/01/1970`, `—` ambíguo, ou a data **estimada** como se fosse compromisso. Estimativa só dentro do form, rotulada “Simulação, não gravada como prazo vigente”.

#### 6.8.4 Form de prorrogação (humano)

Campos: nova data *, motivo *, origem (WhatsApp pré-preenchida se veio do inbox; senão “Manual”).  
Mostra prazo original, prazo atual, contador.  
Não usa os 6 tipos — altera a **data vigente** preservando a regra, salvo o ADMIN escolha “Editar regra” separado (A28).

Ajuste vs aprovação: no inbox, rádio. No detalhe, mesmo dialog.

---

### 6.9 Configurações mínimas

Uma página com **abas**. Sem “settings dump” de 40 campos.

Abas: **Geral · Feriados · Regras de notificação · Destinos de notificação**

Somente ADMIN edita (seção 4). OPERATOR: leitura + banner “Somente o administrador altera.”

#### 6.9.1 Geral — timezone

- Select de timezone IANA. Default `America/Sao_Paulo` (A2)
- Locale fixo `pt-BR` (não oferecemos i18n no MVP; mostrar como dado)
- Preview: “Agora no sistema: {data/hora}”
- Aviso: “Prazos já calculados não são reescritos só por mudar timezone; novos cálculos usam o valor novo.” (assumption operacional — se o domínio decidir recálculo, a UI deve pedir confirmação explícita)

#### 6.9.2 Feriados (A21, A22)

Tabela: data, nome, origem (Nacional seed | Custom).

Ações: adicionar feriado custom, desativar feriado nacional específico (não apagar seed: toggle “considerar neste calendário”).

Filtro por ano. Seed 2026–2028 visível.

Empty custom: “Nenhum feriado extra. Os nacionais já estão na lista.”

Não: mapa do Brasil, import ICS no MVP (pode ser FASE 7).

#### 6.9.3 Regras de notificação (seção 16)

Tabela de regras, não JSON.

Colunas: evento (D-3 úteis, D-1, dia D, D+1, follow-up), ativo, janela anti-spam (horas), aplica digest.

Defaults visíveis e editáveis (não hardcoded na UI).

Toggles explícitos alinhados a A25–A26:

- Preferir digest se 2+ lembretes no mesmo dia para a mesma pessoa
- Não lembrar COMPLETED/CANCELLED
- Não lembrar `WAITING_FOR_TRIGGER`
- Não cobrar bloqueada como atraso do responsável
- Não repetir o mesmo tipo em menos de X horas

Copy de ajuda: “Desligar uma regra não apaga o histórico de envios.”

#### 6.9.4 Destinos de notificação (A30, A24, Q4)

Propósito: **quem recebe aviso de prorrogação aprovada** (e, no futuro, outros eventos). Não hardcode sócios.

Tabela de targets:

| Nome / responsável vinculado | Canal | Destino | Ativo |
|------------------------------|-------|---------|-------|
| … | In-app / WhatsApp individual / E-mail (desabilitado “em breve”) / Texto para copiar | número ou user | |

WhatsApp Group: se indisponível, linha de ajuda **fixa**:

> Grupo de WhatsApp não está disponível para esta conta. Usaremos envio individual e/ou mensagem pronta para copiar.

Após aprovar prorrogação, se o canal for “copiar”: dialog com o texto da seção 13 + botão Copiar. Não fingir que enviou.

Empty: “Nenhum destino. Prorrogações aprovadas só geram registro in-app até você cadastrar sócios (Q4).”

#### Estados das configurações

| Estado | UI |
|--------|-----|
| Loading | skeleton por aba |
| Erro ao salvar regra | inline + toast |
| Sem permissão | campos disabled |

---

## 7. Fluxos transversais (pouco clique)

### 7.1 Sino / notificações in-app

- Dropdown: 10 mais recentes, mesmas origens rotuladas
- Item de inbox não lido incrementa badge
- Clique → Caixa de Entrada com item aberto
- Não é um segundo inbox com regras diferentes

### 7.2 Mensagem pronta para copiar (A24)

Dialog padrão: textarea readonly + Copiar + “Marcar como copiado” (audit `USER`). Usado quando WhatsApp group falha ou target é clipboard.

### 7.3 Confirmações que a automação **não** substitui

Sempre dialog, nunca toast-only: confirmar entrega, aprovar/rejeitar prazo, cancelar demanda, arquivar matriz, alterar dependências.

### 7.4 Degradação FASE 1 → 5

| Fase | O que a UI mostra |
|------|-------------------|
| 1 | Matrizes, tabela, dashboard básico (cards que dependem de WhatsApp/IA ficam 0 + tooltip “a partir da FASE 3/4”) |
| 2 | WAITING_FOR_TRIGGER e prazo relativo vivos |
| 3 | Conversa e falhas de envio |
| 4 | Inbox de classificação |
| 5 | Aprovar prorrogação + destinos |

Não esconder rotas futuras: mostrar desabilitadas com a fase, para o administrador não achar que o produto “perdeu” a caixa de entrada.

---

## 8. Responsivo (desktop-first, não mobile-first)

| Largura | Comportamento |
|---------|----------------|
| ≥1280 | shell completo; tabela com todas as colunas; inbox split |
| 1024–1279 | sidebar ícones; Observações pode truncar mais |
| 768–1023 | sidebar drawer; tabela com **scroll horizontal** e colunas pinadas (Ordem + Tarefa); **não** converter linhas em cards |
| <768 | mesmo scroll horizontal; inbox vira lista → tela cheia de contexto; forms em folha única. Aviso discreto: “Esta ferramenta é otimizada para desktop.” Sem app nativo |

Prioridade: **não quebrar a tabela**. Cards só nos 8 métricos do Dashboard, empilhados em 1 coluna no estreito.

---

## 9. O que NÃO fazer (proibições de UX)

### 9.1 Visual e movimento

- Animações de página, parallax, confete, skeleton pulsante lento, spinners de marca
- Dark mode elaborado no MVP (se o shadcn trouxer, um toggle discreto no máximo — não é requisito)
- Ilustrações empty-state, mascotes, onboarding em 5 steps
- Kanban, Gantt, mindmap como visão principal

### 9.2 Metáfora de chatbot (seção 3, 47)

- Bolha flutuante “Pergunte à IA”
- Thread estilo ChatGPT no lugar da tabela
- Composer que envia sozinho a `suggested_reply`
- “Digitando…” de bot
- Continuação automática de diálogo com o responsável
- Inbox desenhado como WhatsApp Web (lista de conversas por pessoa como eixo principal). O eixo é **pendência de decisão**, não contato

### 9.3 Modelagem mental errada

- Ordenar “importância” por `#` / `sequence_number`
- Inferir dependência pela ordem
- Um único badge “Atrasado” no lugar das três camadas
- Esconder linhas de timeline `AUTOMATION` / `SYSTEM`
- Mostrar data inventada em `WAITING_FOR_TRIGGER`
- Marcar concluído a partir de “já enviei” sem dialog do ADMIN
- Responsável primário / “owner” destacado
- Duplicar tarefas na Visão Geral
- Chamar Visão Geral de Matriz Geral
- Transformar Observações num campo único editável que apaga a projeção

### 9.4 Ruído operacional

- Um modal por campo
- Wizard de 6 passos para criar demanda
- Notificações toast para cada job interno
- Exigir abrir o detalhe para mudar status ou anotar

---

## 10. Critério de qualidade (seção 50) — resposta da UI

| Pergunta | Como a UI garante SIM |
|----------|------------------------|
| Reduz trabalho operacional? | Ações na linha; inbox único; dashboard em segundos |
| Auditável? | Timeline com origem; Observações geradas a partir de dados |
| Impede ação indevida da IA? | Callout permanente; sugestão ≠ execução; COMPLETED só dialog ADMIN |
| Funciona se a IA cair? | Inbox “pendente de classificação”; tabelas intactas |
| Funciona se o WhatsApp cair? | Banner; copiar mensagem; prazos visíveis |
| Explica prazo? | Regra em linguagem natural + original vs atual + WAITING_FOR_TRIGGER explícito |
| Explica mensagem enviada? | Conversa com template/rótulo; timeline “lembrete enviado” |
| Múltiplos responsáveis? | chips; digest comunicado nas regras; Q5 explícito na validação |
| Dependências? | coluna + cadeado + efeito no dialog de COMPLETED |
| Prorrogações históricas? | contador + linha 2 de Observações + eventos na timeline |
| Rodável localmente? | sem dependência de fonte/CDN de design; FASE 1 usável offline de WhatsApp |

---

## 11. Riscos de usabilidade

| ID | Risco | Por que acontece | Mitigação nesta spec |
|----|-------|------------------|----------------------|
| U1 | Confundir **Ordem (#)** com prioridade | Hábito do Word / planilha | Tooltip, copy no empty state, lista de atenção com subtítulo explícito, sort do Dashboard proibido por `#` |
| U2 | Confundir **Visão Geral** com **Matriz Geral** | Homônimos (I7) | Nomenclatura travada; tipo “Geral” só na lista de matrizes |
| U3 | Achar que `WAITING_FOR_TRIGGER` está atrasada | Célula de prazo vazia lida como erro | Proibir data fantasma; card e badge próprios; exclusão dos cards de atraso |
| U4 | Achar que a IA já decidiu | Inbox parece “notificação resolvida” | Callout permanente; rótulo “Sugestão — não aplicada” |
| U5 | Esconder automação ao filtrar timeline | Usuário filtra “só eu” e perde lembretes | Default Todos; origens rotuladas; filtro Automação disponível mas não default de ocultação |
| U6 | Clique demais para o fluxo diário | Detalhe como único lugar de ação | Expand + ⋯ na linha; COMPLETED e prorrogação ainda exigem dialog (proposital) |
| U7 | Tabela ilegível com muitos responsáveis e observações longas | Dados reais (dois nomes, 3 linhas) | chips `+N`, observações em 3 linhas truncadas, expand para o resto |
| U8 | Operator confirma entrega sem querer / sem poder | Q1, A14 | Botão desabilitado com motivo; dialog só ADMIN |
| U9 | Um “entreguei” de um responsável parecer entrega parcial | Q5 | Copy no dialog: tarefa é una |
| U10 | Dashboard lento demais para “segundos” | Agregar 8 cards + lista | Exigir endpoint agregado; skeleton; erro parcial por card |
| U11 | Mobile destruir o modelo mental da matriz | Tentação de cards | Scroll horizontal + pin; aviso de desktop |
| U12 | Filtros da matriz vs Visão Geral divergentes | Duas tabelas | Mesmos controles; Visão Geral só acrescenta coluna Matriz |
| U13 | Prorrogação **solicitada** lida como **já prorrogado** | Texto da seção 11 | Verbos distintos na projeção (5.4) |
| U14 | Cobrar responsável bloqueado | Card “Atrasadas” mal definido | Critérios de card e ranking excluem gatilho; copy em BLOCKED+ON_TIME |
| U15 | Configuração de destinos vazia → sócio não avisado | Q4 | Empty state honesto; dialog de copiar; não fingir envio a grupo |
| U16 | Recorrência parecer N linhas | A16 | Uma linha; badge Recorrente; copy no form |
| U17 | Inbox vazio interpretado como “não há demandas” | Fila ≠ universo | Empty copy aponta para a matriz |
| U18 | Status `WAITING_FOR_INPUT` vs item de inbox | I9 | Ajuda no filtro; ambos visíveis em superfícies diferentes |
| U19 | Editar `display_order` parecer mudar dependência | A11 | Toast “# não mudou”; sem prompt de cadeia |
| U20 | Tom de chatbot vazar no composer | Pressão de “inbox moderno” | Placeholder anti-loop; sem suggested chips no composer (só “Usar no responder” a partir do bloco IA) |

---

## 12. Assumptions e perguntas (não reabrir A1–A36; não fechar Qx)

### Assumptions de UX (novas, só interface)

- **A-UX1.** Nome da fila: “Caixa de Entrada”; “Central de Pendências” fica como subtítulo.
- **A-UX2.** Timeline default cronológica crescente (como seção 24).
- **A-UX3.** Clique no título = detalhe; resto da linha = expand/select.
- **A-UX4.** Coluna extra “Situação” default ligada no desktop, desligável para fidelidade Word.
- **A-UX5.** FASE 1 mostra cards/rotas futuras zerados com tooltip de fase, em vez de escondê-los.
- **A-UX6.** OPERATOR não envia WhatsApp nem resolve inbox no MVP.
- **A-UX7.** Digest e anti-spam são configuráveis na aba de regras; a UI não visualiza o digest como tela própria no MVP (o responsável recebe no WhatsApp; o admin vê na conversa da tarefa / nas várias tarefas).
- **A-UX8.** Sem edição em massa de prazos no MVP.

### Perguntas (integrator → `docs/11-open-questions.md`)

- **Q1** altera volume de controles desabilitados.
- **Q3** confirma copy da recorrência após “concluir o mês”.
- **Q4** popula empty state de destinos / seed.
- **Q5** já está no dialog de validação; se a decisão mudar (entrega por responsável), a célula de responsáveis e o dialog mudam — hoje a spec assume tarefa una.

---

## 13. Inventário de telas (entrega)

| # | Tela | Objeto central | Ação primária do admin |
|---|------|----------------|------------------------|
| 1 | Lista de matrizes | Tabela de matrizes | Abrir / criar matriz |
| 2 | Visão Geral | Tabela agregada + coluna Matriz | Filtrar o universo |
| 3 | Tela da matriz | TanStack 6 colunas (+ situação opcional) | Operar demandas no contexto |
| 4 | Detalhe da tarefa | Fatos + timeline auditável | Decidir (validar, prorrogar, entender história) |
| 5 | Dashboard | 8 cards + lista Prioridade de atenção | Olhar o dia |
| 6 | Caixa de Entrada | Master-detail de pendências humanas | Decidir o que a automação não pode |
| 7 | Responsáveis | Tabela + form | Cadastrar uma vez, reutilizar |
| 8 | Formulários de prazo | 6 tipos + WAITING_FOR_TRIGGER explícito | Definir regra sem texto solto |
| 9 | Configurações | 4 abas | Timezone, feriados, regras, destinos |

Fim da spec de frontend da FASE 0. Nenhum código de produção.
