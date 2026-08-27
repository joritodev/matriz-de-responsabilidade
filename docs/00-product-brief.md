# Brief de produto — Matriz de Responsabilidade

**Versão:** 0.1 (FASE 0)  
**Idioma:** português do Brasil  
**Status:** especificação oficial da FASE 0  
**Fonte de lei:** `/PROMPT.md`  
**Assumptions travadas:** A1–A36 (`docs/assumptions.md`)  
**Perguntas em aberto (não respondidas aqui):** Q1–Q5 — consolidação em `docs/11-open-questions.md`

Este documento descreve o *quê* e o *porquê*. Regras de caso de uso, critérios de aceite e UX comportamental estão em `docs/01-functional-spec.md`.

---

## 1. Visão

Substituir o processo atual de matrizes de responsabilidade em documentos Word por uma aplicação interna, single-tenant, confiável e auditável, que:

1. centraliza matrizes e demandas como fonte oficial da verdade;
2. calcula prazos, bloqueios e atrasos de forma determinística;
3. inicia e organiza o acompanhamento automático (lembretes, triagem, resumos);
4. devolve ao administrador apenas as decisões que realmente importam.

O produto não é uma demo visual nem um chatbot. É uma ferramenta operacional interna, desktop-first, cuja visualização principal permanece uma tabela próxima da matriz Word atual.

A aplicação roda localmente no desenvolvimento (`docker compose up`) e deve poder ser hospedada depois, sem depender da máquina do dono estar ligada em produção.

---

## 2. Problema (o Word de hoje)

Hoje existem várias matrizes em Word:

- uma **Matriz Geral**;
- matrizes de **projetos**;
- matrizes de **cursos**;
- matrizes de **produtos**;
- outras matrizes que surgirão.

Cada matriz lista demandas com colunas próximas de: ordem, responsável, tarefa, prazo, pré-requisito, observações.

Isso gera trabalho operacional contínuo para o dono:

- lembrar quem deve o quê e quando;
- conferir se uma demanda está bloqueada por outra;
- interpretar prazos relativos (“15 dias úteis após a live”, “terceiro dia útil do mês”);
- cobrar no WhatsApp, uma a uma;
- negociar prorrogações e avisar sócios;
- confirmar se “já entreguei” é realmente entrega;
- manter histórico espalhado em conversas e arquivos.

O Word não calcula dias úteis, não impede dependência circular, não guarda histórico de prorrogação, não distingue “ordem de cadastro” de “dependência”, e não escala o acompanhamento. O dono vira o sistema.

**O que o Word faz bem e o produto deve preservar:** leitura rápida em formato tabular; uma linha = uma demanda; responsáveis visíveis; prazo e pré-requisito na mesma vista; observações que resumem o estado atual.

**O que o Word faz mal e o produto deve eliminar:** texto como banco de dados; “Sim, tarefa 2” como dependência; “15 dias úteis” sem regra estruturada; ausência de auditoria; acompanhamento 100% manual.

---

## 3. Objetivo central

Reduzir a responsabilidade operacional do administrador para:

1. criar uma matriz;
2. adicionar uma demanda;
3. indicar responsável(is);
4. definir prazo (regra estruturada, não só texto);
5. indicar dependências explícitas;
6. acompanhar **exceções**;
7. intervir **somente quando necessário**.

O sistema assume o restante: monitorar prazos, detectar bloqueios, enviar lembretes, receber respostas, classificar, resumir, alertar e guardar histórico.

Sucesso do produto não é “mais telas”. Sucesso é: o dono deixa de perseguir demanda por demanda e passa a decidir sobre uma fila curta de exceções.

---

## 4. Não-objetivos

Fora do produto, agora e no MVP:

