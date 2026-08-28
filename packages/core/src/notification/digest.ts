import type { BaseStatus, DeadlineStatus } from "../status/types";
import { buildReminderMessage, firstName } from "./reminder-message";

export type DigestStrategy = "DIGEST_WHEN_2_PLUS" | "ALWAYS_PER_TASK" | "ALWAYS_DIGEST";

export type ReminderCandidate = {
  taskId: string;
  responsibleId: string;
  responsibleName: string;
  sequenceNumber: number;
  taskTitle: string;
  matrixName: string;
  matrixArchived: boolean;
  dueDate: string | null;
  baseStatus: BaseStatus;
  deadlineStatus: DeadlineStatus;
  overdueDays?: number;
  responsibleActive: boolean;
  optInStatus: string;
  /** dedupe_key já registrada como enviada hoje (§6.2, §7.1). */
  alreadySentToday: boolean;
};

export type SkipReason =
  | "TASK_CLOSED"
  | "NO_DEADLINE_PRESSURE"
  | "WAITING_FOR_TRIGGER"
  | "BLOCKED_IS_NOT_LATE"
  | "RESPONSIBLE_INACTIVE"
  | "OPTED_OUT"
  | "MATRIX_ARCHIVED"
  | "ALREADY_SENT_TODAY";

export type SkippedReminder = { candidate: ReminderCandidate; reason: SkipReason };

export type PlannedReminder = {
  responsibleId: string;
  responsibleName: string;
  kind: "SINGLE" | "DIGEST";
  taskIds: string[];
  dedupeKeys: string[];
  message: string;
};

export type DailyReminderPlan = {
  planned: PlannedReminder[];
  skipped: SkippedReminder[];
};

const PRESSURE: DeadlineStatus[] = ["DUE_SOON", "DUE_TODAY", "OVERDUE"];

/**
 * §6.2 — o que as regras nunca cobram. Bloqueio não é atraso do responsável (A26).
 */
export function skipReasonFor(candidate: ReminderCandidate): SkipReason | null {
  if (candidate.baseStatus === "COMPLETED" || candidate.baseStatus === "CANCELLED") return "TASK_CLOSED";
  if (candidate.deadlineStatus === "WAITING_FOR_TRIGGER" || candidate.deadlineStatus === "NOT_APPLICABLE") {
    return "WAITING_FOR_TRIGGER";
  }
  if (!PRESSURE.includes(candidate.deadlineStatus)) return "NO_DEADLINE_PRESSURE";
  if (candidate.baseStatus === "BLOCKED" && candidate.deadlineStatus === "OVERDUE") return "BLOCKED_IS_NOT_LATE";
  if (!candidate.responsibleActive) return "RESPONSIBLE_INACTIVE";
  if (candidate.optInStatus === "OPTED_OUT") return "OPTED_OUT";
  if (candidate.matrixArchived) return "MATRIX_ARCHIVED";
  if (candidate.alreadySentToday) return "ALREADY_SENT_TODAY";
  return null;
}

export function dedupeKey(candidate: ReminderCandidate, today: string): string {
  return `task:${candidate.taskId}:responsible:${candidate.responsibleId}:day:${today}`;
}

export type PlanOptions = {
  today: string;
  strategy?: DigestStrategy;
  /** WA-A4: teto de linhas no digest antes de "e mais X". */
  maxDigestLines?: number;
};

export function planDailyReminders(
  candidates: ReminderCandidate[],
  options: PlanOptions,
): DailyReminderPlan {
  const strategy = options.strategy ?? "DIGEST_WHEN_2_PLUS";
  const maxLines = options.maxDigestLines ?? 5;

  const skipped: SkippedReminder[] = [];
  const byResponsible = new Map<string, ReminderCandidate[]>();

  for (const candidate of candidates) {
    const reason = skipReasonFor(candidate);
    if (reason) {
      skipped.push({ candidate, reason });
      continue;
    }
    const list = byResponsible.get(candidate.responsibleId) ?? [];
    list.push(candidate);
    byResponsible.set(candidate.responsibleId, list);
  }

  const planned: PlannedReminder[] = [];

  for (const [responsibleId, list] of byResponsible) {
    const ordered = [...list].sort(byUrgency);
    const useDigest =
      strategy === "ALWAYS_DIGEST" ||
      (strategy === "DIGEST_WHEN_2_PLUS" && ordered.length >= 2);

    if (!useDigest) {
      for (const candidate of ordered) {
        planned.push({
          responsibleId,
          responsibleName: candidate.responsibleName,
          kind: "SINGLE",
          taskIds: [candidate.taskId],
          dedupeKeys: [dedupeKey(candidate, options.today)],
          message: buildReminderMessage({
            responsibleName: candidate.responsibleName,
            taskTitle: candidate.taskTitle,
            matrixName: candidate.matrixName,
            dueDate: candidate.dueDate,
            deadlineStatus: candidate.deadlineStatus,
            overdueDays: candidate.overdueDays,
          }),
        });
      }
      continue;
    }

    planned.push({
      responsibleId,
      responsibleName: ordered[0]!.responsibleName,
      kind: "DIGEST",
      taskIds: ordered.map((c) => c.taskId),
      dedupeKeys: ordered.map((c) => dedupeKey(c, options.today)),
      message: buildDigestMessage(ordered, maxLines),
    });
  }

  planned.sort((a, b) => a.responsibleName.localeCompare(b.responsibleName, "pt-BR"));
  return { planned, skipped };
}

/** §5.4 — reminder_digest. */
export function buildDigestMessage(candidates: ReminderCandidate[], maxLines = 5): string {
  const name = firstName(candidates[0]!.responsibleName);
  const shown = candidates.slice(0, maxLines);
  const hidden = candidates.length - shown.length;

  const lines = shown.map((c) => {
    const due = c.dueDate ? formatPtBr(c.dueDate) : "sem prazo";
    const tag = c.deadlineStatus === "OVERDUE" ? " — atrasada" : c.deadlineStatus === "DUE_TODAY" ? " — vence hoje" : "";
    return `#${c.sequenceNumber} ${c.matrixName} — ${c.taskTitle} (prazo ${due})${tag}`;
  });

  if (hidden > 0) {
    lines.push(`e mais ${hidden} no sistema`);
  }

  const count = candidates.length;
  return [
    `Oi, ${name}! Você tem ${count} demandas para acompanhar hoje:`,
    "",
    lines.join("\n"),
    "",
    "Se alguma estiver travada, dependendo de outra pessoa ou precisando de prazo novo, me avisa por aqui.",
  ].join("\n");
}

const URGENCY: Record<string, number> = { OVERDUE: 0, DUE_TODAY: 1, DUE_SOON: 2 };

function byUrgency(a: ReminderCandidate, b: ReminderCandidate): number {
  const ua = URGENCY[a.deadlineStatus] ?? 9;
  const ub = URGENCY[b.deadlineStatus] ?? 9;
  if (ua !== ub) return ua - ub;
  return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
}

function formatPtBr(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}`;
}
