import { CaretLeftIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { Avatar } from "@/components/Avatar";
import { MessagePreview } from "@/components/MessagePreview";
import { BatchChip, Chip } from "@/components/StatusChip";
import { api } from "@/lib/api";
import type { Batch, BatchHistory, BatchItem, BatchKind, Channel, IsoDate, PersonRef, Preview } from "@/lib/api-types";
import { capitalize, ddmm, formatWhatsapp, relativeDayLabel, timeOf, weekdayLong } from "@/lib/dates";
import { folderTheme } from "@/lib/folder-colors";
import { channelLabel, kindLabel, nextDayWord } from "@/lib/labels";

export const metadata: Metadata = { title: "Cobranças" };

interface Row {
  key: string;
  href: string;
  assignee: PersonRef;
  meta: string;
  items: BatchItem[];
  chip: React.ReactNode;
}

function itemsText(items: BatchItem[]) {
  return items.map((i) => i.title).join(items.length === 2 ? " e " : ", ");
}

function metaText(channel: Channel, time: string | null, kind: BatchKind, items: BatchItem[], sentOn: IsoDate) {
  const parts = [channelLabel(channel)];
  if (time) parts.push(time);
  let k = kindLabel[kind];
  if (items.length > 1) k += `, ${items.length} demandas`;
  const offDay = kind === "due" && items.length === 1 && items[0].dueDateSnapshot !== sentOn;
  parts.push(offDay ? `${k} (prazo no ${weekdayLong(items[0].dueDateSnapshot)})` : k);
  return parts.join(", ");
}

function ReminderLog({ groups, selectedKey, empty }: { groups: { label: string; rows: Row[] }[]; selectedKey: string | null; empty: string }) {
  if (groups.length === 0) return <p className="px-2 py-10 text-center text-[15px] text-ink-2">{empty}</p>;
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <section key={g.label} aria-label={g.label}>
          <h2 className="px-[10px] pb-[6px] text-[13px] font-semibold text-ink-2">{g.label}</h2>
          <ul className="flex flex-col">
            {g.rows.map((r) => {
              const on = r.key === selectedKey;
              return (
                <li key={r.key}>
                  <Link
                    href={r.href}
                    scroll={false}
                    aria-current={on ? "true" : undefined}
                    className={`flex items-center gap-3 rounded-[16px] px-[10px] py-[10px] transition-colors duration-150 ${on ? "bg-surface-muted" : "hover:bg-surface-muted/60"}`}
                  >
                    <Avatar initials={r.assignee.initials} color={r.assignee.color} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <b className="text-[15px] font-semibold">{r.assignee.fullName}</b>
                        <span className="text-[12px] text-ink-2">{r.meta}</span>
                      </span>
                      <span className="mt-[2px] flex items-center gap-2 text-[13px] text-ink-2">
                        <span className="flex shrink-0 gap-[3px]" aria-hidden="true">
                          {[...new Set(r.items.map((i) => i.matrix.color))].map((c) => (
                            <span key={c} className="h-[9px] w-[9px] rounded-[3px]" style={{ background: folderTheme[c].solid }} />
                          ))}
                        </span>
                        <span className="truncate">{itemsText(r.items)}</span>
                      </span>
                    </span>
                    {r.chip}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function DetailShell({
  assignee,
  subtitle,
  closeHref,
  explicit,
  children,
}: {
  assignee: PersonRef;
  subtitle: string;
  closeHref: string;
  explicit: boolean;
  children: React.ReactNode;
}) {
  return (
    <aside
      aria-label={`Mensagem para ${assignee.fullName}`}
      className={`flex-[1_0_340px] flex-col gap-4 bg-surface p-5 lg:max-w-[420px] lg:self-start lg:rounded-card lg:p-6 ${
        explicit ? "fixed inset-0 z-50 flex overflow-y-auto lg:static lg:z-auto" : "hidden lg:flex"
      }`}
    >
      <div className="flex items-center gap-3">
        <Link href={closeHref} scroll={false} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-muted lg:hidden">
          <CaretLeftIcon size={18} aria-hidden="true" />
          <span className="sr-only">Voltar para a lista</span>
        </Link>
        <Avatar initials={assignee.initials} color={assignee.color} size="md" />
        <div className="min-w-0">
          <p className="text-[16px] leading-5 font-semibold">{assignee.fullName}</p>
          <p className="text-[13px] text-ink-2">{subtitle}</p>
        </div>
      </div>
      {children}
    </aside>
  );
}

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-[13px]">
      {rows.map(([k, v]) => (
        <Fragment key={k}>
          <dt className="text-ink-2">{k}</dt>
          <dd className="text-right font-semibold break-words">{v}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

function recipientText(channel: Channel, to: string) {
  return channel === "whatsapp" ? formatWhatsapp(to) : to;
}

async function SentTab({ id, today }: { id: string | null; today: IsoDate }) {
  const [history, preview] = await Promise.all([api<BatchHistory>("/reminders/batches"), api<Preview>("/reminders/preview")]);
  const all = history.days.flatMap((d) => d.batches);
  const selected = (id && all.find((b) => b.id === id)) || null;
  const shown: Batch | null = selected ?? all[0] ?? null;
  const retryWord = nextDayWord(preview.date, today);

  const groups = history.days.map((d) => ({
    label: relativeDayLabel(d.date, today),
    rows: d.batches.map<Row>((b) => ({
      key: b.id,
      href: `/cobrancas?id=${b.id}`,
      assignee: b.assignee,
      meta: metaText(b.channel, timeOf(b.createdAt), b.kind, b.items, b.sentOn),
      items: b.items,
      chip: <BatchChip status={b.displayStatus} />,
    })),
  }));

  return (
    <div className="flex flex-wrap items-start gap-5">
      <div className="min-w-0 flex-[999_1_560px] rounded-card bg-surface p-3 md:p-[14px]">
        <ReminderLog groups={groups} selectedKey={shown?.id ?? null} empty="Nenhuma cobrança nos últimos 30 dias." />
      </div>
      {shown && (
        <DetailShell
          assignee={shown.assignee}
          subtitle={`${channelLabel(shown.channel)}, ${shown.sentOn === today ? "hoje" : ddmm(shown.sentOn)} às ${timeOf(shown.createdAt)}`}
          closeHref="/cobrancas"
          explicit={Boolean(selected)}
        >
          {shown.status === "failed" && (
            <p role="status" className="flex gap-2 rounded-[14px] bg-late-bg px-[14px] py-3 text-[13px] text-late-fg">
              <WarningCircleIcon size={18} className="shrink-0" aria-hidden="true" />
              <span>
                {(shown.error ?? "O envio falhou").replace(/\.?$/, ".")}
                {shown.sentOn === today ? ` Nova tentativa ${retryWord}.` : ""}
              </span>
            </p>
          )}
          {shown.displayStatus === "no_confirmation" && (
            <p className="rounded-[14px] bg-surface-muted px-[14px] py-3 text-[13px] text-ink-2">O Make ainda não confirmou este envio. Confira a execução no cenário.</p>
          )}
          <MessagePreview channel={shown.channel} subject={shown.subject} body={shown.messageBody} to={recipientText(shown.channel, shown.recipient)} />
          {shown.messageReconstructed && <p className="text-[12px] text-ink-3">Texto remontado a partir das demandas do lote.</p>}
          <Facts
            rows={[
              ["Tipo", capitalize(kindLabel[shown.kind])],
              ["Para", recipientText(shown.channel, shown.recipient)],
              ...(shown.makeExecutionId ? ([["Execução no Make", `#${shown.makeExecutionId}`]] as [string, string][]) : []),
            ]}
          />
        </DetailShell>
      )}
    </div>
  );
}

async function PreviewTab({ item, today }: { item: string | null; today: IsoDate }) {
  const preview = await api<Preview>("/reminders/preview");
  const idx = item !== null && /^\d+$/.test(item) ? Number(item) : null;
  const selected = idx !== null ? (preview.batches[idx] ?? null) : null;
  const shown = selected ?? preview.batches[0] ?? null;
  const dayLabel = relativeDayLabel(preview.date, today);

  const rows = preview.batches.map<Row>((b, i) => ({
    key: String(i),
    href: `/cobrancas?aba=previa&item=${i}`,
    assignee: b.assignee,
    meta: metaText(b.channel, "08:00", b.kind, b.items, preview.date),
    items: b.items,
    chip: b.retry ? <Chip tone="soon" small>nova tentativa</Chip> : <Chip tone="ok" small>prevista</Chip>,
  }));

  return (
    <div className="flex flex-wrap items-start gap-5">
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
        <div className="rounded-card bg-surface p-3 md:p-[14px]">
          {!preview.isBusinessDay ? (
            <p className="px-2 py-10 text-center text-[15px] text-ink-2">{capitalize(dayLabel)} não é dia útil. Nada sai nesse dia.</p>
          ) : (
            <ReminderLog groups={rows.length ? [{ label: `${dayLabel}, 08:00`, rows }] : []} selectedKey={shown ? String(preview.batches.indexOf(shown)) : null} empty={`Nenhuma cobrança prevista para ${dayLabel.toLowerCase()}.`} />
          )}
        </div>
        {preview.skipped.length > 0 && (
          <section aria-labelledby="avisos" className="rounded-card bg-surface p-5">
            <h2 id="avisos" className="text-[18px] leading-6 font-bold tracking-[-0.02em]">
              Avisos
            </h2>
            <p className="mt-1 text-[13px] text-ink-2">Estas demandas deveriam ser cobradas, mas falta algo no cadastro.</p>
            <ul className="mt-3 flex flex-col">
              {preview.skipped.map((s) => (
                <li key={`${s.taskId}-${s.channel ?? "x"}`} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
                  <Avatar initials={s.assignee.initials} color={s.assignee.color} size="md" />
                  <span className="min-w-0 flex-1">
                    <b className="block text-[15px] font-semibold">{s.assignee.fullName}</b>
                    <span className="flex items-center gap-2 text-[13px] text-ink-2">
                      <span className="h-[9px] w-[9px] shrink-0 rounded-[3px]" style={{ background: folderTheme[s.matrix.color].solid }} aria-hidden="true" />
                      <span className="truncate">{s.title}</span>
                    </span>
                  </span>
                  <Link href={`/responsaveis?pessoa=${s.assignee.id}`} className="shrink-0 hover:underline">
                    <Chip tone="late" small>
                      {s.message}
                    </Chip>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      {shown && (
        <DetailShell
          assignee={shown.assignee}
          subtitle={`${channelLabel(shown.channel)}, ${dayLabel.split(",")[0].toLowerCase()} às 08:00`}
          closeHref="/cobrancas?aba=previa"
          explicit={Boolean(selected)}
        >
          {shown.retry && <p className="rounded-[14px] bg-soon-bg px-[14px] py-3 text-[13px] text-soon-fg">Nova tentativa: o envio anterior falhou.</p>}
          <MessagePreview channel={shown.channel} subject={shown.subject} body={shown.body} to={recipientText(shown.channel, shown.to)} />
          <Facts
            rows={[
              ["Tipo", capitalize(kindLabel[shown.kind])],
              ["Para", recipientText(shown.channel, shown.to)],
            ]}
          />
        </DetailShell>
      )}
    </div>
  );
}

export default async function RemindersPage({ searchParams }: { searchParams: Promise<{ aba?: string; id?: string; item?: string }> }) {
  const { aba, id, item } = await searchParams;
  const previewTab = aba === "previa";
  const { today } = await api<{ today: IsoDate }>("/me");
  const tabs = [
    { href: "/cobrancas", label: "Enviadas", on: !previewTab },
    { href: "/cobrancas?aba=previa", label: "Prévia de amanhã", on: previewTab },
  ];

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] leading-[34px] font-bold tracking-[-0.035em] md:text-[40px] md:leading-[44px]">Cobranças</h1>
          <p className="mt-2 text-[15px] leading-[22px] text-ink-2 md:text-[16px] md:leading-6">Tudo o que saiu às 08:00 e o que sai amanhã.</p>
        </div>
        <nav aria-label="Abas de cobranças" className="flex rounded-full bg-surface p-1">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              aria-current={t.on ? "page" : undefined}
              className={`flex h-9 items-center rounded-full px-4 text-[13px] font-semibold transition-colors duration-150 ${t.on ? "bg-ink text-white" : "text-ink hover:bg-surface-muted"}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </section>
      {previewTab ? <PreviewTab item={item ?? null} today={today} /> : <SentTab id={id ?? null} today={today} />}
    </>
  );
}