| Não-objetivo | Motivo |
|---|---|
| Chatbot autônomo no WhatsApp | Princípio human-in-the-loop (seção 3 do PROMPT) |
| Multi-organização / multi-tenant | A1 — um único espaço de trabalho |
| OAuth / login social | A9 — sessão cookie httpOnly no MVP |
| WhatsApp Web, Selenium, Puppeteer, libs não oficiais | A7 |
| Redis, Kubernetes, microservices | A6 e seção 47 do PROMPT |
| Word/CSV/DOCX como fonte da verdade | Banco é a fonte oficial (A34: import só na FASE 7) |
| Quick capture por linguagem natural | A34 — FASE 7; sempre com preview + confirmação |
| Templates de matriz (“duplicar como modelo de curso”) | A34 — FASE 7 |
| Analytics avançado, BI, relatórios gerenciais ricos | FASE 7 |
| App mobile nativo | Desktop-first (A36); layout responsivo, não nativo |
| Grupo de WhatsApp como dependência de arquitetura | A24 |
| IA calculando prazo, atraso ou dependência | Determinístico; IA só tria texto |
| Portal self-service para o responsável | Responsável opera via WhatsApp, não via login |
| Marketplace, cobrança, multi-idioma de UI | Sistema interno pt-BR |

---

## 5. Princípio fundamental

> **Automação inicia e organiza. Humano decide.**

A automação **pode** enviar: lembrete inicial, aviso de prazo próximo, aviso de atraso, pergunta inicial sobre bloqueios, solicitação de atualização.

Quando o responsável responde, a IA **pode**: interpretar, classificar, extrair, resumir, sugerir ação, avisar o administrador.

A automação **não** continua conversa livre por padrão. Não há “agente” negociando prazo no WhatsApp.

A IA **nunca**, sozinha:

- prorroga prazo;
- altera responsável;
- marca tarefa como definitivamente entregue;
- exclui tarefa;
- altera dependências;
- aprova justificativa;
- negocia nova data;
- envia comunicação sensível aos sócios;
- executa alteração irreversível.

Essas ações exigem confirmação humana (A14, A15). Se a IA cair, dados e prazos continuam corretos (A8, A32). Se o WhatsApp cair, o sistema interno continua operável (A32).

---

## 6. Personas

### 6.1 Administrador (dono) — papel `ADMIN`

Único decisor de negócio no MVP. Primeiro usuário do sistema (A9).

**Quer:** cadastrar matrizes e demandas em poucos cliques; ver “o que preciso olhar hoje”; aprovar/rejeitar/ajustar prorrogação; confirmar entrega; responder responsável quando necessário; copiar aviso aos sócios se o grupo de WhatsApp não existir.

**Não quer:** cobrar cada demanda manualmente; perder histórico; descobrir atraso só quando o sócio cobra; ter o sistema decidindo no lugar dele.

**Canais:** aplicação web (principal) + WhatsApp pessoal para alertas/resumos (a partir da FASE 5; FASE 1 é só web).

### 6.2 Responsável (externo via WhatsApp)

Pessoa reutilizável (professor, diretoria, fornecedor, parceiro, etc.). **Não é usuário logado** no MVP. Não acessa a tabela internamente.

**Quer:** ser cobrado com educação e clareza; informar bloqueio, pedido de prazo ou “já enviei” numa resposta curta; não receber três mensagens no mesmo dia para três demandas.

**Não quer:** chatbot interminável; tom robótico; ser cobrado por tarefa que ainda não começou ou que está bloqueada por outra pessoa.

**Canal:** WhatsApp (Cloud API oficial). Cadastro do número existe desde a FASE 1; envio/recebimento começam na FASE 3.

### 6.3 Operator (futuro) — papel `OPERATOR`

Papel previsto no modelo desde o dia 1 (A9), para não retrabalhar `created_by` e audit. **Não é o dono.**

Uso esperado (pós-Q1): consultar matrizes, dashboard e tarefas; eventualmente cadastrar demandas; **não** aprovar prorrogação, validar entrega, alterar alvos de notificação a sócios, nem arquivar matrizes — até Q1 definir se haverá operators no dia 1 e qual a granularidade.

**Decisão de produto (não responde Q1):** o modelo e a autorização conhecem `OPERATOR`. A FASE 1 pode expor UI apenas ao `ADMIN`. Expandir operadores é produto, não arquitetura.

---

## 7. Escopo: FASE 1 versus MVP completo

**Não confundir FASE 1 com MVP** (A33, I10).

