import { asc, eq } from 'drizzle-orm';
import type { DbOrTx } from '../db/client';
import { assignees, holidays, matrices, reminderBatchItems, reminderBatches, taskDueDateChanges, tasks, type Assignee, type Matrix, type Task } from '../db/schema';
import type { Calendar, TaskForReminder } from '../reminders/rules/reminder-rules';
import type { ReminderItemState } from '../reminders/rules/schedule';

export interface ReminderItemRow extends ReminderItemState {
  taskId: string;
  batchId: string;
  isActive: boolean;
}

export interface Snapshot {
  matrices: Matrix[];
  matrixById: Map<string, Matrix>;
  assignees: Assignee[];
  assigneeById: Map<string, Assignee>;
  tasks: Task[];
  taskById: Map<string, Task>;
  itemsByTask: Map<string, ReminderItemRow[]>;
  extendedTaskIds: Set<string>;
  calendar: Calendar;
}

export async function loadCalendar(db: DbOrTx): Promise<Calendar> {
  const rows = await db.select({ date: holidays.date }).from(holidays);
  return { holidays: new Set(rows.map((r) => r.date)) };
}

export async function loadSnapshot(db: DbOrTx, opts: { includeArchived?: boolean } = {}): Promise<Snapshot> {
  const [mRows, aRows, tRows, iRows, cRows, calendar] = await Promise.all([
    db.select().from(matrices).orderBy(asc(matrices.position), asc(matrices.createdAt)),
    db.select().from(assignees).orderBy(asc(assignees.fullName)),
    db.select().from(tasks).orderBy(asc(tasks.position)),
    db
      .select({
        taskId: reminderBatchItems.taskId,
        batchId: reminderBatchItems.batchId,
        kind: reminderBatchItems.kind,
        channel: reminderBatchItems.channel,
        dueDateSnapshot: reminderBatchItems.dueDateSnapshot,
        isActive: reminderBatchItems.isActive,
        batchStatus: reminderBatches.status,
        createdAt: reminderBatches.createdAt,
      })
      .from(reminderBatchItems)
      .innerJoin(reminderBatches, eq(reminderBatches.id, reminderBatchItems.batchId)),
    db.select({ taskId: taskDueDateChanges.taskId }).from(taskDueDateChanges).where(eq(taskDueDateChanges.kind, 'extension')),
    loadCalendar(db),
  ]);

  const visible = opts.includeArchived ? mRows : mRows.filter((m) => !m.isArchived);
  const matrixById = new Map(mRows.map((m) => [m.id, m]));
  const itemsByTask = new Map<string, ReminderItemRow[]>();
  for (const it of iRows) {
    const list = itemsByTask.get(it.taskId) ?? [];
    list.push(it);
    itemsByTask.set(it.taskId, list);
  }
  return {
    matrices: visible,
    matrixById,
    assignees: aRows,
    assigneeById: new Map(aRows.map((a) => [a.id, a])),
    tasks: tRows,
    taskById: new Map(tRows.map((t) => [t.id, t])),
    itemsByTask,
    extendedTaskIds: new Set(cRows.map((c) => c.taskId)),
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
    if (t.status !== 'pending') continue;
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
