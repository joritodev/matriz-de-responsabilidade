import { asc, count, ne, sql } from 'drizzle-orm';
import type { DbOrTx } from '../db/client';
import { assignees, holidays, matrices, tasks, type Assignee, type Matrix, type Task } from '../db/schema';
import { addDays, EARLY_MAX_DAYS, type Calendar, type IsoDate, type TaskForReminder } from '../reminders/rules/reminder-rules';
import type { ReminderItemState } from '../reminders/rules/schedule';

export interface ReminderItemRow extends ReminderItemState {
  taskId: string;
  batchId: string;
  isActive: boolean;
}

export interface MatrixCounts {
  open: number;
  done: number;
  canceled: number;
}

export interface Snapshot {
  matrices: Matrix[];
  matrixById: Map<string, Matrix>;
  assignees: Assignee[];
  assigneeById: Map<string, Assignee>;
  /** Só demandas `pending`; concluídas e canceladas saem de `counts`. */
  tasks: Task[];
  taskById: Map<string, Task>;
  /** Itens de cobrança das demandas pendentes (inclusive os inativos com falha, usados na prévia). */
  itemsByTask: Map<string, ReminderItemRow[]>;
  counts: Map<string, MatrixCounts>;
  calendar: Calendar;
}

export async function loadCalendar(db: DbOrTx): Promise<Calendar> {
  const rows = await db.select({ date: holidays.date }).from(holidays);
  return { holidays: new Set(rows.map((r) => r.date)) };
}

/**
 * Linhas brutas do Postgres, sem o mapeador por linha do Drizzle (que custa
 * ~15µs/coluna e dominava o tempo das telas com milhares de demandas).
 * `to_char` deixa os timestamps como texto ISO em qualquer driver; `::text`
 * garante `YYYY-MM-DD` nos prazos (o driver postgres.js devolveria Date).
 */
