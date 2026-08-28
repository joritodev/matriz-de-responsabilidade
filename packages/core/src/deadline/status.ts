import type { BaseStatus, DeadlineStatus } from "../status/types";
import { addBusinessDays } from "./calendar";
import type { CivilDate } from "./calendar";

export type ComputeDeadlineStatusInput = {
  baseStatus: BaseStatus;
  currentDueDate: CivilDate | null;
  today: CivilDate;
  holidays: CivilDate[];
  dueSoonBusinessDays: number;
};

export function computeDeadlineStatus(input: ComputeDeadlineStatusInput): DeadlineStatus {
  if (input.baseStatus === "COMPLETED" || input.baseStatus === "CANCELLED") {
    return "NOT_APPLICABLE";
  }
  if (!input.currentDueDate) {
    return "NOT_APPLICABLE";
  }
  if (input.today > input.currentDueDate) {
    return "OVERDUE";
  }
  if (input.today === input.currentDueDate) {
    return "DUE_TODAY";
  }
  const soonLimit = addBusinessDays(input.today, input.dueSoonBusinessDays, input.holidays);
  if (input.currentDueDate <= soonLimit) {
    return "DUE_SOON";
  }
  return "ON_TIME";
}
