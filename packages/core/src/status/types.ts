export const BASE_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "BLOCKED",
  "WAITING_FOR_INPUT",
  "WAITING_FOR_VALIDATION",
  "COMPLETED",
  "CANCELLED",
] as const;

export type BaseStatus = (typeof BASE_STATUSES)[number];

export const EXTENSION_STATUSES = ["NONE", "REQUESTED", "APPROVED", "REJECTED"] as const;
export type ExtensionStatus = (typeof EXTENSION_STATUSES)[number];

export const DEADLINE_STATUSES = [
  "ON_TIME",
  "DUE_SOON",
  "DUE_TODAY",
  "OVERDUE",
  "WAITING_FOR_TRIGGER",
  "NOT_APPLICABLE",
] as const;
export type DeadlineStatus = (typeof DEADLINE_STATUSES)[number];

export const ACTOR_TYPES = [
  "USER",
  "AUTOMATION",
  "WHATSAPP",
  "AI_SUGGESTION",
  "SYSTEM",
] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

export const USER_ROLES = ["ADMIN", "OPERATOR"] as const;
export type UserRole = (typeof USER_ROLES)[number];
