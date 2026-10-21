"use client";

import { XIcon } from "@phosphor-icons/react";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, useTransition } from "react";
import { createTaskAction, prerequisiteOptionsAction } from "@/app/(app)/actions";
import type { Assignee, FolderSummary, IsoDate } from "@/lib/api-types";
import { ddmm, parseDateInput } from "@/lib/dates";
import { folderVars } from "@/lib/folder-colors";
import { Button } from "./Button";
import { DateInput } from "./DateInput";
import { Field } from "./Field";
import { useToast } from "./Toast";

const PanelContext = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({ open: false, setOpen: () => {} });
export const useNewTaskPanel = () => useContext(PanelContext);

export function NewTaskProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <PanelContext.Provider value={{ open, setOpen }}>{children}</PanelContext.Provider>;
}

/** "Nova demanda": popover ancorado no botão no desktop, folha que sobe de baixo no celular. */
export function NewTaskPanel({ folders, assignees, today }: { folders: FolderSummary[]; assignees: Assignee[]; today: IsoDate }) {
  const { open, setOpen } = useNewTaskPanel();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const currentSlug = /^\/pastas\/([^/]+)/.exec(pathname)?.[1];
  const [folderId, setFolderId] = useState("");
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [due, setDue] = useState("");
  const [prereq, setPrereq] = useState("");
  const [options, setOptions] = useState<{ id: string; position: number; title: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const titleRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fromPath = folders.find((f) => f.slug === currentSlug);
    setFolderId((cur) => fromPath?.id ?? (cur || folders[0]?.id || ""));
    setErrors({});
    const t = setTimeout(() => titleRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, currentSlug, folders, setOpen]);

  const folder = folders.find((f) => f.id === folderId);

  useEffect(() => {
    if (!open || !folder) return;
    setPrereq("");
    let alive = true;
    void prerequisiteOptionsAction(folder.slug).then((r) => alive && setOptions(r.ok ? r.data : []));
    return () => {
      alive = false;
    };
  }, [open, folder]);

  if (!open) return null;
  const active = assignees.filter((a) => a.isActive);

  const submit = () => {
    const next: Record<string, string> = {};
    const parsed = parseDateInput(due, today);
    if (!folder) next.folder = "Crie uma pasta primeiro.";
    if (!title.trim()) next.title = "Escreva o que precisa ser feito.";
    if (!assigneeId) next.assignee = "Escolha quem vai receber a cobrança.";
    if (!parsed) next.due = "Use dd/mm, como 23/10.";
    else if (parsed < today) next.due = "O prazo precisa ser hoje ou depois.";
    setErrors(next);
    if (Object.keys(next).length || !folder || !parsed) return;
    start(async () => {
      const res = await createTaskAction(folder.id, { title: title.trim(), assigneeId, dueDate: parsed, prerequisiteTaskId: prereq || null });
      if (!res.ok) {
        setErrors({ form: res.message });
        return;
      }
      toast(`Demanda lançada em ${folder.name}, prazo ${ddmm(parsed)}`);
      setTitle("");
      setDue("");
      setPrereq("");
      setOpen(false);
      if (currentSlug !== folder.slug) router.push(`/pastas/${folder.slug}`);
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-[rgba(22,24,29,.32)] md:bg-transparent" onClick={() => setOpen(false)} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-task-title"
        style={folderVars(folder?.color)}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-[24px] bg-surface p-5 pb-8 md:absolute md:inset-x-auto md:top-[52px] md:right-[50px] md:bottom-auto md:w-[420px] md:rounded-card md:border-[1.5px] md:border-line md:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="new-task-title" className="text-[18px] leading-6 font-bold tracking-[-0.02em]">
            Nova demanda
          </h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-muted">
            <XIcon size={20} aria-hidden="true" />
          </button>
        </div>
        <form
          className="flex flex-col gap-4 rounded-inner bg-f-wash p-[14px]"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Field label="Pasta" htmlFor="nt-folder" error={errors.folder}>
            <select id="nt-folder" className="field" value={folderId} onChange={(e) => setFolderId(e.target.value)}>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tarefa" htmlFor="nt-title" error={errors.title}>
            <input
              ref={titleRef}
              id="nt-title"
              className="field"
              placeholder="O que precisa ser feito"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={errors.title ? true : undefined}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Responsável" htmlFor="nt-assignee" error={errors.assignee}>
              <select
                id="nt-assignee"
                className="field"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                aria-invalid={errors.assignee ? true : undefined}
              >
                <option value="">Escolher pessoa</option>
                {active.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Prazo" htmlFor="nt-due" error={errors.due}>
              <DateInput id="nt-due" value={due} onChange={setDue} today={today} invalid={Boolean(errors.due)} />
            </Field>
          </div>
          <Field label="Pré-requisito" htmlFor="nt-prereq">
            <select id="nt-prereq" className="field" value={prereq} onChange={(e) => setPrereq(e.target.value)}>
              <option value="">Nenhum</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.position}. {o.title}
                </option>
              ))}
            </select>
          </Field>
          {errors.form && (
            <p role="alert" className="text-[13px] text-late-fg">
              {errors.form}
            </p>
          )}
          <Button type="submit" size="form" loading={pending} className="w-full sm:w-auto sm:self-end">
            Lançar
          </Button>
        </form>
      </div>
    </>
  );
}
