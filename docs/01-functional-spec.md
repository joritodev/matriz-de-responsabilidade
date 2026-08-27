# Especificação funcional — Matriz de Responsabilidade

**Versão:** 0.1 (FASE 0)  
**Complementa:** `docs/00-product-brief.md`  
**Lei:** `/PROMPT.md`  
**Assumptions:** A1–A36 (`docs/assumptions.md`)  
**Inconsistências tratadas:** I1–I10 (seção 11)  
**Perguntas em aberto:** Q1–Q5 (não respondidas; hypotheses de trabalho citadas)

Este documento define casos de uso, regras de negócio, critérios de aceite testáveis, notificações em alto nível, central de triagem, cenários reais A–G, UX comportamental e gaps de produto que **não** bloqueiam arquitetura.

Detalhe de Cloud API, templates Meta, janela de 24h e opt-in fica em `docs/06-whatsapp-integration.md`. Detalhe de schema IA fica em `docs/07-ai-triage.md`. Máquinas de estado em `docs/03-state-machines.md`. Motor de prazo em `docs/04-deadline-engine.md`.

---

## 0. Convenções

- **UI em português; identificadores em inglês** (A3).
- Critérios de aceite no formato **Dado / Quando / Então**, testáveis sem UI pixel-perfect.
- **Fase** no caso de uso = fase mínima em que o UC precisa existir de ponta a ponta. Pré-requisitos de modelo podem nascer antes.
- Origens de mutação: `USER` | `AUTOMATION` | `WHATSAPP` | `AI_SUGGESTION` | `SYSTEM`. Automação nunca se disfarça de usuário.
- Timezone padrão: `America/Sao_Paulo`. Datas na UI: `dd/MM/yyyy`. “Fim do dia” de um prazo = 23:59:59 no timezone do sistema, salvo decisão futura (gap G-07).

---

## 1. Atores

| Ator | Sistema | Notas |
|---|---|---|
| Administrador (`ADMIN`) | Web + (FASE 5) WhatsApp de alerta | Decisor. |
| Operator (`OPERATOR`) | Web | Papel no modelo (A9). Escopo de permissão = Q1 / gap G-01. |
| Responsável | WhatsApp | Sem login. |
| Sistema / worker | Jobs, outbox, scheduler | Efeitos colaterais. |
| IA | Classificação estruturada | Sem mutação de domínio (A15). |

Enquanto Q1 não for respondida: fluxos abaixo descrevem o **Administrador**. Operator, se existir, vê o mesmo que o admin **exceto** as ações marcadas *sensíveis* (aprovar prorrogação, validar entrega, arquivar matriz, editar NotificationTargets, editar feriados globais).

---

## 2. Regras de negócio globais

### 2.1 Identidade, tenant e arquivo

| ID | Regra |
|---|---|
| **BR-01** | Single-tenant. Não há seletor de organização (A1). |
| **BR-02** | Matriz arquivada ⇔ `archived_at IS NOT NULL`. O flag `active` da UI é derivado (A10, I1). |
| **BR-03** | Arquivar matriz **não** apaga tarefas. Elas saem dos defaults da visão Geral e do dashboard; filtro “incluir arquivadas” as traz (A17). |
| **BR-04** | Não há exclusão física de tarefa no MVP. Cancelar = `CANCELLED` + `cancelled_at`. |
| **BR-05** | Tipo de matriz é string controlada extensível, não ENUM de banco (A18). UI mostra rótulo pt-BR. |
| **BR-06** | Nome de matriz é obrigatório. Unicidade de nome **não** é exigida no MVP (pode haver duas “Curso X” de anos diferentes); a lista mostra tipo + data. |

### 2.2 Sequência, ordem e dependência

| ID | Regra |
|---|---|
| **BR-10** | `sequence_number` incrementa por matriz, começa em 1, é imutável após criação (A11, I2). |
| **BR-11** | `sequence_number` não é prioridade e **não** cria dependência. |
| **BR-12** | `display_order` inicia igual a `sequence_number` e pode ser editado depois, com audit. |
| **BR-13** | Dependência só existe em `task_dependencies`. Texto em observação não conta. |
| **BR-14** | Múltiplos pré-requisitos = **AND**: todos precisam estar `COMPLETED` (validados) para a dependência estar satisfeita (A12). |
| **BR-15** | Auto-dependência é inválida. Ciclos (diretos ou transitivos) são rejeitados na gravação. |
| **BR-16** | Dependência só entre tarefas da **mesma** matriz no MVP. Cross-matrix é gap (G-08) e não entra no modelo de FASE 1 como feature. |
| **BR-17** | Tarefa com pré-requisito não satisfeito **não** é cobrada como atraso do responsável (A26). Status operacional pode ser `BLOCKED` e/ou prazo `WAITING_FOR_TRIGGER` conforme o tipo de prazo. |
| **BR-18** | Visual da coluna Pré-requisito lista `#sequence_number` + título curto das predecessoras e indica quais já estão `COMPLETED`. |

### 2.3 Responsáveis

| ID | Regra |
|---|---|
| **BR-20** | Responsável é entidade reutilizável. Papel (`role`) é texto livre com sugestões, não enum rígido (A19). |
| **BR-21** | Tarefa tem 1..N responsáveis ativos via `task_responsibles`. Não há responsável primário (A20). |
| **BR-22** | FASE 1: tarefa **pode** ser salva sem responsável (rascunho operacional), mas entra na inbox do admin como “tarefa sem responsável” apenas se estiver com prazo vigente no passado ou no D0 — ver gap G-09. Default recomendado: UI exige ≥1 responsável para tarefas com prazo `FIXED_DATE` futuro; `MANUAL` permite 0. |
| **BR-23** | Notificações WhatsApp vão para **todos** os responsáveis ativos da tarefa. Digest é **por pessoa**, não por tarefa (A20, A25, I5). |
| **BR-24** | Template `{{nome}}` é o primeiro nome (ou nome cadastrado) **daquele** destinatário, nunca uma lista concatenada no vocativo. |
| **BR-25** | WhatsApp: persistir número bruto e E.164. Opt-in/status quando aplicável. Sem opt-in válido, o sistema **não envia** (FASE 3); o cadastro na FASE 1 ainda é válido. |
| **BR-26** | Hypothesis Q5: um claim de entrega de **qualquer** responsável coloca a **tarefa** em `WAITING_FOR_VALIDATION`, não uma “parte” dele. |

### 2.4 Status (três eixos)

| ID | Regra |
|---|---|
| **BR-30** | Status operacional é persistido. Transições ilegais são rejeitadas (máquina em `docs/03-state-machines.md`). |
| **BR-31** | Status de prazo é **sempre calculado**. Cache `computed_at` é otimização, nunca fonte da verdade (A13). |
| **BR-32** | Se operacional ∈ {`COMPLETED`, `CANCELLED`}, status de prazo = `NOT_APPLICABLE` (I4). Não existe “COMPLETED” no eixo de prazo. |
| **BR-33** | Eixos são independentes: `IN_PROGRESS` + `OVERDUE` é válido; `BLOCKED` + `ON_TIME` é válido. |
| **BR-34** | Status de prorrogação é persistido no registro de extensão (e agregado na tarefa: nenhuma / solicitada / última aprovada). |
| **BR-35** | “Já entreguei” (humano na UI ou classificação `CLAIMS_DELIVERED`) → operacional `WAITING_FOR_VALIDATION` + item de inbox. **Nunca** `COMPLETED` direto (A14). |
| **BR-36** | Só `ADMIN` promove `WAITING_FOR_VALIDATION` → `COMPLETED`. Isso emite evento de conclusão e pode satisfazer dependentes (A14). |
| **BR-37** | `WAITING_FOR_INPUT` descreve a **tarefa**. Inbox descreve o **trabalho do admin**. Podem coexistir (I9). |
| **BR-38** | Recorrência: uma task; completar um período registra ocorrência e abre o próximo (A16). Hypothesis Q3: operacional volta a `PENDING` (ou equivalente não-terminal) no novo período; a ocorrência passada permanece `COMPLETED`. |

