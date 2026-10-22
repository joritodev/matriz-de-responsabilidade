"use client";

import { useEffect, useState, useTransition } from "react";
import {
  correctDueDateAction,
  extendTaskAction,
  setTaskStatusAction,
  taskHistoryAction,
  updateTaskAction,
} from "@/app/(app)/actions";
import type { Assignee, HistoryEvent, IsoDate, TaskRowData } from "@/lib/api-types";
import { dateOf, ddmm, parseDateInput, timeOf } from "@/lib/dates";
import { channelLabel } from "@/lib/labels";
import { Button } from "./Button";
import { ConfirmDialog } from "./ConfirmDialog";
import { DateInput } from "./DateInput";
import { Field } from "./Field";
import { useCanWrite } from "./Role";
import { useToast } from "./Toast";

function describe(e: HistoryEvent): [string, string] {
  const day = ddmm(dateOf(e.at));
  switch (e.type) {
    case "created":
      return [day, `criada com prazo ${ddmm(e.dueDate)}`];
    case "due_change":
      return e.kind === "extension"
        ? [day, `prorrogada de ${ddmm(e.previousDueDate)} para ${ddmm(e.newDueDate)}${e.reason ? `: ${e.reason}` : ""}${e.approvedBy ? ` (aprovado por ${e.approvedBy})` : ""}`]
        : [day, `prazo corrigido de ${ddmm(e.previousDueDate)} para ${ddmm(e.newDueDate)}`];
    case "reminder": {
      const status = e.status === "failed" ? ", falhou" : e.status === "queued" ? ", sem confirmação" : "";
      return [`${day}, ${timeOf(e.at)}`, `cobrança ${e.kind === "early" ? "antecipada" : "no dia"} por ${channelLabel(e.channel)}${status}`];
    }
    case "completed":
      return [day, "concluída"];
  }
}

export function TaskHistory({ taskId, version }: { taskId: string; version: string }) {
  const [events, setEvents] = useState<HistoryEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void taskHistoryAction(taskId).then((r) => {
      if (!alive) return;
      if (r.ok) setEvents(r.data.events);
      else setError(r.message);
    });
    return () => {
      alive = false;
    };
  }, [taskId, version]);
  if (error) return <p className="text-[13px] text-late-fg">{error}</p>;
  if (!events)
    return (
      <div className="flex gap-6" aria-label="Carregando histórico">
        <span className="skeleton h-4 w-40" />
        <span className="skeleton h-4 w-56" />
      </div>
    );
  return (
    <>
      {events.slice(-5).map((e, i) => {
        const [when, what] = describe(e);
        return (
          <li key={i}>
            <b className="font-semibold text-ink">{when}</b> {what}
          </li>
        );
      })}
    </>
  );
}

