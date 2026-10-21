import Link from "next/link";
import type { IsoDate, RulerGroup, RulerRow } from "@/lib/api-types";
import { dayOfMonth, ddmm, weekdayShort } from "@/lib/dates";
import { folderTheme } from "@/lib/folder-colors";
import { ReminderDot, reminderStateLabel } from "./ReminderDot";

function Bar({ row, columns, today, color }: { row: RulerRow; columns: IsoDate[]; today: IsoDate; color: RulerGroup["color"] }) {
  const theme = folderTheme[color];
  const todayIdx = Math.max(0, columns.findIndex((c) => c >= today));
  if (row.status.kind === "overdue") {
    return (
      <div
        className="mx-[3px] flex h-[34px] items-center justify-end rounded-[0_999px_999px_0] bg-late-bg pr-1"
        style={{ gridColumn: `2 / ${todayIdx + 3}` }}
      >
        <span className="inline-flex h-[26px] items-center rounded-full bg-late-fg px-2 text-[12px] font-bold text-white">atrasada</span>
      </div>
    );
  }
  const start = row.earlyDate ?? row.dueDate;
  let startIdx = columns.findIndex((c) => c >= start);
  if (startIdx < 0) startIdx = 0;
  let endIdx = -1;
  for (let i = columns.length - 1; i >= 0; i--) {
    if (columns[i] <= row.dueDate) {
      endIdx = i;
      break;
    }
  }
  if (endIdx < startIdx) endIdx = startIdx;
  const clipped = start < columns[0];
  const isToday = row.status.kind === "today";
  const endStyle =
    row.due === "failed"
      ? { background: "#A1141C", color: "#FFFFFF" }
      : isToday
        ? { background: "#16181D", color: "#FFFFFF" }
        : { background: theme.solid, color: "#16181D" };
  const label = `Antecipada ${row.earlyDate ? `${ddmm(row.earlyDate)}, ${reminderStateLabel[row.early]}` : "não se aplica"}; prazo ${ddmm(row.dueDate)}, cobrança no dia ${reminderStateLabel[row.due]}`;
  return (
    <div
      className={`mx-[3px] flex h-[34px] items-center justify-between pr-1 pl-2 ${clipped ? "rounded-[0_999px_999px_0]" : "rounded-full"}`}
      style={{ gridColumn: `${startIdx + 2} / ${endIdx + 3}`, background: theme.bg }}
      role="img"
      aria-label={label}
      title={label}
    >
      {row.earlyDate ? <ReminderDot state={row.early} /> : <span />}
      <span className="inline-flex h-[26px] min-w-[34px] items-center justify-center rounded-full px-2 text-[12px] font-bold" style={endStyle}>
        {dayOfMonth(row.dueDate)}
      </span>
    </div>
  );
}

/** Régua de 10 dias úteis com barras da cobrança antecipada até o prazo. */
export function DeadlineRuler({
  columns,
  groups,
  today,
  selectedDay,
}: {
  columns: IsoDate[];
  groups: RulerGroup[];
  today: IsoDate;
  selectedDay: IsoDate | null;
}) {
  const todayIdx = columns.indexOf(today);
  const visible = groups.map((g) => ({ ...g, rows: selectedDay ? g.rows.filter((r) => r.dueDate === selectedDay) : g.rows }));
  const nothing = visible.every((g) => g.rows.length === 0);

  return (
    <section aria-labelledby="ruler-title" className="min-w-0 flex-[999_1_640px] rounded-card bg-surface px-6 pt-6 pb-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="ruler-title" className="text-[22px] leading-7 font-bold tracking-[-0.02em]">
          {selectedDay ? `Vencem ${weekdayShort(selectedDay)} ${ddmm(selectedDay)}` : "Próximas duas semanas"}
        </h2>
        <div className="flex flex-wrap gap-4 text-[13px] text-ink-2">
          <span className="flex items-center gap-[6px]">
            <ReminderDot state="sent" /> cobrança enviada
          </span>
          <span className="flex items-center gap-[6px]">
            <ReminderDot state="planned" /> cobrança prevista
          </span>
          <span className="flex items-center gap-[6px]">
            <ReminderDot state="failed" /> falhou
          </span>
        </div>
      </div>
      {selectedDay && (
        <Link href="/" scroll={false} className="mt-2 inline-block text-[13px] font-semibold underline underline-offset-2">
          Ver as duas semanas
        </Link>
      )}

      {nothing ? (
        <p className="mt-6 rounded-[18px] bg-surface-muted px-5 py-6 text-[15px] text-ink-2">
          {selectedDay ? "Nada vence neste dia." : "Nada vence nas próximas duas semanas."}
        </p>
      ) : (
        <div className="mt-[14px] overflow-x-auto">
          <div className="relative min-w-[820px]">
            {todayIdx >= 0 && (
              <span
                aria-hidden="true"
                className="absolute top-0 bottom-0 rounded-[12px] bg-[rgba(22,24,29,.045)]"
                style={{ left: `calc(230px + (100% - 230px) * ${todayIdx / 10})`, width: "calc((100% - 230px) / 10)" }}
              />
            )}
            <div className="relative grid h-9 grid-cols-[230px_repeat(10,minmax(0,1fr))] items-center text-[12px] font-semibold text-ink-3">
              <span />
              {columns.map((c) => (
                <span key={c} className={`text-center ${c === today ? "text-ink" : ""}`}>
                  {c === today ? "Hoje" : `${weekdayShort(c)} ${dayOfMonth(c)}`}
                </span>
              ))}
            </div>
            {visible.map((g) => {
              const theme = folderTheme[g.color];
              return (
                <div key={g.folderId} className="relative">
                  <div className="flex items-center gap-2 pt-[14px] pb-1 text-[13px] font-bold" style={{ color: theme.ink }}>
                    <span className="h-[10px] w-[10px] rounded-[3px]" style={{ background: theme.solid }} aria-hidden="true" />
                    <Link href={`/pastas/${g.slug}`} className="rounded hover:underline">
                      {g.name}
                    </Link>
                    {g.rows.length === 0 && (
                      <span className="font-medium text-ink-3">{selectedDay ? "nada neste dia" : "nada nas próximas duas semanas"}</span>
                    )}
                  </div>
                  {g.rows.map((r) => (
                    <div key={r.taskId} className="grid min-h-14 grid-cols-[230px_repeat(10,minmax(0,1fr))] items-center">
                      <Link href={`/pastas/${g.slug}?demanda=${r.taskId}`} className="flex min-w-0 items-center gap-[10px] rounded-[12px] pr-3">
                        <span
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                          style={{ background: theme.bg, color: theme.ink }}
                          aria-hidden="true"
                        >
                          {r.initials}
                        </span>
                        <span className="min-w-0">
                          <b className="block truncate text-[14px] font-semibold">{r.title}</b>
                          <small className="block truncate text-[12px] text-ink-3">
                            {r.assigneeName}
                            {r.status.kind === "overdue" ? `, venceu ${weekdayShort(r.dueDate)} ${dayOfMonth(r.dueDate)}` : ""}
                          </small>
                        </span>
                      </Link>
                      <Bar row={r} columns={columns} today={today} color={g.color} />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
