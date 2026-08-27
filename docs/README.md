# Documentação — Matriz de Responsabilidade

`PROMPT.md` (raiz do repositório) é a **lei** do desenvolvimento. Esta pasta é a FASE 0: especificação, sem código de produção.

## Ordem de leitura

1. [00-product-brief.md](./00-product-brief.md) — visão, problema, não-objetivos
2. [01-functional-spec.md](./01-functional-spec.md) — casos de uso, regras, aceite
3. [assumptions.md](./assumptions.md) — A1–A36 e inconsistências I1–I10
4. [02-domain-model.md](./02-domain-model.md) — modelo relacional
5. [03-state-machines.md](./03-state-machines.md) — status operacional, prazo, prorrogação
6. [04-deadline-engine.md](./04-deadline-engine.md) — dias úteis, tipos de prazo
7. [05-architecture.md](./05-architecture.md) — monorepo, outbox, worker
8. [06-whatsapp-integration.md](./06-whatsapp-integration.md) — Cloud API, templates, webhook
9. [07-ai-triage.md](./07-ai-triage.md) — Structured Outputs, HITL
10. [08-security.md](./08-security.md) — ameaças, LGPD, authZ
11. [09-test-plan.md](./09-test-plan.md) — TDD e casos A–G
12. [10-roadmap.md](./10-roadmap.md) — fatias verticais
13. [11-open-questions.md](./11-open-questions.md) — as 5 perguntas ao dono
14. [12-ux-spec.md](./12-ux-spec.md) — telas e comportamento

## ADRs

- [ADR-001](./adr/ADR-001-web-local-first.md) — Compose como ambiente de verdade
- [ADR-002](./adr/ADR-002-postgresql.md) — PostgreSQL + Drizzle
- [ADR-003](./adr/ADR-003-whatsapp-cloud-api.md) — Meta Cloud API
- [ADR-004](./adr/ADR-004-human-in-the-loop.md) — humano decide
- [ADR-005](./adr/ADR-005-background-jobs.md) — pg-boss + outbox
- [ADR-006](./adr/ADR-006-ai-structured-output.md) — Responses API + Zod

## Runbooks

- [local-dev.md](./runbooks/local-dev.md) — como a FASE 1 deve subir (ainda não há compose real)

## Gate

FASE 1 (código) **só** após aprovação explícita desta FASE 0.
