"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { searchAction } from "@/app/(app)/actions";
import type { SearchResult } from "@/lib/api-types";
import { ddmm } from "@/lib/dates";
import { folderTheme } from "@/lib/folder-colors";
import { Avatar } from "./Avatar";
import { StatusChip } from "./StatusChip";

type Hit = { href: string; key: string };

/** Busca no topo: resultados agrupados por pasta; Enter abre a demanda já expandida. */
export function SearchBox({ className = "" }: { className?: string }) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResult(null);
      setError(null);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const res = await searchAction(term);
      setLoading(false);
      if (res.ok) {
        setResult(res.data);
        setError(null);
      } else setError(res.message);
      setActive(0);
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const hits: Hit[] = useMemo(() => {
    if (!result) return [];
    return [
      ...result.groups.flatMap((g) => g.tasks.map((t) => ({ key: t.id, href: `/pastas/${g.folder.slug}?filtro=${t.taskStatus === "done" ? "done" : "open"}&demanda=${t.id}` }))),
      ...result.people.map((p) => ({ key: p.id, href: `/responsaveis?pessoa=${p.id}` })),
    ];
  }, [result]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  let idx = -1;
  const showPanel = open && q.trim().length >= 2;

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <label htmlFor="busca" className="sr-only">
        Buscar demanda ou pessoa
      </label>
      <MagnifyingGlassIcon size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
      <input
        id="busca"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Buscar demanda ou pessoa"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, Math.max(hits.length - 1, 0)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && hits[active]) {
            e.preventDefault();
            go(hits[active].href);
          } else if (e.key === "Escape") setOpen(false);
        }}
        className="h-10 w-full rounded-full border-[1.5px] border-transparent bg-surface pr-[18px] pl-11 text-[14px] placeholder:text-ink-3 focus:border-ink focus:outline-none"
      />
      {showPanel && (
        <div id={listId} role="listbox" className="absolute top-12 right-0 z-50 w-[min(420px,calc(100vw-32px))] rounded-card border-[1.5px] border-line bg-surface p-3">
          {loading && !result && (
            <div className="flex flex-col gap-2 p-2" aria-label="Buscando">
              <span className="skeleton h-4 w-1/3" />
              <span className="skeleton h-10 w-full" />
              <span className="skeleton h-10 w-full" />
            </div>
          )}
          {error && <p className="p-3 text-[13px] text-late-fg">{error}</p>}
          {result && hits.length === 0 && <p className="p-3 text-[14px] text-ink-2">Nada encontrado para “{q.trim()}”.</p>}
          {result?.groups.map((g) => (
            <div key={g.folder.id} className="mb-1">
              <div className="flex items-center gap-2 px-3 pt-2 pb-1 text-[12px] font-bold" style={{ color: folderTheme[g.folder.color].ink }}>
                <span className="h-[10px] w-[10px] rounded-[3px]" style={{ background: folderTheme[g.folder.color].solid }} />
                {g.folder.name}
              </div>
              {g.tasks.map((t) => {
                idx += 1;
                const i = idx;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="option"
                    aria-selected={active === i}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(hits[i].href)}
                    className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-2 text-left ${active === i ? "bg-surface-muted" : ""}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold">{t.title}</span>
                      <span className="block text-[12px] text-ink-3">
                        {t.assigneeName}, prazo {ddmm(t.dueDate)}
                      </span>
                    </span>
                    <StatusChip status={t.status} small />
                  </button>
                );
              })}
            </div>
          ))}
          {result && result.people.length > 0 && (
            <div>
              <div className="px-3 pt-2 pb-1 text-[12px] font-bold text-ink-2">Pessoas</div>
              {result.people.map((p) => {
                idx += 1;
                const i = idx;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={active === i}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(hits[i].href)}
                    className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-2 text-left ${active === i ? "bg-surface-muted" : ""}`}
                  >
                    <Avatar initials={p.initials} color={p.color} />
                    <span className="text-[14px] font-semibold">{p.fullName}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
