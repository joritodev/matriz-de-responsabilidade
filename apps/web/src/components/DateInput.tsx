"use client";

import { CalendarBlankIcon } from "@phosphor-icons/react";
import { useRef } from "react";
import type { IsoDate } from "@/lib/api-types";
import { ddmm, parseDateInput, weekdayLong } from "@/lib/dates";

/** Campo de prazo: aceita "23/10", "23/10/2026" ou o seletor nativo e mostra o dia da semana. */
export function DateInput({
  id,
  value,
  onChange,
  today,
  placeholder = "dd/mm",
  invalid,
  describedBy,
  className = "",
  onEnter,
}: {
  id: string;
  value: string;
  onChange: (raw: string) => void;
  today: IsoDate;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
  onEnter?: () => void;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const parsed = parseDateInput(value, today);
  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        className="field pr-[88px]"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />
      <span className="pointer-events-none absolute top-1/2 right-[42px] -translate-y-1/2 text-[13px] text-ink-3" aria-live="polite">
        {parsed ? weekdayLong(parsed).replace("-feira", "") : ""}
      </span>
      <button
        type="button"
        className="absolute top-1/2 right-[6px] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-2 hover:bg-surface-muted"
        aria-label="Abrir calendário"
        onClick={() => {
          const el = picker.current;
          if (!el) return;
          if (typeof el.showPicker === "function") el.showPicker();
          else el.click();
        }}
      >
        <CalendarBlankIcon size={18} aria-hidden="true" />
      </button>
      <input
        ref={picker}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute right-0 bottom-0 h-0 w-0 opacity-0"
        value={parsed ?? ""}
        min={today}
        onChange={(e) => e.target.value && onChange(`${ddmm(e.target.value)}/${e.target.value.slice(0, 4)}`)}
      />
    </div>
  );
}
