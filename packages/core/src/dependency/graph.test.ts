import { describe, expect, it } from "vitest";
import { assertCanAddDependency, DomainError } from "./graph";

const edge = (taskId: string, dependsOnTaskId: string) => ({ taskId, dependsOnTaskId });

describe("unit_dep", () => {
  it("unit_dep_autoDependenciaRejeitada", () => {
    expect(() => assertCanAddDependency([], edge("t5", "t5"))).toThrow(DomainError);
    expect(() => assertCanAddDependency([], edge("t5", "t5"))).toThrow(/self/i);
  });

  it("unit_dep_cicloDiretoRejeitado", () => {
    expect(() => assertCanAddDependency([edge("A", "B")], edge("B", "A"))).toThrow(/cycle/i);
  });

  it("unit_dep_cicloTransitivoRejeitado", () => {
    const existing = [edge("A", "B"), edge("B", "C")];
    expect(() => assertCanAddDependency(existing, edge("C", "A"))).toThrow(/cycle/i);
  });

  it("unit_dep_diamantePermitido", () => {
    const existing = [edge("A", "C"), edge("B", "C")];
    expect(() => assertCanAddDependency(existing, edge("D", "A"))).not.toThrow();
    expect(() => assertCanAddDependency([...existing, edge("D", "A")], edge("D", "B"))).not.toThrow();
  });

  it("unit_dep_naoInferirPorSequenceNumber — ausência de aresta não cria vínculo", () => {
    expect(assertCanAddDependency([], edge("t3", "t2"))).toEqual(edge("t3", "t2"));
  });

  it("aresta duplicada é idempotente", () => {
    const existing = [edge("A", "B")];
    expect(assertCanAddDependency(existing, edge("A", "B"))).toEqual({
      taskId: "A",
      dependsOnTaskId: "B",
      duplicate: true,
    });
  });
});
