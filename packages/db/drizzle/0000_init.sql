-- FASE 1 initial schema
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  email citext NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  responsible_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'OPERATOR'))
);
CREATE UNIQUE INDEX users_email_uq ON users (email);
CREATE INDEX users_active_role_idx ON users (active, role);

CREATE TABLE sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX sessions_token_hash_uq ON sessions (token_hash);
CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE business_calendars (
  id uuid PRIMARY KEY,
  code text NOT NULL,
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  locale text NOT NULL DEFAULT 'pt-BR',
  weekend_days integer[] NOT NULL DEFAULT '{0,6}',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX business_calendars_code_uq ON business_calendars (code);
CREATE UNIQUE INDEX business_calendars_default_uq ON business_calendars (is_default) WHERE is_default = true;

CREATE TABLE holidays (
  id uuid PRIMARY KEY,
  calendar_id uuid NOT NULL REFERENCES business_calendars(id) ON DELETE CASCADE,
  observed_on date NOT NULL,
  name text NOT NULL,
  kind text NOT NULL,
  source text NOT NULL,
  year integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX holidays_calendar_day_uq ON holidays (calendar_id, observed_on);

CREATE TABLE matrices (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  description text,
  type text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX matrices_archived_name_idx ON matrices (archived_at, name);
CREATE INDEX matrices_type_idx ON matrices (type);

CREATE TABLE responsibles (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  role text,
  whatsapp_number text,
  whatsapp_number_e164 text,
  email citext,
  active boolean NOT NULL DEFAULT true,
  whatsapp_opt_in_status text NOT NULL DEFAULT 'UNKNOWN',
  whatsapp_opt_in_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX responsibles_e164_uq ON responsibles (whatsapp_number_e164) WHERE whatsapp_number_e164 IS NOT NULL;
CREATE INDEX responsibles_active_name_idx ON responsibles (active, name);

ALTER TABLE users
  ADD CONSTRAINT users_responsible_fk FOREIGN KEY (responsible_id) REFERENCES responsibles(id);

CREATE TABLE tasks (
  id uuid PRIMARY KEY,
  matrix_id uuid NOT NULL REFERENCES matrices(id) ON DELETE RESTRICT,
  sequence_number integer NOT NULL,
  display_order integer NOT NULL,
  title text NOT NULL,
  description text,
  base_status text NOT NULL DEFAULT 'PENDING',
  extension_status text NOT NULL DEFAULT 'NONE',
  original_due_date date,
  current_due_date date,
  extension_count integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cached_deadline_status text,
  deadline_status_computed_at timestamptz,
  deadline_status_as_of date,
  CONSTRAINT tasks_sequence_positive CHECK (sequence_number > 0),
  CONSTRAINT tasks_extension_count_nonneg CHECK (extension_count >= 0),
  CONSTRAINT tasks_base_status_check CHECK (base_status IN (
    'PENDING','IN_PROGRESS','BLOCKED','WAITING_FOR_INPUT','WAITING_FOR_VALIDATION','COMPLETED','CANCELLED'
  )),
  CONSTRAINT tasks_extension_status_check CHECK (extension_status IN ('NONE','REQUESTED','APPROVED','REJECTED'))
);
CREATE UNIQUE INDEX tasks_matrix_sequence_uq ON tasks (matrix_id, sequence_number);
CREATE INDEX tasks_matrix_display_idx ON tasks (matrix_id, display_order);
CREATE INDEX tasks_base_status_idx ON tasks (base_status);
CREATE INDEX tasks_due_open_idx ON tasks (current_due_date) WHERE cancelled_at IS NULL AND completed_at IS NULL;

CREATE TABLE deadline_rules (
  id uuid PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  deadline_type text NOT NULL,
  fixed_date date,
  amount integer,
  unit text,
  trigger_type text,
  trigger_task_id uuid REFERENCES tasks(id),
  recurrence_config jsonb,
  recurrence_ended_at timestamptz,
  timezone text,
  calendar_id uuid NOT NULL REFERENCES business_calendars(id),
  calculated_due_date date,
  waiting_for_trigger boolean NOT NULL DEFAULT false,
  explanation jsonb,
  computed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX deadline_rules_task_uq ON deadline_rules (task_id);

CREATE TABLE task_responsibles (
  id uuid PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  responsible_id uuid NOT NULL REFERENCES responsibles(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid NOT NULL REFERENCES users(id),
  active boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX task_responsibles_pair_uq ON task_responsibles (task_id, responsible_id);
CREATE INDEX task_responsibles_person_idx ON task_responsibles (responsible_id, active);

CREATE TABLE task_dependencies (
  id uuid PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES users(id),
  satisfied_at timestamptz,
  CONSTRAINT task_dependencies_no_self CHECK (task_id <> depends_on_task_id)
);
CREATE UNIQUE INDEX task_dependencies_pair_uq ON task_dependencies (task_id, depends_on_task_id);
CREATE INDEX task_dependencies_blocker_idx ON task_dependencies (depends_on_task_id);

CREATE TABLE task_notes (
  id uuid PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE task_status_history (
  id uuid PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  actor_type text NOT NULL,
  actor_user_id uuid REFERENCES users(id),
  actor_responsible_id uuid REFERENCES responsibles(id),
  reason text,
  inbox_item_id uuid,
  correlation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX task_status_history_task_idx ON task_status_history (task_id, created_at);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  actor_type text NOT NULL,
  actor_user_id uuid REFERENCES users(id),
  actor_responsible_id uuid REFERENCES responsibles(id),
  before jsonb,
  after jsonb,
  origin text NOT NULL,
  correlation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id, created_at);
CREATE INDEX audit_logs_created_idx ON audit_logs (created_at);

CREATE TABLE outbox_messages (
  id uuid PRIMARY KEY,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  event_name text NOT NULL,
  job_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  last_error text,
  pgboss_job_id text,
  idempotency_key text NOT NULL,
  correlation_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX outbox_idempotency_uq ON outbox_messages (idempotency_key);
CREATE INDEX outbox_pending_idx ON outbox_messages (status, available_at) WHERE status = 'PENDING';

CREATE TABLE system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);
