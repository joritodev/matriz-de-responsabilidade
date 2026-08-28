# Matriz de Responsabilidade

Aplicação interna para centralizar matrizes de responsabilidade hoje mantidas em Word: demandas, prazos, dependências, acompanhamento e triagem humana.

**`PROMPT.md` é a lei do desenvolvimento.**

## Estado atual

**FASE 1 — Core (sem WhatsApp, sem IA).** Spec da FASE 0 em [`docs/`](./docs/README.md).

```bash
cp .env.example .env
docker compose up --build
# http://localhost:3000
# login: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD do .env
```

Atalho de desenvolvimento (Postgres precisa estar no ar, Compose ou local):

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev          # web :3000
npm run dev:worker   # health :3001
npm test
```

Dados de demonstração (opcional): `npm run db:seed-demo`

Flags: `WHATSAPP_ENABLED=false`, `AI_ENABLED=false`. Transportes não oficiais de WhatsApp estão rejeitados (ADR-007).

## Agentes

Ver [`AGENTS.md`](./AGENTS.md).

- Sub-agents: modo auto do Cursor (`model: inherit`).
- **Graphify** é skill de primeira classe: [`docs/13-graphify.md`](./docs/13-graphify.md), grafo em `graphify-out/`. Origem: [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify).
