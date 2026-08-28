import { describe, expect, it } from "vitest";
import {
  claimDelivered,
  DomainError,
  transitionOperationalStatus,
} from "./operational";

describe("unit_status_operational", () => {
  it("já entreguei via claim vai para WAITING_FOR_VALIDATION, nunca COMPLETED", () => {
    expect(
      claimDelivered({ from: "IN_PROGRESS", actorType: "SYSTEM" }).to,
    ).toBe("WAITING_FOR_VALIDATION");
    expect(() =>
      transitionOperationalStatus({
        from: "IN_PROGRESS",
        to: "COMPLETED",
        actorType: "SYSTEM",
        actorRole: null,
      }),
    ).toThrow(DomainError);
  });

  it("somente ADMIN confirma COMPLETED", () => {
    expect(
      transitionOperationalStatus({
        from: "WAITING_FOR_VALIDATION",
        to: "COMPLETED",
        actorType: "USER",
        actorRole: "ADMIN",
      }).to,
    ).toBe("COMPLETED");
    expect(() =>
      transitionOperationalStatus({
        from: "WAITING_FOR_VALIDATION",
        to: "COMPLETED",
        actorType: "USER",
        actorRole: "OPERATOR",
      }),
    ).toThrow(DomainError);
  });

  it("ADMIN pode ir de IN_PROGRESS para COMPLETED sem claim", () => {
    expect(
      transitionOperationalStatus({
        from: "IN_PROGRESS",
        to: "COMPLETED",
        actorType: "USER",
        actorRole: "ADMIN",
      }).to,
    ).toBe("COMPLETED");
  });

  it("IA não origina transição de domínio", () => {
    expect(() =>
      transitionOperationalStatus({
        from: "IN_PROGRESS",
        to: "WAITING_FOR_VALIDATION",
        actorType: "AI_SUGGESTION",
        actorRole: null,
      }),
    ).toThrow(DomainError);
  });

  it("unit_dep_andBloqueiaSeUmaPendente — SYSTEM pode marcar BLOCKED", () => {
    expect(
      transitionOperationalStatus({
        from: "PENDING",
        to: "BLOCKED",
        actorType: "SYSTEM",
        actorRole: null,
        reason: "UNSATISFIED_DEPENDENCY",
      }).to,
    ).toBe("BLOCKED");
  });
});