### 2.5 Prazos

| ID | Regra |
|---|---|
| **BR-40** | Prazo nunca vive só como texto. `DeadlineRule` estruturada gera o texto da UI. |
| **BR-41** | Tipos: `FIXED_DATE`, `BUSINESS_DAYS_AFTER_CREATION`, `BUSINESS_DAYS_AFTER_DEPENDENCY`, `CALENDAR_DAYS_AFTER_TRIGGER`, `RECURRING_BUSINESS_DAY`, `MANUAL`. |
| **BR-42** | FASE 1 implementa `FIXED_DATE` e `MANUAL`. Demais: FASE 2 (`CALENDAR_DAYS_AFTER_TRIGGER` preparado no modelo; UI pode ocultar até haver regra). |
| **BR-43** | `original_due_date` é preenchido na primeira materialização e não é sobrescrito (A28). |
| **BR-44** | Prazo vigente muda apenas por: cálculo inicial, trigger de dependência (tipos relativos), aprovação de prorrogação, edição humana da regra (A28). |
| **BR-45** | Concluir predecessora **não** altera tarefa `FIXED_DATE` (I3). Pode apenas desbloquear o eixo operacional/`BLOCKED`. |
| **BR-46** | `BUSINESS_DAYS_AFTER_DEPENDENCY` materializa `due_date` quando a tarefa **gatilho** entra em `COMPLETED` (validada), não no claim (A29). |
| **BR-47** | Limitação I6: “definir data da live” no MVP significa **concluir/validar** a tarefa gatilho, não um evento de marco separado. FASE 7 pode introduzir `trigger_type` de data-de-marco. |
| **BR-48** | Antes do trigger: prazo calculado = `WAITING_FOR_TRIGGER`; sem `calculated_due_date` vigente (ou nulo). Não há lembrete de atraso. |
| **BR-49** | Dias úteis = seg–sex, excluindo feriados do calendário da regra (A22). Cálculo local; seed nacional 2026–2028 + feriados custom (A21). Sem API externa obrigatória. |
| **BR-50** | `RECURRING_BUSINESS_DAY` (ex.: 3º dia útil do mês) = uma linha de tarefa + ocorrências. Não clonar a demanda todo mês (A16). |
| **BR-51** | IA **não** calcula prazo nem atraso. |

### 2.6 Observações, histórico, auditoria

| ID | Regra |
|---|---|
| **BR-60** | Coluna Observações = projeção: operacional + prazo + prorrogações + últimas notas manuais (A27). Exemplos: “Pendente”; “Entregue em 27/08/2026”; “Atrasada há 3 dias”; “Prorrogado 1 vez. Novo prazo: 05/09/2026.” |
| **BR-61** | `task_notes` guarda texto livre adicional, com autor e timestamp. |
| **BR-62** | Toda mutação relevante gera audit log: ator, timestamp, antes, depois, origem, `correlation_id` quando houver cadeia WhatsApp/IA (A31). |
| **BR-63** | Timeline da tarefa concatena eventos de domínio + notas + mensagens + classificações + extensões, em ordem cronológica. |

### 2.7 Prorrogação e sócios

| ID | Regra |
|---|---|
| **BR-70** | Pedido de prorrogação (WhatsApp, UI admin, ou classificação IA) **não** altera prazo vigente. |
| **BR-71** | IA pode preencher `reason` e `requested_due_date` sugerido. Status da extensão = `REQUESTED`. Admin é alertado. |
| **BR-72** | Admin pode **aprovar**, **ajustar data** (aprovar com data diferente) ou **rejeitar**. |
| **BR-73** | Ao aprovar: grava prazo anterior, prazo novo, incrementa contador, atualiza vigente, recarrega automações, audit, gera comunicação estruturada aos NotificationTargets (A30). |
| **BR-74** | Comunicação a sócios **só** na aprovação, nunca no pedido. Texto sempre deixa claro que foi decisão humana. |
| **BR-75** | Se WhatsApp Group indisponível: envio individual aos targets e/ou mensagem pronta para copiar + notificação in-app (A24). O produto não quebra. |
| **BR-76** | Rejeitar: prazo vigente inalterado; responsável pode ser notificado (ação humana “Responder”, não automática por padrão). |

### 2.8 Automação, IA, falhas

| ID | Regra |
|---|---|
| **BR-80** | IA não muta domínio. Persiste classificação + item de inbox + `suggested_reply` (A15). |
| **BR-81** | Confidence abaixo do threshold ⇒ `requires_human_action = true` e item na inbox (`UNCLEAR` ou equivalente). |
| **BR-82** | OpenAI indisponível: mensagem já persistida; classificação “pendente”; alerta in-app; prazos intactos. |
| **BR-83** | Efeitos (WhatsApp, alerta admin) passam por outbox transacional; pg-boss entrega (A23, I8). |
| **BR-84** | Webhook Meta é persistido **antes** de classificar. Idempotência por `provider_message_id`. |
| **BR-85** | Worker, IA ou WhatsApp caídos não corrompem prazo nem histórico (A32). |

---

## 3. Casos de uso

Cada UC lista fase, regras, fluxo e ACs. “Pouco clique” (A36): o caminho feliz de criar/editar cabe em **um painel ou um diálogo**, sem wizard de 5 passos.

---

### UC-01 — Criar matriz

**Fase:** 1  
**Ator:** Admin  
**Regras:** BR-01, BR-05, BR-06

**Fluxo:** Admin em Visão Matrizes → “Nova matriz” → informa nome, tipo (`GENERAL`/`PROJECT`/`COURSE`/`PRODUCT`/`EVENT`/`OTHER`), descrição opcional → salvar → é levado à tabela vazia da matriz.

**Não faz:** clonar template (FASE 7).

**Critérios de aceite:**

- **AC-01.1** Dado que o admin está autenticado, quando submete nome “OD Academy” e tipo `COURSE`, então a matriz existe, `archived_at` é nulo, a UI mostra “Ativa”, e um audit `USER` é gravado.
- **AC-01.2** Dado um tipo ainda não listado no seed, quando um tipo novo é adicionado na configuração, então o select de criação passa a oferecê-lo **sem** migration de ENUM (A18).
- **AC-01.3** Quando a criação falha validação (nome vazio), então nada é persistido.

---

### UC-02 — Arquivar e reativar matriz

**Fase:** 1  
**Regras:** BR-02, BR-03

- **AC-02.1** Quando o admin arquiva, então `archived_at` é preenchido, a matriz some da lista default e suas tarefas somem do dashboard/visão Geral default.
- **AC-02.2** Quando reativa, então `archived_at` volta a nulo e as tarefas reaparecem nos defaults.
- **AC-02.3** Tarefas e histórico permanecem íntegros após arquivar.

---

### UC-03 — Listar matrizes (visão Matrizes)

**Fase:** 1

Lista: nome, tipo (rótulo pt-BR), contagem de tarefas abertas, próximas a vencer / atrasadas (FASE 1: com base em `FIXED_DATE` + operacional). Default: ativas. Filtro: incluir arquivadas.

