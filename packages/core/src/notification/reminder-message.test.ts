import { describe, expect, it } from "vitest";
import { buildReminderMessage, firstName } from "./reminder-message";
import { buildWhatsAppChatLink } from "./wa-link";

describe("buildReminderMessage", () => {
  const base = {
    responsibleName: "Matheus Silva",
    taskTitle: "Atualizar a Assinatura Suprema no Site",
    dueDate: "2026-08-28",
  };

  it("usa o primeiro nome e a data em pt-BR", () => {
    const text = buildReminderMessage({ ...base, deadlineStatus: "DUE_SOON" });
    expect(text).toContain("Oi, Matheus!");
    expect(text).toContain("28/08/2026");
  });

  it("atrasada não soa como cobrança e informa os dias", () => {
    const text = buildReminderMessage({
      ...base,
      deadlineStatus: "OVERDUE",
      overdueDays: 3,
    });
    expect(text).toContain("há 3 dias");
    expect(text).toContain("Não é cobrança");
  });

  it("vence hoje pede confirmação do dia", () => {
    const text = buildReminderMessage({ ...base, deadlineStatus: "DUE_TODAY" });
    expect(text).toContain("vence hoje");
  });

  it("singulariza um dia de atraso", () => {
    const text = buildReminderMessage({
      ...base,
      deadlineStatus: "OVERDUE",
      overdueDays: 1,
    });
    expect(text).toContain("há 1 dia)");
  });
});

describe("firstName", () => {
  it("pega o primeiro token", () => {
    expect(firstName("Giovanni Pacelli")).toBe("Giovanni");
    expect(firstName("  Fenilli  ")).toBe("Fenilli");
  });
});

describe("buildWhatsAppChatLink", () => {
  it("monta o link oficial com o texto codificado", () => {
    const link = buildWhatsAppChatLink("+5511999998888", "Oi, Matheus! Tudo bem?");
    expect(link).toBe("https://wa.me/5511999998888?text=Oi%2C%20Matheus!%20Tudo%20bem%3F");
  });

  it("recusa número incompleto", () => {
    expect(buildWhatsAppChatLink("1199998888", "oi")).toBeNull();
    expect(buildWhatsAppChatLink("", "oi")).toBeNull();
  });
});
