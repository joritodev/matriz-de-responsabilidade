import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';
import { Clock } from '../common/clock';
import { badRequest, notFound } from '../common/errors';
import { loadSnapshot, type ReminderItemRow, type Snapshot } from '../common/snapshot';
import { folderSummary, personRef, primaryFolderColor, reminderStates, taskDueStatus, taskEarlyDate } from '../common/views';
import { DB, type Db, type Tx } from '../db/client';
import { assignees, matrices, reminderBatchItems, reminderBatches, taskDueDateChanges, tasks, type Task } from '../db/schema';
import { addDays } from '../reminders/rules/reminder-rules';
import { startOfWeek } from '../reminders/rules/schedule';

export type TaskFilter = 'open' | 'done' | 'extended';

const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

@Injectable()
export class TasksService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  async listForMatrix(slug: string, filter: TaskFilter) {
    const today = this.clock.today();
    const snap = await loadSnapshot(this.db, { includeArchived: true, items: 'none' });
    const m = [...snap.matrixById.values()].find((x) => x.slug === slug);
    if (!m) throw notFound('Pasta não encontrada.', 'matrix_not_found');

    const [mine, changes] = await Promise.all([
      this.db.select().from(tasks).where(eq(tasks.matrixId, m.id)).orderBy(asc(tasks.position)),
      this.db
        .select()
        .from(taskDueDateChanges)
        .innerJoin(tasks, eq(tasks.id, taskDueDateChanges.taskId))
        .where(eq(tasks.matrixId, m.id))
        .orderBy(asc(taskDueDateChanges.createdAt)),
    ]);
    const folderItems = mine.length
      ? await this.db
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
          .innerJoin(reminderBatches, eq(reminderBatches.id, reminderBatchItems.batchId))
          .where(inArray(reminderBatchItems.taskId, mine.map((t) => t.id)))
      : [];

    // Mescla as demandas e os itens da pasta no snapshot limitado: os filtrados
    // (concluídas, prorrogadas) também precisam de lembrete e pré-requisito.
    const taskById = new Map(snap.taskById);
    const itemsByTask = new Map(snap.itemsByTask);
    for (const t of mine) taskById.set(t.id, t);
    for (const it of folderItems) {
      const list = itemsByTask.get(it.taskId) ?? [];
      list.push(it);
      itemsByTask.set(it.taskId, list);
    }
    const view: Snapshot = { ...snap, taskById, itemsByTask };

    const lastChange = new Map<string, (typeof changes)[number]['task_due_date_changes']>();
    const extended = new Set<string>();
    for (const c of changes) {
      lastChange.set(c.task_due_date_changes.taskId, c.task_due_date_changes);
      if (c.task_due_date_changes.kind === 'extension') extended.add(c.task_due_date_changes.taskId);
    }

    const open = mine.filter((t) => t.status === 'pending');
    const extendedMine = mine.filter((t) => t.status !== 'canceled' && extended.has(t.id));
    const selected = filter === 'open' ? open : filter === 'done' ? mine.filter((t) => t.status === 'done') : extendedMine;
    const weekEnd = addDays(startOfWeek(today), 6);
    const colorByAssignee = new Map(snap.assignees.map((a) => [a.id, primaryFolderColor(snap, a.id, today)]));