- **AC-03.1** “Matriz Geral” (instância) aparece como **item** da lista, independentemente da Visão Geral (I7).
- **AC-03.2** Clique no nome abre a tela da matriz (UC-16).

---

### UC-04 — Cadastrar responsável

**Fase:** 1  
**Regras:** BR-20, BR-25

Campos: nome, papel (texto + sugestões: Professor, Diretoria Executiva, Diretoria Comercial, Marketing, Administrador, Site, Fornecedor, Parceiro, Outro), WhatsApp, e-mail opcional, notas, ativo.

- **AC-04.1** Dado o cadastro de “Matheus” com número brasileiro válido, então existem `whatsapp_number` e `whatsapp_number_e164`, e **nenhuma** mensagem é enviada na FASE 1 (I10).
- **AC-04.2** O responsável recém-criado aparece no seletor ao criar tarefa.
- **AC-04.3** Papel livre “Coordenador de polo” é aceito.

---

### UC-05 — Editar responsável e opt-in

**Fase:** 1 (cadastro) / 3 (opt-in efetivo no envio)

- **AC-05.1** Inativar responsável impede novos envios (FASE 3) e o oculta do seletor default; tarefas já vinculadas **não** o removem automaticamente.
- **AC-05.2** Sem opt-in válido, job de lembrete **não** envia e registra motivo auditável (FASE 3).

---

### UC-06 — Criar tarefa

**Fase:** 1  
**Regras:** BR-10–BR-12, BR-21, BR-40–BR-42

**Fluxo (pouco clique):** na matriz, “Nova demanda” abre painel/diálogo: título, descrição opcional, responsáveis, regra de prazo, pré-requisitos (opcional), nota inicial opcional. Submit cria `sequence_number = max(matriz)+1`, `display_order` igual, operacional `PENDING`.

- **AC-06.1** Primeira tarefa da matriz recebe `#1`. A segunda, `#2`. Apagar/cancelar `#1` **não** reutiliza o número 1.
- **AC-06.2** Criar `#3` **não** cria dependência com `#2`.
- **AC-06.3** Audit `USER` registra criação com `created_by`.

---

### UC-07 — Editar tarefa (não destrutivo)

**Fase:** 1

Pode editar título, descrição, responsáveis, regra de prazo, notas, `display_order`. Não pode editar `sequence_number`.

- **AC-07.1** Tentativa de alterar `sequence_number` é rejeitada.
- **AC-07.2** Mudança de `display_order` gera audit com valor anterior e novo (A11).
- **AC-07.3** Mudança humana da regra de prazo atualiza vigente conforme BR-44 e registra origem `USER`.

---

### UC-08 — Atribuir múltiplos responsáveis

**Fase:** 1  
**Regras:** BR-21, BR-23, BR-24  
**Cenário real:** Caso E

- **AC-08.1** Uma tarefa vinculada a Giovanni Pacelli e Francisco Netto permanece **uma** linha na matriz e na visão Geral.
- **AC-08.2** A célula Responsável mostra os dois nomes, sem truncar de forma a parecer um só (comportamento: lista visível ou “+N” com expansão).
- **AC-08.3** Remover um responsável não apaga a tarefa nem o outro vínculo.

---

### UC-09 — Cadastrar e remover dependências

**Fase:** 1  
**Regras:** BR-13–BR-18  
**Cenário real:** Caso B

**Fluxo:** no formulário da tarefa ou na expansão da linha, selecionar uma ou mais predecessoras da mesma matriz.

