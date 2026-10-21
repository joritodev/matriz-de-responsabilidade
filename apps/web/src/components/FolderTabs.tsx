import Link from "next/link";
import type { FolderSummary } from "@/lib/api-types";
import { folderTheme } from "@/lib/folder-colors";

/** Abas das pastas acima do corpo da pasta aberta; a ativa é mais alta e maior. */
export function FolderTabs({ folders, activeSlug }: { folders: FolderSummary[]; activeSlug: string }) {
  return (
    <nav aria-label="Pastas" className="-mx-4 flex gap-[6px] overflow-x-auto px-4 md:mx-0 md:px-1">
      {folders.map((f) => {
        const t = folderTheme[f.color];
        const on = f.slug === activeSlug;
        return (
          <Link
            key={f.id}
            href={`/pastas/${f.slug}`}
            aria-current={on ? "page" : undefined}
            className={`flex shrink-0 items-center gap-[6px] self-end rounded-[14px_14px_0_0] font-bold whitespace-nowrap transition-[height] duration-150 md:gap-2 md:rounded-[18px_18px_0_0] ${
              on ? "h-[44px] px-4 text-[16px] md:h-[50px] md:px-7 md:text-[17px]" : "h-[34px] px-[14px] text-[14px] md:h-[38px] md:px-[22px] md:text-[15px]"
            }`}
            style={{ background: t.bg, color: t.ink }}
          >
            {f.name} <span className="font-medium">{f.openCount}</span>
          </Link>
        );
      })}
      <Link
        href="/?nova=1"
        className="hidden h-[38px] shrink-0 items-center self-end rounded-[18px_18px_0_0] border-2 border-b-0 border-dashed border-dash px-[22px] text-[15px] font-bold text-ink-2 md:flex"
      >
        Nova pasta
      </Link>
    </nav>
  );
}
