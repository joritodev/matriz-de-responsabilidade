import type { BatchDisplayStatus, DueStatus } from "@/lib/api-types";
import { dueStatusLabel } from "@/lib/dates";

type Tone = "late" | "today" | "soon" | "ok" | "done" | "white";

const tones: Record<Tone, string> = {
  late: "bg-late-bg text-late-fg",
  today: "bg-today-bg text-today-fg",
  soon: "bg-soon-bg text-soon-fg",
  ok: "bg-ok-bg text-ok-fg",
  done: "bg-done-bg text-done-fg",
  white: "bg-white text-f-ink",
};

export function Chip({ tone, children, small = false, className = "" }: { tone: Tone; children: React.ReactNode; small?: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-[10px] text-[12px] leading-4 font-bold ${small ? "h-[22px]" : "h-[26px]"} ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function dueTone(s: DueStatus): Tone {
  switch (s.kind) {
    case "overdue": return "late";
    case "today": return "today";
    case "soon": return "soon";
    case "done": return "done";
    default: return "ok";
  }
}

export function StatusChip({ status, label, small }: { status: DueStatus; label?: string; small?: boolean }) {
  return (
    <Chip tone={dueTone(status)} small={small}>
      {label ?? dueStatusLabel(status)}
    </Chip>
  );
}

const batchLabels: Record<BatchDisplayStatus, [string, Tone]> = {
  sent: ["enviada", "ok"],
  failed: ["falhou", "late"],
  queued: ["na fila", "ok"],
  taken: ["recebida", "soon"],
  no_confirmation: ["sem confirmação", "ok"],
};

export function BatchChip({ status, small = true }: { status: BatchDisplayStatus; small?: boolean }) {
  const [label, tone] = batchLabels[status];
  return (
    <Chip tone={tone} small={small}>
      {label}
    </Chip>
  );
}
