# Matriz de Responsabilidade

Aplicação interna para centralizar matrizes de responsabilidade hoje mantidas em Word: demandas, prazos, dependências, acompanhamento e triagem humana.

**`PROMPT.md` é a lei do desenvolvimento.** Não implementar código de produção antes da aprovação explícita da FASE 0.

## Estado atual

**FASE 0 — especificação.** Documentação em [`docs/`](./docs/README.md).

Perguntas Q1–Q5 respondidas. Cloud API / WABA **não** é pré-requisito da FASE 1: ver [`docs/runbooks/whatsapp-waba-brasil.md`](./docs/runbooks/whatsapp-waba-brasil.md).

Próximo passo: você dizer **pode implementar** → FASE 1 (core local, um ADMIN, sem WhatsApp automático).

## Agentes

Ver [`AGENTS.md`](./AGENTS.md).

- Sub-agents: modo auto do Cursor (`model: inherit`).
- **Graphify** é skill de primeira classe: [`docs/13-graphify.md`](./docs/13-graphify.md), grafo em `graphify-out/`. Origem: [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify).
