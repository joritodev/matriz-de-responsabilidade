"use client";

import { CheckIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createMatrixAction } from "@/app/(app)/actions";
import { FOLDER_COLORS, type FolderColor } from "@/lib/api-types";
import { folderColorLabel, folderTheme, folderVars } from "@/lib/folder-colors";
import { Button } from "./Button";
import { useToast } from "./Toast";

/** "Nova pasta": cartão tracejado que vira formulário inline com nome e as 8 cores. */
export function NewFolderCard({ suggestedColor = "sky", large = false }: { suggestedColor?: FolderColor; large?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<FolderColor>(suggestedColor);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (editing) input.current?.focus();
  }, [editing]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`folder-lift relative mt-[18px] flex flex-col items-center justify-center gap-1 rounded-[0_22px_22px_22px] border-2 border-dashed border-dash px-5 py-[18px] text-ink-2 ${large ? "min-h-[180px]" : "min-h-[112px]"}`}
      >
        <span aria-hidden="true" className="absolute top-[-20px] left-[-2px] h-5 w-[46%] rounded-[14px_14px_0_0] border-2 border-b-0 border-dashed border-dash" />
        <span className="text-[16px] font-semibold text-ink">Nova pasta</span>
        <span className="text-[13px]">{large ? "Crie a primeira matriz ou importe a do Docs." : "Crie uma matriz ou importe do Docs"}</span>
      </button>
    );
  }

  const submit = () => {
    if (!name.trim()) {
      setError("Dê um nome para a pasta.");
      input.current?.focus();
      return;
    }
    start(async () => {
      const res = await createMatrixAction({ name: name.trim(), color });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      toast(`Pasta ${name.trim()} criada`);
      router.push(`/pastas/${res.data.slug}`);
    });
  };

  return (
    <form
      style={folderVars(color)}
      className="relative mt-[18px] flex flex-col gap-3 rounded-[0_22px_22px_22px] bg-f-bg px-5 py-[18px] text-f-ink transition-colors duration-150"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
    >
      <span aria-hidden="true" className="absolute top-[-18px] left-0 h-5 w-[46%] rounded-[14px_14px_0_0] bg-f-bg transition-colors duration-150" />
      <label htmlFor="new-folder-name" className="sr-only">
        Nome da pasta
      </label>
      <input
        ref={input}
        id="new-folder-name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
        placeholder="Nome da pasta"
        className="field h-10"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "new-folder-error" : undefined}
        maxLength={60}
      />
      <fieldset>
        <legend className="sr-only">Cor da pasta</legend>
        <div className="flex flex-wrap gap-[6px]">
          {FOLDER_COLORS.map((c) => (
            <label key={c} className="relative cursor-pointer" title={folderColorLabel[c]}>
              <input type="radio" name="folder-color" value={c} checked={color === c} onChange={() => setColor(c)} className="peer sr-only" />
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink"
                style={{ background: folderTheme[c].solid }}
              >
                {color === c && <CheckIcon size={14} weight="bold" className="text-ink" aria-hidden="true" />}
              </span>
              <span className="sr-only">{folderColorLabel[c]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {error && (
        <p id="new-folder-error" role="alert" className="text-[13px] text-late-fg">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="folder" loading={pending}>
          Criar pasta
        </Button>
        <Button variant="secondary" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