interface RawTaskPending {
  id: string;
  matrix_id: string;
  position: number;
  assignee_id: string;
  title: string;
  due_date: string;
  prerequisite_task_id: string | null;
  prerequisite_note: string | null;
  status: Task['status'];
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface RawItemPending {
  task_id: string;
  batch_id: string;
  kind: ReminderItemRow['kind'];
  channel: ReminderItemRow['channel'];
  due_date_snapshot: string;
  is_active: boolean;
  batch_status: ReminderItemRow['batchStatus'];
  created_at: string;
}

const rawTasksPending = async (db: DbOrTx): Promise<RawTaskPending[]> => {
  const res = (await db.execute(sql`
    select id, matrix_id, position, assignee_id, title, due_date::text as due_date,
      prerequisite_task_id, prerequisite_note, status, notes,
      to_char(completed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as completed_at,
      to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
      to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at
    from tasks
    where status = 'pending'
    order by position
  `)) as { rows: RawTaskPending[] };
  return res.rows;
};

const rawItemsPending = async (db: DbOrTx, dueOnOrBefore?: IsoDate): Promise<RawItemPending[]> => {
  const res = (await db.execute(sql`
    select i.task_id, i.batch_id, i.kind, i.channel, i.due_date_snapshot::text as due_date_snapshot,
      i.is_active, b.status as batch_status,
      to_char(b.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at
    from reminder_batch_items i
    inner join reminder_batches b on b.id = i.batch_id
    inner join tasks t on t.id = i.task_id
    where t.status = 'pending'
      ${dueOnOrBefore ? sql`and t.due_date <= ${dueOnOrBefore}` : sql``}
  `)) as { rows: RawItemPending[] };
  return res.rows;
};

export interface SnapshotOptions {
  includeArchived?: boolean;
  /**
   * Itens de cobrança a carregar. A junção com 7k+ linhas custa ~80 ms, e só
   * a régua da visão geral, a prévia e o despacho leem `itemsByTask`: as telas
   * de lista passam `'none'`, e visão geral/prévia recortam com
   * `itemsDueOnOrBefore(target)` (cobrança só existe na janela do prazo).
   */
  items?: 'all' | 'none' | { dueOnOrBefore: IsoDate };
}

/**
 * Limite de prazo para carregar itens em torno de `target`: a cobrança
 * antecipada só dispara até `EARLY_MAX_DAYS` antes do prazo, e a folga cobre
 * dias não úteis entre o prazo e o dia cobrado.
 */
export const itemsDueOnOrBefore = (target: IsoDate): IsoDate => addDays(target, EARLY_MAX_DAYS + 7);

export async function loadSnapshot(db: DbOrTx, opts: SnapshotOptions = {}): Promise<Snapshot> {
  const itemsOpt = opts.items ?? 'all';
  const [mRows, aRows, tRows, iRows, cRows, calendar] = await Promise.all([
    db.select().from(matrices).orderBy(asc(matrices.position), asc(matrices.createdAt)),
    db.select().from(assignees).orderBy(asc(assignees.fullName)),
    rawTasksPending(db),
    itemsOpt === 'none'
      ? Promise.resolve([] as RawItemPending[])
      : rawItemsPending(db, typeof itemsOpt === 'object' ? itemsOpt.dueOnOrBefore : undefined),
    db.select({ matrixId: tasks.matrixId, status: tasks.status, n: count() }).from(tasks).where(ne(tasks.status, 'pending')).groupBy(tasks.matrixId, tasks.status),
    loadCalendar(db),
  ]);

  const visible = opts.includeArchived ? mRows : mRows.filter((m) => !m.isArchived);
  const matrixById = new Map(mRows.map((m) => [m.id, m]));
  const pending: Task[] = tRows.map((r) => ({
    id: r.id,
    matrixId: r.matrix_id,
    position: r.position,
    assigneeId: r.assignee_id,
    title: r.title,
    dueDate: r.due_date,
    prerequisiteTaskId: r.prerequisite_task_id,
    prerequisiteNote: r.prerequisite_note,
    hasPrerequisite: r.prerequisite_task_id !== null || r.prerequisite_note !== null,
    status: r.status,
    notes: r.notes,
    completedAt: r.completed_at ? new Date(r.completed_at) : null,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  }));
  const itemsByTask = new Map<string, ReminderItemRow[]>();
  for (const r of iRows) {
    const list = itemsByTask.get(r.task_id) ?? [];
    list.push({
      taskId: r.task_id,
      batchId: r.batch_id,
      kind: r.kind,
      channel: r.channel,
      dueDateSnapshot: r.due_date_snapshot,
      isActive: r.is_active,
      batchStatus: r.batch_status,
      createdAt: r.created_at,
    });
    itemsByTask.set(r.task_id, list);
  }
  const counts = new Map<string, MatrixCounts>();
  for (const m of mRows) counts.set(m.id, { open: 0, done: 0, canceled: 0 });
  for (const t of pending) counts.get(t.matrixId)!.open += 1;
  for (const c of cRows) {
    if (c.status === 'done' || c.status === 'canceled') counts.get(c.matrixId)![c.status] += c.n;
  }
  return {
    matrices: visible,
    matrixById,
    assignees: aRows,
    assigneeById: new Map(aRows.map((a) => [a.id, a])),
    tasks: pending,
    taskById: new Map(pending.map((t) => [t.id, t])),
    itemsByTask,
    counts,
    calendar,
  };
}

/** Converte demanda + responsável + matriz no formato da regra de cobrança. */
export function toTaskForReminder(t: Task, a: Assignee, m: Matrix): TaskForReminder {
  return {
    id: t.id,
    title: t.title,
    dueDate: t.dueDate,
    status: t.status,
    matrixName: m.name,
    matrixPosition: m.position,
    position: t.position,
    assignee: {
      id: a.id,
      fullName: a.fullName,
      whatsappE164: a.whatsappE164,
      email: a.email,
      channel: a.reminderChannel,
      isActive: a.isActive,
    },
  };
}

export function reminderInputs(s: Snapshot) {
  const out: TaskForReminder[] = [];
  for (const t of s.tasks) {
    const m = s.matrixById.get(t.matrixId);
    const a = s.assigneeById.get(t.assigneeId);
    if (!m || !a || m.isArchived) continue;
    out.push(toTaskForReminder(t, a, m));
  }
  const activeReservations = [...s.itemsByTask.values()]
    .flat()
    .filter((i) => i.isActive)
    .map((i) => ({ taskId: i.taskId, kind: i.kind, dueDateSnapshot: i.dueDateSnapshot, channel: i.channel }));
  return { tasks: out, activeReservations };
}
