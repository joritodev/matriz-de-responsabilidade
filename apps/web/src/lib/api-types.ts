export type IsoDate = string;
export type FolderColor = "lilac" | "mint" | "peach" | "lemon" | "sky" | "rose" | "sand" | "sage";
export const FOLDER_COLORS: FolderColor[] = ["lilac", "mint", "peach", "lemon", "sky", "rose", "sand", "sage"];

export type Channel = "whatsapp" | "email";
export type ChannelPreference = Channel | "both";
export type ReminderState = "sent" | "planned" | "failed" | "queued" | "none";
export type TaskStatus = "pending" | "done" | "canceled";

export type DueStatus =
  | { kind: "done" }
  | { kind: "canceled" }
  | { kind: "overdue"; days: number }
  | { kind: "today" }
  | { kind: "soon"; days: number }
  | { kind: "ok"; days: number };

export type FolderAlert =
  | { kind: "overdue"; count: number }
  | { kind: "today"; count: number }
  | { kind: "soon"; count: number }
  | { kind: "ok" }
  | { kind: "empty" };

export interface FolderSummary {
  id: string;
  name: string;
  slug: string;
  color: FolderColor;
  description: string | null;
  position: number;
  isArchived: boolean;
  openCount: number;
  doneCount: number;
  totalCount: number;
  nextDueDate: IsoDate | null;
  alert: FolderAlert;
  assigneeInitials: string[];
}

export interface PersonRef {
  id: string;
  fullName: string;
  initials: string;
  color: FolderColor | null;
}

export interface MatrixRef {
  name: string;
  color: FolderColor;
  slug: string;
}

export interface RulerRow {
  taskId: string;
  title: string;
  position: number;
  assigneeName: string;
  initials: string;
  dueDate: IsoDate;
  earlyDate: IsoDate | null;
  status: DueStatus;
  early: ReminderState;
  due: ReminderState;
}

export interface RulerGroup {
  folderId: string;
  name: string;
  slug: string;
  color: FolderColor;
  rows: RulerRow[];
}

export type BatchKind = "early" | "due" | "mixed";
export type BatchStatus = "queued" | "sent" | "failed";
export type BatchDisplayStatus = BatchStatus | "no_confirmation";

export interface BatchItem {
  taskId: string;
  title: string;
  kind: "early" | "due";
  dueDateSnapshot: IsoDate;
  matrix: MatrixRef;
}

export interface Overview {
  today: IsoDate;
  greeting: { dueToday: number; dueNext3Days: number; overdue: number; remindersSentToday: boolean };
  days: { date: IsoDate; folderColors: FolderColor[] }[];
  folders: FolderSummary[];
  ruler: { columns: IsoDate[]; groups: RulerGroup[] };
  todayBatches: {
    id: string;
    assignee: PersonRef;
    assigneeName: string;
    channel: Channel;
    kind: BatchKind;
    status: BatchStatus;
    displayStatus: BatchDisplayStatus;
    items: BatchItem[];
    summary: string;
    sentAt: string;
    error: string | null;
  }[];
  tomorrow: { date: IsoDate; count: number; summary: string };
  dueSoon: {
    taskId: string;
    title: string;
    assigneeName: string;
    dueDate: IsoDate;
    status: DueStatus;
    matrix: MatrixRef;
    early: ReminderState;
    due: ReminderState;
  }[];
}

export type Prerequisite = { taskId: string; title: string } | { note: string } | null;

export interface TaskRowData {
  id: string;
  matrixId: string;
  position: number;
  title: string;
  notes: string | null;
  assignee: PersonRef;
  dueDate: IsoDate;
  earlyDate: IsoDate | null;
  taskStatus: TaskStatus;
  status: DueStatus;
  prerequisite: Prerequisite;
  reminders: { early: ReminderState; due: ReminderState };
  isExtended: boolean;
  completedAt: string | null;
  createdAt: string;
  lastChange: {
    kind: "extension" | "correction";
    previousDueDate: IsoDate;
    newDueDate: IsoDate;
    reason: string | null;
    approvedBy: string | null;
    createdAt: string;
  } | null;
}

export type TaskFilter = "open" | "done" | "extended";

export interface MatrixTasks {
  today: IsoDate;
  matrix: FolderSummary;
  filter: TaskFilter;
  counts: { open: number; done: number; extended: number; canceled: number; total: number };
  dueThisWeek: number;
  prerequisiteOptions: { id: string; position: number; title: string }[];
  tasks: TaskRowData[];
}

export type HistoryEvent =
  | { type: "created"; at: string; dueDate: IsoDate }
  | { type: "due_change"; at: string; kind: "extension" | "correction"; previousDueDate: IsoDate; newDueDate: IsoDate; reason: string | null; approvedBy: string | null }
  | { type: "reminder"; at: string; kind: "early" | "due"; channel: Channel; status: BatchStatus; dueDateSnapshot: IsoDate; error: string | null }
  | { type: "completed"; at: string };

export interface Assignee {
  id: string;
  fullName: string;
  initials: string;
  whatsapp: string | null;
  email: string | null;
  reminderChannel: ChannelPreference;
  isActive: boolean;
  color: FolderColor | null;
  openCount: number;
  nextDue: { date: IsoDate; taskId: string; title: string; matrixSlug: string; status: DueStatus } | null;
  folderColors: FolderColor[];
  createdAt: string;
}

export interface Batch {
  id: string;
  sentOn: IsoDate;
  assignee: PersonRef;
  channel: Channel;
  recipient: string;
  status: BatchStatus;
  displayStatus: BatchDisplayStatus;
  kind: BatchKind;
  items: BatchItem[];
  subject: string | null;
  messageBody: string;
  messageReconstructed: boolean;
  error: string | null;
  providerMessageId: string | null;
  makeExecutionId: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface BatchHistory {
  from: IsoDate;
  to: IsoDate;
  today: IsoDate;
  days: { date: IsoDate; batches: Batch[] }[];
}

export interface Preview {
  date: IsoDate;
  isBusinessDay: boolean;
  batches: {
    assignee: PersonRef;
    channel: Channel;
    to: string;
    subject: string | null;
    body: string;
    kind: BatchKind;
    retry: boolean;
    items: BatchItem[];
  }[];
  skipped: {
    taskId: string;
    title: string;
    assignee: PersonRef;
    channel: Channel | null;
    reason: "assignee_inactive" | "missing_whatsapp" | "missing_email";
    message: string;
    matrix: MatrixRef;
  }[];
}

export interface SearchResult {
  q: string;
  groups: {
    folder: { id: string; name: string; slug: string; color: FolderColor };
    tasks: { id: string; title: string; dueDate: IsoDate; taskStatus: TaskStatus; status: DueStatus; assigneeName: string }[];
  }[];
  people: PersonRef[];
}

export interface Me {
  email: string;
  role: "admin" | "editor" | "viewer";
  today: IsoDate;
}

export interface ApiErrorBody {
  message: string;
  code: string;
}

export type ActionResult<T = undefined> = { ok: true; data: T; message?: string } | { ok: false; message: string; code?: string };
