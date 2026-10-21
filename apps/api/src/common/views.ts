import type { Assignee, FolderColor, Matrix, Task } from '../db/schema';
import {
  daysBetween,
  dueStatus,
  earlyReminderDate,
  EARLY_WINDOW_DAYS,
  type DueStatus,
  type IsoDate,
} from '../reminders/rules/reminder-rules';
import { initials, reminderState, type ReminderState } from '../reminders/rules/schedule';
import type { Snapshot } from './snapshot';

export type FolderAlert =
  | { kind: 'overdue'; count: number }
  | { kind: 'today'; count: number }
  | { kind: 'soon'; count: number }
  | { kind: 'ok' }
  | { kind: 'empty' };

export interface FolderSummary {
  id: string;
  name: string;
  slug: string;
  color: FolderColor;
  description: string | null;
  position: number;
  isArchived: boolean;
  openCount: number;
  doneCount: number;
  totalCount: number;
  nextDueDate: IsoDate | null;
  alert: FolderAlert;
  assigneeInitials: string[];
}

const pendingOf = (s: Snapshot, matrixId: string) => s.tasks.filter((t) => t.matrixId === matrixId && t.status === 'pending');

export function folderSummary(s: Snapshot, m: Matrix, today: IsoDate): FolderSummary {
  const open = pendingOf(s, m.id);
  const counts = s.counts.get(m.id) ?? { open: open.length, done: 0, canceled: 0 };
  const overdue = open.filter((t) => t.dueDate < today).length;
  const dueToday = open.filter((t) => t.dueDate === today).length;
  const soon = open.filter((t) => {
    const d = daysBetween(today, t.dueDate);
    return d >= 1 && d <= EARLY_WINDOW_DAYS;
  }).length;
  const upcoming = open.map((t) => t.dueDate).filter((d) => d >= today).sort();
  const alert: FolderAlert =
    open.length === 0
      ? { kind: 'empty' }
      : overdue > 0
        ? { kind: 'overdue', count: overdue }
        : dueToday > 0
          ? { kind: 'today', count: dueToday }
          : soon > 0
            ? { kind: 'soon', count: soon }
            : { kind: 'ok' };
  const seen = new Set<string>();
  const assigneeInitials: string[] = [];
  for (const t of open) {
    if (seen.has(t.assigneeId)) continue;
    seen.add(t.assigneeId);
    const a = s.assigneeById.get(t.assigneeId);
    if (a) assigneeInitials.push(initials(a.fullName));
  }
  return {
    id: m.id,
    name: m.name,
    slug: m.slug,
    color: m.color,
    description: m.description,
    position: m.position,
    isArchived: m.isArchived,
    openCount: open.length,
    doneCount: counts.done,
    totalCount: open.length + counts.done,
    nextDueDate: upcoming[0] ?? null,
    alert,
    assigneeInitials,
  };
}

/**
 * Cor da "pasta principal" da pessoa: onde tem mais demandas abertas;
 * no empate, a pasta do prazo mais próximo a partir de hoje.
 */
export function primaryFolderColor(s: Snapshot, assigneeId: string, today: IsoDate): FolderColor | null {
  const byMatrix = new Map<string, { count: number; next: string }>();
  for (const t of s.tasks) {
    if (t.assigneeId !== assigneeId || t.status !== 'pending') continue;
    const m = s.matrixById.get(t.matrixId);
    if (!m || m.isArchived) continue;
    const cur = byMatrix.get(m.id) ?? { count: 0, next: '9999-12-31' };
    cur.count += 1;
    if (t.dueDate >= today && t.dueDate < cur.next) cur.next = t.dueDate;
    byMatrix.set(m.id, cur);
  }
  let best: { id: string; count: number; next: string } | null = null;
  for (const [id, v] of byMatrix) {
    if (!best || v.count > best.count || (v.count === best.count && v.next < best.next)) best = { id, ...v };
  }
  return best ? s.matrixById.get(best.id)!.color : null;
}

export function folderColorsForAssignee(s: Snapshot, assigneeId: string): FolderColor[] {
  const ids = new Set(s.tasks.filter((t) => t.assigneeId === assigneeId && t.status === 'pending').map((t) => t.matrixId));
  return s.matrices.filter((m) => ids.has(m.id)).map((m) => m.color);
}

export interface PersonRef {
  id: string;
  fullName: string;
  initials: string;
  color: FolderColor | null;
}

export const personRef = (a: Assignee, color: FolderColor | null): PersonRef => ({
  id: a.id,
  fullName: a.fullName,
  initials: initials(a.fullName),
  color,
});

export function reminderStates(s: Snapshot, t: Task, today: IsoDate): { early: ReminderState; due: ReminderState } {
  const items = s.itemsByTask.get(t.id) ?? [];
  return {
    early: reminderState('early', t, items, today, s.calendar),
    due: reminderState('due', t, items, today, s.calendar),
  };
}

export const taskDueStatus = (t: { dueDate: string; status: Task['status'] }, today: IsoDate): DueStatus =>
  dueStatus({ dueDate: t.dueDate, status: t.status }, today);
export const taskEarlyDate = (s: Snapshot, t: Task) => earlyReminderDate(t.dueDate, s.calendar);
