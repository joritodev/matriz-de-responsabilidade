import type { FolderColor } from "@/lib/api-types";
import { folderTheme } from "@/lib/folder-colors";

const sizes = {
  sm: "h-8 w-8 text-[12px]",
  md: "h-10 w-10 text-[13px]",
  lg: "h-11 w-11 text-[14px]",
  xl: "h-[52px] w-[52px] text-[16px]",
};

export function Avatar({
  initials,
  color,
  size = "sm",
  tone = "bg",
  ring = false,
  label,
  className = "",
}: {
  initials: string;
  color?: FolderColor | null;
  size?: keyof typeof sizes;
  /** "bg": fundo da pasta; "white": fundo branco com texto da pasta (sobre o corpo da pasta). */
  tone?: "bg" | "white";
  ring?: boolean;
  label?: string;
  className?: string;
}) {
  const theme = color ? folderTheme[color] : null;
  const style =
    tone === "white"
      ? { background: "#FFFFFF", color: theme?.ink ?? "#16181D" }
      : { background: theme?.bg ?? "#D9DDE4", color: theme?.ink ?? "#16181D" };
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${sizes[size]} ${ring ? "border-2 border-white" : ""} ${className}`}
      style={style}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      title={label}
    >
      {initials}
    </span>
  );
}
