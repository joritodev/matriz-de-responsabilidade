import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const citext = customType<{ data: string }>({
  dataType() {
    return "citext";
  },
});

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    email: citext("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull(),
    active: boolean("active").notNull().default(true),
    responsibleId: uuid("responsible_id"),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
    lastLoginAt: timestamptz("last_login_at"),
  },
  (t) => [
    uniqueIndex("users_email_uq").on(t.email),
    index("users_active_role_idx").on(t.active, t.role),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamptz("expires_at").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    lastSeenAt: timestamptz("last_seen_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("sessions_token_hash_uq").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);

export const businessCalendars = pgTable(
  "business_calendars",
  {
    id: uuid("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    timezone: text("timezone").notNull().default("America/Sao_Paulo"),
    locale: text("locale").notNull().default("pt-BR"),
    weekendDays: integer("weekend_days").array().notNull().default(sql`'{0,6}'::integer[]`),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("business_calendars_code_uq").on(t.code),
    uniqueIndex("business_calendars_default_uq")
      .on(t.isDefault)
      .where(sql`${t.isDefault} = true`),
  ],
);

export const holidays = pgTable(
  "holidays",
  {
    id: uuid("id").primaryKey(),
    calendarId: uuid("calendar_id")
      .notNull()
      .references(() => businessCalendars.id, { onDelete: "cascade" }),
    observedOn: date("observed_on").notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    source: text("source").notNull(),
    year: integer("year").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("holidays_calendar_day_uq").on(t.calendarId, t.observedOn)],
);

export const matrices = pgTable(
  "matrices",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    type: text("type").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
    archivedAt: timestamptz("archived_at"),
  },
  (t) => [index("matrices_archived_name_idx").on(t.archivedAt, t.name), index("matrices_type_idx").on(t.type)],
);

export const responsibles = pgTable(
  "responsibles",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    role: text("role"),
    whatsappNumber: text("whatsapp_number"),
    whatsappNumberE164: text("whatsapp_number_e164"),
    email: citext("email"),
    active: boolean("active").notNull().default(true),
    whatsappOptInStatus: text("whatsapp_opt_in_status").notNull().default("UNKNOWN"),
    whatsappOptInAt: timestamptz("whatsapp_opt_in_at"),
    notes: text("notes"),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("responsibles_e164_uq")
      .on(t.whatsappNumberE164)
      .where(sql`${t.whatsappNumberE164} is not null`),
    index("responsibles_active_name_idx").on(t.active, t.name),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey(),
    matrixId: uuid("matrix_id")
      .notNull()
      .references(() => matrices.id, { onDelete: "restrict" }),
    sequenceNumber: integer("sequence_number").notNull(),
    displayOrder: integer("display_order").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    baseStatus: text("base_status").notNull().default("PENDING"),
    extensionStatus: text("extension_status").notNull().default("NONE"),
    originalDueDate: date("original_due_date"),
    currentDueDate: date("current_due_date"),
    extensionCount: integer("extension_count").notNull().default(0),
    completedAt: timestamptz("completed_at"),
    cancelledAt: timestamptz("cancelled_at"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
    cachedDeadlineStatus: text("cached_deadline_status"),
    deadlineStatusComputedAt: timestamptz("deadline_status_computed_at"),
    deadlineStatusAsOf: date("deadline_status_as_of"),
  },
  (t) => [
    uniqueIndex("tasks_matrix_sequence_uq").on(t.matrixId, t.sequenceNumber),
    index("tasks_matrix_display_idx").on(t.matrixId, t.displayOrder),
    index("tasks_base_status_idx").on(t.baseStatus),
    index("tasks_due_open_idx")
      .on(t.currentDueDate)
      .where(sql`${t.cancelledAt} is null and ${t.completedAt} is null`),
  ],
);

export const deadlineRules = pgTable(
  "deadline_rules",
  {
    id: uuid("id").primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    deadlineType: text("deadline_type").notNull(),
    fixedDate: date("fixed_date"),
    amount: integer("amount"),
    unit: text("unit"),
    triggerType: text("trigger_type"),
    triggerTaskId: uuid("trigger_task_id").references(() => tasks.id),
    recurrenceConfig: jsonb("recurrence_config"),
    recurrenceEndedAt: timestamptz("recurrence_ended_at"),
    timezone: text("timezone"),
    calendarId: uuid("calendar_id")
      .notNull()
      .references(() => businessCalendars.id),
    calculatedDueDate: date("calculated_due_date"),
    waitingForTrigger: boolean("waiting_for_trigger").notNull().default(false),
    explanation: jsonb("explanation"),
    computedAt: timestamptz("computed_at"),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("deadline_rules_task_uq").on(t.taskId)],
);

export const taskResponsibles = pgTable(
  "task_responsibles",
  {
    id: uuid("id").primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    responsibleId: uuid("responsible_id")
      .notNull()
      .references(() => responsibles.id, { onDelete: "restrict" }),
    assignedAt: timestamptz("assigned_at").notNull().defaultNow(),
    assignedBy: uuid("assigned_by")
      .notNull()
      .references(() => users.id),
    active: boolean("active").notNull().default(true),
  },
  (t) => [
    uniqueIndex("task_responsibles_pair_uq").on(t.taskId, t.responsibleId),
    index("task_responsibles_person_idx").on(t.responsibleId, t.active),
  ],
);

export const taskDependencies = pgTable(
  "task_dependencies",
  {
    id: uuid("id").primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    dependsOnTaskId: uuid("depends_on_task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "restrict" }),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    satisfiedAt: timestamptz("satisfied_at"),
  },
  (t) => [
    uniqueIndex("task_dependencies_pair_uq").on(t.taskId, t.dependsOnTaskId),
    index("task_dependencies_blocker_idx").on(t.dependsOnTaskId),
  ],
);

export const taskNotes = pgTable("task_notes", {
  id: uuid("id").primaryKey(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  deletedAt: timestamptz("deleted_at"),
});

export const taskStatusHistory = pgTable(
  "task_status_history",
  {
    id: uuid("id").primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    actorType: text("actor_type").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    actorResponsibleId: uuid("actor_responsible_id").references(() => responsibles.id),
    reason: text("reason"),
    inboxItemId: uuid("inbox_item_id"),
    correlationId: uuid("correlation_id"),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (t) => [index("task_status_history_task_idx").on(t.taskId, t.createdAt)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: text("action").notNull(),
    actorType: text("actor_type").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    actorResponsibleId: uuid("actor_responsible_id").references(() => responsibles.id),
    before: jsonb("before"),
    after: jsonb("after"),
    origin: text("origin").notNull(),
    correlationId: uuid("correlation_id"),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_entity_idx").on(t.entityType, t.entityId, t.createdAt),
    index("audit_logs_created_idx").on(t.createdAt),
  ],
);

export const outboxMessages = pgTable(
  "outbox_messages",
  {
    id: uuid("id").primaryKey(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    eventName: text("event_name").notNull(),
    jobType: text("job_type").notNull(),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    availableAt: timestamptz("available_at").notNull().defaultNow(),
    processedAt: timestamptz("processed_at"),
    lastError: text("last_error"),
    pgbossJobId: text("pgboss_job_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    correlationId: uuid("correlation_id").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("outbox_idempotency_uq").on(t.idempotencyKey),
    index("outbox_pending_idx")
      .on(t.status, t.availableAt)
      .where(sql`${t.status} = 'PENDING'`),
  ],
);

export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id),
});
