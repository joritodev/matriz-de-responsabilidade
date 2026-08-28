-- Prorrogações (docs/02-domain-model.md §3.11, FASE 5)
create table if not exists deadline_extensions (
  id uuid primary key,
  task_id uuid not null references tasks(id) on delete cascade,
  occurrence_id uuid references deadline_occurrences(id) on delete set null,
  previous_due_date date,
  requested_due_date date,
  approved_due_date date,
  requested_by_user_id uuid references users(id),
  requested_by_responsible_id uuid references responsibles(id),
  reason text,
  request_source text not null,
  inbox_item_id uuid references inbox_items(id) on delete set null,
  requested_at timestamptz not null default now(),
  approved_by uuid references users(id),
  approved_at timestamptz,
  rejected_by uuid references users(id),
  rejected_at timestamptz,
  status text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deadline_extensions_status_check check (status in ('REQUESTED', 'APPROVED', 'REJECTED')),
  constraint deadline_extensions_source_check check (request_source in ('USER', 'WHATSAPP', 'SYSTEM'))
);

create unique index if not exists deadline_extensions_open_uq
  on deadline_extensions (task_id)
  where status = 'REQUESTED';

create index if not exists deadline_extensions_task_requested_idx
  on deadline_extensions (task_id, requested_at desc);

create index if not exists deadline_extensions_status_idx
  on deadline_extensions (status)
  where status = 'REQUESTED';
