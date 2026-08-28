CREATE TABLE IF NOT EXISTS inbox_items (
  id uuid PRIMARY KEY,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  matrix_id uuid REFERENCES matrices(id) ON DELETE SET NULL,
  responsible_id uuid REFERENCES responsibles(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  suggested_action text,
  requires_human_action boolean NOT NULL DEFAULT true,
  snoozed_until timestamptz,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id),
  correlation_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inbox_items_open_idx
  ON inbox_items (status, created_at DESC)
  WHERE status IN ('OPEN', 'SNOOZED');

CREATE INDEX IF NOT EXISTS inbox_items_task_idx ON inbox_items (task_id);
