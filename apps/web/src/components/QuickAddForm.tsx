"use client";

import { useRef, useState, useTransition } from "react";
import { createTaskAction } from "@/app/(app)/actions";
import type { Assignee, IsoDate } from "@/lib/api-types";
import { ddmm, parseDateInput } from "@/lib/dates";
import { Button } from "./Button";
import { DateInput } from "./DateInput";
import { Field } from "./Field";
import { useCanWrite } from "./Role";
import { useToast } from "./Toast";

/** Faixa de lançamento rápido dentro da pasta. Enter lança e devolve o foco ao título. */
export function QuickAddForm({
  matrixId,
  assignees,
  options,
  today,
  highlight = false,
}: {
  matrixId: string;
  assignees: Assignee[];
  options: { id: string; position: number; title: string }[];
  today: IsoDate;
  highlight?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [due, setDue] = useState("");
  const [prereq, setPrereq] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const titleRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const canWrite = useCanWrite();
  const active = assignees.filter((a) => a.isActive);

  const submit = () => {
    const next: Record<string, string> = {};
    const parsed = parseDateInput(due, today);
    if (!title.trim()) next.title = "Escreva o que precisa ser feito.";
    if (!assigneeId) next.assignee = "Escolha uma pessoa.";
    if (!parsed) next.due = "Use dd/mm, como 23/10.";
    else if (parsed < today) next.due = "O prazo precisa ser hoje ou depois.";
    setErrors(next);
    if (Object.keys(next).length || !parsed) {
      if (next.title) titleRef.current?.focus();
      return;
    }
    start(async () => {
      const res = await createTaskAction(matrixId, { title: title.trim(), assigneeId, dueDate: parsed, prerequisiteTaskId: prereq || null });
      if (!res.ok) {
        setErrors({ form: res.message });
        return;
      }
      toast(`Demanda ${res.data.position} lançada, prazo ${ddmm(parsed)}`);
      setTitle("");
      setPrereq("");
      titleRef.current?.focus();
    });
  };

  if (!canWrite) return null;

  return (
    <form
      aria-label="Lançar nova demanda"
      className={`mt-5 flex flex-wrap items-start gap-3 rounded-inner bg-f-wash p-[14px] ${highlight ? "outline-2 outline-offset-2 outline-f-solid" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {highlight && <p className="basis-full text-[15px] font-semibold text-f-ink">Lance a primeira demanda desta matriz.</p>}
      <Field label="Nova demanda" htmlFor="qa-title" error={errors.title} className="flex-[3_1_260px]">
        <input
          ref={titleRef}
          id="qa-title"
          className="field"
          placeholder="O que precisa ser feito"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={errors.title ? true : undefined}
          autoFocus={highlight}
        />
      </Field>
      <Field label="Responsável" htmlFor="qa-assignee" error={errors.assignee} className="flex-[1.4_1_180px]">
        <select
          id="qa-assignee"
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
      <Field label="Prazo" htmlFor="qa-due" error={errors.due} className="flex-[1_1_150px]">
        <DateInput id="qa-due" value={due} onChange={setDue} today={today} invalid={Boolean(errors.due)} onEnter={submit} />
      </Field>
      <Field label="Pré-requisito" htmlFor="qa-prereq" className="flex-[1_1_150px]">
        <select id="qa-prereq" className="field" value={prereq} onChange={(e) => setPrereq(e.target.value)}>
          <option value="">Nenhum</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.position}. {o.title}
            </option>
          ))}
        </select>
      </Field>
      <Button type="submit" size="form" loading={pending} className="mt-[22px]">
        Lançar
      </Button>
      {errors.form && (
        <p role="alert" className="basis-full text-[13px] text-late-fg">
          {errors.form}
        </p>
      )}
    </form>
  );
}
