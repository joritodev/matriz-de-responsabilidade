import { describe, expect, it } from "vitest";
import { buildDateValidationMessage, dateValidationDueLabel } from "./date-validation";

describe("buildDateValidationMessage", () => {
  it("lista demandas e pede confirmação de datas", () => {
    const text = buildDateValidationMessage({
      responsibleName: "Matheus Silva",
      tasks: [
        {
          matrixName: "Responsabilização Geral",
          sequenceNumber: 1,
          title: "Atualizar a Assinatura Suprema no Site",
          dueLabel: "04/09/2026",
        },
        {
          matrixName: "Responsabilização Geral",
          sequenceNumber: 7,
          title: "Emitir Passagens para Brasília",
          dueLabel: "20/09/2026",
          prerequisiteNote: "depende da etapa #6",
        },
      ],
    });

    expect(text).toContain("Oi, Matheus!");
    expect(text).toContain("1) Atualizar a Assinatura Suprema no Site");
    expect(text).toContain("prazo 04/09/2026");
    expect(text).toContain("depende da etapa #6");
    expect(text).toContain("Não é cobrança ainda");
  });
});

describe("dateValidationDueLabel", () => {
  it("prefere explicação materializada", () => {
    expect(
      dateValidationDueLabel({
        currentDueDate: "2026-09-04",
        deadlineExplanation: "3º dia útil de 09/2026 → 03/09/2026",
      }),
    ).toBe("3º dia útil de 09/2026 → 03/09/2026");
  });

  it("cai no formato da data quando não há explicação", () => {
    expect(
      dateValidationDueLabel({
        currentDueDate: "2026-09-04",
        deadlineExplanation: null,
      }),
    ).toBe("04/09/2026");
  });
});
