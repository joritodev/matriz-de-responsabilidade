import { describe, expect, it } from "vitest";
import { dueStatusLabel, formatWhatsapp, parseDateInput, relativeDayLabel } from "./dates";
import { folderAlertText, nextDayWord } from "./labels";

const today = "2026-10-20";

describe("parseDateInput", () => {
  it("aceita dd/mm no ano corrente", () => {
    expect(parseDateInput("23/10", today)).toBe("2026-10-23");
    expect(parseDateInput("3/11", today)).toBe("2026-11-03");
  });

  it("aceita ano com 2 ou 4 dígitos e ISO", () => {
    expect(parseDateInput("23/10/2026", today)).toBe("2026-10-23");
    expect(parseDateInput("05/01/27", today)).toBe("2027-01-05");
    expect(parseDateInput("2026-12-01", today)).toBe("2026-12-01");
  });

  it("joga para o ano seguinte quando dd/mm já passou há mais de 2 meses", () => {
    expect(parseDateInput("10/01", today)).toBe("2027-01-10");
    expect(parseDateInput("10/09", today)).toBe("2026-09-10");
  });

  it("recusa datas inválidas", () => {
    expect(parseDateInput("31/02", today)).toBeNull();
    expect(parseDateInput("amanhã", today)).toBeNull();
    expect(parseDateInput("", today)).toBeNull();
  });
});

describe("rótulos", () => {
  it("descreve a situação do prazo", () => {
    expect(dueStatusLabel({ kind: "overdue", days: 1 })).toBe("atrasada 1 dia");
    expect(dueStatusLabel({ kind: "soon", days: 3 })).toBe("em 3 dias");
    expect(dueStatusLabel({ kind: "soon", days: 1 })).toBe("amanhã");
    expect(folderAlertText({ kind: "overdue", count: 2 })).toBe("2 atrasadas");
  });

  it("formata WhatsApp brasileiro", () => {
    expect(formatWhatsapp("5511998124470")).toBe("+55 11 99812-4470");
    expect(formatWhatsapp(null)).toBe("");
  });

  it("nomeia dias relativos", () => {
    expect(relativeDayLabel("2026-10-20", today)).toBe("Hoje, terça 20");
    expect(relativeDayLabel("2026-10-19", today)).toBe("Ontem, segunda 19");
    expect(relativeDayLabel("2026-10-16", today)).toBe("Sexta, 16");
    expect(nextDayWord("2026-10-21", today)).toBe("amanhã");
    expect(nextDayWord("2026-10-26", "2026-10-23")).toBe("segunda");
  });
});
