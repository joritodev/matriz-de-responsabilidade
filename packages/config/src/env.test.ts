import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

const valid = {
  DATABASE_URL: "postgresql://matriz:matriz@localhost:5432/matriz",
  APP_URL: "http://localhost:3000",
  TZ: "America/Sao_Paulo",
  SESSION_SECRET: "change-me-to-at-least-32-chars-long",
  NODE_ENV: "test",
  PROCESS_ROLE: "web",
  LOG_LEVEL: "info",
  WHATSAPP_ENABLED: "false",
  AI_ENABLED: "false",
} as const;

describe("unit_env_boot", () => {
  it("aceita ENV mínima da FASE 1 e força flags WhatsApp/IA desligadas por default", () => {
    const cfg = loadEnv({ ...valid });
    expect(cfg.databaseUrl).toContain("postgresql://");
    expect(cfg.appUrl).toBe("http://localhost:3000");
    expect(cfg.tz).toBe("America/Sao_Paulo");
    expect(cfg.processRole).toBe("web");
    expect(cfg.whatsappEnabled).toBe(false);
    expect(cfg.aiEnabled).toBe(false);
  });

  it("recusa subir sem DATABASE_URL", () => {
    const { DATABASE_URL: _, ...rest } = valid;
    expect(() => loadEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it("recusa SESSION_SECRET com menos de 32 caracteres", () => {
    expect(() => loadEnv({ ...valid, SESSION_SECRET: "curta" })).toThrow(/SESSION_SECRET/);
  });

  it("recusa PROCESS_ROLE inválido", () => {
    expect(() => loadEnv({ ...valid, PROCESS_ROLE: "api" })).toThrow(/PROCESS_ROLE/);
  });

  it("exige credenciais Meta quando WHATSAPP_ENABLED=true", () => {
    expect(() => loadEnv({ ...valid, WHATSAPP_ENABLED: "true" })).toThrow(/WHATSAPP_TOKEN/);
  });

  it("exige OPENAI_API_KEY quando AI_ENABLED=true", () => {
    expect(() => loadEnv({ ...valid, AI_ENABLED: "true" })).toThrow(/OPENAI_API_KEY/);
  });

  it("não loga nem devolve a senha do banco no objeto além da URL (contrato de boot)", () => {
    const cfg = loadEnv({ ...valid });
    expect(cfg).not.toHaveProperty("password");
    expect(Object.keys(cfg).sort()).toEqual(
      expect.arrayContaining([
        "databaseUrl",
        "appUrl",
        "tz",
        "sessionSecret",
        "nodeEnv",
        "processRole",
        "logLevel",
        "whatsappEnabled",
        "aiEnabled",
      ]),
    );
  });
});
