"use client";

import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import type { TaskRow } from "@/lib/queries";
import { baseStatusLabel, deadlineAccent, deadlineStatusLabel } from "@/lib/labels";
import { formatDatePtBr } from "@/lib/dates";

export function TaskTable({ rows, showMatrix = false }: { rows: TaskRow[]; showMatrix?: boolean }) {
  const [query, setQuery] = useState("");
  const columns = useMemo<ColumnDef<TaskRow>[]>(() => {
    const cols: ColumnDef<TaskRow>[] = [
      {
        accessorKey: "sequenceNumber",
        header: "Ordem (#)",
        cell: ({ row }) => <span className="tabular-nums">#{row.original.sequenceNumber}</span>,
      },
    ];
    if (showMatrix) {
      cols.push({
        accessorKey: "matrixName",
        header: "Matriz",
      });
    }
    cols.push(
      {
        id: "responsibles",
        header: "Responsável",
        cell: ({ row }) =>
          row.original.responsibles.length ? (
            <span>{row.original.responsibles.map((r) => r.name).join(", ")}</span>
          ) : (
            <span className="text-stone-400">Sem responsável</span>
          ),
        accessorFn: (row) => row.responsibles.map((r) => r.name).join(" "),
      },
      {
        accessorKey: "title",
        header: "Tarefa",
        cell: ({ row }) => (
          <Link
            href={`/matrices/${row.original.matrixId}/tasks/${row.original.id}`}
            className="font-medium underline-offset-2 hover:underline"
          >
            {row.original.title}
          </Link>
        ),
      },
      {
        accessorKey: "currentDueDate",
        header: "Prazo",
        cell: ({ row }) => (
          <span>
            {formatDatePtBr(row.original.currentDueDate)}
            <span className="ml-2 text-xs text-stone-500">{deadlineStatusLabel[row.original.deadlineStatus]}</span>
          </span>
        ),
      },
      {
        id: "prereq",
        header: "Pré-requisito",
        cell: ({ row }) =>
          row.original.prerequisites.length
            ? row.original.prerequisites.map((p) => `#${p.sequenceNumber}`).join(", ")
            : "—",
        accessorFn: (row) => row.prerequisites.map((p) => p.sequenceNumber).join(" "),
      },
      {
        id: "obs",
        header: "Observações",
        cell: ({ row }) => (
          <div className="max-w-xs text-xs leading-5">
            {row.original.observations.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p className="text-stone-400">{baseStatusLabel[row.original.baseStatus]}</p>
          </div>
        ),
        accessorFn: (row) => row.observations.join(" "),
      },
    );
    return cols;
  }, [showMatrix]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 100 }, sorting: [{ id: "sequenceNumber", desc: false }] },
    state: { globalFilter: query },
    onGlobalFilterChange: setQuery,
    globalFilterFn: (row, _columnId, filter) => {
      const q = String(filter).toLowerCase();
      const t = row.original;
      return [
        t.title,
        t.description ?? "",
        String(t.sequenceNumber),
        t.matrixName,
        ...t.responsibles.map((r) => r.name),
        ...t.observations,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    },
  });

  return (
    <div className="mt-6">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar título, responsável, #…"
        className="mb-3 w-full max-w-md border border-[#d6d3cd] bg-white px-3 py-2 text-sm"
      />
      <div className="overflow-x-auto border border-[#d6d3cd] bg-[#fbfaf6]">
        <table className="w-full border-collapse text-sm" aria-label="Demandas da matriz">
          <thead className="sticky top-0 bg-[#f4f1ea]">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b border-[#d6d3cd] text-left text-xs uppercase tracking-wide text-stone-500">
                {group.headers.map((header) => (
                  <th
                    key={header.id}
                    className="cursor-pointer px-3 py-2"
                    onClick={header.column.getToggleSortingHandler()}
                    title={header.column.id === "sequenceNumber" ? "Ordem de cadastro. Não é prioridade nem dependência." : undefined}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-stone-500">
                  Nenhuma demanda com esses filtros.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-[#ece8e1] border-l-4 ${deadlineAccent(row.original.deadlineStatus)}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-stone-500">{rows.length} demandas</p>
    </div>
  );
}
