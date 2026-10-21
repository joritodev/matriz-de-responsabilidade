"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { ActionResult, ChannelPreference, FolderColor, HistoryEvent, MatrixTasks, SearchResult } from "@/lib/api-types";

async function run<T>(fn: () => Promise<T>, revalidate = true): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    if (revalidate) revalidatePath("/", "layout");
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof ApiError) return { ok: false, message: err.message, code: err.code };
    return { ok: false, message: "Algo deu errado. Tente de novo." };
  }
}

export async function createMatrixAction(input: { name: string; color: FolderColor }) {
  return run(() => api<{ id: string; slug: string }>("/matrices", { method: "POST", body: input }));
}

export async function updateMatrixAction(id: string, input: { name?: string; color?: FolderColor; isArchived?: boolean }) {
  return run(() => api<{ id: string; slug: string }>(`/matrices/${id}`, { method: "PATCH", body: input }));
}

export interface NewTaskInput {
  title: string;
  assigneeId: string;
  dueDate: string;
  prerequisiteTaskId?: string | null;
  prerequisiteNote?: string | null;
  notes?: string | null;
}

export async function createTaskAction(matrixId: string, input: NewTaskInput) {
  return run(() => api<{ id: string; position: number; matrixSlug: string }>(`/matrices/${matrixId}/tasks`, { method: "POST", body: input }));
}

export async function updateTaskAction(
  id: string,
  input: { title?: string; assigneeId?: string; notes?: string | null; prerequisiteTaskId?: string | null; prerequisiteNote?: string | null },
) {
  return run(() => api<{ id: string }>(`/tasks/${id}`, { method: "PATCH", body: input }));
}

export async function extendTaskAction(id: string, input: { newDueDate: string; reason: string; approvedBy?: string | null }) {
  return run(() => api<{ id: string; dueDate: string }>(`/tasks/${id}/extend`, { method: "POST", body: input }));
}

export async function correctDueDateAction(id: string, input: { newDueDate: string; reason?: string | null }) {
  return run(() => api<{ id: string; dueDate: string }>(`/tasks/${id}/correct-due-date`, { method: "POST", body: input }));
}

export async function setTaskStatusAction(id: string, action: "complete" | "reopen" | "cancel") {
  return run(() => api<{ id: string; status: string }>(`/tasks/${id}/${action}`, { method: "POST" }));
}

export async function reorderTasksAction(matrixId: string, taskIds: string[]) {
  return run(() => api<{ ok: true }>(`/matrices/${matrixId}/tasks/reorder`, { method: "POST", body: { taskIds } }));
}

export async function taskHistoryAction(id: string) {
  return run(() => api<{ taskId: string; events: HistoryEvent[] }>(`/tasks/${id}/history`), false);
}

export async function prerequisiteOptionsAction(slug: string) {
  return run(async () => (await api<MatrixTasks>(`/matrices/${slug}/tasks?filter=open`)).prerequisiteOptions, false);
}

export async function searchAction(q: string) {
  return run(() => api<SearchResult>(`/search?q=${encodeURIComponent(q)}`), false);
}

export interface AssigneeInput {
  fullName?: string;
  whatsapp?: string | null;
  email?: string | null;
  reminderChannel?: ChannelPreference;
  isActive?: boolean;
}

export async function createAssigneeAction(input: AssigneeInput & { fullName: string; reminderChannel: ChannelPreference }) {
  return run(() => api<{ id: string }>("/assignees", { method: "POST", body: input }));
}

export async function updateAssigneeAction(id: string, input: AssigneeInput) {
  return run(() => api<{ id: string }>(`/assignees/${id}`, { method: "PATCH", body: input }));
}
