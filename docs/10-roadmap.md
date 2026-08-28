# Roadmap — fatias verticais

**Versão:** 0.1 (FASE 0)  
**Lei:** `PROMPT.md` §§42, 45, 48  
**Assumptions:** `docs/assumptions.md`  
**Não fazer:** “criar todas as telas e depois conectar”. Cada fatia entrega persistência + UI + teste.

A FASE 1 **não** é o MVP completo. O Definition of Done da §48 só fecha ao terminar a **FASE 5**. A FASE 6 endurece. A FASE 7 é enhancement.

Nenhuma fatia abaixo começa sem aprovação explícita desta FASE 0.

---

## 1. Mapa fases × DoD (§48)

| # | Capacidade do DoD | Fase mínima |
|---|-------------------|-------------|
| 1 | Abrir a aplicação local | 1 |
| 2 | Cadastrar Matheus com WhatsApp | 1 (cadastro) / 3 (envio) |
| 3 | Criar matriz | 1 |
| 4 | Adicionar tarefas | 1 |
| 5 | Múltiplos responsáveis | 1 |
| 6 | Dependências | 1 |
| 7 | Prazo fixo | 1 |
| 8 | Prazo relativo em dias úteis | 2 |
| 9 | Recorrência (3º dia útil) | 2 |
| 10 | Visualizar demandas na matriz | 1 |
| 11 | Dashboard geral | 1 (cards básicos) / 2 (prazo calculado pleno) |
| 12 | Alertas de prazo | 2 (in-app) / 3 (WhatsApp) |
| 13 | Lembrete automático WhatsApp | 3 |
| 14 | Receber resposta | 3 |
| 15 | Armazenar resposta | 3 |
| 16 | Classificar resposta | 4 |
| 17 | Aviso de bloqueio | 4 |
| 18 | Aviso de pedido de prorrogação | 4–5 |
| 19 | Aprovar prorrogação manualmente | 5 |
| 20 | Consultar prorrogações anteriores | 5 |
| 21 | Confirmar entrega manualmente | 1 (status) / 4 (via claim WhatsApp) |
| 22 | Desbloquear dependente automaticamente | 1–2 |
| 23 | Resumo da situação | 4 |
| 24 | Consultar histórico de ações | 1 (audit) |

---

## 2. FASE 0 — Especificação (esta entrega)

Documentos em `docs/`. Sem código de produção. Gate: aprovação explícita do dono.

---

## 3. FASE 1 — Core (sem WhatsApp, sem IA)

Scaffold + domínio mínimo + tabela + dashboard. Cada slice é vertical.

### Slice 1.1 — Fundações

Monorepo (`apps/web`, `apps/worker`, `packages/*`), Docker Compose (`postgres`, `web`, `worker`), ENV Zod (`packages/config`), Pino, healthchecks, Drizzle + primeira migration, seed **um** `ADMIN` (Q1) + calendário vazio, login cookie httpOnly.

**Aceite:** `docker compose up` abre login em `http://localhost:3000`. Sem Meta. Sem OpenAI. `WHATSAPP_ENABLED=false`, `AI_ENABLED=false`.

**Teste:** boot valida ENV; health de postgres/web/worker.

### Slice 1.2 — Matrizes

CRUD de matriz (`name`, `description`, `type` string controlada), arquivar (`archived_at`), lista.

**Aceite:** criar “Matriz Geral”, “OD Academy”; listar; arquivar some do default.

**Teste:** unicidade de id; `active` derivado (A10).

### Slice 1.3 — Responsáveis

CRUD reutilizável: nome, papel texto livre, WhatsApp bruto + E.164, e-mail opcional, ativo, notas. Sem envio.

**Aceite:** cadastrar Matheus com número; reutilizar em tarefas depois.

**Teste:** E.164 normalizado; mascaramento em log.

### Slice 1.4 — Tarefas + prazo fixo + tabela da matriz