O **MVP completo** é a Definition of Done da seção 48 do PROMPT. Ele atravessa as FASES 1–5. A FASE 6 (hardening) e a FASE 7 (enhancements) ficam fora do MVP funcional, embora a arquitetura não as impeça.

### 7.1 FASE 1 — Core (sem WhatsApp, sem motor completo de prazo, sem IA)

Entregável:

- PostgreSQL + app web local;
- CRUD de matrizes (tipos extensíveis; arquivar);
- CRUD de responsáveis (incluindo número WhatsApp persistido, sem envio);
- CRUD de tarefas na matriz;
- múltiplos responsáveis (N:N);
- dependências explícitas (AND, sem ciclo);
- prazo **FIXED_DATE** e **MANUAL/UNDEFINED**;
- tabela da matriz (colunas do Word);
- visão Geral como query agregada;
- dashboard básico (cards calculados sobre prazo fixo e status operacional);
- audit log das ações humanas;
- usuário `ADMIN` (e schema pronto para `OPERATOR`).

Fora da FASE 1 (mesmo que o cadastro já exista):

- envio/recebimento WhatsApp;
- templates Meta;
- classificação por IA;
- inbox de triagem alimentada por mensagem;
- workflow de prorrogação com aprovação;
- alerta ao WhatsApp do admin;
- dias úteis / feriados / prazos relativos / recorrência (FASE 2);
- scheduler de lembretes.

Na FASE 1, cadastrar “Matheus com WhatsApp” significa **persistir o contato**. Não significa conversa.

### 7.2 MVP completo (DoD seção 48) — até FASE 5

O MVP está funcional quando o administrador conseguir:

| # | Capacidade | Fase mínima |
|---|---|---|
| 1 | Abrir a aplicação local | 1 |
| 2 | Cadastrar Matheus com WhatsApp (contato) | 1 (envio: 3) |
| 3 | Criar uma nova matriz | 1 |
| 4 | Adicionar tarefas | 1 |
| 5 | Usar múltiplos responsáveis | 1 |
| 6 | Criar dependências | 1 |
| 7 | Definir prazo fixo | 1 |
| 8 | Definir prazo relativo em dias úteis | 2 |
| 9 | Definir recorrência (terceiro dia útil) | 2 |
| 10 | Visualizar demandas na matriz | 1 |
| 11 | Visualizar tudo no dashboard geral | 1 (enriquecido 2–5) |
| 12 | Receber alertas de prazo | 2 (in-app) / 5 (WhatsApp admin) |
| 13 | Enviar lembrete automático via WhatsApp | 3 |
| 14 | Receber resposta do responsável | 3 |
| 15 | Armazenar resposta | 3 |
| 16 | Classificar resposta | 4 |
| 17 | Ser avisado se houver bloqueio | 4 |
| 18 | Ser avisado se houver pedido de prorrogação | 4–5 |
| 19 | Aprovar prorrogação manualmente | 5 |
| 20 | Consultar prorrogações anteriores | 5 |
| 21 | Confirmar entrega manualmente | 1 (manual) / 4–5 (via claim WhatsApp) |
| 22 | Desbloquear tarefa dependente automaticamente | 1 (ao completar) / 2 (recalc. prazo relativo) |
| 23 | Receber resumo da situação | 4–5 |
| 24 | Consultar histórico de ações | 1 (base) / 3–5 (conversa + IA + extensão) |

### 7.3 Depois do MVP (FASE 6–7)

Hardening (E2E, segurança, backup, deploy). Enhancements: quick capture, import, templates de matriz, analytics, `trigger_type` data-de-marco (I6).

---

## 8. Glossário

Termos de código/schema em inglês; UI em português (A3).

