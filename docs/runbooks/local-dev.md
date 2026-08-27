# Runbook — desenvolvimento local

Este runbook descreve o **contrato** do ambiente. Os arquivos Compose/Dockerfile nascem na FASE 1 (Slice 1.1). Não há código de produção nesta FASE 0.

## O que `docker compose up` deve subir

| Serviço | Porta no host | Health |
|---------|---------------|--------|
| `postgres` | 5432 (localhost) | `pg_isready` |
| `web` | 3000 | `GET /api/health` |
| `worker` | health interno 3001, não público | DB + schema pg-boss |

Não sobe: Redis, Kubernetes, túnel WhatsApp, OpenAI obrigatório.

## Flags

- `WHATSAPP_ENABLED=false` e `AI_ENABLED=false` na FASE 1.
- Túnel HTTPS: perfil separado `whatsapp-tunnel`, só FASE 3+. Documentação de túnel **não** entra no `up` default.

## ENV (conceitual)

Obrigatórias no boot (Zod em `packages/config`): `DATABASE_URL`, `APP_URL`, `TZ`, `SESSION_SECRET`, `NODE_ENV`, `PROCESS_ROLE` (`web` \| `worker`), `LOG_LEVEL`.

Se `WHATSAPP_ENABLED=true`: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WABA_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`.

Se `AI_ENABLED=true`: `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_CONFIDENCE_THRESHOLD`, `AI_PROMPT_VERSION`.

Nunca commitar secrets. `.env` gitignored; `.env.example` só nomes.

Timezone de processo e Postgres: `America/Sao_Paulo` (A2). Divergência aqui gera prazo errado.

## Fluxo esperado na FASE 1

```bash
cp .env.example .env
docker compose up --build
# http://localhost:3000 — login do ADMIN seed
```

Migrations Drizzle aplicam **antes** de aceitar tráfego (lock no entrypoint para web e worker não migrarem em paralelo).

## Backups

Local: volume `postgres_data`. Dump manual aceitável. `compose down -v` apaga dados.

Produção (FASE 6): dump periódico + teste de restore. Dumps contêm PII (LGPD).

## Proibido

Redis “só um pouco”. Túnel como produção. Secrets no YAML. Postgres publicado em `0.0.0.0` em produção.
