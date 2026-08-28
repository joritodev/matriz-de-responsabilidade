CREATE TABLE IF NOT EXISTS deadline_occurrences (
  id uuid PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  deadline_rule_id uuid NOT NULL REFERENCES deadline_rules(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL,
  completed_at timestamptz,
  completed_by uuid REFERENCES users(id),
  explanation jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS deadline_occurrences_task_period_uq
  ON deadline_occurrences (task_id, period_start);

CREATE INDEX IF NOT EXISTS deadline_occurrences_task_open_idx
  ON deadline_occurrences (task_id, status);
