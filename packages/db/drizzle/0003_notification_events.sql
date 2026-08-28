-- Registro de lembretes (docs/06-whatsapp-integration.md §6.2, §7).
-- Serve o envio assistido por click-to-chat (ADR-008) e, depois, a outbox da Cloud API.
create table if not exists notification_events (
  id uuid primary key,
  dedupe_key text not null,
  channel text not null default 'WHATSAPP_ASSISTED',
  kind text not null,
  result text not null,
  task_id uuid references tasks(id) on delete set null,
  responsible_id uuid references responsibles(id) on delete set null,
  message_body text,
  sent_on date not null,
  sent_at timestamptz not null default now(),
  sent_by uuid references users(id),
  correlation_id uuid not null,
  created_at timestamptz not null default now()
);

-- §7.1: mesma tarefa + responsável + dia não dispara duas vezes.
create unique index if not exists notification_events_dedupe_uq
  on notification_events (dedupe_key)
  where result in ('SENT', 'QUEUED');

create index if not exists notification_events_day_idx
  on notification_events (sent_on, responsible_id);

create index if not exists notification_events_task_idx
  on notification_events (task_id, sent_on);
