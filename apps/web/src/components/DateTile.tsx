import type { DueStatus, FolderColor, IsoDate } from "@/lib/api-types";
import { dayOfMonth, weekdayShort } from "@/lib/dates";
import { folderTheme } from "@/lib/folder-colors";

/** Quadrado com dia e dia da semana, colorido pela situação (ou pela pasta). */
export function DateTile({ date, status, folder }: { date: IsoDate; status: DueStatus; folder?: FolderColor }) {
  let style: React.CSSProperties;
  let sub = weekdayShort(date);
  switch (status.kind) {
    case "overdue":
      style = { background: "#FFE2E3", color: "#A1141C" };
      break;
    case "today":
      style = { background: "#16181D", color: "#FFFFFF" };
      sub = "hoje";
      break;
    case "soon":
      style = folder ? { background: folderTheme[folder].bg, color: folderTheme[folder].ink } : { background: "#FFF0B3", color: "#614A00" };
      break;
    case "done":
      style = { background: "#DDF3E7", color: "#11593A" };
      break;
    default:
      style = { background: "#F0F1F4", color: "#16181D" };
  }
  return (
    <span className="flex h-[46px] w-[46px] shrink-0 flex-col items-center justify-center rounded-[14px] leading-none" style={style}>
      <span className="text-[17px] font-bold">{dayOfMonth(date)}</span>
      <span className="mt-[3px] text-[11px] font-semibold">{sub}</span>
    </span>
  );
}
