import type { DueStatus, IsoDate } from "./api-types";

export const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const WEEKDAYS_LONG = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
export const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const MONTHS_LONG = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const toUtc = (d: IsoDate) => new Date(`${d}T00:00:00Z`);

export const weekday = (d: IsoDate) => toUtc(d).getUTCDay();
export const dayOfMonth = (d: IsoDate) => Number(d.slice(8, 10));
export const monthIndex = (d: IsoDate) => Number(d.slice(5, 7)) - 1;
export const weekdayShort = (d: IsoDate) => WEEKDAYS_SHORT[weekday(d)];
export const weekdayLong = (d: IsoDate) => WEEKDAYS_LONG[weekday(d)];
export const ddmm = (d: IsoDate) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function addDays(d: IsoDate, n: number): IsoDate {
  const dt = toUtc(d);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);
}

/** "Terça, 20 de outubro" */
export const longDate = (d: IsoDate) => `${capitalize(weekdayLong(d))}, ${dayOfMonth(d)} de ${MONTHS_LONG[monthIndex(d)]}`;

/** Rótulo de dia relativo: "Hoje, terça 20", "Ontem, segunda 19", "Sexta, 16". */
export function relativeDayLabel(d: IsoDate, today: IsoDate): string {
  const diff = daysBetween(today, d);
  if (diff === 0) return `Hoje, ${weekdayLong(d)} ${dayOfMonth(d)}`;
  if (diff === -1) return `Ontem, ${weekdayLong(d)} ${dayOfMonth(d)}`;
  if (diff === 1) return `Amanhã, ${weekdayLong(d)} ${dayOfMonth(d)}`;
  return `${capitalize(weekdayLong(d))}, ${dayOfMonth(d)}${diff < -6 || diff > 6 ? `/${d.slice(5, 7)}` : ""}`;
}

/** Hora local "08:02" de um instante ISO, no fuso do app. */
export function timeOf(iso: string, timeZone = "America/Fortaleza"): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

export function dateOf(iso: string, timeZone = "America/Fortaleza"): IsoDate {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

/**
 * Aceita "23/10", "23/10/2026", "23/10/26" e "2026-10-23".
 * Sem ano: o ano corrente, ou o próximo se a data já passou há mais de 2 meses.
 */
export function parseDateInput(raw: string, today: IsoDate): IsoDate | null {
  const s = raw.trim();
  if (!s) return null;
  let y: number, m: number, d: number;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const br = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2}|\d{4}))?$/.exec(s);
  if (iso) {
    [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (br) {
    d = Number(br[1]);
    m = Number(br[2]);
    if (br[3]) {
      y = Number(br[3].length === 2 ? `20${br[3]}` : br[3]);
    } else {
      y = Number(today.slice(0, 4));
      const candidate = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (daysBetween(today, candidate) < -60) y += 1;
    }
  } else {
    return null;
  }
  const out = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const dt = new Date(`${out}T00:00:00Z`);
  if (Number.isNaN(dt.getTime()) || dt.toISOString().slice(0, 10) !== out) return null;
  return out;
}

export function dueStatusLabel(s: DueStatus): string {
  switch (s.kind) {
    case "done": return "concluída";
    case "canceled": return "cancelada";
    case "overdue": return s.days === 1 ? "atrasada 1 dia" : `atrasada ${s.days} dias`;
    case "today": return "hoje";
    case "soon": return s.days === 1 ? "amanhã" : `em ${s.days} dias`;
    case "ok": return "no prazo";
  }
}

/** Versão curta para cartões de pessoa: "atrasada", "hoje", "em 6 dias". */
export function dueStatusShort(s: DueStatus): string {
  switch (s.kind) {
    case "overdue": return "atrasada";
    case "ok": return `em ${s.days} dias`;
    default: return dueStatusLabel(s);
  }
}

export function formatWhatsapp(e164: string | null): string {
  if (!e164) return "";
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(e164);
  if (m) return `+55 ${m[1]} ${m[2]}-${m[3]}`;
  return `+${e164}`;
}
