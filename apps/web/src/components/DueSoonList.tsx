import Link from "next/link";
import type { Overview } from "@/lib/api-types";
import { DateTile } from "./DateTile";
import { ReminderTrack } from "./ReminderTrack";

/** Celular: lista "Vence logo" no lugar da régua. */
export function DueSoonList({ items }: { items: Overview["dueSoon"] }) {
  return (
    <section aria-labelledby="due-soon" className="rounded-card bg-surface px-[18px] pt-5 pb-2 md:hidden">
      <h2 id="due-soon" className="text-[20px] leading-6 font-bold tracking-[-0.02em]">
        Vence logo
      </h2>
      {items.length === 0 ? (
        <p className="py-5 text-[15px] text-ink-2">Nada vence nos próximos dias.</p>
      ) : (
        <ul className="mt-2">
          {items.map((t) => (
            <li key={t.taskId} className="border-b border-line last:border-b-0">
              <Link href={`/pastas/${t.matrix.slug}?demanda=${t.taskId}`} className="flex items-center gap-[14px] py-[14px]">
                <DateTile date={t.dueDate} status={t.status} folder={t.matrix.color} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[16px] leading-[22px] font-semibold">{t.title}</b>
                  <span className="block truncate text-[13px] text-ink-3">
                    {t.assigneeName.split(" ")[0]}, {t.matrix.name}
                    {t.status.kind === "overdue" ? ", atrasada" : ""}
                  </span>
                </span>
                <ReminderTrack early={t.early} due={t.due} compact />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
