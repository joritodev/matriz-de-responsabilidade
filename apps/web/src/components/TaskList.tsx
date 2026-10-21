"use client";

import { DotsSixVerticalIcon } from "@phosphor-icons/react";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { reorderTasksAction } from "@/app/(app)/actions";
import type { Assignee, IsoDate, Prerequisite, TaskFilter, TaskRowData } from "@/lib/api-types";
import { ddmm, dueStatusLabel, monthIndex, MONTHS_SHORT, weekdayShort } from "@/lib/dates";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { DateTile } from "./DateTile";
import { ExtendInline } from "./ExtendInline";
import { StatusChip } from "./StatusChip";
import { ReminderTrack } from "./ReminderTrack";
import { useToast } from "./Toast";

const GRID = "md:grid md:grid-cols-[40px_minmax(0,2.6fr)_minmax(0,1.3fr)_92px_150px_120px_112px] md:items-center md:gap-x-3";

function prerequisiteText(p: Prerequisite, isDone: boolean): string {
  if (!p) return isDone ? "" : "sem pré-requisito";
  if ("taskId" in p) return `depende de: ${p.title}`;
  return p.note;
}

function situationLabel(t: TaskRowData): string {
  if (t.taskStatus === "done") return t.completedAt ? `concluída ${ddmm(t.completedAt.slice(0, 10))}` : "concluída";
  return dueStatusLabel(t.status);
}

const desktopQuery = "(min-width: 768px)";
function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(desktopQuery);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(desktopQuery).matches,
    () => true,
  );
}

function setQuery(id: string | null) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("demanda", id);
  else url.searchParams.delete("demanda");
  window.history.replaceState(null, "", url);
}