| Termo | Significado |
|---|---|
| **Matrix / Matriz** | Contêiner nomeado de demandas (ex.: “OD Academy”, “Matriz Geral”). Tem `type`, não duplica tarefas. |
| **Tipo de matriz (`type`)** | String controlada: `GENERAL`, `PROJECT`, `COURSE`, `PRODUCT`, `EVENT`, `OTHER`, extensível por configuração. **Não** é ENUM rígido de banco (A18). |
| **Tipo `GENERAL`** | Um valor de `type`. A instância “Matriz Geral” é uma matriz cujo tipo *pode* ser `GENERAL`. |
| **Visão Matrizes** | Lista das matrizes (ativas por padrão). |
| **Visão Geral** | Consulta agregada de tarefas de **todas** as matrizes ativas (filtro para incluir arquivadas). **Não duplica** linhas. **Não é** o tipo `GENERAL` (A17, A18, I7). |
| **Task / Tarefa / Demanda** | Unidade de trabalho dentro de uma matriz. Uma linha da tabela. |
| **`sequence_number`** | Inteiro incremental **por matriz**, imutável após criação. Ordem de **cadastro**. Não é prioridade. Não gera dependência (A11, I2). |
| **`display_order`** | Ordem de **exibição** editável depois, com audit. A coluna “Ordem” da UI mostra `sequence_number` por padrão e pode ser reordenada por `display_order` (A11). |
| **Responsible / Responsável** | Pessoa (ou papel institucional) reutilizável, com WhatsApp. Não é user do sistema. |
| **`task_responsibles`** | N:N. Uma tarefa tem um ou mais responsáveis. Sem “primário” no MVP (A20). |
| **Dependência** | Relação explícita em `task_dependencies`. Só existe se cadastrada. Múltiplos pré-requisitos = **AND**. Ciclo e auto-dependência proibidos (A12). |
| **Pré-requisito (UI)** | Projeção das dependências da tarefa. Nunca texto solto como fonte da verdade. |
| **DeadlineRule / regra de prazo** | Estrutura tipada (`FIXED_DATE`, `BUSINESS_DAYS_AFTER_CREATION`, `BUSINESS_DAYS_AFTER_DEPENDENCY`, `CALENDAR_DAYS_AFTER_TRIGGER`, `RECURRING_BUSINESS_DAY`, `MANUAL`). Texto amigável é gerado, não armazenado como regra. |
| **`original_due_date`** | Primeiro prazo vigente materializado. Preservado para histórico (A28). |
| **`calculated_due_date` / prazo vigente** | Prazo atual. Só muda por: cálculo inicial, trigger de dependência (tipos relativos), aprovação de prorrogação, edição humana da regra. **FIXED_DATE não é recalculado** só porque uma dependência concluiu (A28, I3). |
| **Deadline occurrence** | Período de uma tarefa **recorrente**. UMA task, várias ocorrências; não clonar linhas por mês (A16). |
| **Business Calendar** | Calendário de dias úteis: seg–sex, menos feriados do calendário da regra (A21, A22). Locale `pt-BR`, timezone padrão `America/Sao_Paulo` (A2). |
| **Status operacional** | Estado persistido: `PENDING`, `IN_PROGRESS`, `BLOCKED`, `WAITING_FOR_INPUT`, `WAITING_FOR_VALIDATION`, `COMPLETED`, `CANCELLED`. |
| **Status de prazo** | Sempre **calculado** (cache opcional, nunca fonte da verdade): `WAITING_FOR_TRIGGER`, `ON_TIME`, `DUE_SOON`, `DUE_TODAY`, `OVERDUE`, `NOT_APPLICABLE` (I4). |
| **`NOT_APPLICABLE` (prazo)** | Status de prazo quando o operacional é `COMPLETED` ou `CANCELLED`. Evita colidir “COMPLETED operacional” com “COMPLETED de prazo” (I4). |
| **`WAITING_FOR_TRIGGER`** | Prazo ainda não materializado (ex.: esperando predecessora). Não se cobra o responsável (A26). |
| **`WAITING_FOR_INPUT`** | Estado **da tarefa** quando falta dado/decisão no domínio da demanda. Não é a inbox (I9). |
| **Inbox / Central de triagem / Caixa de entrada** | Fila de **exceções do administrador**. Pode coexistir com `WAITING_FOR_INPUT` na tarefa (I9). |
| **Status de prorrogação** | Persistido na extensão/tarefa: `NONE`, `REQUESTED`, `APPROVED`, `REJECTED`. |
| **DeadlineExtension** | Pedido/histórico de prorrogação. IA cria pedido; humano aprova/ajusta/rejeita. |
| **Observações (coluna)** | **Projeção** amigável: status + prazo + prorrogações + notas manuais. Não é um blob de lógica (A27). |
| **`task_notes`** | Anotações livres manuais, além da projeção. |
| **`active` da matriz** | Derivado: `archived_at IS NULL`. Não é fonte da verdade (A10, I1). |
| **User** | Conta logada (`ADMIN` / `OPERATOR`). Distinto de Responsible. |
| **NotificationRule** | Regra configurável de quando lembrar (D-3, D-1, D0, D+1, etc.). |
| **NotificationTarget** | Destino configurável (sócios, admin): in-app, WhatsApp individual, e-mail futuro, grupo se/quando autorizado (A24, A30). |
| **Digest** | Uma mensagem agrupando 2+ lembretes do mesmo responsável no mesmo dia (A25). |
| **Conversation / Message** | Thread e mensagens WhatsApp persistidas (webhook antes de processar). |
| **Classificação IA** | JSON estruturado validado. Não muta domínio (A15). |
| **Outbox** | Persistência transacional do efeito colateral (A23, I8). |
| **pg-boss** | Poller/worker que processa a outbox e jobs (A23, I8). Não substitui a outbox. |
| **Prioridade de atenção** | Ordenação operacional do dashboard (“olhe isto primeiro”). **Não** é `sequence_number`. |
| **Human-in-the-loop** | Qualquer mutação sensível passa por humano. |

