import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

// Espelho de supabase/migrations/20261021000000_init.sql. A migração SQL é a fonte de verdade.

export const taskStatus = pgEnum('task_status', ['pending', 'done', 'canceled']);
export const reminderChannel = pgEnum('reminder_channel', ['whatsapp', 'email']);
export const channelPreference = pgEnum('channel_preference', ['whatsapp', 'email', 'both']);
export const reminderKind = pgEnum('reminder_kind', ['early', 'due']);
export const batchStatus = pgEnum('batch_status', ['queued', 'sent', 'failed', 'taken']);
export const folderColor = pgEnum('folder_color', ['lilac', 'mint', 'peach', 'lemon', 'sky', 'rose', 'sand', 'sage']);
export const memberRole = pgEnum('member_role', ['admin', 'editor', 'viewer']);
export const dueChangeKind = pgEnum('due_change_kind', ['extension', 'correction']);
export const holidayKind = pgEnum('holiday_kind', ['nacional', 'ponto_facultativo', 'local']);

export const members = pgTable(
  'members',
  {
    email: text('email').primaryKey(),
    role: memberRole('role').notNull().default('editor'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('members_email_check', sql`${t.email} = lower(${t.email}) and ${t.email} ~ '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'`)],
).enableRLS();

export const matrices = pgTable(
  'matrices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    color: folderColor('color').notNull().default('lilac'),
    description: text('description'),
    position: integer('position').notNull().default(0),
    isArchived: boolean('is_archived').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('matrices_name_check', sql`length(trim(${t.name})) > 0`),
    check('matrices_slug_check', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    uniqueIndex('matrices_name_active_key').on(sql`lower(${t.name})`).where(sql`not ${t.isArchived}`),
  ],
).enableRLS();

export const assignees = pgTable(
  'assignees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fullName: text('full_name').notNull(),
    whatsappE164: text('whatsapp_e164'),
    email: text('email'),
    reminderChannel: channelPreference('reminder_channel').notNull().default('whatsapp'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('assignees_full_name_check', sql`length(trim(${t.fullName})) > 0`),
    check('assignees_whatsapp_e164_check', sql`${t.whatsappE164} ~ '^[1-9][0-9]{9,14}$'`),
    check('assignees_email_check', sql`${t.email} ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'`),
    check(
      'assignees_contact_for_channel',
      sql`(${t.reminderChannel} = 'whatsapp' and ${t.whatsappE164} is not null)
        or (${t.reminderChannel} = 'email' and ${t.email} is not null)
        or (${t.reminderChannel} = 'both' and ${t.whatsappE164} is not null and ${t.email} is not null)`,
    ),
  ],
).enableRLS();

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    matrixId: uuid('matrix_id')
      .notNull()
      .references(() => matrices.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    assigneeId: uuid('assignee_id')
      .notNull()
      .references(() => assignees.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    dueDate: date('due_date', { mode: 'string' }).notNull(),
    prerequisiteTaskId: uuid('prerequisite_task_id').references((): AnyPgColumn => tasks.id, { onDelete: 'set null' }),
    prerequisiteNote: text('prerequisite_note'),
    hasPrerequisite: boolean('has_prerequisite').generatedAlwaysAs(
      sql`prerequisite_task_id is not null or prerequisite_note is not null`,
    ),
    status: taskStatus('status').notNull().default('pending'),
    notes: text('notes'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('tasks_position_check', sql`${t.position} > 0`),
    check('tasks_title_check', sql`length(trim(${t.title})) > 0`),
    // deferrable initially deferred: definido na migração SQL
    unique('tasks_position_per_matrix').on(t.matrixId, t.position),
    check('tasks_completed_at_matches_status', sql`(${t.status} = 'done') = (${t.completedAt} is not null)`),
    check('tasks_prerequisite_not_self', sql`${t.prerequisiteTaskId} is null or ${t.prerequisiteTaskId} <> ${t.id}`),
    index('tasks_open_by_due').on(t.dueDate).where(sql`${t.status} = 'pending'`),
    index('tasks_assignee').on(t.assigneeId),
  ],
).enableRLS();

export const taskDueDateChanges = pgTable(
  'task_due_date_changes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    kind: dueChangeKind('kind').notNull().default('extension'),
    previousDueDate: date('previous_due_date', { mode: 'string' }).notNull(),
    newDueDate: date('new_due_date', { mode: 'string' }).notNull(),
    reason: text('reason'),
    approvedBy: text('approved_by'),
    changedByEmail: text('changed_by_email'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('due_change_differs', sql`${t.newDueDate} <> ${t.previousDueDate}`),
    check('due_change_extension_has_reason', sql`${t.kind} <> 'extension' or length(trim(coalesce(${t.reason}, ''))) >= 3`),
    index('task_due_date_changes_task').on(t.taskId, t.createdAt.desc()),
  ],
).enableRLS();

export const holidays = pgTable('holidays', {
  date: date('date', { mode: 'string' }).primaryKey(),
  name: text('name').notNull(),
  kind: holidayKind('kind').notNull().default('nacional'),
}).enableRLS();

export const reminderBatches = pgTable(
  'reminder_batches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assigneeId: uuid('assignee_id')
      .notNull()
      .references(() => assignees.id, { onDelete: 'restrict' }),
    channel: reminderChannel('channel').notNull(),
    recipient: text('recipient').notNull(),
    sentOn: date('sent_on', { mode: 'string' }).notNull(),
    status: batchStatus('status').notNull().default('queued'),
    subject: text('subject'),
    messageBody: text('message_body').notNull(),
    providerMessageId: text('provider_message_id'),
    errorMessage: text('error_message'),
    makeExecutionId: text('make_execution_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (t) => [
    unique('reminder_batches_id_channel').on(t.id, t.channel),
    check('reminder_batches_failed_has_error', sql`${t.status} <> 'failed' or ${t.errorMessage} is not null`),
    index('reminder_batches_by_day').on(t.sentOn.desc(), t.createdAt.desc()),
  ],
).enableRLS();

export const reminderBatchItems = pgTable(
  'reminder_batch_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    batchId: uuid('batch_id').notNull(),
    channel: reminderChannel('channel').notNull(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    kind: reminderKind('kind').notNull(),
    dueDateSnapshot: date('due_date_snapshot', { mode: 'string' }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: 'reminder_items_batch_fk',
      columns: [t.batchId, t.channel],
      foreignColumns: [reminderBatches.id, reminderBatches.channel],
    }).onDelete('cascade'),
    uniqueIndex('reminder_items_once')
      .on(t.taskId, t.kind, t.dueDateSnapshot, t.channel)
      .where(sql`${t.isActive}`),
    index('reminder_items_batch').on(t.batchId),
    index('reminder_items_task').on(t.taskId),
  ],
).enableRLS();

export type Matrix = typeof matrices.$inferSelect;
export type Assignee = typeof assignees.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type ReminderBatch = typeof reminderBatches.$inferSelect;
export type FolderColor = (typeof folderColor.enumValues)[number];
export const FOLDER_COLORS = folderColor.enumValues;
