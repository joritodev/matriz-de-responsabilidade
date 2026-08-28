import type { BaseStatus, DeadlineStatus, ExtensionStatus } from "../status/types";

export type AttentionInput = {
  sequenceNumber: number;
  deadlineStatus: DeadlineStatus;
  baseStatus: BaseStatus;
  extensionStatus: ExtensionStatus;
};

const DEADLINE_WEIGHT: Record<DeadlineStatus, number> = {
  OVERDUE: 0,
  DUE_TODAY: 10,
  DUE_SOON: 20,
  WAITING_FOR_TRIGGER: 30,
  ON_TIME: 40,
  NOT_APPLICABLE: 90,
};

export function attentionRank(input: AttentionInput): number {
  let rank = DEADLINE_WEIGHT[input.deadlineStatus] * 1000;
  if (input.extensionStatus === "REQUESTED") rank -= 5;
  if (input.baseStatus === "BLOCKED") rank += 1;
  return rank;
}
