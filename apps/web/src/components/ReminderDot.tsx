import type { ReminderState } from "@/lib/api-types";

export const reminderStateLabel: Record<ReminderState, string> = {
  sent: "enviada",
  planned: "prevista",
  failed: "falhou",
  queued: "na fila, sem confirmação",
  none: "não se aplica",
};

const sizes = { lg: "h-[14px] w-[14px]", md: "h-3 w-3", sm: "h-[10px] w-[10px]" };

/** Cheio = enviada; vazado = prevista; vermelho = falhou. */
export function ReminderDot({ state, size = "lg", className = "" }: { state: ReminderState; size?: keyof typeof sizes; className?: string }) {
  const look =
    state === "sent"
      ? "bg-ink"
      : state === "failed"
        ? "border-2 border-late-fg bg-late-bg"
        : state === "queued"
          ? "border-2 border-ink bg-[#C9CED6]"
          : state === "planned"
            ? "border-2 border-ink"
            : "border-2 border-dash";
  return <span aria-hidden="true" className={`block shrink-0 rounded-full ${sizes[size]} ${look} ${className}`} />;
}