---

## 9. Princípios de qualidade (seção 50)

Toda decisão de produto neste brief e na spec funcional precisa responder **SIM**:

| Pergunta | Como o produto garante |
|---|---|
| Reduz trabalho operacional real? | Admin só age na inbox e nas criações; lembretes e cálculos são automáticos. |
| É auditável? | Toda mutação gera audit log (quem, quando, antes, depois, origem). |
| Evita ação indevida da IA? | IA não muta domínio (A15). Confiança baixa → humano. |
| Funciona se a IA cair? | Mensagem persiste; item “pendente de classificação”; prazos intactos (A8, A32). |
| Funciona se o WhatsApp cair? | App web opera; outbox retenta; falha vira item de inbox (A32). |
| Explica por que o prazo foi calculado? | `DeadlineRule` estruturada + calendário + histórico de extensões; UI mostra regra e datas original/vigente. |
| Explica por que a mensagem foi enviada? | `notification_events` + regra + `correlation_id` (A31). |
| Suporta múltiplos responsáveis? | N:N; digest por pessoa; template renderizado por destinatário (A20, I5). |
| Suporta dependências? | Grafo explícito, AND, ciclo bloqueado, visual de bloqueio (A12). |
| Suporta prorrogações históricas? | Entidade própria; contador; comunicação gerada na aprovação (não no pedido). |
| Rodável e testável localmente? | Docker Compose; túnel só para webhook; sem serviço pago obrigatório no dev. |

Se alguma resposta for NÃO, a solução está errada — não “fica para depois” no domínio crítico.

---

## 10. O que o sistema NÃO faz

Lista normativa (produto). Complementa a seção 47 do PROMPT.

1. **Não** é um chatbot autônomo que conversa indefinidamente com responsáveis.
2. **Não** deixa a IA alterar prazo, responsável, dependências, status final ou exclusão.
3. **Não** marca tarefa como `COMPLETED` porque alguém disse “já enviei” / “já fiz” / “está pronto”.
4. **Não** infere dependência pela ordem (`#3` não depende de `#2` só por ser o próximo número).
5. **Não** usa Word, planilha ou texto livre como fonte da verdade de prazo ou pré-requisito.
6. **Não** usa IA para calcular dias úteis, atraso, feriado ou ciclo de grafo.
7. **Não** cobra tarefa `COMPLETED`, `CANCELLED`, `WAITING_FOR_TRIGGER`, nem bloqueada como se o atraso fosse culpa do responsável (A26).
8. **Não** envia o mesmo tipo de lembrete duas vezes nem uma rajada por tarefa no mesmo dia (digest).
9. **Não** depende de grupo de WhatsApp para funcionar (A24).
10. **Não** cadastra demanda por linguagem natural sem preview + confirmação (e isso nem está no MVP).
11. **Não** duplica tarefas para montar a visão Geral.
12. **Não** trata `sequence_number` como prioridade.
13. **Não** recalcula `FIXED_DATE` quando uma dependência conclui (I3, A28).
14. **Não** esconde alterações feitas por automação.
15. **Não** torna a IA ponto único de falha para dados ou prazos.
16. **Não** implementa WhatsApp na FASE 1 — o DoD 48 descreve o MVP completo, não o primeiro slice (I10, A33).

