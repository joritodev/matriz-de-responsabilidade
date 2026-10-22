import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Clock } from '../common/clock';
import { badRequest, notFound } from '../common/errors';
import { loadSnapshot } from '../common/snapshot';
import { folderColorsForAssignee, primaryFolderColor, taskDueStatus } from '../common/views';
import { DB, pgErrorCode, type Db } from '../db/client';
import { assignees, type Assignee } from '../db/schema';
import type { ChannelPreference } from '../reminders/rules/reminder-rules';
import { initials } from '../reminders/rules/schedule';

export interface AssigneeInput {
  fullName?: string;
  whatsapp?: string | null;
  email?: string | null;
  reminderChannel?: ChannelPreference;
  isActive?: boolean;
}

@Injectable()
export class AssigneesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  async list() {
    const today = this.clock.today();
    const snap = await loadSnapshot(this.db, { items: 'none' });
    const visible = new Set(snap.matrices.map((m) => m.id));
    return snap.assignees.map((a) => {
      const open = snap.tasks
        .filter((t) => t.assigneeId === a.id && t.status === 'pending' && visible.has(t.matrixId))
        .sort((x, y) => x.dueDate.localeCompare(y.dueDate));
      const next = open[0];
      return {
        id: a.id,
        fullName: a.fullName,
        initials: initials(a.fullName),
        whatsapp: a.whatsappE164,
        email: a.email,
        reminderChannel: a.reminderChannel,
        isActive: a.isActive,
        color: primaryFolderColor(snap, a.id, today),
        openCount: open.length,
        nextDue: next
          ? { date: next.dueDate, taskId: next.id, title: next.title, matrixSlug: snap.matrixById.get(next.matrixId)?.slug ?? '', status: taskDueStatus(next, today) }
          : null,
        folderColors: folderColorsForAssignee(snap, a.id),
        createdAt: a.createdAt.toISOString(),
      };
    });
  }

  async create(input: Required<Pick<AssigneeInput, 'fullName' | 'reminderChannel'>> & AssigneeInput) {
    this.assertContact(input.reminderChannel, input.whatsapp ?? null, input.email ?? null);
    try {
      const [row] = await this.db
        .insert(assignees)
        .values({
          fullName: input.fullName,
          whatsappE164: input.whatsapp ?? null,
          email: input.email ?? null,
          reminderChannel: input.reminderChannel,
        })
        .returning();
      return row;
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async update(id: string, input: AssigneeInput) {
    const [current] = await this.db.select().from(assignees).where(eq(assignees.id, id)).limit(1);
    if (!current) throw notFound('Responsável não encontrado.', 'assignee_not_found');
    const next: Partial<Assignee> = {};
    if (input.fullName !== undefined) next.fullName = input.fullName;
    if (input.whatsapp !== undefined) next.whatsappE164 = input.whatsapp;
    if (input.email !== undefined) next.email = input.email;
    if (input.reminderChannel !== undefined) next.reminderChannel = input.reminderChannel;
    if (input.isActive !== undefined) next.isActive = input.isActive;
    this.assertContact(
      next.reminderChannel ?? current.reminderChannel,
      next.whatsappE164 !== undefined ? next.whatsappE164 : current.whatsappE164,
      next.email !== undefined ? next.email : current.email,
    );
    try {
      const [row] = await this.db.update(assignees).set(next).where(eq(assignees.id, id)).returning();
      return row;
    } catch (err) {
      throw this.mapError(err);
    }
  }

  private assertContact(channel: ChannelPreference, whatsapp: string | null, email: string | null) {
    if ((channel === 'whatsapp' || channel === 'both') && !whatsapp) {
      throw badRequest('Para cobrar por WhatsApp, cadastre o número.', 'missing_whatsapp');
    }
    if ((channel === 'email' || channel === 'both') && !email) {
      throw badRequest('Para cobrar por e-mail, cadastre o endereço.', 'missing_email');
    }
  }

  private mapError(err: unknown) {
    if (pgErrorCode(err) === '23514') return badRequest('Confira o WhatsApp e o e-mail cadastrados.', 'invalid_contact');
    return err;
  }
}
