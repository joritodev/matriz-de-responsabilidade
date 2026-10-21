-- Prazo: esquema inicial
-- Aplicar com: supabase db push (ou colar no SQL Editor do Supabase)
-- Todo acesso aos dados passa pela API NestJS (conexão Postgres direta).
-- O navegador usa o Supabase só para login; RLS ligado e sem políticas bloqueia a API REST pública.

-- ---------- tipos ----------
create type public.task_status as enum ('pending', 'done', 'canceled');
create type public.reminder_channel as enum ('whatsapp', 'email');
create type public.channel_preference as enum ('whatsapp', 'email', 'both');
create type public.reminder_kind as enum ('early', 'due');
create type public.batch_status as enum ('queued', 'sent', 'failed');
create type public.folder_color as enum ('lilac', 'mint', 'peach', 'lemon', 'sky', 'rose', 'sand', 'sage');
create type public.member_role as enum ('admin', 'editor', 'viewer');
create type public.due_change_kind as enum ('extension', 'correction');
create type public.holiday_kind as enum ('nacional', 'ponto_facultativo', 'local');

-- ---------- utilitário ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------- quem pode entrar ----------
create table public.members (
  email text primary key check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.member_role not null default 'editor',
  created_at timestamptz not null default now()
);

-- ---------- matrizes (pastas) ----------
create table public.matrices (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  color public.folder_color not null default 'lilac',
  description text,
  position integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index matrices_name_active_key on public.matrices (lower(name)) where not is_archived;
create trigger matrices_updated_at before update on public.matrices for each row execute function public.set_updated_at();

-- ---------- responsáveis ----------
create table public.assignees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) > 0),
  whatsapp_e164 text check (whatsapp_e164 ~ '^[1-9][0-9]{9,14}$'),
  email text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  reminder_channel public.channel_preference not null default 'whatsapp',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignees_contact_for_channel check (
    (reminder_channel = 'whatsapp' and whatsapp_e164 is not null)
    or (reminder_channel = 'email' and email is not null)
    or (reminder_channel = 'both' and whatsapp_e164 is not null and email is not null)
  )
);
create trigger assignees_updated_at before update on public.assignees for each row execute function public.set_updated_at();

-- ---------- demandas ----------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  matrix_id uuid not null references public.matrices (id) on delete restrict,
  position integer not null check (position > 0),
  assignee_id uuid not null references public.assignees (id) on delete restrict,
  title text not null check (length(trim(title)) > 0),
  due_date date not null,
  prerequisite_task_id uuid references public.tasks (id) on delete set null,
  prerequisite_note text,
  has_prerequisite boolean generated always as (prerequisite_task_id is not null or prerequisite_note is not null) stored,
  status public.task_status not null default 'pending',
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_position_per_matrix unique (matrix_id, position) deferrable initially deferred,
  constraint tasks_completed_at_matches_status check ((status = 'done') = (completed_at is not null)),
  constraint tasks_prerequisite_not_self check (prerequisite_task_id is null or prerequisite_task_id <> id)
);
create index tasks_open_by_due on public.tasks (due_date) where status = 'pending';
create index tasks_assignee on public.tasks (assignee_id);
create trigger tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();

-- ---------- prorrogações e correções de prazo ----------
create table public.task_due_date_changes (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  kind public.due_change_kind not null default 'extension',
  previous_due_date date not null,
  new_due_date date not null,
  reason text,
  approved_by text,
  changed_by_email text,
  created_at timestamptz not null default now(),
  constraint due_change_differs check (new_due_date <> previous_due_date),
  constraint due_change_extension_has_reason check (kind <> 'extension' or length(trim(coalesce(reason, ''))) >= 3)
);
create index task_due_date_changes_task on public.task_due_date_changes (task_id, created_at desc);

-- ---------- feriados (dias não úteis para a cobrança) ----------
create table public.holidays (
  date date primary key,
  name text not null,
  kind public.holiday_kind not null default 'nacional'
);

