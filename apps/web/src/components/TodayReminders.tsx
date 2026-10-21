import Link from "next/link";
import type { IsoDate, Overview } from "@/lib/api-types";
import { capitalize, ddmm, timeOf, weekdayLong } from "@/lib/dates";
import { channelLabel, kindLabel, nextDayWord } from "@/lib/labels";
import { Avatar } from "./Avatar";
import { BatchChip } from "./StatusChip";

function summary(b: Overview["todayBatches"][number], today: IsoDate) {
  if (b.items.length === 1) {
    const it = b.items[0];
    return `${it.title}, ${it.dueDateSnapshot === today ? "vence hoje" : `prazo ${ddmm(it.dueDateSnapshot)}`}`;
  }
  return `${b.items.length} demandas: ${b.items.map((i) => i.title).join(" e ")}`;
}

/** Coluna lateral da Matriz geral: o que saiu às 08:00 e o resumo de amanhã. */
export function TodayReminders({ batches, tomorrow, today }: { batches: Overview["todayBatches"]; tomorrow: Overview["tomorrow"]; today: IsoDate }) {
  const nextWord = nextDayWord(tomorrow.date, today);
  return (
    <aside aria-labelledby="today-reminders" className="box-border flex max-w-full flex-[1_0_340px] flex-col gap-[6px] rounded-card bg-surface p-6">
      <div className="flex items-baseline justify-between">
        <h2 id="today-reminders" className="text-[22px] leading-7 font-bold tracking-[-0.02em]">
          Cobranças de hoje
        </h2>
        <span className="text-[13px] text-ink-3">08:00</span>
      </div>
      {batches.length === 0 ? (
        <p className="py-4 text-[14px] leading-5 text-ink-2">
          Nenhuma cobrança hoje. A próxima sai {nextWord === "amanhã" ? "amanhã" : weekdayLong(tomorrow.date)} às 08:00.
        </p>
      ) : (
        <ul>
          {batches.map((b) => (
            <li key={b.id} className="flex gap-3 border-b border-line py-[14px]">
              <Avatar initials={b.assignee.initials} color={b.assignee.color} size="md" />
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <div className="flex justify-between gap-2">
                  <b className="text-[15px] font-semibold">{b.assigneeName}</b>
                  <BatchChip status={b.displayStatus} />
                </div>
                <Link href={`/cobrancas?id=${b.id}`} className="text-[13px] text-ink-2 hover:underline">
                  {summary(b, today)}
                </Link>
                <span className="text-[12px] text-ink-3">
                  {b.status === "failed"
                    ? `${channelLabel(b.channel)} recusado. Nova tentativa ${nextWord}.`
                    : `${channelLabel(b.channel)}, ${timeOf(b.sentAt)}, ${kindLabel[b.kind]}`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-[10px] flex flex-col gap-1 rounded-[16px] bg-surface-muted px-4 py-[14px]">
        <b className="text-[14px] font-semibold">{nextWord === "amanhã" ? "Amanhã" : capitalize(weekdayLong(tomorrow.date))}, 08:00</b>
        <span className="text-[13px] text-ink-2">
          {tomorrow.count === 0 ? "Nenhuma cobrança prevista." : `${tomorrow.count} ${tomorrow.count === 1 ? "cobrança" : "cobranças"}: ${tomorrow.summary}.`}
        </span>
        <Link href="/cobrancas?aba=previa" className="mt-1 text-[13px] font-semibold underline underline-offset-2">
          Ver prévia das mensagens
        </Link>
      </div>
    </aside>
  );
}
