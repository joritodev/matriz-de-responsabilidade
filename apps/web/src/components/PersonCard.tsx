"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createAssigneeAction, updateAssigneeAction } from "@/app/(app)/actions";
import type { Assignee, ChannelPreference } from "@/lib/api-types";
import { dueStatusShort, formatWhatsapp } from "@/lib/dates";
import { folderColorLabel, folderTheme } from "@/lib/folder-colors";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { ChannelSegmented } from "./ChannelSegmented";
import { ConfirmDialog } from "./ConfirmDialog";
import { Field } from "./Field";
import { StatusChip } from "./StatusChip";
import { useToast } from "./Toast";

const openText = (n: number) => (n === 0 ? "nenhuma demanda aberta" : n === 1 ? "1 demanda aberta" : `${n} demandas abertas`);

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : (parts[0][1] ?? ""))).toUpperCase();
}

function ContactLines({ a }: { a: Pick<Assignee, "whatsapp" | "email"> }) {
  return (
    <dl className="mt-4 mb-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px] leading-[18px]">
      <dt className="text-ink-2">WhatsApp</dt>
      <dd className="truncate text-right">{a.whatsapp ? formatWhatsapp(a.whatsapp) : <span className="text-ink-3">não cadastrado</span>}</dd>
      <dt className="text-ink-2">E-mail</dt>
      <dd className="truncate text-right" title={a.email ?? undefined}>
        {a.email ?? <span className="text-ink-3">não cadastrado</span>}
      </dd>
    </dl>
  );
}

function PersonForm({
  person,
  onDone,
}: {
  person: Assignee | null;
  onDone: (createdId?: string) => void;
}) {
  const toast = useToast();
  const [fullName, setFullName] = useState(person?.fullName ?? "");
  const [whatsapp, setWhatsapp] = useState(person?.whatsapp ? formatWhatsapp(person.whatsapp) : "");
  const [email, setEmail] = useState(person?.email ?? "");
  const [channel, setChannel] = useState<ChannelPreference>(person?.reminderChannel ?? "whatsapp");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOff, setConfirmOff] = useState(false);
  const [pending, start] = useTransition();
  const idp = person ? `p-${person.id.slice(-6)}` : "p-novo";

  const save = () => {
    const next: Record<string, string> = {};
    if (fullName.trim().length < 2) next.fullName = "Escreva o nome da pessoa.";
    if ((channel === "whatsapp" || channel === "both") && !whatsapp.trim()) next.whatsapp = "Para cobrar por WhatsApp, cadastre o número.";
    if ((channel === "email" || channel === "both") && !email.trim()) next.email = "Para cobrar por e-mail, cadastre o endereço.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const body = { fullName: fullName.trim(), whatsapp: whatsapp.trim() || null, email: email.trim() || null, reminderChannel: channel };
    start(async () => {
      const res = person ? await updateAssigneeAction(person.id, body) : await createAssigneeAction(body);
      if (!res.ok) return setErrors({ form: res.message });
      toast(person ? "Responsável atualizado" : `${body.fullName} cadastrado`);
      onDone(person ? undefined : res.data.id);
    });
  };

  const setActive = (isActive: boolean) =>
    start(async () => {
      if (!person) return;
      const res = await updateAssigneeAction(person.id, { isActive });
      setConfirmOff(false);
      if (!res.ok) return setErrors({ form: res.message });
      toast(isActive ? `${person.fullName} foi reativado` : `${person.fullName} foi desativado`);
      onDone();
    });

  return (
    <form
      aria-label={person ? `Editar ${person.fullName}` : "Novo responsável"}
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="flex items-center gap-3">
        <Avatar initials={initialsOf(fullName)} color={person?.color} size="xl" />
        <p className="text-[16px] font-semibold">{person ? "Editar responsável" : "Novo responsável"}</p>
      </div>
      <Field label="Nome" htmlFor={`${idp}-name`} error={errors.fullName}>
        <input id={`${idp}-name`} className="field" value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus placeholder="Nome e sobrenome" />
      </Field>
      <Field label="WhatsApp" htmlFor={`${idp}-wa`} error={errors.whatsapp}>
        <input
          id={`${idp}-wa`}
          className="field"
          inputMode="tel"
          autoComplete="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="+55 11 99812-4470"
        />
      </Field>
      <Field label="E-mail" htmlFor={`${idp}-email`} error={errors.email}>
        <input
          id={`${idp}-email`}
          className="field"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nome@empresa.com.br"
        />
      </Field>
      <div>
        <p className="mb-[6px] text-[12px] font-semibold text-ink-2">Cobrar por</p>
        <ChannelSegmented value={channel} onChange={setChannel} label="Canal de cobrança" />
      </div>
      {errors.form && (
        <p role="alert" className="text-[13px] text-late-fg">
          {errors.form}
        </p>
      )}
      <div className="mt-1 flex flex-wrap gap-2">
        <Button type="submit" loading={pending}>
          Salvar
        </Button>
        <Button variant="secondary" onClick={() => onDone()} disabled={pending}>
          Cancelar
        </Button>
        {person &&
          (person.isActive ? (
            <Button variant="secondary" className="ml-auto text-late-fg" onClick={() => setConfirmOff(true)} disabled={pending}>
              Desativar
            </Button>
          ) : (
            <Button variant="secondary" className="ml-auto" onClick={() => setActive(true)} disabled={pending}>
              Reativar
            </Button>
          ))}
      </div>
      {person && (
        <ConfirmDialog
          open={confirmOff}
          title={`Desativar ${person.fullName}?`}
          body={
            person.openCount > 0
              ? `${person.fullName} tem ${openText(person.openCount)} e deixa de receber cobranças. As demandas continuam na matriz e aparecem como aviso na prévia.`
              : `${person.fullName} deixa de aparecer na escolha de responsável. Dá para reativar depois.`
          }
          confirmLabel="Desativar"
          pending={pending}
          onConfirm={() => setActive(false)}
          onClose={() => setConfirmOff(false)}
        />
      )}
    </form>
  );
}

