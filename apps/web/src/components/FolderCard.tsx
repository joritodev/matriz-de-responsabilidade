import Link from "next/link";
import type { FolderSummary, IsoDate } from "@/lib/api-types";
import { folderVars } from "@/lib/folder-colors";
import { folderAlertText, nextDueText } from "@/lib/labels";
import { Chip } from "./StatusChip";

function AlertChip({ folder }: { folder: FolderSummary }) {
  const text = folderAlertText(folder.alert);
  if (folder.alert.kind === "overdue") return <Chip tone="late">{text}</Chip>;
  if (folder.alert.kind === "today") return <Chip tone="today">{text}</Chip>;
  return <Chip tone="white">{text}</Chip>;
}

/** Pasta suspensa: corpo na cor da pasta, aba de 46% saindo por cima. */
export function FolderCard({ folder, today }: { folder: FolderSummary; today: IsoDate }) {
  const shown = folder.assigneeInitials.slice(0, 4);
  const extra = folder.assigneeInitials.length - shown.length;
  return (
    <Link
      href={`/pastas/${folder.slug}`}
      style={folderVars(folder.color)}
      className="folder-lift relative mt-[18px] flex flex-col gap-[10px] rounded-[0_22px_22px_22px] bg-f-bg px-5 py-[18px] text-f-ink"
    >
      <span aria-hidden="true" className="absolute top-[-18px] left-0 h-5 w-[46%] rounded-[14px_14px_0_0] bg-f-bg" />
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-[20px] leading-6 font-bold tracking-[-0.02em]">{folder.name}</span>
        <AlertChip folder={folder} />
      </span>
      <span className="text-[14px] leading-5">
        {folder.openCount === 0 ? "Nenhuma demanda aberta." : `${folder.openCount} ${folder.openCount === 1 ? "aberta" : "abertas"}. ${nextDueText(folder.nextDueDate, today)}`}
      </span>
      <span className="flex min-h-8" aria-label={shown.length ? `Responsáveis: ${folder.assigneeInitials.join(", ")}` : undefined}>
        {shown.map((ini, i) => (
          <span
            key={ini + i}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-white text-[12px] font-bold text-f-ink ${i ? "-ml-2" : ""}`}
            aria-hidden="true"
          >
            {ini}
          </span>
        ))}
        {extra > 0 && (
          <span className="-ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-white text-[12px] font-bold text-f-ink" aria-hidden="true">
            +{extra}
          </span>
        )}
      </span>
    </Link>
  );
}

/** Versão compacta do celular (imagem 05). */
export function FolderCardMobile({ folder }: { folder: FolderSummary }) {
  const late = folder.alert.kind === "overdue";
  return (
    <Link
      href={`/pastas/${folder.slug}`}
      style={folderVars(folder.color)}
      className="relative mt-3 flex w-[min(46vw,216px)] shrink-0 snap-start flex-col gap-[6px] rounded-[0_18px_18px_18px] bg-f-bg p-[14px] pt-4 text-f-ink"
    >
      <span aria-hidden="true" className="absolute top-[-12px] left-0 h-[14px] w-[30%] min-w-[56px] rounded-[10px_10px_0_0] bg-f-bg" />
      <span className="truncate text-[18px] leading-6 font-bold tracking-[-0.02em]">{folder.name}</span>
      <span className="text-[14px]">{folder.openCount === 1 ? "1 aberta" : `${folder.openCount} abertas`}</span>
      <span className={`text-[14px] font-bold ${late ? "text-late-fg" : ""}`}>{folderAlertText(folder.alert)}</span>
    </Link>
  );
}
