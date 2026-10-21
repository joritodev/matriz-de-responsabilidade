import type { Metadata } from "next";
import { DayStrip } from "@/components/DayStrip";
import { DeadlineRuler } from "@/components/DeadlineRuler";
import { DueSoonList } from "@/components/DueSoonList";
import { FolderCard, FolderCardMobile } from "@/components/FolderCard";
import { NewFolderCard } from "@/components/NewFolderCard";
import { TodayReminders } from "@/components/TodayReminders";
import { api } from "@/lib/api";
import { FOLDER_COLORS, type Overview } from "@/lib/api-types";
import { longDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Matriz geral" };

function greetingWord() {
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza", hour: "2-digit", hour12: false }).format(new Date()));
  return hour < 12 ? "Bom dia." : hour < 18 ? "Boa tarde." : "Boa noite.";
}

const vencem = (n: number) => (n === 1 ? "vence" : "vencem");

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const { dia } = await searchParams;
  const data = await api<Overview>("/overview");
  const { greeting, today } = data;
  const selectedDay = dia && data.ruler.columns.includes(dia) ? dia : null;
  const usedColors = new Set(data.folders.map((f) => f.color));
  const nextColor = FOLDER_COLORS.find((c) => !usedColors.has(c)) ?? "sky";

  const todayText =
    greeting.dueToday > 0 ? `${greeting.dueToday} ${greeting.dueToday === 1 ? "demanda vence" : "demandas vencem"} hoje` : "Nada vence hoje";
  const soonText = greeting.dueNext3Days > 0 ? ` e ${greeting.dueNext3Days} nos próximos três dias` : "";
  const sentText = greeting.remindersSentToday ? " As cobranças das 08:00 já saíram." : "";

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-[30px] leading-[34px] font-bold tracking-[-0.035em] md:text-[40px] md:leading-[44px]">{greetingWord()}</h1>
          <p className="mt-2 hidden max-w-[560px] text-[16px] leading-6 text-ink-2 md:block">
            {longDate(today)}. <b className="font-semibold text-ink">{todayText}</b>
            {soonText}.{sentText}
          </p>
          <p className="mt-2 text-[16px] leading-6 text-ink-2 md:hidden">
            {longDate(today)}.{" "}
            <b className="font-bold text-ink">
              {greeting.dueToday > 0 ? `${greeting.dueToday} ${vencem(greeting.dueToday)} hoje.` : "Nada vence hoje."}
            </b>
          </p>
        </div>
        <div className="hidden md:block">
          <DayStrip days={data.days} today={today} selected={selectedDay} />
        </div>
      </section>

      {data.folders.length === 0 ? (
        <section aria-label="Pastas" className="grid grid-cols-1 sm:max-w-[420px]">
          <NewFolderCard suggestedColor="lilac" large />
        </section>
      ) : (
        <>
          <section aria-label="Pastas" className="hidden grid-cols-[repeat(auto-fit,minmax(min(250px,100%),1fr))] gap-4 md:grid">
            {data.folders.map((f) => (
              <FolderCard key={f.id} folder={f} today={today} />
            ))}
            <NewFolderCard suggestedColor={nextColor} />
          </section>
          <section aria-label="Pastas" className="-mx-4 -mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:hidden">
            {data.folders.map((f) => (
              <FolderCardMobile key={f.id} folder={f} />
            ))}
          </section>
        </>
      )}

      <DueSoonList items={data.dueSoon} />

      <div className="hidden flex-wrap items-start gap-5 md:flex">
        <DeadlineRuler columns={data.ruler.columns} groups={data.ruler.groups} today={today} selectedDay={selectedDay} />
        <TodayReminders batches={data.todayBatches} tomorrow={data.tomorrow} today={today} />
      </div>
    </>
  );
}
