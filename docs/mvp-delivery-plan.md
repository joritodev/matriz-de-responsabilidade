# Plano de entrega MVP — Fases 2 a 6

WhatsApp automático (FASE 3 Cloud API) e IA (FASE 4) **fora do escopo** desta entrega.
Envio assistido via `wa.me` cobre lembretes e validação de datas.

## PRs empilhados

| PR | Branch | Escopo |
|----|--------|--------|
| #4 | `feat/mvp-fase-2-3-deadline-reminders` | Motor de prazos, worker, inbox, lembretes assistidos (ADR-008) |
| #5 | `feat/mvp-fase-5-extensions` | Prorrogações, validação de entrega, validar datas, histórico |
| #6 | `feat/mvp-fase-6-tests-ci` | Testes expandidos, Playwright E2E, GitHub Actions |

## DoD §48 (sem WhatsApp auto / IA)

- [x] 1–11 Core e visualização
- [x] 12 Alertas in-app + worker
- [~] 13–16 WhatsApp auto / inbound / IA — adiado
- [x] 17–18 Bloqueios e prorrogações na inbox
- [x] 19–20 Aprovar prorrogação + histórico `/extensions`
- [x] 21 Confirmar entrega na inbox
- [x] 22 Desbloqueio automático ao concluir dependência
- [x] 23 Dashboard + digest diário
- [x] 24 Auditoria e timeline na tarefa

## Verificação local

```bash
docker compose up postgres -d
npm run db:migrate && npm run db:seed && npm run db:seed-pdf
npm test && npm run typecheck && npm run build -w @matriz/web
npm run dev:all
npm run test:e2e   # com Postgres no ar
```