    return {
      today,
      matrix: folderSummary(view, m, today),
      filter,
      counts: {
        open: open.length,
        done: mine.filter((t) => t.status === 'done').length,
        extended: extendedMine.length,
        canceled: mine.filter((t) => t.status === 'canceled').length,
        total: mine.filter((t) => t.status !== 'canceled').length,
      },
      dueThisWeek: open.filter((t) => t.dueDate >= today && t.dueDate <= weekEnd).length,
      prerequisiteOptions: mine
        .filter((t) => t.status !== 'canceled')
        .map((t) => ({ id: t.id, position: t.position, title: t.title })),
      tasks: selected.map((t) => {
        const c = lastChange.get(t.id);
        return {
          ...this.row(view, t, today, colorByAssignee, extended),
          lastChange: c
            ? {
                kind: c.kind,
                previousDueDate: c.previousDueDate,
                newDueDate: c.newDueDate,
                reason: c.reason,
                approvedBy: c.approvedBy,
                createdAt: c.createdAt.toISOString(),
              }
            : null,
        };
      }),
    };
  }

  private row(snap: Snapshot, t: Task, today: string, colorByAssignee: Map<string, ReturnType<typeof primaryFolderColor>>, extended: Set<string>) {
    const a = snap.assigneeById.get(t.assigneeId)!;
    const pre = t.prerequisiteTaskId ? snap.taskById.get(t.prerequisiteTaskId) : undefined;
    return {
      id: t.id,
      matrixId: t.matrixId,
      position: t.position,
      title: t.title,
      notes: t.notes,
      assignee: personRef(a, colorByAssignee.get(a.id) ?? null),
      dueDate: t.dueDate,
      earlyDate: taskEarlyDate(snap, t),
      taskStatus: t.status,
      status: taskDueStatus(t, today),
      prerequisite: pre ? { taskId: pre.id, title: pre.title } : t.prerequisiteNote ? { note: t.prerequisiteNote } : null,
      reminders: reminderStates(snap, t, today),
      isExtended: extended.has(t.id),
      completedAt: t.completedAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
    };
  }

  async create(
    matrixId: string,
    input: { title: string; assigneeId: string; dueDate: string; prerequisiteTaskId?: string | null; prerequisiteNote?: string | null; notes?: string | null },
  ) {
    const today = this.clock.today();
    if (input.dueDate < today) throw badRequest('O prazo precisa ser hoje ou depois.', 'due_date_in_past');
    return this.db.transaction(async (tx) => {
      // Trava a linha da pasta: duas criações em paralelo não leem o mesmo max(position).
      const [m] = await tx.select().from(matrices).where(eq(matrices.id, matrixId)).for('update').limit(1);
      if (!m) throw notFound('Pasta não encontrada.', 'matrix_not_found');
      if (m.isArchived) throw badRequest('Esta pasta está arquivada.', 'matrix_archived');
      await this.assertAssignee(tx, input.assigneeId);
      if (input.prerequisiteTaskId) await this.assertPrerequisite(tx, matrixId, input.prerequisiteTaskId);
      const [{ max }] = await tx
        .select({ max: sql<number>`coalesce(max(${tasks.position}), 0)` })
        .from(tasks)
        .where(eq(tasks.matrixId, matrixId));
      const [row] = await tx
        .insert(tasks)
        .values({
          matrixId,
          position: Number(max) + 1,
          assigneeId: input.assigneeId,
          title: input.title,
          dueDate: input.dueDate,
          prerequisiteTaskId: input.prerequisiteTaskId ?? null,
          prerequisiteNote: input.prerequisiteTaskId ? null : (input.prerequisiteNote ?? null),
          notes: input.notes ?? null,
        })
        .returning();
      return { id: row.id, position: row.position, matrixSlug: m.slug };
    });
  }

  async update(
    id: string,
    input: { title?: string; assigneeId?: string; notes?: string | null; prerequisiteTaskId?: string | null; prerequisiteNote?: string | null },
  ) {
    return this.db.transaction(async (tx) => {
      const t = await this.getTask(tx, id);
      if (input.assigneeId) await this.assertAssignee(tx, input.assigneeId);
      if (input.prerequisiteTaskId) {
        if (input.prerequisiteTaskId === id) throw badRequest('Uma demanda não pode depender dela mesma.', 'prerequisite_self');
        await this.assertPrerequisite(tx, t.matrixId, input.prerequisiteTaskId, id);
      }
      const patch: Partial<Task> = {};
      if (input.title !== undefined) patch.title = input.title;
      if (input.assigneeId !== undefined) patch.assigneeId = input.assigneeId;
      if (input.notes !== undefined) patch.notes = input.notes;
      if (input.prerequisiteTaskId !== undefined) {
        patch.prerequisiteTaskId = input.prerequisiteTaskId;
        if (input.prerequisiteTaskId) patch.prerequisiteNote = null;
      }
      if (input.prerequisiteNote !== undefined && !input.prerequisiteTaskId) patch.prerequisiteNote = input.prerequisiteNote;
      if (Object.keys(patch).length === 0) return { id };
      await tx.update(tasks).set(patch).where(eq(tasks.id, id));
      return { id };
    });
  }

  /** Prorrogação: histórico + novo prazo na mesma transação. Reservas antigas deixam de bater pelo due_date_snapshot. */
  async changeDueDate(
    id: string,
    kind: 'extension' | 'correction',
    input: { newDueDate: string; reason?: string | null; approvedBy?: string | null },
    changedByEmail: string,
  ) {
    return this.db.transaction(async (tx) => {
      const t = await this.getTask(tx, id);
      if (t.status !== 'pending') throw badRequest('Só dá para mudar o prazo de demanda aberta.', 'task_not_pending');
      if (kind === 'extension' && input.newDueDate <= t.dueDate) {
        throw badRequest('O novo prazo precisa ser depois do prazo atual.', 'new_due_not_after');
      }
      if (kind === 'correction' && input.newDueDate === t.dueDate) {
        throw badRequest('O prazo informado é igual ao atual.', 'same_due_date');
      }
      await tx.insert(taskDueDateChanges).values({
        taskId: id,
        kind,
        previousDueDate: t.dueDate,
        newDueDate: input.newDueDate,
        reason: input.reason ?? null,
        approvedBy: input.approvedBy ?? null,
        changedByEmail,
      });
      await tx.update(tasks).set({ dueDate: input.newDueDate }).where(eq(tasks.id, id));
      return { id, previousDueDate: t.dueDate, dueDate: input.newDueDate };
    });
  }

  async setStatus(id: string, action: 'complete' | 'reopen' | 'cancel') {
    return this.db.transaction(async (tx) => {
      const t = await this.getTask(tx, id);
      if (action === 'complete') {
        if (t.status !== 'pending') throw badRequest('Esta demanda não está aberta.', 'task_not_pending');
        await tx.update(tasks).set({ status: 'done', completedAt: new Date() }).where(eq(tasks.id, id));
      } else if (action === 'cancel') {
        if (t.status !== 'pending') throw badRequest('Só dá para cancelar demanda aberta.', 'task_not_pending');
        await tx.update(tasks).set({ status: 'canceled', completedAt: null }).where(eq(tasks.id, id));
      } else {
        if (t.status === 'pending') throw badRequest('Esta demanda já está aberta.', 'task_already_pending');
        await tx.update(tasks).set({ status: 'pending', completedAt: null }).where(eq(tasks.id, id));
      }
      const [row] = await tx.select({ status: tasks.status }).from(tasks).where(eq(tasks.id, id));
      return { id, status: row.status };
    });
  }

  /** Reescreve a ordem dos itens enviados, reaproveitando as posições que eles já ocupam. */
  async reorder(matrixId: string, taskIds: string[]) {
    if (new Set(taskIds).size !== taskIds.length) throw badRequest('A lista tem demandas repetidas.', 'duplicate_tasks');
    await this.db.transaction(async (tx) => {
      const rows = await tx
        .select({ id: tasks.id, position: tasks.position })
        .from(tasks)
        .where(and(eq(tasks.matrixId, matrixId), inArray(tasks.id, taskIds)));
      if (rows.length !== taskIds.length) throw badRequest('A lista tem demanda de outra pasta.', 'unknown_task');
      const slots = rows.map((r) => r.position).sort((a, b) => a - b);
      for (const [i, id] of taskIds.entries()) await tx.update(tasks).set({ position: slots[i] }).where(eq(tasks.id, id));
    });
    return { ok: true };
  }

  async history(id: string) {
    const t = await this.getTask(this.db, id);
    const [changes, reminders] = await Promise.all([
      this.db.select().from(taskDueDateChanges).where(eq(taskDueDateChanges.taskId, id)).orderBy(asc(taskDueDateChanges.createdAt)),
      this.db
        .select({
          batchId: reminderBatches.id,
          kind: reminderBatchItems.kind,
          channel: reminderBatchItems.channel,
          dueDateSnapshot: reminderBatchItems.dueDateSnapshot,
          status: reminderBatches.status,
          error: reminderBatches.errorMessage,
          sentOn: reminderBatches.sentOn,
          at: reminderBatches.createdAt,
        })
        .from(reminderBatchItems)
        .innerJoin(reminderBatches, eq(reminderBatches.id, reminderBatchItems.batchId))
        .where(eq(reminderBatchItems.taskId, id)),
    ]);
    type Event =
      | { type: 'created'; at: string; dueDate: string }
      | { type: 'due_change'; at: string; kind: 'extension' | 'correction'; previousDueDate: string; newDueDate: string; reason: string | null; approvedBy: string | null }
      | { type: 'reminder'; at: string; kind: 'early' | 'due'; channel: 'whatsapp' | 'email'; status: 'queued' | 'taken' | 'sent' | 'failed'; dueDateSnapshot: string; error: string | null }
      | { type: 'completed'; at: string };
    const events: Event[] = [
      { type: 'created', at: t.createdAt.toISOString(), dueDate: changes[0]?.previousDueDate ?? t.dueDate },
      ...changes.map((c) => ({
        type: 'due_change' as const,
        at: c.createdAt.toISOString(),
        kind: c.kind,
        previousDueDate: c.previousDueDate,
        newDueDate: c.newDueDate,
        reason: c.reason,
        approvedBy: c.approvedBy,
      })),
      ...reminders.map((r) => ({
        type: 'reminder' as const,
        at: r.at.toISOString(),
        kind: r.kind,
        channel: r.channel,
        status: r.status,
        dueDateSnapshot: r.dueDateSnapshot,
        error: r.error,
      })),
    ];
    if (t.completedAt) events.push({ type: 'completed', at: t.completedAt.toISOString() });
    events.sort((a, b) => a.at.localeCompare(b.at));
    return { taskId: id, events };
  }

  async search(q: string) {
    const today = this.clock.today();
    const needle = fold(q.trim());
    const [snap, rows] = await Promise.all([
      loadSnapshot(this.db, { items: 'none' }),
      this.db
        .select({ id: tasks.id, title: tasks.title, dueDate: tasks.dueDate, status: tasks.status, matrixId: tasks.matrixId, assigneeId: tasks.assigneeId })
        .from(tasks)
        .where(ne(tasks.status, 'canceled')),
    ]);
    const visible = new Set(snap.matrices.map((m) => m.id));
    const hits = rows.filter((t) => {
      if (!visible.has(t.matrixId)) return false;
      const a = snap.assigneeById.get(t.assigneeId);
      return fold(t.title).includes(needle) || (a ? fold(a.fullName).includes(needle) : false);
    });
    const groups = snap.matrices
      .map((m) => ({
        folder: { id: m.id, name: m.name, slug: m.slug, color: m.color },
        tasks: hits
          .filter((t) => t.matrixId === m.id)
          .sort((a, b) => Number(a.status !== 'pending') - Number(b.status !== 'pending') || a.dueDate.localeCompare(b.dueDate))
          .slice(0, 8)
          .map((t) => ({
            id: t.id,
            title: t.title,
            dueDate: t.dueDate,
            taskStatus: t.status,
            status: taskDueStatus(t, today),
            assigneeName: snap.assigneeById.get(t.assigneeId)?.fullName ?? '',
          })),
      }))
      .filter((g) => g.tasks.length > 0);
    const people = snap.assignees
      .filter((a) => fold(a.fullName).includes(needle))
      .slice(0, 6)
      .map((a) => personRef(a, primaryFolderColor(snap, a.id, today)));
    return { q, groups, people };
  }

  private async getTask(db: Db | Tx, id: string) {
    const [t] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!t) throw notFound('Demanda não encontrada.', 'task_not_found');
    return t;
  }

  private async assertAssignee(tx: Tx, assigneeId: string) {
    const [a] = await tx.select().from(assignees).where(eq(assignees.id, assigneeId)).limit(1);
    if (!a) throw badRequest('Escolha um responsável da lista.', 'assignee_not_found');
    if (!a.isActive) throw badRequest(`${a.fullName} está desativada. Reative a pessoa ou escolha outra.`, 'assignee_inactive');
  }

  /**
   * O pré-requisito precisa ser da mesma pasta. Sobe a cadeia dele: se encontrar
   * a demanda que está sendo editada, é ciclo; a cadeia também é limitada a 50 níveis.
   */
  private async assertPrerequisite(tx: Tx, matrixId: string, taskId: string, updatingId?: string) {
    const [p] = await tx.select().from(tasks).where(eq(tasks.id, taskId)).for('update').limit(1);
    if (!p || p.matrixId !== matrixId) throw badRequest('O pré-requisito precisa ser uma demanda desta pasta.', 'prerequisite_other_matrix');
    let current = p;
    for (let level = 0; level < 50; level++) {
      if (!current.prerequisiteTaskId) return;
      const [next] = await tx.select().from(tasks).where(eq(tasks.id, current.prerequisiteTaskId)).for('update').limit(1);
      if (!next) return;
      if (updatingId && next.id === updatingId) {
        throw badRequest(`Isso criaria um ciclo: ${next.title} já depende desta demanda.`, 'prerequisite_cycle');
      }
      current = next;
    }
    throw badRequest('A cadeia de pré-requisitos é longa demais (máximo de 50).', 'prerequisite_chain_too_long');
  }
}
