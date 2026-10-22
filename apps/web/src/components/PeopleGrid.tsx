"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Assignee } from "@/lib/api-types";
import { Button } from "./Button";
import { PersonCard } from "./PersonCard";
import { useCanWrite } from "./Role";

const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function PeopleGrid({ people, initialPerson }: { people: Assignee[]; initialPerson: string | null }) {
  const router = useRouter();
  const canWrite = useCanWrite();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(initialPerson);

  useEffect(() => {
    if (initialPerson) document.getElementById(`pessoa-${initialPerson}`)?.scrollIntoView({ block: "center" });
  }, [initialPerson]);

  const q = fold(query.trim());
  const digits = q.replace(/\D/g, "");
  const match = (a: Assignee) =>
    !q || fold(a.fullName).includes(q) || (a.email ?? "").toLowerCase().includes(q) || (digits.length > 0 && (a.whatsapp ?? "").includes(digits));
  const active = people
    .filter((a) => a.isActive && match(a))
    .sort((x, y) => (x.nextDue?.date ?? "9999").localeCompare(y.nextDue?.date ?? "9999") || x.fullName.localeCompare(y.fullName, "pt-BR"));
  const inactive = people.filter((a) => !a.isActive && match(a));

  const done = (createdId?: string) => {
    setCreating(false);
    setEditingId(null);
    if (createdId) setHighlight(createdId);
    router.refresh();
  };

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] leading-[34px] font-bold tracking-[-0.035em] md:text-[40px] md:leading-[44px]">Responsáveis</h1>
          <p className="mt-2 text-[15px] leading-[22px] text-ink-2 md:text-[16px] md:leading-6">Quem recebe as cobranças, por onde, e o que está com cada um.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <label className="relative min-w-0 flex-1 sm:w-[220px] sm:flex-none">
            <span className="sr-only">Buscar pessoa</span>
            <MagnifyingGlassIcon size={16} className="pointer-events-none absolute top-1/2 left-[14px] -translate-y-1/2 text-ink-2" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar pessoa"
              className="h-10 w-full rounded-full bg-surface pr-4 pl-[38px] text-[14px] outline-offset-2 placeholder:text-ink-2"
            />
          </label>
          {canWrite && (
            <Button
              onClick={() => {
                setCreating(true);
                setEditingId(null);
              }}
              disabled={creating}
            >
              Novo responsável
            </Button>
          )}
        </div>
      </section>

      {people.length === 0 && !creating ? (
        <div className="rounded-card border-2 border-dashed border-dash px-6 py-12 text-center">
          <p className="text-[17px] font-semibold">Cadastre quem recebe as cobranças.</p>
          {canWrite && (
            <Button className="mt-4" onClick={() => setCreating(true)}>
              Novo responsável
            </Button>
          )}
        </div>
      ) : (
        <section aria-label="Pessoas" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(270px,1fr))]">
          {creating && <PersonCard person={null} editing onDone={done} />}
          {active.map((a) => (
            <PersonCard
              key={`${a.id}-${a.reminderChannel}`}
              person={a}
              editing={editingId === a.id}
              highlighted={highlight === a.id}
              onEdit={() => {
                setEditingId(a.id);
                setCreating(false);
              }}
              onDone={done}
            />
          ))}
          {q && active.length === 0 && inactive.length === 0 && (
            <p className="col-span-full rounded-inner bg-surface px-5 py-8 text-center text-[15px] text-ink-2">Ninguém com “{query.trim()}”.</p>
          )}
        </section>
      )}

      {inactive.length > 0 && (
        <section aria-labelledby="desativados" className="flex flex-col gap-4">
          <h2 id="desativados" className="text-[18px] leading-6 font-bold tracking-[-0.02em] md:text-[22px] md:leading-7">
            Desativados
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(270px,1fr))]">
            {inactive.map((a) => (
              <PersonCard key={a.id} person={a} editing={editingId === a.id} onEdit={() => setEditingId(a.id)} onDone={done} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