`Task` com `sequence_number` imutável, `display_order`, título, descrição, `FIXED_DATE` e `MANUAL`. Tela da matriz (TanStack): Ordem, Responsável, Tarefa, Prazo, Pré-requisito, Observações (projeção inicial).

**Aceite:** Caso A — demanda #1, prazo 28/08/2026, sem pré-requisito.

**Teste TDD:** `sequence_number` por matriz; FIXED_DATE materializa `original_due_date` = `current_due_date`.

### Slice 1.5 — N responsáveis

`task_responsibles`. Chips na tabela. Caso E (Giovanni + Francisco, uma linha).

**Teste:** N:N sem duplicar a tarefa.

### Slice 1.6 — Dependências

`task_dependencies`, rejeição de ciclo e auto-relação, coluna Pré-requisito, `BLOCKED` quando AND incompleto. Caso B.

**Teste TDD:** ciclo transitivo rejeitado; auto-dependência rejeitada; AND.

### Slice 1.7 — Detalhe, status operacional, validar entrega

Detalhe da tarefa + timeline. Transições `PENDING` / `IN_PROGRESS` / `BLOCKED` / `WAITING_FOR_VALIDATION` / `COMPLETED` / `CANCELLED`. ADMIN confirma entrega. Completar desbloqueia dependentes.

**Aceite:** marcar COMPLETED na predecessora libera a sucessora (ainda com prazo fixo neste slice).

**Teste TDD:** “já entreguei” via UI de claim (se houver) não vai a COMPLETED; só confirmação ADMIN.

### Slice 1.8 — Visão Geral + dashboard básico + audit

Query agregada (A17). Cards: vencem hoje, próximos, atrasadas, bloqueadas (com FIXED_DATE + calendário simples weekday, feriados ainda vazios). Audit log nas mutações. Prioridade de atenção ≠ `sequence_number`.

**Aceite:** DoD 1, 3–7, 10–11 (parcial), 21 (manual), 22 (dependência), 24.

**Fora desta fase:** dias úteis com feriado, relativo, recorrência, WhatsApp, IA, prorrogação.

---

## 4. FASE 2 — Deadline engine

### Slice 2.1 — Business Calendar

`business_calendars` + `holidays` + seed BR 2026–2028. Funções puras em `packages/core`. TDD obrigatório.

### Slice 2.2 — Dias úteis após criação / após dependência

`BUSINESS_DAYS_AFTER_CREATION`, `BUSINESS_DAYS_AFTER_DEPENDENCY`, `WAITING_FOR_TRIGGER`. Caso C. Trigger = `COMPLETED` validado (A29). `FIXED_DATE` não recalcula (A28).

### Slice 2.3 — Recorrência 3º dia útil

`RECURRING_BUSINESS_DAY` + `deadline_occurrences`. Caso D (fim de semana, feriado, mês começando sáb/dom). Completar período abre o próximo (A16 / Q3).

### Slice 2.4 — Scheduler e status de prazo

Worker `deadline-tick`. Status calculado: `ON_TIME`, `DUE_SOON`, `DUE_TODAY`, `OVERDUE`, `WAITING_FOR_TRIGGER`, `NOT_APPLICABLE`. Dashboard pleno. Alertas **in-app**. Explicação “por que esta data?”.

### Slice 2.5 — `CALENDAR_DAYS_AFTER_TRIGGER` preparado

Modelo e função; UI pode ocultar o tipo até haver caso real (G-31).

---

## 5. FASE 3 — WhatsApp

### Slice 3.1 — Provider + persist-first webhook

`WhatsAppProvider` + `MetaWhatsAppProvider`. GET challenge. POST: HMAC raw body, persistir `messages`, idempotência `wamid`, 200. Outbox. Fake provider nos testes.

### Slice 3.2 — Templates e regras

Templates `REMINDER_DUE_SOON` e `OVERDUE` (UTILITY). `NotificationRules` default D-3, D-1, D0, D+1. Opt-in. Anti-spam + digest (A25, A26).

### Slice 3.3 — Envio + status

Worker envia via outbox. `notification_events`. Falha → inbox “automação com erro”. Túnel só no perfil `whatsapp-tunnel`.

