import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, asc, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { Clock } from '../common/clock';
import { conflict, notFound } from '../common/errors';
import { loadCalendar, loadSnapshot, reminderInputs, type Snapshot } from '../common/snapshot';
import { personRef, primaryFolderColor } from '../common/views';
import { DB, pgErrorCode, type Db } from '../db/client';
import { reminderBatchItems, reminderBatches, tasks, matrices, type ReminderBatch } from '../db/schema';
import {
  addDays,
  buildReminderMessage,
  isBusinessDay,
  planReminders,
  type IsoDate,
  type PlannedBatch,
  type SkippedTask,
} from './rules/reminder-rules';
import { firstName, joinPt, nextBusinessDay } from './rules/schedule';

export const NO_CONFIRMATION_MS = 2 * 60 * 60 * 1000;
const SEED_PLACEHOLDER = '(mensagem de exemplo)';

const SKIP_MESSAGES: Record<SkippedTask['reason'], string> = {
  assignee_inactive: 'Pessoa desativada',
  missing_whatsapp: 'Sem WhatsApp cadastrado',
  missing_email: 'Sem e-mail cadastrado',
};

export interface DispatchResult {
  date: IsoDate;
  batches: { id: string; channel: 'whatsapp' | 'email'; to: string; assigneeName: string; subject: string | null; body: string }[];
  skipped: SkippedTask[];
}

