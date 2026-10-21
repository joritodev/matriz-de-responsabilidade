import { CircleNotchIcon } from "@phosphor-icons/react/dist/ssr";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "folder" | "muted" | "danger";
type Size = "default" | "row" | "form";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-[#2A2D35]",
  secondary: "border-[1.5px] border-line bg-surface text-ink hover:bg-surface-muted",
  folder: "bg-f-ink text-white hover:opacity-90",
  muted: "bg-surface-muted text-ink-2 hover:bg-nav-hover",
  danger: "bg-late-fg text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  default: "h-10 px-[18px]",
  row: "h-[34px] px-4",
  form: "h-11 px-[18px]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "default", extra = "") {
  return `pressable inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[14px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({
  variant = "primary",
  size = "default",
  loading = false,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
    >
      {loading && <CircleNotchIcon size={16} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
