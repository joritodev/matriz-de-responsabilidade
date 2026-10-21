import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Clock } from '../common/clock';
import { loadSnapshot } from '../common/snapshot';
import { folderSummary, reminderStates, taskDueStatus, taskEarlyDate } from '../common/views';
import { DB, type Db } from '../db/client';
import { reminderBatches } from '../db/schema';
import { RemindersService } from '../reminders/reminders.service';
import { addDays, daysBetween, EARLY_WINDOW_DAYS } from '../reminders/rules/reminder-rules';
import { businessDaysFrom, initials, previousBusinessDay } from '../reminders/rules/schedule';

@Injectable()
export class OverviewService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(RemindersService) private readonly reminders: RemindersService,
  ) {}

  async overview() {
    const today = this.clock.today();
    const snap = await loadSnapshot(this.db);
    const visibleIds = new Set(snap.matrices.map((m) => m.id));
    const open = snap.tasks.filter((t) => t.status === 'pending' && visibleIds.has(t.matrixId));

    const todayRows = await this.db
      .select({ id: reminderBatches.id })
      .from(reminderBatches)
      .where(eq(reminderBatches.sentOn, today));
    const todayBatches = (await this.reminders.listBatches({ from: today, to: today })).days[0]?.batches ?? [];

    const greeting = {
      dueToday: open.filter((t) => t.dueDate === today).length,
      dueNext3Days: open.filter((t) => {
        const d = daysBetween(today, t.dueDate);
        return d >= 1 && d <= EARLY_WINDOW_DAYS;
      }).length,
      overdue: open.filter((t) => t.dueDate < today).length,
      remindersSentToday: todayRows.length > 0,
    };

    const start = previousBusinessDay(today, snap.calendar);
    const stripDays = businessDaysFrom(start, 7, snap.calendar);
    const columns = businessDaysFrom(start, 10, snap.calendar);
    const lastCol = columns[columns.length - 1];

    const days = stripDays.map((date) => {
      const colors = snap.matrices.filter((m) => open.some((t) => t.matrixId === m.id && t.dueDate === date)).map((m) => m.color);
      return { date, folderColors: colors };
    });

    const groups = snap.matrices.map((m) => {
      const mine = open.filter((t) => t.matrixId === m.id);
      const overdue = mine.filter((t) => t.dueDate < today).sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.position - b.position);
      const upcoming = mine
        .filter((t) => t.dueDate >= today && t.dueDate <= lastCol)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.position - b.position);
      const rows = [...overdue, ...upcoming].map((t) => {
        const a = snap.assigneeById.get(t.assigneeId)!;
        return {
          taskId: t.id,
          title: t.title,
          position: t.position,
          assigneeName: a.fullName,
          initials: initials(a.fullName),
          dueDate: t.dueDate,
          earlyDate: taskEarlyDate(snap, t),
          status: taskDueStatus(t, today),
          ...reminderStates(snap, t, today),
        };
      });
      return { folderId: m.id, name: m.name, slug: m.slug, color: m.color, rows };
    });

    return {
      today,
      greeting,
      days,
      folders: snap.matrices.map((m) => folderSummary(snap, m, today)),
      ruler: { columns, groups },
      todayBatches: todayBatches.map((b) => ({
        id: b.id,
        assignee: b.assignee,
        assigneeName: b.assignee.fullName,
        channel: b.channel,
        kind: b.kind,
        status: b.status,
        displayStatus: b.displayStatus,
        items: b.items,
        summary: b.items.map((i) => i.title).join(' e '),
        sentAt: b.createdAt,
        error: b.error,
      })),
      tomorrow: this.reminders.tomorrowSummary(snap, today),
      dueSoon: open
        .filter((t) => t.dueDate <= addDays(today, 7))
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 8)
        .map((t) => {
          const a = snap.assigneeById.get(t.assigneeId)!;
          const m = snap.matrixById.get(t.matrixId)!;
          return {
            taskId: t.id,
            title: t.title,
            assigneeName: a.fullName,
            dueDate: t.dueDate,
            status: taskDueStatus(t, today),
            matrix: { name: m.name, slug: m.slug, color: m.color },
            ...reminderStates(snap, t, today),
          };
        }),
    };
  }
}