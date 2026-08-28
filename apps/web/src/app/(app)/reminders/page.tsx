import { markReminderSentAction } from "@/lib/actions";
import { CopyButton } from "@/components/copy-button";
import { formatDatePtBr } from "@/lib/dates";import { listTodayReminders, skipLabel } from "@/lib/queries";

export default async function RemindersPage() {
  const { today, reminders, alreadySent, skipped } = await listTodayReminders();

  return (
    <div>
      <h1 className="font-[family-name:var(--font-source-serif)] text-3xl">Lembretes de hoje</h1>
      <p className="mt-1 max-w-2xl text-sm text-stone-600">
        Passada de {formatDatePtBr(today)}. Uma mensagem por pessoa — quem tem várias demandas recebe um resumo, não
        vários lembretes. Você confere, envia pelo seu WhatsApp e marca como enviado.
      </p>

      {alreadySent > 0 ? (
        <p className="mt-3 text-xs text-stone-500">
          {alreadySent} {alreadySent === 1 ? "demanda já foi lembrada" : "demandas já foram lembradas"} hoje e não
          aparecem aqui.
        </p>
      ) : null}

      {reminders.length === 0 ? (
        <p className="mt-6 max-w-xl border border-[#d6d3cd] bg-[#fbfaf6] p-4 text-sm text-stone-600">
          Nada a lembrar agora. Se você esperava alguém nesta lista, confira se o worker já rodou hoje —{" "}
          <code className="text-xs">npm run db:deadline-tick</code>.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {reminders.map((reminder) => (
            <li key={reminder.responsibleId} className="border border-[#d6d3cd] bg-[#fbfaf6] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{reminder.responsibleName}</p>
                <span className="rounded-sm border border-[#d6d3cd] px-2 py-0.5 text-[11px] uppercase tracking-wide text-stone-500">
                  {reminder.kind === "DIGEST" ? `Resumo · ${reminder.taskIds.length} demandas` : "1 demanda"}
                </span>
              </div>

              <pre className="mt-3 whitespace-pre-wrap border-l-2 border-[#d6d3cd] bg-white/60 p-3 font-[family-name:var(--font-geist-sans)] text-sm text-stone-700">
                {reminder.message}
              </pre>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <CopyButton text={reminder.message} label="Copiar mensagem" />
                {reminder.blockedReason ? (
                  <span className="text-xs text-stone-500">{reminder.blockedReason}</span>
                ) : (
                  <a
                    href={reminder.chatLink ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-[#0f3d3e] bg-[#0f3d3e] px-3 py-1.5 text-sm text-[#fbfaf6]"
                  >
                    Abrir no WhatsApp
                  </a>
                )}
                <form action={markReminderSentAction}>
                  <input type="hidden" name="responsibleId" value={reminder.responsibleId} />
                  <input type="hidden" name="kind" value={reminder.kind} />
                  <input type="hidden" name="message" value={reminder.message} />
                  <input type="hidden" name="dedupeKeys" value={reminder.dedupeKeys.join(",")} />
                  <button
                    type="submit"
                    className="border border-[#0f3d3e] px-3 py-1.5 text-sm text-[#0f3d3e]"
                  >
                    Marcar como enviado
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {skipped.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm uppercase tracking-wide text-stone-500">Não cobrado de propósito</h2>
          <ul className="mt-2 space-y-1 text-sm text-stone-600">
            {skipped.map((item, i) => (
              <li key={`${item.name}-${i}`}>
                {item.name} · {item.taskTitle} — {skipLabel(item.reason)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
