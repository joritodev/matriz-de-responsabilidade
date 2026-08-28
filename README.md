# Matriz de Responsabilidade

Aplicação interna para centralizar matrizes de responsabilidade hoje mantidas em Word: demandas, prazos, dependências, acompanhamento e triagem humana.

**`PROMPT.md` é a lei do desenvolvimento.**

## Estado atual

**MVP funcional** — Fases 1–2 e 5 (prorrogações). WhatsApp automático e IA **adiados**; envio assistido via `wa.me`.

| Fluxo | Rota |
|-------|------|
| Dashboard e fila de atenção | `/` |
| Caixa de entrada (prorrogações, validações, prazos) | `/inbox` |
| Validar datas com responsáveis (copy-ready) | `/validate-dates` |
| Lembretes diários assistidos | `/reminders` |
| Matrizes e tarefas | `/matrices` |
| Visão geral com filtros | `/overview` |
| Histórico de prorrogações | `/extensions` |

```bash
cp .env.example .env
docker compose up --build
# http://localhost:3000
# login: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD do .env
```

Desenvolvimento local (Postgres no ar — `docker compose up postgres -d` ou instalação local):

```bash
npm install
npm run db:migrate
npm run db:seed
npm run db:seed-pdf    # matrizes do PDF (opcional)
npm run dev:all        # web :3000 + worker deadline-tick
npm test
```

Rotina diária: **Validar datas** (se prazos chegando) → **Lembretes de hoje** → marcar como enviado. Inbox para prorrogações e confirmação de entrega.

Flags: `WHATSAPP_ENABLED=false`, `AI_ENABLED=false`. Transportes não oficiais de WhatsApp estão rejeitados (ADR-007). WABA: `docs/runbooks/waba-mei-passo-a-passo.md` (quando quiser ligar automação).

## Agentes

Ver [`AGENTS.md`](./AGENTS.md).

- Sub-agents: modo auto do Cursor (`model: inherit`).
- **Graphify**: [`docs/13-graphify.md`](./docs/13-graphify.md), grafo em `graphify-out/`.
