/**
 * Regra de cobrança do Prazo. Funções puras, sem banco e sem relógio:
 * quem chama passa "hoje" (data local America/Fortaleza) e os feriados.
 *
 * Copiar para apps/api/src/reminders/rules/ sem alterar a lógica.
 * Os testes em reminder-rules.spec.ts descrevem o comportamento esperado.
 */

export type IsoDate = string; // 'YYYY-MM-DD'
export type ReminderKind = 'early' | 'due';
export type Channel = 'whatsapp' | 'email';
export type ChannelPreference = Channel | 'both';

export const APP_TIME_ZONE = 'America/Fortaleza';
/** Cobrança antecipada: a partir de 3 dias corridos antes do prazo. */
export const EARLY_WINDOW_DAYS = 3;
/** Nunca antecipar mais do que isso, mesmo com feriado emendado. */
export const EARLY_MAX_DAYS = 5;

export interface Calendar {
  holidays: ReadonlySet<IsoDate>;
}

// ---------- datas ----------

const toUtc = (d: IsoDate): Date => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error(`Data inválida: ${d}`);
  return new Date(`${d}T00:00:00Z`);
};
const fromUtc = (dt: Date): IsoDate => dt.toISOString().slice(0, 10);

export function addDays(d: IsoDate, n: number): IsoDate {
  const dt = toUtc(d);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fromUtc(dt);
}

/** Dias corridos de `from` até `to` (positivo se `to` é depois). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);
}

/** 0 = domingo ... 6 = sábado */
export function weekday(d: IsoDate): number {
  return toUtc(d).getUTCDay();
}

export function isBusinessDay(d: IsoDate, cal: Calendar): boolean {
  const w = weekday(d);
  return w !== 0 && w !== 6 && !cal.holidays.has(d);
}

