import type { ReminderState } from "@/lib/api-types";
import { ReminderDot, reminderStateLabel } from "./ReminderDot";

/** Dois pontos ligados por traço: antecipada → no dia. */
export function ReminderTrack({
  early,
  due,
  compact = false,
}: {
  early: ReminderState;
  due: ReminderState;
  compact?: boolean;
}) {
  const label = `Cobrança antecipada ${reminderStateLabel[early]}; no dia ${reminderStateLabel[due]}`;
  return (
    <span className="inline-flex items-center" role="img" aria-label={label} title={label}>
      <ReminderDot state={early} size={compact ? "sm" : "md"} />
      <span aria-hidden="true" className={`block h-[2px] bg-track ${compact ? "w-[18px]" : "w-[34px]"}`} />
      <ReminderDot state={due} size={compact ? "sm" : "md"} />
    </span>
  );
}
