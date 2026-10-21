import type { Metadata } from "next";
import { PeopleGrid } from "@/components/PeopleGrid";
import { api } from "@/lib/api";
import type { Assignee } from "@/lib/api-types";

export const metadata: Metadata = { title: "Responsáveis" };

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ pessoa?: string }> }) {
  const { pessoa } = await searchParams;
  const people = await api<Assignee[]>("/assignees");
  return <PeopleGrid people={people} initialPerson={pessoa && people.some((p) => p.id === pessoa) ? pessoa : null} />;
}
