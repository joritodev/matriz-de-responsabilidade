import type { ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  className = "",
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | null;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-[6px] ${className}`}>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2 text-[12px] leading-4 font-semibold text-ink-2">
        <span>{label}</span>
        {hint && <span className="font-medium text-ink-3">{hint}</span>}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-[13px] leading-[18px] text-late-fg">
          {error}
        </p>
      )}
    </div>
  );
}
