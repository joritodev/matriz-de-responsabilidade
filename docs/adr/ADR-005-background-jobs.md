# ADR-005 — pg-boss + outbox transacional (sem Redis no MVP)

Status: Aceito (FASE 0)

## Contexto

Há trabalho que não pode viver no request HTTP: tick de prazos, planejamento de lembretes, envio WhatsApp, classificação OpenAI, retries, digest. O PROMPT §27 prefere solução **baseada em PostgreSQL** (pg-boss ou equivalente) para não adicionar Redis ao MVP. §30 exige transactional outbox para não chamar API externa na transação crítica. A23/I8 separam os dois mecanismos: outbox é o registro do efeito; pg-boss é o poller.

Sistema interno, um worker, volume baixo (dezenas/centenas de tarefas, não milhões de jobs/s). Redis + BullMQ são excelentes em escala e péssimos como segundo SPOF, segunda imagem, segundo backup e segunda forma de “por que o lembrete não saiu?”.

## Decisão

1. **Fila do MVP = pg-boss** rodando **no mesmo PostgreSQL** da aplicação, processo **`apps/worker` separado** de `apps/web`.
2. **Outbox transacional própria** (`outbox_messages`), gravada no **mesmo COMMIT** que a mutação de domínio + `audit_logs`. Eventos de domínio são emitidos **in-process** (sem tabela `domain_events`). A outbox guarda o **efeito** (SendWhatsAppTemplate, ClassifyInboundMessage, …), não substitui o fato já persistido nas tabelas de negócio.
3. **Fluxo canônico:** transação persiste fato + outbox → COMMIT → pg-boss acorda o worker (ou o worker faz poll curto) → adapter → marca `sent` / `retry` / `failed`. Detalhe em `docs/05-architecture.md` §8.
4. **Uma instância de worker no MVP.** pg-boss / `SELECT FOR UPDATE SKIP LOCKED` evitam double-dispatch. Idempotência de negócio em `notification_events` (chave natural do lembrete) e `provider_message_id` no inbound.
5. **Redis e BullMQ ficam explicitamente fora** até existir evidência de fila, latência ou multi-worker que o Postgres não aguente. Se um dia vierem, **a outbox permanece no Postgres** — só o transporte do poller muda.
6. **Scheduler de prazo** é job recorrente no worker (`deadline-tick`), não cron do sistema operacional como única fonte, e **não** é a IA.
7. **Falha permanente** (retries esgotados) vira item de inbox “automação com erro”, nunca um retry infinito contra a Meta.

## Consequências

- Um único backup (Postgres) preserva dados **e** jobs pendentes.
- Local: `docker compose up` já inclui o worker; não há container Redis para esquecer de subir.
- Operação investiga lembrete perdido com SQL: outbox + notification_events + correlation_id.
- pg-boss não é tão rico quanto BullMQ (dashboards, rate limit fino, delayed jobs sofisticados). Para o volume interno, basta. Delayed/retry são campos da outbox (`available_at`, `attempts`).
- Web e worker compartilham schema: versionar migrations com disciplina (ADR-002).
- HTTP do webhook devolve 200 após persistir; classificação pesada não estoura timeout da Meta.

## Alternativas rejeitadas

| Alternativa | Por que não |
|---|---|
| Redis + BullMQ / Bull no MVP | Segundo runtime e segundo SPOF sem necessidade (PROMPT §27, §47, A6). |
| Chamar Meta/OpenAI dentro da transação HTTP | Mensagem órfã ou domínio commitado sem efeito (PROMPT §30). |
| Só pg-boss, sem tabela outbox | Job “na memória da lib” pode ser enfileirado **depois** do commit e se perder no crash entre COMMIT e `boss.send`. Outbox primeiro; pg-boss é o despertador. |
| Só outbox com poll `SELECT` no próprio `apps/web` | UI e scheduler no mesmo processo; crash da página mata o tick. Worker separado é requisito. |
| RabbitMQ / Kafka / SQS como barramento de domínio | Enterprise demais; evento interno já está no Postgres. |
| Cron do host (`crontab`) como motor de prazo | Duas verdades; difícil de testar no Compose; fuso `America/Sao_Paulo` fica implícito. Cron pode **acordar** o tick, não **ser** a regra. |
| Serverless queues (Cloud Tasks, Lambda + SQS) no MVP | Foge do local-first (ADR-001) e do “um Compose = ambiente de verdade”. |
| Múltiplos microserviços “notification-service”, “ai-service” | Proibido (§47). Packages + um worker. |
