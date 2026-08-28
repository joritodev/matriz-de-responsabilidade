export { DomainError } from "./errors";

export { normalizeE164 } from "./phone/e164";
export type { E164 } from "./phone/e164";

export { nextSequenceNumber } from "./task/sequence-number";
export { projectObservations } from "./task/observations";

export { assertCanAddDependency } from "./dependency/graph";
export type { DependencyEdge, AddDependencyResult } from "./dependency/graph";
export { andDependenciesSatisfied, blockedByUnsatisfiedDeps } from "./dependency/and";

export {
  BASE_STATUSES,
  EXTENSION_STATUSES,
  DEADLINE_STATUSES,
  ACTOR_TYPES,
  USER_ROLES,
} from "./status/types";
export type {
  BaseStatus,
  ExtensionStatus,
  DeadlineStatus,
  ActorType,
  UserRole,
} from "./status/types";
export { transitionOperationalStatus, claimDelivered } from "./status/operational";

export { isMatrixActive } from "./matrix/active";

export { materializeFixedDate } from "./deadline/fixed-date";
export { isBusinessDay, addBusinessDays, isWeekend, businessDaysBetween } from "./deadline/calendar";
export { computeDeadlineStatus } from "./deadline/status";
export { attentionRank } from "./dashboard/attention";

export const MATRIX_TYPES = [
  "GENERAL",
  "PROJECT",
  "COURSE",
  "PRODUCT",
  "EVENT",
  "OTHER",
] as const;
export type MatrixType = (typeof MATRIX_TYPES)[number];

export const DEADLINE_TYPES = [
  "FIXED_DATE",
  "BUSINESS_DAYS_AFTER_CREATION",
  "BUSINESS_DAYS_AFTER_DEPENDENCY",
  "CALENDAR_DAYS_AFTER_TRIGGER",
  "RECURRING_BUSINESS_DAY",
  "MANUAL",
] as const;
export type DeadlineType = (typeof DEADLINE_TYPES)[number];
