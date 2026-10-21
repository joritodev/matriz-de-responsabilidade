"use client";

import type { ChannelPreference } from "@/lib/api-types";

const OPTIONS: { value: ChannelPreference; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail" },
  { value: "both", label: "Os dois" },
];

/** Pílula com três opções; a ativa fica ink. */
export function ChannelSegmented({
  value,
  onChange,
  label,
  disabled = false,
}: {
  value: ChannelPreference;
  onChange: (v: ChannelPreference) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-surface-muted p-[3px]">
      {OPTIONS.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => !on && onChange(o.value)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const i = OPTIONS.findIndex((x) => x.value === value);
              const next = OPTIONS[(i + (e.key === "ArrowRight" ? 1 : OPTIONS.length - 1)) % OPTIONS.length];
              onChange(next.value);
              (e.currentTarget.parentElement?.children[OPTIONS.indexOf(next)] as HTMLElement | undefined)?.focus();
            }}
            tabIndex={on ? 0 : -1}
            className={`h-[30px] rounded-full px-[11px] text-[12px] font-semibold transition-colors duration-150 disabled:opacity-60 ${
              on ? "bg-ink text-white" : "text-ink hover:bg-nav-hover"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