- **AC-09.1** Task #3 dependente de #2 persiste em `task_dependencies` e a coluna Pré-requisito mostra `#2` (não o texto “Sim, tarefa 2” como fonte).
- **AC-09.2** Tentar fazer #2 depender de #3 quando #3 já depende de #2 é rejeitado com erro compreensível (“dependência circular”).
- **AC-09.3** Tarefa depender de si mesma é rejeitado.
- **AC-09.4** Múltiplos pré-requisitos (#5 depende de #2 e #4): a #5 só tem dependências **satisfitas** quando **ambas** estão `COMPLETED`.
- **AC-09.5** Remover dependência gera audit e recalcula bloqueio.

---

### UC-10 — Prazo FIXED_DATE

**Fase:** 1  
**Regras:** BR-40–BR-45  
**Cenário real:** Caso A

- **AC-10.1** Tarefa “Atualizar a Assinatura Suprema no Site”, prazo 28/08/2026, sem pré-requisito: `calculated_due_date` = 28/08/2026 no timezone do sistema; coluna Prazo mostra essa data; regra visível no detalhe.
- **AC-10.2** Após 28/08/2026 23:59:59 (timezone do sistema), com operacional não terminal, status de prazo = `OVERDUE`.
- **AC-10.3** Concluir qualquer outra tarefa da matriz **não** muda esse prazo (I3).

---

### UC-11 — Prazo BUSINESS_DAYS_AFTER_CREATION

**Fase:** 2  
**Regras:** BR-49

- **AC-11.1** “15 dias úteis após cadastramento”, criação numa sexta com feriado no percurso: `calculated_due_date` ignora sábados, domingos e feriados do calendário.
- **AC-11.2** O detalhe explica a conta (data criação + N úteis + calendário usado). IA não participa.

---

### UC-12 — Prazo BUSINESS_DAYS_AFTER_DEPENDENCY

**Fase:** 2  
**Regras:** BR-46–BR-48  
**Cenário real:** Caso C  
**Limitação:** I6 / BR-47

- **AC-12.1** Antes de #2 (`Definir data da live`) ser `COMPLETED`, #3 tem prazo `WAITING_FOR_TRIGGER`, sem cobrança WhatsApp (A26).
- **AC-12.2** Quando #2 é apenas `WAITING_FOR_VALIDATION` (“já defini a data”), #3 **ainda** não materializa prazo.
- **AC-12.3** Quando o admin valida #2 → `COMPLETED`, `due_date` de #3 = completion_date de #2 + 15 dias úteis pelo Business Calendar.
- **AC-12.4** `original_due_date` de #3 é esse primeiro valor materializado.

---

### UC-13 — Prazo CALENDAR_DAYS_AFTER_TRIGGER

**Fase:** 2 (modelo preparado; UI pode ser FASE 2 ou posterior imediata)

- **AC-13.1** Equivale a UC-12 em disparo (`COMPLETED` do gatilho), mas soma dias corridos, não úteis.
- **AC-13.2** Feature de marco temporal sem conclusão = **não** implementada (FASE 7, I6).

---

### UC-14 — Prazo RECURRING_BUSINESS_DAY

**Fase:** 2  
**Regras:** BR-50, BR-38  
**Cenário real:** Caso D  
**Hypothesis Q3:** A16

- **AC-14.1** “Até o terceiro dia útil de cada mês” = **uma** task. Janeiro/junho/dezembro com feriado ou mês começando sáb/dom geram ocorrências com datas diferentes, calculadas pelo calendário.
- **AC-14.2** Completar a ocorrência de março registra `deadline_occurrences` de março como feita e abre a ocorrência de abril; a linha da matriz **não** é duplicada.
- **AC-14.3** Lembretes (FASE 3) referem-se à ocorrência vigente, não a meses passados.

---

### UC-15 — Prazo MANUAL / UNDEFINED

**Fase:** 1

- **AC-15.1** Tarefa sem data: coluna Prazo mostra “A definir” (ou equivalente); status de prazo não é `OVERDUE`; lembretes de vencimento **não** disparam (A26 analogamente).
- **AC-15.2** Admin pode depois promover para `FIXED_DATE` ou outro tipo (FASE 2), gerando audit.

---

### UC-16 — Visualizar matriz (tabela)

**Fase:** 1  
**UX:** seção 9

Colunas obrigatórias, nesta ordem default:

1. Ordem (`sequence_number`; sort opcional por `display_order`)
2. Responsável (N nomes)
3. Tarefa (título)
4. Prazo (data vigente ou “A definir” / “Aguardando #N”)
5. Pré-requisito (projeção)
6. Observações (projeção BR-60)

Ações por linha, **sem** sair da tabela no caminho curto: filtrar, pesquisar, ordenar, expandir, abrir detalhe, alterar status operacional (com confirmação se transição sensível), adicionar comentário/nota, ver histórico, ver conversa (FASE 3+), registrar prorrogação (FASE 5; FASE 1 = registro manual interno se exposto, senão só FASE 5).

- **AC-16.1** A tabela é a vista central; a matriz **não** é convertida em mural de cards (A36).
- **AC-16.2** Pesquisa por título ou nome de responsável reduz as linhas sem duplicar dados.
- **AC-16.3** Expandir a linha mostra descrição, regra de prazo, dependentes (quem esta tarefa bloqueia) e atalhos.
- **AC-16.4** Alterar status para `COMPLETED` **direto** a partir de `PENDING`/`IN_PROGRESS` **exige confirmação** (“Marcar como entregue e validada?”) — é atalho do admin, equivalente a validar. Claim de terceiro nunca usa esse atalho.

---

### UC-17 — Visão Geral (agregado)

**Fase:** 1  
**Regras:** A17, I7

Não é uma matriz. Não copia tarefas. Query: tarefas das matrizes ativas + coluna extra **Matriz**. Filtros: matriz, responsável, status operacional, status de prazo, incluir arquivadas.

- **AC-17.1** Tarefa da “Matriz Geral” (tipo `GENERAL` ou não) aparece **uma** vez na Visão Geral e **uma** vez na sua matriz. IDs iguais.
- **AC-17.2** O rótulo de navegação “Geral” não é confundível com o tipo “Geral”: navegação usa “Visão Geral”; tipo usa “Geral” no badge da matriz.
- **AC-17.3** Arquivar a matriz-mãe remove as linhas do default da Visão Geral.

---

### UC-18 — Dashboard

**Fase:** 1 (cards com dados existentes); enriquecido nas fases 2–5  
**UX:** seção 9.2

Pergunta que a tela responde em segundos: **o que preciso olhar hoje?**

Cards (contagem + clique filtra a lista “Prioridade de atenção”):

| Card | Critério (produto) |
|---|---|
| Vencem hoje | prazo vigente = hoje e operacional não terminal e não `WAITING_FOR_TRIGGER` |
| Vencem nos próximos dias | D+1..D+N úteis (N default 3, alinhado à regra D-3), mesmos filtros |
| Atrasadas | `OVERDUE` e operacional não terminal |
| Bloqueadas | operacional `BLOCKED` **ou** pré-requisito AND não satisfeito |
| Pedidos de prorrogação | extensões `REQUESTED` abertas (FASE 5; FASE 1: 0) |
| Aguardando minha resposta | inbox aberta tipo `NEEDS_INPUT` / conversa pendente do admin (FASE 4+) |
| Aguardando validação | operacional `WAITING_FOR_VALIDATION` |
| Automações com erro | jobs/outbox falhos (FASE 3+) |

Lista **Prioridade de atenção**: não usa `sequence_number`. Ordenação sugerida (gap G-25 permite ajuste fino): inbox crítica > validação > prorrogação > atrasada não bloqueada > vence hoje > bloqueada > due soon.

- **AC-18.1** Card “Atrasadas” não inclui `COMPLETED`/`CANCELLED` (BR-32).
- **AC-18.2** Card “Atrasadas” não trata `WAITING_FOR_TRIGGER` como atraso do responsável.
- **AC-18.3** Clique em “Vencem hoje” mostra só essas tarefas, com link para matriz e detalhe.
- **AC-18.4** Dashboard FASE 1 já funciona sem WhatsApp (I10).

---

### UC-19 — Inbox / Central de triagem

**Fase:** 4 (itens de mensagem/IA); FASE 3 já pode gerar falha de envio; FASE 5 completa prorrogação  
**Detalhe:** seção 7

- **AC-19.1** Cada item tem tipo, urgência, tarefa, matriz, responsável, resumo, `correlation_id`.
- **AC-19.2** Ações disponíveis: Ver contexto, Aprovar ação, Responder, Adiar, Marcar como resolvido (seção 7.3).
- **AC-19.3** Resolver **sem** aprovar prorrogação **não** muda prazo.

---

### UC-20 — Registrar pedido de prorrogação

**Fase:** 5 (WhatsApp+IA: 4 detecta, 5 materializa workflow completo)  
**Regras:** BR-70, BR-71  
**Cenário real:** Caso F

Origens: classificação `EXTENSION_REQUEST`; admin na UI (“registrar pedido”).

- **AC-20.1** Após “Vou precisar prorrogar até dia 30 porque ainda estou esperando o material.”: classificação `EXTENSION_REQUEST`; prazo vigente **igual** ao anterior; extensão `REQUESTED`; admin alertado in-app (e WhatsApp admin na FASE 5).
- **AC-20.2** Motivo extraído fica no registro; data 30 do mês do prazo vigente (ou explicitada) vira `requested_due_date` se a IA tiver confiança; senão data nula e humano preenche.
- **AC-20.3** Nenhuma mensagem automática de “prazo alterado” é enviada nesta etapa.

---

### UC-21 — Aprovar, ajustar ou rejeitar prorrogação

**Fase:** 5  
**Regras:** BR-72–BR-76

- **AC-21.1** Aprovar: `previous_due_date` e `approved_due_date` gravados; vigente = aprovado; contador +1; Observações projetam “Prorrogado N vezes…”.
- **AC-21.2** Ajustar: admin informa 02/09 quando o pedido era 30/08; vigente = 02/09; motivo e pedido original preservados.
- **AC-21.3** Rejeitar: vigente intacto; status extensão `REJECTED`; audit.
- **AC-21.4** Automações de lembrete passam a usar o novo vigente após aprovação.
- **AC-21.5** Histórico lista todas as extensões anteriores da tarefa (DoD 20).

---

### UC-22 — Comunicar prorrogação aos sócios

**Fase:** 5  
**Regras:** BR-74, BR-75, A24, A30

Gerar texto estruturado (exemplo normativo do PROMPT §13):

```
Prorrogação registrada — OD Academy

Demanda #3
Responsável: Fenilli
Tarefa: Elaborar versão 1
Prazo anterior: 25/10/2026
Novo prazo: 30/10/2026
Solicitado por: Fenilli
Motivo: aguardando consolidação dos materiais
Prorrogação nº 1.
```

Com múltiplos responsáveis, o campo Responsável lista todos; “Solicitado por” é quem pediu (responsável identificável ou Admin).

- **AC-22.1** A comunicação **não** é gerada no `REQUESTED`, só no `APPROVED`.
- **AC-22.2** Se não houver grupo: in-app + texto copiável + tentativa individual aos NotificationTargets configurados.
- **AC-22.3** Seed de quem são os sócios = Q4; produto aceita lista vazia (só in-app + copiar).

---

### UC-23 — Validar entrega

**Fase:** 1 (atalho admin); 4 (claim WhatsApp)  
**Regras:** BR-35, BR-36, BR-26  
**Cenário real:** Caso G

- **AC-23.1** “Já enviei.” → operacional `WAITING_FOR_VALIDATION`, **não** `COMPLETED`. Inbox: “{Nome} informou que concluiu a demanda #{n}. Confirmar entrega?”
- **AC-23.2** Admin confirma → `COMPLETED` + `completed_at` + eventos `TaskDeliveryValidated` / `TaskCompleted`.
- **AC-23.3** Se houver dependente com `BUSINESS_DAYS_AFTER_DEPENDENCY` (FASE 2), o prazo do dependente materializa agora, não no claim (A29).
- **AC-23.4** Dependente só de bloqueio operacional (FASE 1, `FIXED_DATE`): ao validar a predecessora, o dependente deixa de estar bloqueado por AND, sem mudar a data fixa (I3).
- **AC-23.5** Admin recusa a validação: volta a `IN_PROGRESS` (ou `PENDING` se nunca saiu), nota obrigatória, responsável pode ser avisado via “Responder”.

---

### UC-24 — Cancelar tarefa

**Fase:** 1

- **AC-24.1** `CANCELLED` + prazo `NOT_APPLICABLE`; some de cards de atraso; não dispara lembrete.
- **AC-24.2** Dependentes que só dependiam dela permanecem com pré-requisito **não** satisfeito até o admin remover a dependência ou substituir (não auto-completar). Comportamento explícito: cancelar predecessora **não** satisfaz AND.

---

### UC-25 — Alterar status operacional (admin)

**Fase:** 1

Atalhos honestos: Pendente, Em andamento, Bloqueada, Aguardando input, Aguardando validação, Concluída (com confirmação), Cancelada (com confirmação).

- **AC-25.1** Transição ilegal é rejeitada (detalhe na state machine).
- **AC-25.2** Origem `USER` visível na timeline.

---

### UC-26 — Lembrete WhatsApp (saída)

**Fase:** 3  
**Regras:** seção 6, A25, A26, I5

Tipos iniciais: `REMINDER_DUE_SOON`, `OVERDUE`; `BLOCKED_FOLLOW_UP` só quando fizer sentido (não cobra atraso). Tom: humano, curto, educado, profissional, não robótico.

- **AC-26.1** D-3 / D-1 / D0 / D+1 disparam conforme NotificationRules (defaults seção 6.2), não hardcoded imutável.
- **AC-26.2** Mesmo tipo não é reenviado para o mesmo par (responsável, tarefa, ocorrência, tipo) enquanto a regra não resetar.
- **AC-26.3** Tarefa `COMPLETED`/`CANCELLED`/`WAITING_FOR_TRIGGER` não recebe lembrete de vencimento.
- **AC-26.4** Tarefa bloqueada por pré-requisito não recebe `OVERDUE` acusando o responsável; pode gerar inbox ao admin e follow-up gentil opcional (A26).
- **AC-26.5** 3 demandas do mesmo responsável no mesmo dia → 1 digest (se estratégia = digest), não 3 templates independentes (A25).
- **AC-26.6** Dois responsáveis na mesma tarefa → duas renderizações (`{{nome}}` diferente).

---

### UC-27 — Resposta do responsável (entrada)

**Fase:** 3 (persistir) / 4 (classificar)  
**Regras:** BR-80–BR-84

- **AC-27.1** Webhook duplicado não cria segunda Message de domínio nem segunda classificação.
- **AC-27.2** Payload bruto é persistido (protegido); texto normalizado disponível na timeline da tarefa quando a correlação identificar a tarefa.
- **AC-27.3** Se a tarefa não for identificável, a conversa ainda é armazenada e a inbox recebe `UNCLEAR` / “mensagem sem tarefa”.
- **AC-27.4** Classificações possíveis: `ON_TRACK`, `BLOCKED`, `NEEDS_INPUT`, `NEEDS_ANOTHER_PERSON`, `EXTENSION_REQUEST`, `CLAIMS_DELIVERED`, `UNCLEAR`, `OTHER`.
- **AC-27.5** `ON_TRACK` com confiança alta **não** abre conversa livre; no máximo um ack se o produto decidir (default: **não** responder automaticamente; só inbox se `requires_human_action`).
- **AC-27.6** Fallback sem IA: item “pendente de classificação”; admin lê o texto original.

---

### UC-28 — Resumo e alerta ao administrador

**Fase:** 4 (in-app) / 5 (WhatsApp do admin)

Resumos deixam **explícito** quando o sistema **não** tomou a decisão.

Exemplos normativos (PROMPT §21):

- Bloqueio identificado, intervenção SIM, motivo.
- Pedido de prorrogação, “Nenhuma alteração foi feita ainda.”

- **AC-28.1** Alerta de prorrogação contém matriz, #demanda, responsável, prazo atual, nova previsão, motivo, e a frase de que nada foi alterado.
- **AC-28.2** Alerta de entrega claimada pergunta se confirma; não afirma que está concluída.
- **AC-28.3** `correlation_id` liga webhook → message → classificação → inbox → notificação (A31).

---

### UC-29 — Consultar detalhe, timeline e histórico

**Fase:** 1 (base); 3–5 enriquecem

Detalhe mostra: título, descrição, matriz, número (`sequence_number`), responsáveis, prazo original, prazo atual, regra de prazo, pré-requisitos, dependentes, status operacional, situação do prazo, número de prorrogações, timeline.

- **AC-29.1** A timeline contém pelo menos: criação, mudanças de status, mudanças de prazo, extensões, lembretes enviados, mensagens, classificações, validação.
- **AC-29.2** Evento de automação aparece como automação, não como se o admin tivesse clicado.
- **AC-29.3** DoD 24: o admin consulta o histórico completo da demanda a partir desta tela.

---

### UC-30 — Adicionar observação / nota

**Fase:** 1  
**Regras:** BR-60, BR-61

- **AC-30.1** Nota manual entra em `task_notes` e passa a compor a projeção de Observações (resumo, não necessariamente o texto inteiro na célula).
- **AC-30.2** A célula Observações **não** é um textarea único que guarda regra de prazo.

---

### UC-31 — Calendário e feriados

**Fase:** 2 (seed pode existir no schema FASE 1, uso no cálculo FASE 2)

- **AC-31.1** Feriado nacional seedado é excluído de dia útil.
- **AC-31.2** Admin adiciona feriado custom; cálculos seguintes o respeitam.
- **AC-31.3** Cálculo histórico não depende de API externa estar no ar (A21).

---

### UC-32 — Configurar NotificationRules e NotificationTargets

**Fase:** 3–5 (UI de config pode ser FASE 5; defaults no código/seed FASE 3)

- **AC-32.1** Defaults D-3, D-1, D0, D+1 existem e são editáveis.
- **AC-32.2** Targets de sócios são lista, não nomes hardcoded (A30, Q4).

---

## 4. Mapa FASE 1 × demais UCs

| UC | FASE 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| 01–10, 15–18, 23 (atalho admin), 24–25, 29–30 | ● | | | | |
| 11–14, 31 | | ● | | | |
| 26, 27 (persistir), 05 opt-in | | | ● | | |
| 19, 27 (IA), 28 in-app | | | | ● | |
| 20–22, 28 WhatsApp admin, 32 targets | | | | | ● |

FASE 1 **não** entrega o DoD 48 inteiro (I10, A33).

---

## 5. Casos reais A–G (aceitação de processo)

Fixtures obrigatórias do PROMPT §44. Cada caso é cenário de aceite de ponta a ponta no domínio indicado. Nomes e datas são canônicos.

### Caso A — Prazo fixo na Matriz Geral

**Dado** a matriz “Matriz Geral”  
**E** a Task #1, responsável Matheus, “Atualizar a Assinatura Suprema no Site”, prazo 28/08/2026, sem pré-requisito  
**Então** a regra é `FIXED_DATE` = 28/08/2026  
**E** a coluna Prazo mostra 28/08/2026  
**E** o detalhe mostra a mesma data como vigente e original  
**E** nenhuma dependência é criada  
**Relaciona:** UC-10, AC-10.1

### Caso B — Dependência explícita

**Dado** a matriz “Ordenador de Despesas Presencial”  
**E** Task #2 “Definir modelo de remuneração”  
**E** Task #3 “Elaborar Planilha Financeira e determinar ponto de equilíbrio” depende de #2  
**Então** #3 aparece vinculada a #2 na coluna Pré-requisito e em `task_dependencies`  
**E** #3 **não** depende de #2 apenas por ser o próximo `sequence_number`  
**Relaciona:** UC-09, AC-09.1

### Caso C — 15 dias úteis após o gatilho

**Dado** a matriz “Pós-Graduação Ordenação de Despesas”  
**E** Task #2 “Definir data da live”  
**E** Task #3 “Preparar material para live” com prazo 15 dias úteis após conclusão da #2  
**Quando** #2 ainda não está `COMPLETED`  
**Então** #3 está `WAITING_FOR_TRIGGER` e não é cobrada por atraso  
**Quando** #2 é **validada** (`COMPLETED`)  
**Então** `due_date` de #3 = data de conclusão de #2 + 15 dias úteis (Business Calendar)  
**E** um mero “já defini a data” (`WAITING_FOR_VALIDATION`) **não** dispara o cálculo (A29)  
**E** o produto **não** interpreta “definição da data” como marco separado da conclusão no MVP (I6)  
**Relaciona:** UC-12

### Caso D — Terceiro dia útil do mês

**Dado** uma task “Divulgar disciplinas do mês” com `RECURRING_BUSINESS_DAY` = 3º dia útil  
**Quando** o mês começa sábado, domingo, ou contém feriado no início  
**Então** a ocorrência daquele mês cai no 3º dia útil **efetivo**  
**E** não se cria uma linha nova de demanda por mês  
**Relaciona:** UC-14  
**Hypothesis Q3:** completar a ocorrência abre o próximo período em `PENDING`.

### Caso E — Dois responsáveis, uma tarefa

**Dado** Giovanni Pacelli e Francisco Netto na mesma tarefa  
**Então** existe uma única Task  
**E** `task_responsibles` tem dois vínculos  
**E** a matriz e a Visão Geral não duplicam a demanda  
**Relaciona:** UC-08

### Caso F — Pedido de prorrogação via WhatsApp

**Dado** um responsável que envia: “Vou precisar prorrogar até dia 30 porque ainda estou esperando o material.”  
**Então** a IA classifica `EXTENSION_REQUEST`  
**E** o prazo vigente **não** muda  
**E** nasce um pedido `REQUESTED`  
**E** o administrador recebe alerta (in-app; WhatsApp na FASE 5)  
**E** a mensagem deixa claro que nenhuma alteração foi feita  
**Relaciona:** UC-20, UC-28

### Caso G — “Já enviei”

**Dado** o responsável envia “Já enviei.”  
**Então** operacional = `WAITING_FOR_VALIDATION`  
**E** operacional ≠ `COMPLETED`  
**E** o admin precisa confirmar para concluir e eventualmente liberar dependentes  
**Relaciona:** UC-23

---

## 6. Notificações e anti-spam (alto nível)

O detalhe de templates aprovados na Meta, janela de atendimento, opt-in e qualidade da conta pertence a `docs/06-whatsapp-integration.md`. Aqui vale o contrato de produto.

### 6.1 Canais

| Canal | Uso no MVP |
|---|---|
| In-app | Sempre. Inbox, dashboard, toasts de falha. |
| WhatsApp individual (responsável) | Lembretes e follow-ups (FASE 3+). |
| WhatsApp individual (admin) | Alertas/resumos (FASE 5). |
| WhatsApp group | Opcional, se a conta permitir. **Não** é requisito (A24). |
| E-mail | Fora do MVP; NotificationTarget já prevê o tipo. |
| Mensagem copiável | Fallback de comunicação a sócios. |

### 6.2 Defaults de regra (editáveis)

| Gatilho | Default |
|---|---|
| `DUE_SOON` | D-3 dias úteis e D-1 dia útil |
| `DUE_TODAY` | no dia, em horário comercial configurável (default 09:00 `America/Sao_Paulo`) |
| `OVERDUE` | D+1 dia útil |
| Follow-up overdue | após N dias úteis sem resposta (default 3), respeitando anti-spam |
| Digest | se 2+ lembretes ao mesmo responsável no mesmo dia civil (A25) |

Valores **não** são lei eterna; são seed.

### 6.3 Anti-spam (normativo)

| ID | Regra |
|---|---|
| **NR-01** | Não enviar o mesmo **tipo** de lembrete duas vezes para o mesmo (responsável, task, occurrence) enquanto o estado que originou o envio não mudou materialmente (novo prazo aprovado pode rearmar). |
| **NR-02** | Não enviar mensagem repetida ao mesmo número em menos de X horas (default 6h), salvo alerta crítico ao **admin**. |
| **NR-03** | Não lembrar tarefa `COMPLETED` ou `CANCELLED`. |
| **NR-04** | Não cobrar `WAITING_FOR_TRIGGER`. |
| **NR-05** | Não cobrar bloqueio de pré-requisito como atraso do responsável (A26). |
| **NR-06** | Preferir digest por pessoa no mesmo dia (A25). Estratégia configurável: `DIGEST` (default) \| `PER_TASK`. |
| **NR-07** | Não continuar conversa livre após classificação. Resposta automática default = **desligada**. `suggested_reply` só é enviado se o admin acionar “Responder” / “Aprovar ação” que inclua envio. |
| **NR-08** | Falha de envio: outbox retenta com backoff; após esgotar, item de inbox `WHATSAPP_SEND_FAILURE`. Não duplicar o lembrete “porque falhou o primeiro” sem marcar o evento. |
| **NR-09** | Renderização **por destinatário** (I5). |
| **NR-10** | Responsável inativo ou sem opt-in: skip + motivo no `notification_events`. |

### 6.4 O que a FASE 1 entrega de “alerta”

Apenas in-app: cards do dashboard e (se implementado) badge de atrasadas. Sem push WhatsApp. Isso é correto (I10).

---

## 7. Central de triagem

Nome na UI: **Caixa de entrada** (subtítulo: “Pendências que precisam de você”).

### 7.1 Tipos de item

| Tipo | Origem típica | Ação feliz |
|---|---|---|
| `EXTENSION_REQUEST` | IA / admin | Aprovar / ajustar / rejeitar (UC-21) |
| `BLOCKER` | classificação `BLOCKED` | Ver contexto; opcional marcar tarefa `BLOCKED`; responder |
| `NEEDS_INPUT` | classificação `NEEDS_INPUT` | Responder; tarefa pode ir a `WAITING_FOR_INPUT` (I9) |
| `NEEDS_ANOTHER_PERSON` | classificação | Ver contexto; talvez criar/vincular dependência (humano); responder |
| `UNCLEAR_RESPONSE` | `UNCLEAR`, baixa confiança | Ver contexto; classificar manualmente; responder |
| `DELIVERY_CLAIMED` | `CLAIMS_DELIVERED` | Confirmar ou recusar (UC-23) |
| `CRITICAL_OVERDUE` | scheduler (atraso + sem bloqueio + N dias / tarefa marcada crítica) | Ver; cobrar via Responder; ou prorrogação |
| `WHATSAPP_SEND_FAILURE` | outbox | Reagendar / copiar mensagem / resolver |
| `CLASSIFICATION_PENDING` | IA down | Ler original; agir manualmente |
| `TASK_WITHOUT_RESPONSIBLE` | opcional, gap G-09 | Atribuir |
| `AUTOMATION_ERROR` | worker | Investigar; resolver |

Um mesmo evento de domínio não deve criar **dois** itens abertos do mesmo tipo para a mesma tarefa; atualiza o existente (`correlation_id`).

### 7.2 Conteúdo mínimo do item

- tipo, urgência (`LOW`/`MEDIUM`/`HIGH`), created_at;
- matriz, `#sequence_number`, título da tarefa;
- responsáveis;
- prazo vigente e status dos três eixos;
- resumo (IA ou sistema);
- se aplicável: suggested_reply, suggested_new_deadline, mentioned_people;
- link Ver contexto;
- indicação explícita: “O sistema não alterou prazo/status final.”

### 7.3 Ações

| Ação | Comportamento |
|---|---|
| **Ver contexto** | Abre detalhe da tarefa + thread recente + classificação + regra de prazo, em painel (pouco clique: split ou drawer). Não perde a posição da inbox. |
| **Aprovar ação** | Executa a mutação sugerida **somente** com clique humano: aprovar prorrogação (data sugerida ou ajustada), confirmar entrega, aplicar `BLOCKED`, etc. Mostra preview do que vai mudar. |
| **Responder** | Envia (FASE 3+) texto ao responsável — `suggested_reply` editável. Origem `USER`. Não vira loop: uma mensagem de saída, sem auto-follow. |
| **Adiar** | Snooze do **item de inbox** (default 1 dia útil; opções 3h / amanhã 9h / 3 dias úteis). **Não** adia o prazo da tarefa. |
| **Marcar como resolvido** | Fecha o item. Não implica `COMPLETED` nem prazo novo. Se a mutação pendente era prorrogação, o pedido permanece `REQUESTED` até UC-21 — resolver o item sem decidir deve avisar: “O pedido de prorrogação continua aberto.” |

Atalhos por tipo: `DELIVERY_CLAIMED` tem Confirmar entrega / Recusar na própria linha (ainda são “Aprovar ação”).

### 7.4 Relação com `WAITING_FOR_INPUT` (I9)

Exemplo: responsável pede acesso ao site.

1. Tarefa pode ir a `WAITING_FOR_INPUT` (falta um dado/ação no mundo).
2. Inbox ganha `NEEDS_INPUT` ou `BLOCKER` para o admin.
3. Resolver a inbox sem liberar o acesso **não** tira `WAITING_FOR_INPUT`.
4. Quando o admin registra que o acesso foi liberado (nota + voltar a `IN_PROGRESS`), ambos os eixos se atualizam.

---

## 8. Tratamento das inconsistências I1–I10

| ID | Como a spec funcional aplica a assumption |
|---|---|
| **I1** | UC-02 e BR-02: arquivar preenche `archived_at`. Filtros usam derivado “Ativa”. Nenhum campo `active` persistido como verdade. |
| **I2** | UC-06/07/16: “Ordem” = `#sequence_number`. Reorder altera `display_order`. Sort na tabela pode usar os dois. Dependência continua explícita. |
| **I3** | UC-10 + UC-23.4: conclusão de predecessora não toca `FIXED_DATE`. UC-12 só para regra relativa. |
| **I4** | BR-32: eixo de prazo usa `NOT_APPLICABLE` no terminal. Cards “Atrasadas” / “Vencem hoje” ignoram terminais. Observações de concluída: “Entregue em {data}”, não “em dia”. |
| **I5** | BR-24, NR-09, UC-26.6: vocativo individual. Digest: “Oi, Giovanni…” listando as demandas dele, não “Oi, Giovanni e Francisco”. |
| **I6** | UC-12 / Caso C: trigger = `COMPLETED`. Copy da UI da regra: “N dias úteis após a **conclusão validada** da demanda #X”, não “após definir a data”. Limitação documentada; extensão FASE 7. |
| **I7** | Navegação: “Visão Geral” vs lista “Matrizes”. Badge de tipo: “Geral”. UC-17.2. |
| **I8** | Produto fala “envio confiável”. Admin vê “na fila”, “enviado”, “falhou”. Internamente: outbox persiste, pg-boss envia. Falha ≠ perda silenciosa (UC-19 tipo `WHATSAPP_SEND_FAILURE`). |
| **I9** | BR-37, seção 7.4. Inbox ≠ status da tarefa. Dashboard tem card separado “Aguardando minha resposta” (inbox) e a tabela mostra `WAITING_FOR_INPUT`. |
| **I10** | Seção 4 e brief §7. Testes FASE 1 **não** exigem Meta. DoD 48 é o critério do **MVP**, não do slice 1. |

---

## 9. UX comportamental (não CSS)

Princípios: A36 + PROMPT §33. Ferramenta interna. Velocidade, leitura, clareza, pouco clique, filtros, feedback imediato. Desktop-first, responsivo o suficiente para consulta em tela estreita, **sem** recriar a matriz como app mobile.

### 9.1 Navegação

Estrutura persistente (sidebar ou top nav, o que for mais denso em desktop):

1. Dashboard  
2. Caixa de entrada (badge com abertos)  
3. Visão Geral  
4. Matrizes  
5. Responsáveis  
6. Configurações (feriados, regras de notificação, targets — conforme a fase)

Contexto da matriz: breadcrumb `Matrizes / {nome}`.

### 9.2 Dashboard — comportamento dos cards

- Cards são **contagens clicáveis**, não enfeite. Um clique aplica o filtro na lista abaixo.
- A lista mostra: matriz, `#`, título, responsáveis, prazo, eixo operacional, eixo de prazo, motivo da prioridade (“atrasada 3 dias”, “aguardando sua validação”).
- Linha da lista abre o detalhe (drawer). Segundo clique ou “abrir matriz” vai para a tabela já posicionada na linha (pouco clique).
- Estados vazios são explícitos: “Nada vencendo hoje.”
- Sem animações de entrada que atrasem a leitura.

### 9.3 Matriz — tabela

- Densidade alta, linhas compactas, cabeçalho fixo ao rolar.
- Coluna Ordem: `#n`. Tooltip: “Ordem de cadastro. Não implica dependência.”
- Responsável: nomes; se >2, primeiro + “+k” com hover/expansão.
- Prazo: data + indicador do eixo de prazo (texto, não só cor: “Atrasada”, “Hoje”, “Aguardando #2”).
- Pré-requisito: `#n` clicável; check visual se `COMPLETED`.
- Observações: projeção de uma a duas linhas; overflow no expand.
- Filtros persistidos na URL da matriz (compartilhável internamente).
- Criar demanda: botão sempre visível; atalho teclado (ex. `n`) desejável, não obrigatório no MVP.
- Edição de prazo/status na expansão, não obrigar navegar a outra rota para o caminho feliz.
- Múltiplos responsáveis: o autocomplete de pessoas é o mesmo do cadastro (reuso).

### 9.4 Visão Geral

Igual à tabela da matriz **mais** a coluna Matriz no início. Mesmos filtros + filtro de matriz. Não é um segundo tipo de card wall.

### 9.5 Detalhe / timeline

Uma página ou drawer largo. Acima: metadados. Abaixo: timeline crescente ou decrescente com toggle, default **mais recente embaixo** (leitura de conversa) ou mais recente no topo — **decisão de produto: mais recente no topo** para operação (exceções primeiro). Gap G-26 se quiserem inverter.

Cada evento: data/hora, origem (Você / Automação / WhatsApp / IA / Sistema), texto.

### 9.6 Inbox

- Lista à esquerda, contexto à direita no desktop (zero ida-e-volta).
- Em viewport estreita: lista → detalhe com voltar.
- Ações primárias na linha: as do tipo (Confirmar entrega, Aprovar prazo).
- Adiar e Resolver são secundárias, mas visíveis sem menu escondido de três níveis.

### 9.7 Formulários

- React Hook Form + validação visível (produto: erros em português, junto ao campo).
- Dependência: multi-select das tarefas da matriz, mostrando `#` e título, impedindo ciclo **antes** do submit (disable opções inválidas + mensagem).
- Prazo: primeiro escolhe o **tipo**, depois os campos daquele tipo. Não um único campo texto “15 dias úteis”.
- Confirmações só para mutações irreversíveis/sensíveis: concluir, cancelar, aprovar/rejeitar prorrogação. Demais saves são imediatos com toast desfazer **não obrigatório** no MVP (audit cobre).

### 9.8 Feedback e falhas

- Mutação ok: toast curto.
- WhatsApp falhou: badge no dashboard + inbox, não modal modal-only.
- IA pendente: o item mostra o texto humano cru.

### 9.9 Acessibilidade mínima de produto

Contraste legível, foco visível, tabela navegável por teclado no essencial (entrar na linha, abrir detalhe). Não é um projeto de acessibilidade plena na FASE 1, mas a tabela não pode ser só `div`s clicáveis sem semântica — isso é requisito de implementação, aqui fica o comportamento: **admin consegue operar a matriz só com teclado no caminho criar → abrir → mudar status**.

---

## 10. Gaps de produto que não bloqueiam arquitetura

Itens conscientes. Não são TBD de modelo. Podem ir para `docs/11-open-questions.md` / backlog FASE 7.

| ID | Gap | Por que não bloqueia |
|---|---|---|
| **G-01** | Matriz fina de permissão do `OPERATOR` (Q1) | Modelo já tem papéis; default ADMIN-only na UI. |
| **G-02** | Seed de sócios / canais (Q4) | NotificationTargets é lista vazia-válida + copiar texto. |
| **G-03** | WABA existente vs greenfield (Q2) | Provider abstrato; FASE 1 nem envia. |
| **G-04** | Confirmar reset de status na recorrência (Q3) | A16 é hypothesis suficiente para modelar `deadline_occurrences`. |
| **G-05** | Entrega parcial com N responsáveis (Q5) | Tarefa una; um claim valida o todo. Se no futuro for split, vira subtarefa — não precisa agora. |
| **G-06** | Trigger por data-marco sem `COMPLETED` (I6) | Campo `trigger_type` no modelo; UI MVP só conclusão. |
| **G-07** | Hora exata do vencimento e “DUE_TODAY” vs timezone de viagem | Default 23:59:59 `America/Sao_Paulo` é implementável. |
| **G-08** | Dependência entre matrizes | MVP intra-matriz; grafo já é entidade. |
| **G-09** | Tarefa sem responsável: bloquear save vs permitir rascunho | BR-22 dá default; schema N:N já permite 0. |
| **G-10** | Anexos / evidência de entrega (link, arquivo) | Claim textual + validação humana bastam ao DoD. |
| **G-11** | Quiet hours / DND do responsável | NR-02 + horário default 09:00. |
| **G-12** | Admin responder pelo próprio WhatsApp (inbound admin) vs só inbox web | Inbox web é o canal de decisão; inbound admin pode ser FASE 7. |
| **G-13** | Frequência do resumo diário ao admin | Evento transacional por exceção + digest diário opcional depois. |
| **G-14** | Opt-out / LGPD erasure UX | Modelo de ativo + retenção entra em security spec; tela de exclusão pode ser FASE 6. |
| **G-15** | Responsável sem WhatsApp (só e-mail / só nome) | Cadastro permite; skip de envio (NR-10). |
| **G-16** | Unicidade de telefone entre responsáveis | Não exigir na FASE 1; risco de digest misturar pessoas é aceitável até regra. |
| **G-17** | Prioridade de atenção: pesos exatos (G-25) | Ordem sugerida na UC-18; algoritmo pode ser ajustado sem schema. |
| **G-18** | Comentário interno vs nota visível na coluna Observações | Tudo em `task_notes` no MVP; flag `internal` depois. |
| **G-19** | Views salvas / pin de filtros | URL de filtro na FASE 1 basta. |
| **G-20** | Critério de `CRITICAL_OVERDUE` (N dias, valor, matriz) | Default: `OVERDUE` ≥ 3 dias úteis e não bloqueada. Ajustável. |
| **G-21** | Follow-up de bloqueio: template ligado/desligado por matriz | A26 já torna opcional; default off. |
| **G-22** | Ack automático de “ok, obrigado” após `ON_TRACK` | Default off (NR-07). |
| **G-23** | Idioma das mensagens ≠ pt-BR | Fora de escopo. |
| **G-24** | Duração default do snooze da inbox | 1 dia útil; enum curto. |
| **G-25** | Scoring da lista “Prioridade de atenção” | Heurística da UC-18; não é campo persistido. |
| **G-26** | Ordem da timeline (topo vs base) | Decisão: mais recente no topo. Invertível por preferência depois. |
| **G-27** | Desfazer toast após save | Audit substitui no MVP. |
| **G-28** | Unicidade de nome de matriz | Não exigida (BR-06). |
| **G-29** | Portal do responsável | Fora (brief §4). |
| **G-30** | Import Word e quick capture | A34, FASE 7. Arquitetura “draft + confirmação” já prevista. |
| **G-31** | CALENDAR_DAYS visível na UI FASE 2 ou só API | Modelo preparado; produto pode esconder o tipo até haver 1 caso real. |
| **G-32** | Horário comercial configurável além das 09:00 | Seed único; `system_settings` já existe. |
| **G-33** | Tarefa crítica marcada manualmente vs só atraso | Card + heurística; flag `attention_flag` pode nascer depois. |

---

## 11. Rastreio da qualidade (seção 50) nesta spec

| Pergunta | Onde está garantido |
|---|---|
| Reduz trabalho operacional? | UC-18, UC-19, UC-26; admin não persegue linha a linha. |
| Auditável? | BR-62, UC-29. |
| Impede ação indevida da IA? | BR-80, UC-20.1, UC-23.1, NR-07. |
| IA cair? | BR-82, tipo `CLASSIFICATION_PENDING`. |
| WhatsApp cair? | BR-83–85, I8, `WHATSAPP_SEND_FAILURE`. |
| Explica prazo? | UC-10–15, detalhe da regra, Casos A–D. |
| Explica mensagem? | `notification_events` + NR-01–10 + `correlation_id`. |
| Múltiplos responsáveis? | UC-08, Caso E, I5. |
| Dependências? | UC-09, Casos B–C, BR-13–18. |
| Prorrogações históricas? | UC-20–22, Caso F. |
| Local? | FASE 1 web-only; WhatsApp túnel só quando FASE 3. |

---

## 12. Fora desta spec

Não define: schema SQL, ADRs de stack, payloads Meta, JSON Schema da IA, plano de testes executável, nem roadmap de slices. Esses documentos são dos demais subagents da FASE 0.

Este arquivo **é** a fonte de casos de uso e aceite de produto. Conflito com código futuro: vence esta spec até o dono revisá-la.