### Slice 3.4 — Inbound

Correlação responsável/tarefa. Conversa visível no detalhe (log, não chatbot). Sem IA ainda: mensagem aparece na inbox como “pendente de classificação” se `AI_ENABLED=false`.

**Aceite:** DoD 12 (WhatsApp), 13–15.

---

## 6. FASE 4 — AI triage + inbox

### Slice 4.1 — Structured Outputs

Zod + schema `responsibility-triage-output-v1`. Prompt `responsibility-triage-v1`. Modelo via `OPENAI_MODEL`. Fallback se IA cair.

### Slice 4.2 — Efeitos determinísticos pós-JSON

`CLAIMS_DELIVERED` → `WAITING_FOR_VALIDATION` (sistema, não LLM). `EXTENSION_REQUEST` cria pedido **sem** mudar prazo. Inbox.

### Slice 4.3 — Central de Pendências

Tela inbox: contexto, aprovar (ainda sem workflow completo de extensão — rascunho), responder (um disparo humano), adiar, resolver. Callout: “nenhuma alteração automática”.

### Slice 4.4 — Resumos ao admin

In-app; WhatsApp do admin via outbox se regra permitir. Texto deixa explícito quando o sistema **não** decidiu.

**Aceite:** DoD 16–18, 21 (via claim), 23. Casos F (parcial, pedido criado) e G.

---

## 7. FASE 5 — Prorrogações e escalação

### Slice 5.1 — Workflow `DeadlineExtension`

REQUESTED → ADMIN aprova / ajusta / rejeita. Histórico. Recalcula automações. Casos F completo.

### Slice 5.2 — Chefes (Q4)

Não há envio ao grupo via API. Inbox no `REQUESTED`: **copiar texto para o grupo dos chefes**. Depois da decisão humana no app: **copiar texto ao responsável** (aprovado ou recusado + “vamos reduzir o atraso”). WABA opcional só para o trecho do responsável.

### Slice 5.3 — Alertas admin WhatsApp

Pedidos e bloqueios críticos no WhatsApp do ADMIN, além da inbox.

**Aceite:** DoD 19–20. MVP funcional segundo §48.

---

## 8. FASE 6 — Hardening

E2E Playwright dos fluxos DoD (com fakes de Meta/OpenAI). Threat model residual. Rate limit. Backups + restore. Observabilidade. Runbook de produção (1 host, HTTPS, 2 processos, Postgres). Sem Kubernetes.

---

## 9. FASE 7 — Enhancements (não MVP)

Quick capture com preview obrigatório. Import CSV/XLSX/DOCX (draft + confirmação). Duplicar matriz como template. `trigger_type` marco de data (I6). Analytics. E-mail. Groups API só se a conta autorizar.

---

## 10. Ordem de TDD (obrigatório)

Antes de UI, nestes temas: dias úteis, feriados, prazo relativo, 3º dia útil, dependências/ciclos, bloqueio, vencido, prorrogação, idempotência, anti-spam de lembrete, webhook duplicado, transições de estado.

Frontend visual **não** é test-first dogmático. Domínio sim.

---

## 11. Gate entre fases

| De | Para | Precisa |
|----|------|---------|
| 0 → 1 | Aprovação explícita desta spec | Respostas Q1–Q5 preferíveis, não bloqueantes (assumptions cobrem) |
| 1 → 2 | Slice 1.4–1.7 verdes | Calendário pode nascer vazio no 1.8 |
| 2 → 3 | Motor de prazo testado | WABA/templates (Q2) — senão fake provider + flag |
| 3 → 4 | Webhook persist-first + idempotência | OpenAI opcional; fallback já especificado |
| 4 → 5 | Inbox + classificações | — |
| 5 → 6 | DoD §48 demonstrável localmente | — |

---

## 12. O que esta fase **não** entrega

Código de produção, Dockerfiles, migrations reais, templates Meta submetidos, conta OpenAI, CI. Isso começa na FASE 1 após o “pode implementar”.
