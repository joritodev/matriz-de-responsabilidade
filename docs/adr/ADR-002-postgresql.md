# ADR-002 — PostgreSQL + Drizzle ORM + migrations versionadas

Status: Aceito (FASE 0)

## Contexto

O domínio é relacional de verdade: matrizes, tarefas, N:N de responsáveis (A20), dependências com restrição de ciclo (A12), regras de prazo estruturadas, feriados, prorrogações históricas, conversas, classificações de IA, outbox, audit. Há concorrência futura (webhook + UI + worker no mesmo agregado). O PROMPT §26 e A4 já apontam PostgreSQL + Drizzle + migrations versionadas, inclusive localmente.

Além dos dados de negócio, o MVP usa o próprio Postgres como:

- fila de jobs (pg-boss, ADR-005);
- outbox transacional (A23);
- trilha de auditoria.

Trocar o banco entre local e produção invalidaria o motor de prazo, a idempotência do webhook e os testes da §43.

## Decisão

1. **PostgreSQL é o único banco do MVP**, local e produção. Versão estável pinada no Compose (linha 16.x). Sem SQLite, sem dual-write, sem “Word como backup oficial”.
2. **Drizzle ORM** em `packages/db`: schema TypeScript, queries, e **migrations versionadas** geradas e versionadas no git. Subir web/worker (ou um serviço `migrate`) aplica migrations **antes** de aceitar tráfego.
3. **Fonte de verdade = tabelas.** Status de prazo é calculado (A13), podendo haver cache com `computed_at`, nunca uma coluna mágica que a UI escreve. `active` de matriz é derivado de `archived_at` (A10).
4. **Código e schema em inglês** (`matrices`, `tasks`, `responsibles`, …); UI em português (A3). Tipos de matriz são string controlada + config extensível, **não** ENUM rígido de banco que exige migration para cada tipo novo (A18). Papel de responsável é texto livre (A19).
5. **Repositórios em `packages/db` não implementam regra.** “Pode criar esta dependência?” e “qual o due_date?” vivem em `packages/core`. O banco impõe o que for invariante física (PK, FK, UNIQUE de `provider_message_id`, UNIQUE `(matrix_id, sequence_number)`).
6. **Sem ORM paralelo** (Prisma, TypeORM) e sem query builder solto no `apps/web`.

Lista inicial de agregados (revisão fina é do subagent de domínio; arquitetura não inventa tabelas redundantes): users, sessions, responsibles, matrices, tasks, task_responsibles, task_dependencies, deadline_rules, deadline_occurrences, holidays, deadline_extensions, task_notes, conversations, messages, ai_classifications, notification_rules, notification_events, notification_targets, inbox_items, outbox_messages, domain_events, audit_logs, system_settings, mais o schema interno do pg-boss.

## Consequências

- Relacionamentos, transações (domínio + audit + outbox no mesmo COMMIT) e `SELECT FOR UPDATE SKIP LOCKED` funcionam nativamente.
- Local = produção em fidelidade de SQL. Testes de prazo, ciclo e idempotência rodam no mesmo motor.
- Custo operacional: precisa de Postgres no Compose e de backup em produção (DevOps). Aceito como único SPOF consciente (`docs/05-architecture.md` §13.4).
- Migrations são contrato: rebase/conflict de SQL exige disciplina; não se “edita production schema na mão”.
- JSONB é permitido para raw payload de webhook e para config de recorrência — não para substituir colunas de prazo ou dependência (PROMPT §47).

## Alternativas rejeitadas

| Alternativa | Por que não |
|---|---|
| SQLite | Sem o mesmo travamento, jobs e concorrência; produção divergiria. |
| MongoDB / documento único “matriz = JSON” | Dependências, N:N, audit e prazo relativo viram texto de novo — o problema que o produto existe para eliminar. |
| MySQL / MariaDB | Viável em tese; o PROMPT escolheu Postgres; pg-boss e JSONB + SKIP LOCKED são mais naturais lá. |
| Prisma | Maduro, mas A4/PROMPT §26 fixam Drizzle (migrations SQL explícitas, menor magia, encaixa no monorepo TS). |
| Schema só “push” sem arquivos de migration | Irreproduzível entre máquinas e ambientes; quebra auditoria de mudança estrutural. |
| Event store como fonte de verdade (event sourcing total) | Exagero para sistema interno; eventos append-only existem para audit/timeline, o estado atual é relacional. |
| Redis como banco de tarefas / sessão única | Redis está fora do MVP (ADR-005). Sessão vai para tabela `sessions` no Postgres. |