/** Data de hoje no fuso do app, nunca UTC. */
export function todayInTimeZone(now: Date, timeZone: string = APP_TIME_ZONE): IsoDate {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

// ---------- quando cobrar ----------

/** Dia da cobrança "no dia": o próprio prazo ou o dia útil anterior. */
export function dueReminderDate(due: IsoDate, cal: Calendar): IsoDate {
  let d = due;
  while (!isBusinessDay(d, cal)) d = addDays(d, -1);
  return d;
}

/**
 * Primeiro dia em que a cobrança antecipada pode sair.
 * 1) primeiro dia útil entre D-3 e D-1 que seja antes do dia da cobrança "no dia";
 * 2) se não houver (fim de semana + feriado), o dia útil mais próximo entre D-4 e D-5;
 * 3) se ainda não houver, null: só existe a cobrança "no dia".
 */
export function earlyReminderDate(due: IsoDate, cal: Calendar): IsoDate | null {
  const dueDay = dueReminderDate(due, cal);
  for (let back = EARLY_WINDOW_DAYS; back >= 1; back--) {
    const d = addDays(due, -back);
    if (d < dueDay && isBusinessDay(d, cal)) return d;
  }
  for (let back = EARLY_WINDOW_DAYS + 1; back <= EARLY_MAX_DAYS; back++) {
    const d = addDays(due, -back);
    if (d < dueDay && isBusinessDay(d, cal)) return d;
  }
  return null;
}

/**
 * Que tipo de cobrança esta demanda pode receber hoje (sem olhar reservas).
 * "due" tem prioridade; "early" vale do primeiro dia permitido até a véspera
 * da cobrança "no dia", para cobrir demanda criada tarde ou envio que falhou.
 */
export function reminderKindFor(due: IsoDate, today: IsoDate, cal: Calendar): ReminderKind | null {
  if (!isBusinessDay(today, cal)) return null;
  const dueDay = dueReminderDate(due, cal);
  if (today === dueDay) return 'due';
  const earlyDay = earlyReminderDate(due, cal);
  if (earlyDay && today >= earlyDay && today < dueDay) return 'early';
  return null;
}

// ---------- planejamento do dia ----------

export interface AssigneeForReminder {
  id: string;
  fullName: string;
  whatsappE164: string | null;
  email: string | null;
  channel: ChannelPreference;
  isActive: boolean;
}

export interface TaskForReminder {
  id: string;
  title: string;
  dueDate: IsoDate;
  status: 'pending' | 'done' | 'canceled';
  matrixName: string;
  matrixPosition: number;
  position: number;
  assignee: AssigneeForReminder;
}

/** Reserva ativa já gravada (reminder_batch_items com is_active = true). */
export interface ActiveReservation {
  taskId: string;
  kind: ReminderKind;
  dueDateSnapshot: IsoDate;
  channel: Channel;
}

export interface PlannedItem {
  taskId: string;
  kind: ReminderKind;
  dueDateSnapshot: IsoDate;
  title: string;
  matrixName: string;
}

export interface PlannedBatch {
  assigneeId: string;
  assigneeName: string;
  channel: Channel;
  to: string;
  items: PlannedItem[];
  subject: string | null;
  body: string;
}

export interface SkippedTask {
  taskId: string;
  assigneeId: string;
  channel: Channel | null;
  reason: 'assignee_inactive' | 'missing_whatsapp' | 'missing_email';
}

export interface ReminderPlan {
  today: IsoDate;
  batches: PlannedBatch[];
  skipped: SkippedTask[];
}

export const reservationKey = (taskId: string, kind: ReminderKind, due: IsoDate, channel: Channel) =>
  `${taskId}|${kind}|${due}|${channel}`;

const channelsFor = (pref: ChannelPreference): Channel[] => (pref === 'both' ? ['whatsapp', 'email'] : [pref]);

export function planReminders(input: {
  today: IsoDate;
  tasks: TaskForReminder[];
  activeReservations: ActiveReservation[];
  calendar: Calendar;
}): ReminderPlan {
  const { today, tasks, calendar } = input;
  const reserved = new Set(input.activeReservations.map((r) => reservationKey(r.taskId, r.kind, r.dueDateSnapshot, r.channel)));
  const groups = new Map<string, { assignee: AssigneeForReminder; channel: Channel; to: string; tasks: { task: TaskForReminder; kind: ReminderKind }[] }>();
  const skipped: SkippedTask[] = [];

  for (const task of tasks) {
    if (task.status !== 'pending') continue;
    const kind = reminderKindFor(task.dueDate, today, calendar);
    if (!kind) continue;
    const a = task.assignee;
    if (!a.isActive) {
      skipped.push({ taskId: task.id, assigneeId: a.id, channel: null, reason: 'assignee_inactive' });
      continue;
    }
    for (const channel of channelsFor(a.channel)) {
      if (reserved.has(reservationKey(task.id, kind, task.dueDate, channel))) continue;
      const to = channel === 'whatsapp' ? a.whatsappE164 : a.email;
      if (!to) {
        skipped.push({ taskId: task.id, assigneeId: a.id, channel, reason: channel === 'whatsapp' ? 'missing_whatsapp' : 'missing_email' });
        continue;
      }
      const key = `${a.id}|${channel}`;
      if (!groups.has(key)) groups.set(key, { assignee: a, channel, to, tasks: [] });
      groups.get(key)!.tasks.push({ task, kind });
    }
  }

  const batches: PlannedBatch[] = [];
  for (const g of groups.values()) {
    g.tasks.sort(
      (x, y) =>
        (x.kind === 'due' ? 0 : 1) - (y.kind === 'due' ? 0 : 1) ||
        x.task.dueDate.localeCompare(y.task.dueDate) ||
        x.task.matrixPosition - y.task.matrixPosition ||
        x.task.position - y.task.position,
    );
    const items: PlannedItem[] = g.tasks.map(({ task, kind }) => ({
      taskId: task.id,
      kind,
      dueDateSnapshot: task.dueDate,
      title: task.title,
      matrixName: task.matrixName,
    }));
    const msg = buildReminderMessage({ assigneeName: g.assignee.fullName, items, today, channel: g.channel });
    batches.push({ assigneeId: g.assignee.id, assigneeName: g.assignee.fullName, channel: g.channel, to: g.to, items, ...msg });
  }
  batches.sort((x, y) => x.assigneeName.localeCompare(y.assigneeName, 'pt-BR') || x.channel.localeCompare(y.channel));
  return { today, batches, skipped };
}

// ---------- mensagem ----------

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const formatDayMonth = (d: IsoDate) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export function buildReminderMessage(input: {
  assigneeName: string;
  items: PlannedItem[];
  today: IsoDate;
  channel: Channel;
}): { subject: string | null; body: string } {
  const { assigneeName, items, today, channel } = input;
  if (items.length === 0) throw new Error('Mensagem sem demandas');
  const first = assigneeName.trim().split(/\s+/)[0];
  const many = items.length > 1;
  const dueCount = items.filter((i) => i.kind === 'due').length;
  const bold = (s: string) => (channel === 'whatsapp' ? `*${s}*` : s);

  let opening: string;
  if (dueCount === items.length) opening = `Bom dia, ${first}. Hoje é o prazo ${many ? 'destas demandas' : 'desta demanda'}:`;
  else if (dueCount === 0) opening = `Bom dia, ${first}. Como está o andamento ${many ? 'destas demandas' : 'desta demanda'}?`;
  else opening = `Bom dia, ${first}. Como está o andamento destas demandas? ${dueCount === 1 ? 'A primeira vence hoje.' : `As ${dueCount} primeiras vencem hoje.`}`;

  const blocks = items.map((it, i) => {
    const deadline =
      it.dueDateSnapshot === today
        ? `hoje, ${formatDayMonth(it.dueDateSnapshot)}`
        : `${formatDayMonth(it.dueDateSnapshot)} (${WEEKDAYS[weekday(it.dueDateSnapshot)]})`;
    return [bold(`Demanda ${i + 1}`), `Matriz: ${it.matrixName}`, `Demanda: ${it.title}`, `Responsável: ${assigneeName}`, `Deadline: ${deadline}`].join('\n');
  });

  const closing =
    dueCount === items.length
      ? `Está tudo certo para ${many ? 'as entregas' : 'a entrega'}? Se for necessário prorrogar${many ? ' alguma' : ''}, por favor avise para quando e o motivo.`
      : `Se for necessário prorrogar${many ? ' alguma' : ''}, por favor avise para quando e o motivo.`;

  const body = [opening, ...blocks, closing].join('\n\n');

  let subject: string | null = null;
  if (channel === 'email') {
    const lastDue = items.map((i) => i.dueDateSnapshot).sort().at(-1)!;
    if (dueCount === items.length) subject = many ? `Prazo de hoje: ${items.length} demandas` : `Prazo de hoje: ${items[0].title}`;
    else if (!many) subject = `Andamento: ${items[0].title}, prazo ${formatDayMonth(items[0].dueDateSnapshot)}`;
    else subject = `Andamento de ${items.length} demandas, prazos até ${formatDayMonth(lastDue)}`;
  }
  return { subject, body };
}

// ---------- situação exibida na interface ----------

export type DueStatus =
  | { kind: 'done' }
  | { kind: 'canceled' }
  | { kind: 'overdue'; days: number }
  | { kind: 'today' }
  | { kind: 'soon'; days: number }
  | { kind: 'ok'; days: number };

/** Mesma régua de cores das telas: atrasada, hoje, em até 3 dias, no prazo. */
export function dueStatus(task: { dueDate: IsoDate; status: TaskForReminder['status'] }, today: IsoDate): DueStatus {
  if (task.status === 'done') return { kind: 'done' };
  if (task.status === 'canceled') return { kind: 'canceled' };
  const days = daysBetween(today, task.dueDate);
  if (days < 0) return { kind: 'overdue', days: -days };
  if (days === 0) return { kind: 'today' };
  if (days <= EARLY_WINDOW_DAYS) return { kind: 'soon', days };
  return { kind: 'ok', days };
}

export function dueStatusLabel(s: DueStatus): string {
  switch (s.kind) {
    case 'done': return 'concluída';
    case 'canceled': return 'cancelada';
    case 'overdue': return s.days === 1 ? 'atrasada 1 dia' : `atrasada ${s.days} dias`;
    case 'today': return 'hoje';
    case 'soon': return s.days === 1 ? 'amanhã' : `em ${s.days} dias`;
    case 'ok': return 'no prazo';
  }
}