---

## 11. Inconsistências do PROMPT tratadas neste brief

| ID | Inconsistência | Resolução de produto |
|---|---|---|
| I1 | `active` + `archived_at` | `archived_at` é a verdade; `active` é derivado (A10). UI: “Arquivada” / “Ativa”. |
| I2 | Ordem vs sequência vs edição | Coluna “Ordem” = `sequence_number`; reordenação visual = `display_order` auditado (A11). |
| I3 | Recalcular datas ao concluir dependência | Só regras relativas ao trigger; `FIXED_DATE` permanece (A28). |
| I4 | Status de prazo `COMPLETED` vs operacional | Prazo calculado usa `NOT_APPLICABLE` se operacional é `COMPLETED`/`CANCELLED`. |
| I5 | Template `{{nome}}` vs N responsáveis | Uma renderização por destinatário; digest também é por pessoa. |
| I6 | “Definição da data da live” ≠ conclusão | MVP: trigger = `COMPLETED` da tarefa gatilho. Limitação explícita; marco de data = FASE 7. |
| I7 | Visão Geral vs tipo `GENERAL` | Nomes distintos na UI: “Visão Geral” (agregado) vs tipo “Geral”. |
| I8 | Outbox vs pg-boss | Conceito de produto: “envio confiável”. Outbox guarda o efeito; worker entrega. |
| I9 | `WAITING_FOR_INPUT` vs inbox | Podem coexistir: a tarefa espera input; o admin vê um item na inbox. |
| I10 | DoD com WhatsApp vs FASE 1 sem | FASE 1 ≠ MVP. Ver seção 7. |

---

## 12. Perguntas bloqueantes (não inventar resposta)

Registradas para o integrator (`docs/11-open-questions.md`). O produto segue as assumptions indicadas até decisão explícita do dono:

- **Q1.** Auth no dia 1: só um `ADMIN` ou já múltiplos `OPERATOR`s? *Trabalho: modelo com os dois papéis; UI FASE 1 pode ser ADMIN-only.*
- **Q2.** Já existe WABA / número na Meta Cloud API, ou setup greenfield? *Não bloqueia spec de produto web; bloqueia go-live WhatsApp.*
- **Q3.** Recorrência mensal: ao “concluir” o mês, a tarefa volta a `PENDING` no próximo período automaticamente? *Assumption de trabalho: A16 — sim, registra ocorrência e abre o próximo período.*
- **Q4.** Sócios: quais pessoas/canais recebem prorrogação aprovada no seed? *A30 — lista configurável; seed vazio ou só o admin até Q4.*
- **Q5.** Vários responsáveis: um “entreguei” valida a tarefa inteira? *Assumption de trabalho: a tarefa é una; um claim abre `WAITING_FOR_VALIDATION` da tarefa toda.*

Nenhuma dessas perguntas impede arquitetura, modelo de domínio ou esta spec. Impedem apenas seed, permissões finas e copy de onboarding.

---

## 13. Critério de sucesso (produto)

O dono usa a aplicação no lugar do Word como fonte oficial.

Ele cria matriz e demandas, aponta responsáveis e regras de prazo, e passa a trabalhar por **exceções** (dashboard + inbox), não por caça manual em arquivos e conversas.

O histórico de cada demanda explica, sem adivinhação: qual era o prazo, por que mudou, quem cobrou, o que o responsável disse, o que a IA sugeriu, e o que o humano decidiu.
