import type { BaseStatus } from "../status/types";

export type DependencySatisfaction = {
  dependsOnTaskId: string;
  predecessorStatus: BaseStatus;
};

export function andDependenciesSatisfied(deps: DependencySatisfaction[]): boolean {
  if (deps.length === 0) return true;
  return deps.every((d) => d.predecessorStatus === "COMPLETED");
}

export function blockedByUnsatisfiedDeps(deps: DependencySatisfaction[]): string[] {
  return deps.filter((d) => d.predecessorStatus !== "COMPLETED").map((d) => d.dependsOnTaskId);
}