export type BatchKind = 'early' | 'due' | 'mixed';
export type BatchDisplayStatus = 'sent' | 'failed' | 'queued' | 'no_confirmation';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger('Reminders');

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  /** Chamado pelo Make às 08:00. Reserva antes de devolver; nada sai duas vezes. */
  async dispatch(): Promise<DispatchResult> {
    const today = this.clock.today();
    const calendar = await loadCalendar(this.db);
    if (!isBusinessDay(today, calendar)) {
      this.logger.log(`dispatch ${today}: dia não útil, nada a enviar.`);
      return { date: today, batches: [], skipped: [] };
    }

    return this.db.transaction(async (tx) => {
      const snap = await loadSnapshot(tx);
      const { tasks: input, activeReservations } = reminderInputs(snap);
      const plan = planReminders({ today, tasks: input, activeReservations, calendar: snap.calendar });
      const out: DispatchResult['batches'] = [];
      let alreadyReserved = 0;

      for (const b of plan.batches) {
        try {
          const id = await tx.transaction(async (sp) => {
            const [row] = await sp
              .insert(reminderBatches)
              .values({
                assigneeId: b.assigneeId,
                channel: b.channel,
                recipient: b.to,
                sentOn: today,
                status: 'queued',
                subject: b.subject,
                messageBody: b.body,
              })
              .returning({ id: reminderBatches.id });
            await sp.insert(reminderBatchItems).values(
              b.items.map((i) => ({
                batchId: row.id,
                channel: b.channel,
                taskId: i.taskId,
                kind: i.kind,
                dueDateSnapshot: i.dueDateSnapshot,
              })),
            );
            return row.id;
          });
          out.push({ id, channel: b.channel, to: b.to, assigneeName: b.assigneeName, subject: b.subject, body: b.body });
        } catch (err) {
          if (pgErrorCode(err) === '23505') {
            alreadyReserved += 1;
            continue;
          }
          throw err;
        }
      }

      const reasons = plan.skipped.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.reason]: (acc[s.reason] ?? 0) + 1 }), {});
      this.logger.log(
        `dispatch ${today}: ${out.length} lote(s) reservado(s), ${plan.skipped.length} pulado(s) ${JSON.stringify(reasons)}, ${alreadyReserved} já reservado(s) por outra execução.`,
      );
      return { date: today, batches: out, skipped: plan.skipped };
    });
  }

  /** Make informa o resultado do envio. Mesmo status de novo = 200; trocar status finalizado = 409. */
  async recordResult(
    id: string,
    input: { status: 'sent' | 'failed'; providerMessageId?: string; error?: string; makeExecutionId?: string },
  ) {
    const apply = async () => {
      const [batch] = await this.db.select().from(reminderBatches).where(eq(reminderBatches.id, id)).limit(1);
      if (!batch) throw notFound('Cobrança não encontrada.', 'batch_not_found');
      if (batch.status !== 'queued') {
        if (batch.status === input.status) return { batch, changed: false };
        throw conflict(
          `Esta cobrança já foi finalizada como ${batch.status === 'sent' ? 'enviada' : 'falhou'}.`,
          'batch_already_finalized',
        );
      }
      const [updated] = await this.db
        .update(reminderBatches)
        .set({
          status: input.status,
          providerMessageId: input.providerMessageId ?? batch.providerMessageId,
          errorMessage: input.status === 'failed' ? (input.error ?? null) : batch.errorMessage,
          makeExecutionId: input.makeExecutionId ?? batch.makeExecutionId,
        })
        .where(and(eq(reminderBatches.id, id), eq(reminderBatches.status, 'queued')))
        .returning();
      return updated ? { batch: updated, changed: true } : null;
    };
    const result = (await apply()) ?? (await apply());
    if (!result) throw conflict('Esta cobrança mudou ao mesmo tempo. Tente de novo.', 'batch_race');
    this.logger.log(`result ${id}: ${result.batch.status}${result.changed ? '' : ' (repetido)'}`);
    return {
      id: result.batch.id,
      status: result.batch.status,
      finishedAt: result.batch.finishedAt?.toISOString() ?? null,
    };
  }

  /** O que sairia em `date` (padrão: próximo dia útil), sem reservar nada. */
  async preview(date?: IsoDate) {
    const today = this.clock.today();
    const snap = await loadSnapshot(this.db);
    const target = date ?? nextBusinessDay(today, snap.calendar);
    return this.previewFromSnapshot(snap, target, today);
  }

  previewFromSnapshot(snap: Snapshot, target: IsoDate, today: IsoDate) {
    if (!isBusinessDay(target, snap.calendar)) {
      return { date: target, isBusinessDay: false, batches: [], skipped: [] };
    }
    const { tasks: input, activeReservations } = reminderInputs(snap);
    const plan = planReminders({ today: target, tasks: input, activeReservations, calendar: snap.calendar });
    const isRetry = (b: PlannedBatch) =>
      b.items.some((i) =>
        (snap.itemsByTask.get(i.taskId) ?? []).some(
          (r) => !r.isActive && r.batchStatus === 'failed' && r.kind === i.kind && r.dueDateSnapshot === i.dueDateSnapshot && r.channel === b.channel,
        ),
      );
    return {
      date: target,
      isBusinessDay: true,
      batches: plan.batches.map((b) => {
        const a = snap.assigneeById.get(b.assigneeId)!;
        const kinds = new Set(b.items.map((i) => i.kind));
        return {
          assignee: personRef(a, primaryFolderColor(snap, a.id, today)),
          channel: b.channel,
          to: b.to,
          subject: b.subject,
          body: b.body,
          kind: (kinds.size > 1 ? 'mixed' : [...kinds][0]) as BatchKind,
          retry: isRetry(b),
          items: b.items.map((i) => {
            const t = snap.taskById.get(i.taskId)!;
            const m = snap.matrixById.get(t.matrixId)!;
            return { taskId: i.taskId, title: i.title, kind: i.kind, dueDateSnapshot: i.dueDateSnapshot, matrix: { name: m.name, color: m.color, slug: m.slug } };
          }),
        };
      }),
      skipped: plan.skipped.map((s) => {
        const t = snap.taskById.get(s.taskId)!;
        const a = snap.assigneeById.get(s.assigneeId)!;
        const m = snap.matrixById.get(t.matrixId)!;
        return {
          taskId: s.taskId,
          title: t.title,
          assignee: personRef(a, primaryFolderColor(snap, a.id, today)),
          channel: s.channel,
          reason: s.reason,
          message: SKIP_MESSAGES[s.reason],
          matrix: { name: m.name, color: m.color, slug: m.slug },
        };
      }),
    };
  }

  /** Resumo de amanhã para a Matriz geral: "Matheus (no dia) e Rafael (nova tentativa)". */
  tomorrowSummary(snap: Snapshot, today: IsoDate) {
    const p = this.previewFromSnapshot(snap, nextBusinessDay(today, snap.calendar), today);
    const parts = p.batches.map((b) => {
      const tag = b.retry ? 'nova tentativa' : b.kind === 'due' ? 'no dia' : b.kind === 'early' ? 'antecipada' : 'no dia e antecipada';
      return `${firstName(b.assignee.fullName)} (${tag})`;
    });
    return { date: p.date, count: p.batches.length, summary: joinPt(parts) };
  }

  async listBatches(filter: { from?: IsoDate; to?: IsoDate; assigneeId?: string; status?: 'queued' | 'sent' | 'failed' }) {
    const today = this.clock.today();
    const to = filter.to ?? today;
    const from = filter.from ?? addDays(to, -30);
    const conds = [gte(reminderBatches.sentOn, from), lte(reminderBatches.sentOn, to)];
    if (filter.assigneeId) conds.push(eq(reminderBatches.assigneeId, filter.assigneeId));
    if (filter.status) conds.push(eq(reminderBatches.status, filter.status));

    const [snap, batches] = await Promise.all([
      loadSnapshot(this.db, { includeArchived: true }),
      this.db
        .select()
        .from(reminderBatches)
        .where(and(...conds))
        .orderBy(desc(reminderBatches.sentOn), asc(reminderBatches.createdAt), asc(reminderBatches.id)),
    ]);
    const items = batches.length
      ? await this.db
          .select({
            batchId: reminderBatchItems.batchId,
            taskId: reminderBatchItems.taskId,
            kind: reminderBatchItems.kind,
            dueDateSnapshot: reminderBatchItems.dueDateSnapshot,
            title: tasks.title,
            matrixName: matrices.name,
            matrixColor: matrices.color,
            matrixSlug: matrices.slug,
          })
          .from(reminderBatchItems)
          .innerJoin(tasks, eq(tasks.id, reminderBatchItems.taskId))
          .innerJoin(matrices, eq(matrices.id, tasks.matrixId))
          .where(inArray(reminderBatchItems.batchId, batches.map((b) => b.id)))
      : [];

    const groups: { date: IsoDate; batches: ReturnType<RemindersService['batchView']>[] }[] = [];
    for (const b of batches) {
      const view = this.batchView(b, items.filter((i) => i.batchId === b.id), snap, today);
      const last = groups[groups.length - 1];
      if (last && last.date === b.sentOn) last.batches.push(view);
      else groups.push({ date: b.sentOn, batches: [view] });
    }
    return { from, to, today, days: groups };
  }

  batchView(
    b: ReminderBatch,
    items: { taskId: string; kind: 'early' | 'due'; dueDateSnapshot: string; title: string; matrixName: string; matrixColor: Snapshot['matrices'][number]['color']; matrixSlug: string }[],
    snap: Snapshot,
    today: IsoDate,
  ) {
    const a = snap.assigneeById.get(b.assigneeId)!;
    const kinds = new Set(items.map((i) => i.kind));
    const stale = b.status === 'queued' && this.clock.now().getTime() - b.createdAt.getTime() > NO_CONFIRMATION_MS;
    // O seed grava um texto de exemplo; nesse caso a tela mostra a mensagem remontada a partir das demandas.
    const reconstructed = b.messageBody === SEED_PLACEHOLDER && items.length > 0;
    const message = reconstructed
      ? buildReminderMessage({
          assigneeName: a.fullName,
          channel: b.channel,
          today: b.sentOn,
          items: items.map((i) => ({ taskId: i.taskId, kind: i.kind, dueDateSnapshot: i.dueDateSnapshot, title: i.title, matrixName: i.matrixName })),
        })
      : { subject: b.subject, body: b.messageBody };
    return {
      id: b.id,
      sentOn: b.sentOn,
      assignee: personRef(a, primaryFolderColor(snap, a.id, today)),
      channel: b.channel,
      recipient: b.recipient,
      status: b.status,
      displayStatus: (stale ? 'no_confirmation' : b.status) as BatchDisplayStatus,
      kind: (kinds.size > 1 ? 'mixed' : ([...kinds][0] ?? 'early')) as BatchKind,
      items: items.map((i) => ({
        taskId: i.taskId,
        title: i.title,
        kind: i.kind,
        dueDateSnapshot: i.dueDateSnapshot,
        matrix: { name: i.matrixName, color: i.matrixColor, slug: i.matrixSlug },
      })),
      subject: message.subject,
      messageBody: message.body,
      messageReconstructed: reconstructed,
      error: b.errorMessage,
      providerMessageId: b.providerMessageId,
      makeExecutionId: b.makeExecutionId,
      createdAt: b.createdAt.toISOString(),
      finishedAt: b.finishedAt?.toISOString() ?? null,
    };
  }
}