-- ---------- cobranças ----------
create table public.reminder_batches (
  id uuid primary key default gen_random_uuid(),
  assignee_id uuid not null references public.assignees (id) on delete restrict,
  channel public.reminder_channel not null,
  recipient text not null,
  sent_on date not null,
  status public.batch_status not null default 'queued',
  subject text,
  message_body text not null,
  provider_message_id text,
  error_message text,
  make_execution_id text,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint reminder_batches_id_channel unique (id, channel),
  constraint reminder_batches_failed_has_error check (status <> 'failed' or error_message is not null)
);
create index reminder_batches_by_day on public.reminder_batches (sent_on desc, created_at desc);

create table public.reminder_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null,
  channel public.reminder_channel not null,
  task_id uuid not null references public.tasks (id) on delete cascade,
  kind public.reminder_kind not null,
  due_date_snapshot date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint reminder_items_batch_fk foreign key (batch_id, channel)
    references public.reminder_batches (id, channel) on delete cascade
);
-- A trava: a mesma cobrança (demanda, tipo, prazo, canal) só pode ter uma reserva ativa.
create unique index reminder_items_once on public.reminder_batch_items (task_id, kind, due_date_snapshot, channel) where is_active;
create index reminder_items_batch on public.reminder_batch_items (batch_id);

-- Status só sai de queued uma vez; falha libera as reservas para nova tentativa.
create or replace function public.reminder_batches_status_guard() returns trigger
language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if old.status <> 'queued' then
      raise exception 'Cobrança % já finalizada como %', old.id, old.status using errcode = 'check_violation';
    end if;
    if new.status = 'failed' then
      update public.reminder_batch_items set is_active = false where batch_id = new.id;
    end if;
    if new.finished_at is null then
      new.finished_at := now();
    end if;
  end if;
  return new;
end $$;
create trigger reminder_batches_status before update on public.reminder_batches
  for each row execute function public.reminder_batches_status_guard();

-- ---------- segurança ----------
alter table public.members enable row level security;
alter table public.matrices enable row level security;
alter table public.assignees enable row level security;
alter table public.tasks enable row level security;
alter table public.task_due_date_changes enable row level security;
alter table public.holidays enable row level security;
alter table public.reminder_batches enable row level security;
alter table public.reminder_batch_items enable row level security;
-- Sem políticas de propósito: anon e authenticated não leem nada pela API REST do Supabase.

-- ---------- feriados nacionais (confira feriados locais e pontos facultativos da instituição) ----------
insert into public.holidays (date, name, kind) values
  ('2026-10-12', 'Nossa Senhora Aparecida', 'nacional'),
  ('2026-11-02', 'Finados', 'nacional'),
  ('2026-11-15', 'Proclamação da República', 'nacional'),
  ('2026-11-20', 'Dia Nacional de Zumbi e da Consciência Negra', 'nacional'),
  ('2026-12-25', 'Natal', 'nacional'),
  ('2027-01-01', 'Confraternização Universal', 'nacional'),
  ('2027-02-08', 'Carnaval', 'ponto_facultativo'),
  ('2027-02-09', 'Carnaval', 'ponto_facultativo'),
  ('2027-03-26', 'Sexta-feira Santa', 'nacional'),
  ('2027-04-21', 'Tiradentes', 'nacional'),
  ('2027-05-01', 'Dia do Trabalho', 'nacional'),
  ('2027-05-27', 'Corpus Christi', 'ponto_facultativo'),
  ('2027-09-07', 'Independência do Brasil', 'nacional'),
  ('2027-10-12', 'Nossa Senhora Aparecida', 'nacional'),
  ('2027-11-02', 'Finados', 'nacional'),
  ('2027-11-15', 'Proclamação da República', 'nacional'),
  ('2027-11-20', 'Dia Nacional de Zumbi e da Consciência Negra', 'nacional'),
  ('2027-12-25', 'Natal', 'nacional');
