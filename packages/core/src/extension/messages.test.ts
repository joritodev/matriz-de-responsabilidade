import { describe, expect, it } from "vitest";
import {
  buildExtensionApprovedToResponsibleText,
  buildExtensionRejectedToResponsibleText,
  buildExtensionRequestToChefsText,
} from "./messages";

const base = {
  matrixName: "OD Academy",
  sequenceNumber: 3,
  taskTitle: "Elaborar versão 1",
  responsibleNames: ["Fenilli"],
  currentDueDate: "2026-10-25",
  requestedDueDate: "2026-10-30",
  reason: "aguardando consolidação dos materiais",
  extensionNumber: 0,
};

describe("extension copy-ready (UC-22)", () => {
  it("pedido aos chefes deixa explícito que nada mudou ainda", () => {
    const text = buildExtensionRequestToChefsText(base);
    expect(text).toContain("Nenhuma data foi alterada ainda");
    expect(text).toContain("Prorrogação seria a nº 1");
    expect(text).toContain("25/10/2026");
    expect(text).toContain("30/10/2026");
  });

  it("aprovado informa novo prazo", () => {
    const text = buildExtensionApprovedToResponsibleText({
      ...base,
      approvedDueDate: "2026-11-02",
    });
    expect(text).toContain("Prorrogação aprovada");
    expect(text).toContain("02/11/2026");
  });

  it("rejeitado mantém prazo vigente", () => {
    const text = buildExtensionRejectedToResponsibleText(base);
    expect(text).toContain("não aprovada");
    expect(text).toContain("O prazo segue 25/10/2026");
  });
});
