import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { buttonClass } from "@/components/Button";
import { api } from "@/lib/api";
import type { FolderSummary } from "@/lib/api-types";

export default async function FoldersIndex() {
  await connection();
  const folders = await api<FolderSummary[]>("/matrices");
  const first = folders.find((f) => !f.isArchived);
  if (first) redirect(`/pastas/${first.slug}`);
  return (
    <section className="rounded-card bg-surface px-6 py-12 text-center">
      <h1 className="text-[24px] font-bold">Nenhuma pasta ainda</h1>
      <p className="mt-2 text-[15px] text-ink-2">Crie a primeira pasta para lançar as demandas de um projeto.</p>
      <Link href="/?nova=1" className={buttonClass("primary", "default", "mt-5")}>
        Criar pasta
      </Link>
    </section>
  );
}