/** A linha selecionada abre embaixo: prorrogação, histórico, concluir e cancelar. Sem modal (exceto cancelar). */
export function ExtendInline({
  task,
  today,
  assignees,
  options,
  compact = false,
  onDone,
}: {
  task: TaskRowData;
  today: IsoDate;
  assignees: Assignee[];
  options: { id: string; position: number; title: string }[];
  compact?: boolean;
  onDone: () => void;
}) {
  const toast = useToast();
  const canWrite = useCanWrite();
  const [mode, setMode] = useState<"extend" | "correct" | "edit">("extend");
  const [newDue, setNewDue] = useState("");
  const [reason, setReason] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [title, setTitle] = useState(task.title);
  const [assigneeId, setAssigneeId] = useState(task.assignee.id);
  const [prereq, setPrereq] = useState(task.prerequisite && "taskId" in task.prerequisite ? task.prerequisite.taskId : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pending, start] = useTransition();
  const pendingTask = task.taskStatus === "pending";
  const idp = `t-${task.id.slice(-6)}`;

  const extend = () => {
    const parsed = parseDateInput(newDue, today);
    const next: Record<string, string> = {};
    if (!parsed) next.due = "Use dd/mm, como 30/10.";
    else if (mode === "extend" && parsed <= task.dueDate) next.due = `O novo prazo precisa ser depois de ${ddmm(task.dueDate)}.`;
    else if (mode === "correct" && parsed === task.dueDate) next.due = "O prazo informado é igual ao atual.";
    if (mode === "extend" && reason.trim().length < 3) next.reason = "Explique o motivo (pelo menos 3 letras).";
    setErrors(next);
    if (Object.keys(next).length || !parsed) return;
    start(async () => {
      const res =
        mode === "extend"
          ? await extendTaskAction(task.id, { newDueDate: parsed, reason: reason.trim(), approvedBy: approvedBy.trim() || null })
          : await correctDueDateAction(task.id, { newDueDate: parsed, reason: reason.trim() || null });
      if (!res.ok) return setErrors({ form: res.message });
      toast(mode === "extend" ? `Prazo prorrogado para ${ddmm(parsed)}` : `Prazo corrigido para ${ddmm(parsed)}`);
      setNewDue("");
      setReason("");
      setApprovedBy("");
    });
  };

  const save = () => {
    if (!title.trim()) return setErrors({ title: "Escreva o que precisa ser feito." });
    start(async () => {
      const res = await updateTaskAction(task.id, { title: title.trim(), assigneeId, prerequisiteTaskId: prereq || null });
      if (!res.ok) return setErrors({ form: res.message });
      toast("Demanda atualizada");
      setMode("extend");
    });
  };

  const status = (action: "complete" | "reopen" | "cancel") =>
    start(async () => {
      const res = await setTaskStatusAction(task.id, action);
      setConfirmCancel(false);
      if (!res.ok) return setErrors({ form: res.message });
      toast(action === "complete" ? "Demanda concluída" : action === "reopen" ? "Demanda reaberta" : "Demanda cancelada");
      onDone();
    });

  const version = `${task.dueDate}|${task.taskStatus}|${task.reminders.early}|${task.reminders.due}`;

  if (!canWrite) {
    return (
      <div className="expand-enter">
        <ol className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] leading-[18px] text-ink-2">
          <TaskHistory taskId={task.id} version={version} />
        </ol>
      </div>
    );
  }

  return (
    <div className="expand-enter">
      <div className="flex min-h-0 flex-col gap-[14px] overflow-hidden">
        {pendingTask && mode !== "edit" && (
          <form
            className="flex flex-wrap items-start gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              extend();
            }}
          >
            <Field label={mode === "extend" ? "Novo prazo" : "Prazo correto"} htmlFor={`${idp}-due`} error={errors.due} className={compact ? "flex-[1_1_110px]" : "flex-[1_1_120px]"}>
              <DateInput id={`${idp}-due`} value={newDue} onChange={setNewDue} today={today} invalid={Boolean(errors.due)} onEnter={extend} />
            </Field>
            <Field label={mode === "extend" ? "Motivo" : "Motivo (opcional)"} htmlFor={`${idp}-reason`} error={errors.reason} className={compact ? "flex-[2_1_150px]" : "flex-[3_1_280px]"}>
              <input
                id={`${idp}-reason`}
                className="field"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={mode === "extend" ? "Por que precisa de mais tempo" : "Ex.: digitei a data errada"}
                aria-invalid={errors.reason ? true : undefined}
              />
            </Field>
            {mode === "extend" && !compact && (
              <Field label="Aprovado por" htmlFor={`${idp}-approved`} className="flex-[1.3_1_160px]">
                <input id={`${idp}-approved`} className="field" value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder="Opcional" />
              </Field>
            )}
            {compact ? (
              <div className="flex basis-full gap-2">
                <Button type="submit" variant="folder" size="form" loading={pending} className="flex-1">
                  {mode === "extend" ? "Prorrogar" : "Corrigir"}
                </Button>
                <Button variant="secondary" size="form" onClick={() => status("complete")} disabled={pending} className="flex-1">
                  Concluir
                </Button>
              </div>
            ) : (
              <Button type="submit" variant="folder" size="form" loading={pending} className="mt-[22px]">
                {mode === "extend" ? "Prorrogar" : "Corrigir"}
              </Button>
            )}
          </form>
        )}

        {mode === "edit" && (
          <form
            className="flex flex-wrap items-start gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <Field label="Tarefa" htmlFor={`${idp}-title`} error={errors.title} className="flex-[3_1_240px]">
              <input id={`${idp}-title`} className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Responsável" htmlFor={`${idp}-assignee`} className="flex-[1.4_1_170px]">
              <select id={`${idp}-assignee`} className="field" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                {assignees
                  .filter((a) => a.isActive || a.id === task.assignee.id)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.fullName}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Pré-requisito" htmlFor={`${idp}-prereq`} className="flex-[1.4_1_170px]">
              <select id={`${idp}-prereq`} className="field" value={prereq} onChange={(e) => setPrereq(e.target.value)}>
                <option value="">Nenhum</option>
                {options
                  .filter((o) => o.id !== task.id)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.position}. {o.title}
                    </option>
                  ))}
              </select>
            </Field>
            <div className="mt-[22px] flex gap-2">
              <Button type="submit" variant="folder" size="form" loading={pending}>
                Salvar
              </Button>
              <Button variant="secondary" size="form" onClick={() => setMode("extend")}>
                Voltar
              </Button>
            </div>
          </form>
        )}

        {errors.form && (
          <p role="alert" className="text-[13px] text-late-fg">
            {errors.form}
          </p>
        )}

        <ol className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] leading-[18px] text-ink-2">
          <TaskHistory taskId={task.id} version={version} />
          {pendingTask && mode === "extend" && <li>Prorrogando, as duas cobranças passam a valer para o novo prazo.</li>}
        </ol>

        <div className="flex flex-wrap gap-2">
          {pendingTask ? (
            <>
              {!compact && (
                <Button variant="secondary" size="row" onClick={() => status("complete")} disabled={pending}>
                  Concluir
                </Button>
              )}
              {mode !== "edit" && (
                <Button variant="secondary" size="row" onClick={() => setMode("edit")}>
                  Editar
                </Button>
              )}
              <Button variant="secondary" size="row" onClick={() => setMode(mode === "correct" ? "extend" : "correct")}>
                {mode === "correct" ? "Prorrogar em vez de corrigir" : "Corrigir prazo digitado"}
              </Button>
              <Button variant="secondary" size="row" className="text-late-fg" onClick={() => setConfirmCancel(true)}>
                Cancelar demanda
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="row" onClick={() => status("reopen")} loading={pending}>
              Reabrir
            </Button>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirmCancel}
        title="Cancelar esta demanda?"
        body={`"${task.title}" sai da matriz e para de ser cobrada. Dá para reabrir depois pelo histórico.`}
        confirmLabel="Cancelar demanda"
        pending={pending}
        onConfirm={() => status("cancel")}
        onClose={() => setConfirmCancel(false)}
      />
    </div>
  );
}
