import Link from "next/link";
import type { FolderColor, IsoDate } from "@/lib/api-types";
import { dayOfMonth, ddmm, weekdayShort } from "@/lib/dates";
import { folderTheme } from "@/lib/folder-colors";

/** Tira de 7 dias úteis com os pontos das pastas que vencem em cada dia. Clicar filtra a régua. */
export function DayStrip({ days, today, selected }: { days: { date: IsoDate; folderColors: FolderColor[] }[]; today: IsoDate; selected: IsoDate | null }) {
  const highlighted = selected ?? today;
  return (
    <div role="group" aria-label="Filtrar a régua por dia" className="flex max-w-full gap-[6px] overflow-x-auto rounded-[22px] bg-surface p-[6px]">
      {days.map((d) => {
        const on = d.date === highlighted;
        const href = selected === d.date ? "/" : `/?dia=${d.date}`;
        return (
          <Link
            key={d.date}
            href={href}
            scroll={false}
            aria-pressed={selected === d.date}
            aria-label={`${weekdayShort(d.date)} ${ddmm(d.date)}${d.folderColors.length ? `, ${d.folderColors.length} pasta(s) com prazo` : ", sem prazos"}`}
            className={`flex h-[66px] w-[54px] shrink-0 flex-col items-center justify-center gap-[2px] rounded-[16px] transition-colors duration-150 ${
              on ? "bg-ink text-white" : "text-ink hover:bg-surface-muted"
            }`}
          >
            <span className="text-[12px] font-medium opacity-80">{weekdayShort(d.date)}</span>
            <span className="text-[18px] leading-[22px] font-bold">{dayOfMonth(d.date)}</span>
            <span className="flex h-[6px] gap-[3px]" aria-hidden="true">
              {d.folderColors.map((c, i) => (
                <span key={c + i} className="h-[6px] w-[6px] rounded-full" style={{ background: folderTheme[c].solid }} />
              ))}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