export function TaskList({
  tasks,
  filter,
  matrixId,
  today,
  assignees,
  options,
  initialSelected,
}: {
  tasks: TaskRowData[];
  filter: TaskFilter;
  matrixId: string;
  today: IsoDate;
  assignees: Assignee[];
  options: { id: string; position: number; title: string }[];
  initialSelected: string | null;
}) {
  const [order, setOrder] = useState(tasks);
  const [selected, setSelected] = useState<string | null>(initialSelected);
  const [dragId, setDragId] = useState<string | null>(null);
  const [, start] = useTransition();
  const toast = useToast();
  const canReorder = filter === "open";
  const isDesktop = useIsDesktop();

  useEffect(() => setOrder(tasks), [tasks]);
  useEffect(() => {
    if (initialSelected) document.getElementById(`demanda-${initialSelected}`)?.scrollIntoView({ block: "center" });
  }, [initialSelected]);

  const toggle = (id: string) => {
    const next = selected === id ? null : id;
    setSelected(next);
    setQuery(next);
  };

  const commit = (next: TaskRowData[]) => {
    const previous = order;
    setOrder(next);
    start(async () => {
      const res = await reorderTasksAction(
        matrixId,
        next.map((t) => t.id),
      );
      if (!res.ok) {
        setOrder(previous);
        toast(res.message);
      }
    });
  };

  const move = (id: string, delta: number) => {
    const i = order.findIndex((t) => t.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
    toast(`Demanda movida para a posição ${j + 1}`);
    requestAnimationFrame(() => document.getElementById(`handle-${id}`)?.focus());
  };

  const dropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const next = order.filter((t) => t.id !== dragId);
    const dragged = order.find((t) => t.id === dragId)!;
    next.splice(
      next.findIndex((t) => t.id === targetId) + (order.findIndex((t) => t.id === dragId) < order.findIndex((t) => t.id === targetId) ? 1 : 0),
      0,
      dragged,
    );
    setDragId(null);
    commit(next);
  };

  if (order.length === 0) {
    const empty: Record<TaskFilter, string> = {
      open: "Nenhuma demanda aberta. Lance a próxima acima.",
      done: "Nada concluído ainda nesta pasta.",
      extended: "Nenhuma demanda foi prorrogada.",
    };
    return <p className="rounded-inner bg-surface-muted px-5 py-8 text-center text-[15px] text-ink-2">{empty[filter]}</p>;
  }

  return (
    <div>
      <div className={`hidden px-[6px] pb-2 text-[12px] font-semibold text-ink-2 ${GRID}`} aria-hidden="true">
        <span>Nº</span>
        <span>Tarefa</span>
        <span>Responsável</span>
        <span>Prazo</span>
        <span>Cobranças</span>
        <span>Situação</span>
        <span />
      </div>
      <ul aria-label="Demandas" className="flex flex-col">
        {order.map((t, idx) => {
          const open = selected === t.id;
          const pending = t.taskStatus === "pending";
          const prereq = prerequisiteText(t.prerequisite, !pending);
          return (
            <li
              key={t.id}
              id={`demanda-${t.id}`}
              onDragOver={(e) => {
                if (dragId) e.preventDefault();
              }}
              onDrop={() => dropOn(t.id)}
              className={`border-b border-line last:border-b-0 ${open ? "my-1 rounded-inner border-b-0 bg-f-wash" : ""} ${dragId === t.id ? "opacity-50" : ""}`}
            >
              {/* Computador */}
              <div className={`hidden min-h-[60px] px-[6px] py-2 ${GRID}`}>
                <span className="flex items-center">
                  {canReorder ? (
                    <button
                      id={`handle-${t.id}`}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        setDragId(t.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDragId(null)}
                      onKeyDown={(e) => {
                        if (e.altKey && e.key === "ArrowUp") {
                          e.preventDefault();
                          move(t.id, -1);
                        } else if (e.altKey && e.key === "ArrowDown") {
                          e.preventDefault();
                          move(t.id, 1);
                        }
                      }}
                      aria-label={`Demanda ${idx + 1}. Arraste ou use Alt + setas para mudar a ordem`}
                      className={`group relative flex h-8 w-8 cursor-grab items-center justify-center rounded-full ${open ? "bg-white" : "bg-surface-muted"} text-[13px] font-bold active:cursor-grabbing`}
                    >
                      <span className="group-hover:opacity-0 group-focus-visible:opacity-0">{idx + 1}</span>
                      <DotsSixVerticalIcon size={16} className="absolute opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
                    </button>
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-[13px] font-bold">{t.position}</span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className={`block truncate text-[15px] font-semibold ${t.taskStatus === "done" ? "text-ink-2 line-through decoration-1" : ""}`}>{t.title}</span>
                  {prereq && <span className="block truncate text-[12px] text-ink-2">{prereq}</span>}
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar initials={t.assignee.initials} color={t.assignee.color} tone="bg" />
                  <span className="truncate text-[14px]">{t.assignee.fullName}</span>
                </span>
                <span className="leading-none">
                  <span className="block text-[18px] font-bold">{Number(t.dueDate.slice(8, 10))}</span>
                  <span className="mt-[3px] block text-[11px] text-ink-2">
                    {MONTHS_SHORT[monthIndex(t.dueDate)]}, {weekdayShort(t.dueDate)}
                  </span>
                </span>
                <span>
                  <ReminderTrack early={t.reminders.early} due={t.reminders.due} />
                </span>
                <span>
                  <StatusChip status={t.status} label={situationLabel(t)} small />
                </span>
                <span className="flex justify-end">
                  <Button
                    variant={open ? "primary" : "secondary"}
                    size="row"
                    className="w-full"
                    onClick={() => toggle(t.id)}
                    aria-expanded={open}
                    aria-controls={`detalhe-${t.id}`}
                  >
                    {open ? "Fechar" : pending ? "Prorrogar" : "Detalhes"}
                  </Button>
                </span>
              </div>

              {/* Celular */}
              <button
                type="button"
                onClick={() => toggle(t.id)}
                aria-expanded={open}
                aria-controls={`detalhe-${t.id}`}
                className={`flex w-full items-center gap-[14px] py-[14px] text-left md:hidden ${open ? "px-4 pt-4" : ""}`}
              >
                <DateTile date={t.dueDate} status={t.status} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-[16px] leading-5 font-semibold ${t.taskStatus === "done" ? "text-ink-2 line-through" : ""}`}>{t.title}</span>
                  {open ? (
                    <span className="mt-1 flex items-center gap-2 text-[14px] text-ink-2">
                      <Avatar initials={t.assignee.initials} color={t.assignee.color} size="sm" className="h-6 w-6 text-[10px]" />
                      {t.assignee.fullName}
                    </span>
                  ) : (
                    <span className="mt-1 block truncate text-[14px] text-ink-2">
                      {t.assignee.fullName}, {situationLabel(t)}
                    </span>
                  )}
                </span>
                <span className="self-start pt-1">
                  <ReminderTrack early={t.reminders.early} due={t.reminders.due} compact />
                </span>
              </button>

              {open && (
                <div id={`detalhe-${t.id}`} className="px-4 pb-4 md:pr-[6px] md:pl-[58px]">
                  <ExtendInline task={t} today={today} assignees={assignees} options={options} compact={!isDesktop} onDone={() => toggle(t.id)} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {canReorder && order.length > 1 && (
        <p className="mt-3 hidden text-[12px] text-ink-2 md:block">Arraste pelo número para mudar a ordem, ou foque o número e use Alt + ↑ / ↓.</p>
      )}
    </div>
  );
}