export function PersonCard({
  person,
  editing,
  highlighted,
  onEdit,
  onDone,
}: {
  person: Assignee | null;
  editing: boolean;
  highlighted?: boolean;
  onEdit?: () => void;
  onDone: (createdId?: string) => void;
}) {
  const toast = useToast();
  const [channel, setChannel] = useState<ChannelPreference>(person?.reminderChannel ?? "whatsapp");
  const [channelError, setChannelError] = useState<string | null>(null);
  const [saving, start] = useTransition();

  if (editing || !person) {
    return (
      <article className="rounded-card bg-surface p-4 outline-2 outline-offset-2 outline-ink md:p-[18px]">
        <PersonForm person={person} onDone={onDone} />
      </article>
    );
  }

  const changeChannel = (v: ChannelPreference) => {
    const previous = channel;
    setChannel(v);
    setChannelError(null);
    start(async () => {
      const res = await updateAssigneeAction(person.id, { reminderChannel: v });
      if (!res.ok) {
        setChannel(previous);
        setChannelError(res.message);
        return;
      }
      toast(`${person.fullName.split(" ")[0]} passa a receber por ${v === "both" ? "WhatsApp e e-mail" : v === "email" ? "e-mail" : "WhatsApp"}`);
    });
  };

  return (
    <article
      id={`pessoa-${person.id}`}
      aria-labelledby={`pessoa-nome-${person.id}`}
      className={`flex flex-col rounded-card bg-surface p-4 md:p-[18px] ${person.isActive ? "" : "opacity-70"} ${highlighted ? "outline-2 outline-offset-2 outline-ink" : ""}`}
    >
      <div className="flex items-start gap-3">
        <Avatar initials={person.initials} color={person.color} size="xl" />
        <div className="min-w-0 flex-1 pt-[6px]">
          <button
            type="button"
            id={`pessoa-nome-${person.id}`}
            onClick={onEdit}
            className="block text-left text-[16px] leading-[20px] font-semibold hover:underline"
            aria-label={`${person.fullName}, editar`}
          >
            {person.fullName}
          </button>
          <p className="mt-[2px] text-[13px] text-ink-2">{person.isActive ? openText(person.openCount) : "desativado"}</p>
        </div>
        {person.nextDue && person.isActive && (
          <Link href={`/pastas/${person.nextDue.matrixSlug}?demanda=${person.nextDue.taskId}`} className="mt-[6px] shrink-0" title={person.nextDue.title}>
            <StatusChip status={person.nextDue.status} label={dueStatusShort(person.nextDue.status)} small />
          </Link>
        )}
      </div>
      <ContactLines a={person} />
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
        {person.isActive ? (
          <ChannelSegmented value={channel} onChange={changeChannel} label={`Canal de cobrança de ${person.fullName}`} disabled={saving} />
        ) : (
          <Button variant="secondary" size="row" onClick={onEdit}>
            Reativar
          </Button>
        )}
        <span className="flex gap-1" aria-label={person.folderColors.length ? `Pastas: ${person.folderColors.map((c) => folderColorLabel[c]).join(", ")}` : undefined}>
          {person.folderColors.map((c) => (
            <span key={c} className="h-3 w-3 rounded-[4px]" style={{ background: folderTheme[c].solid }} />
          ))}
        </span>
      </div>
      {channelError && (
        <p role="alert" className="mt-2 text-[13px] text-late-fg">
          {channelError}
        </p>
      )}
    </article>
  );
}
