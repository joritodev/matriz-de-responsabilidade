import { DomainError } from "../errors";
import type { ActorType, BaseStatus, UserRole } from "./types";

export { DomainError };

export type TransitionInput = {
  from: BaseStatus;
  to: BaseStatus;
  actorType: ActorType;
  actorRole: UserRole | null;
  reason?: string;
};

const ADMIN_ONLY_TARGETS = new Set<BaseStatus>(["COMPLETED", "CANCELLED"]);

const ALLOWED: Record<BaseStatus, BaseStatus[]> = {
  PENDING: [
    "IN_PROGRESS",
    "BLOCKED",
    "WAITING_FOR_INPUT",
    "WAITING_FOR_VALIDATION",
    "CANCELLED",
    "COMPLETED",
  ],
  IN_PROGRESS: [
    "BLOCKED",
    "WAITING_FOR_INPUT",
    "WAITING_FOR_VALIDATION",
    "COMPLETED",
    "CANCELLED",
    "PENDING",
  ],
  BLOCKED: [
    "PENDING",
    "IN_PROGRESS",
    "WAITING_FOR_INPUT",
    "WAITING_FOR_VALIDATION",
    "CANCELLED",
  ],
  WAITING_FOR_INPUT: [
    "IN_PROGRESS",
    "PENDING",
    "BLOCKED",
    "WAITING_FOR_VALIDATION",
    "CANCELLED",
  ],
  WAITING_FOR_VALIDATION: [
    "COMPLETED",
    "IN_PROGRESS",
    "PENDING",
    "BLOCKED",
    "CANCELLED",
  ],
  COMPLETED: ["IN_PROGRESS", "PENDING"],
  CANCELLED: ["PENDING"],
};

export function transitionOperationalStatus(input: TransitionInput): { from: BaseStatus; to: BaseStatus } {
  if (input.actorType === "AI_SUGGESTION") {
    throw new DomainError("AI_CANNOT_MUTATE", "IA não origina transição de domínio");
  }
  if (input.actorType === "AUTOMATION" || input.actorType === "WHATSAPP") {
    throw new DomainError("ACTOR_CANNOT_MUTATE", "Este ator não escreve status operacional");
  }
  if (input.actorType === "SYSTEM" && input.to === "COMPLETED") {
    throw new DomainError("SYSTEM_CANNOT_COMPLETE", "SYSTEM não marca COMPLETED");
  }
  if (input.from === input.to) {
    return { from: input.from, to: input.to };
  }
  const allowed = ALLOWED[input.from] ?? [];
  if (!allowed.includes(input.to)) {
    throw new DomainError("INVALID_TRANSITION", `Transição ${input.from} → ${input.to} proibida`);
  }

  const needsAdmin =
    ADMIN_ONLY_TARGETS.has(input.to) ||
    input.from === "COMPLETED" ||
    input.from === "CANCELLED" ||
    (input.from === "WAITING_FOR_VALIDATION" &&
      (input.to === "IN_PROGRESS" || input.to === "PENDING" || input.to === "COMPLETED"));

  if (needsAdmin && input.actorType === "USER" && input.actorRole !== "ADMIN") {
    throw new DomainError("ADMIN_REQUIRED", "Somente ADMIN confirma entrega ou cancela");
  }

  if (input.actorType === "SYSTEM") {
    const systemOk =
      input.to === "BLOCKED" ||
      input.to === "WAITING_FOR_VALIDATION" ||
      input.to === "PENDING" ||
      input.to === "IN_PROGRESS";
    if (!systemOk) {
      throw new DomainError("SYSTEM_TRANSITION_FORBIDDEN", "SYSTEM não pode esta transição");
    }
  }

  return { from: input.from, to: input.to };
}

export function claimDelivered(input: {
  from: BaseStatus;
  actorType: ActorType;
}): { from: BaseStatus; to: BaseStatus } {
  if (input.from === "COMPLETED" || input.from === "CANCELLED" || input.from === "WAITING_FOR_VALIDATION") {
    throw new DomainError("CLAIM_NOT_APPLICABLE", "Claim não se aplica neste status");
  }
  return transitionOperationalStatus({
    from: input.from,
    to: "WAITING_FOR_VALIDATION",
    actorType: input.actorType,
    actorRole: null,
  });
}
