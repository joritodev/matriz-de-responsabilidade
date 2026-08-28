import { describe, expect, it } from "vitest";
import { andDependenciesSatisfied, blockedByUnsatisfiedDeps } from "./and";

describe("unit_dep_and", () => {
  it("unit_dep_andBloqueiaSeUmaPendente", () => {
    const deps = [
      { dependsOnTaskId: "2", predecessorStatus: "COMPLETED" as const },
      { dependsOnTaskId: "4", predecessorStatus: "IN_PROGRESS" as const },
    ];
    expect(andDependenciesSatisfied(deps)).toBe(false);
    expect(blockedByUnsatisfiedDeps(deps)).toEqual(["4"]);
  });

  it("unit_dep_andLiberaQuandoTodasCompleted", () => {
    const deps = [
      { dependsOnTaskId: "2", predecessorStatus: "COMPLETED" as const },
      { dependsOnTaskId: "4", predecessorStatus: "COMPLETED" as const },
    ];
    expect(andDependenciesSatisfied(deps)).toBe(true);
    expect(blockedByUnsatisfiedDeps(deps)).toEqual([]);
  });

  it("WAITING_FOR_VALIDATION da predecessora não satisfaz (A29)", () => {
    const deps = [
      { dependsOnTaskId: "2", predecessorStatus: "WAITING_FOR_VALIDATION" as const },
    ];
    expect(andDependenciesSatisfied(deps)).toBe(false);
  });
});
