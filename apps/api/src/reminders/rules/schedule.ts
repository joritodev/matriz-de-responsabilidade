/**
 * Funções novas ao lado de reminder-rules.ts (que não pode mudar).
 * Usadas pela régua de prazos, pela prévia e pelos resumos das telas.
 */
import {
  addDays,
  dueReminderDate,
  earlyReminderDate,
  isBusinessDay,
  weekday,
  type Calendar,
  type Channel,
  type IsoDate,
  type ReminderKind,
} from './reminder-rules';

export type ReminderState = 'sent' | 'planned' | 'failed' | 'queued' | 'none';

export function nextBusinessDay(d: IsoDate, cal: Calendar): IsoDate {
  let x = addDays(d, 1);
  while (!isBusinessDay(x, cal)) x = addDays(x, 1);
  return x;
}

export function previousBusinessDay(d: IsoDate, cal: Calendar): IsoDate {
  let x = addDays(d, -1);
  while (!isBusinessDay(x, cal)) x = addDays(x, -1);
  return x;
}

/** `count` dias úteis a partir de `start` (inclusive, se for útil). */
export function businessDaysFrom(start: IsoDate, count: number, cal: Calendar): IsoDate[] {
  const out: IsoDate[] = [];
  let d = start;
  while (out.length < count) {
    if (isBusinessDay(d, cal)) out.push(d);
    d = addDays(d, 1);
  }
  return out;
}

export interface ReminderItemState {
  kind: ReminderKind;
  channel: Channel;
  dueDateSnapshot: IsoDate;
  batchStatus: 'queued' | 'sent' | 'failed';
  createdAt: Date | string;
}

const severity: Record<'sent' | 'queued' | 'failed', number> = { sent: 0, queued: 1, failed: 2 };

/**
 * Estado de uma cobrança (antecipada ou no dia) para o prazo atual da demanda.
 * Por canal vale o lote mais recente; entre canais, o pior (falhou > na fila > enviada).
 * Sem lote: "planned" se ainda vai sair, "none" se não se aplica mais.
 */
export function reminderState(
  kind: ReminderKind,
  task: { dueDate: IsoDate; status: 'pending' | 'done' | 'canceled' },
  items: ReminderItemState[],
  today: IsoDate,
  cal: Calendar,
): ReminderState {
  const relevant = items.filter((i) => i.kind === kind && i.dueDateSnapshot === task.dueDate);
  if (relevant.length > 0) {
    const latest = new Map<Channel, ReminderItemState>();
    for (const it of relevant) {
      const cur = latest.get(it.channel);
      if (!cur || new Date(it.createdAt).getTime() >= new Date(cur.createdAt).getTime()) latest.set(it.channel, it);
    }
    let worst: 'sent' | 'queued' | 'failed' = 'sent';
    for (const it of latest.values()) if (severity[it.batchStatus] > severity[worst]) worst = it.batchStatus;
    return worst;
  }
  if (task.status !== 'pending') return 'none';
  const dueDay = dueReminderDate(task.dueDate, cal);
  if (kind === 'due') return today <= dueDay ? 'planned' : 'none';
  const earlyDay = earlyReminderDate(task.dueDate, cal);
  if (!earlyDay) return 'none';
  return today < dueDay ? 'planned' : 'none';
}

// ---------- texto ----------

export const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const WEEKDAYS_LONG = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const weekdayShort = (d: IsoDate) => WEEKDAYS_SHORT[weekday(d)];

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] ?? fullName;

/** "Uma", "Duas", ... até dez; depois, o número. Gênero feminino (demandas, cobranças). */
export function countWordFem(n: number): string {
  const words = ['Nenhuma', 'Uma', 'Duas', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove', 'Dez'];
  return words[n] ?? String(n);
}

/** Lista em português: "a", "a e b", "a, b e c". */
export function joinPt(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

/** Segunda-feira da semana de `d`. */
export function startOfWeek(d: IsoDate): IsoDate {
  const w = weekday(d);
  return addDays(d, w === 0 ? -6 : 1 - w);
}

/** Normaliza WhatsApp para só dígitos com DDI. Sem DDI (10 ou 11 dígitos) assume Brasil. */
export function normalizeWhatsapp(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (!digits) return null;
  const withDdi = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  return /^[1-9][0-9]{9,14}$/.test(withDdi) ? withDdi : null;
}

/** Gera slug sem acento, minúsculo e com hífens. */
export function slugify(name: string): string {
  const s = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'pasta';
}
