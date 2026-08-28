import { z } from "zod";
import { bootstrapEnvFile } from "./bootstrap-env";

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === "boolean") return value;
    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  });

const baseSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_URL: z.string().url("APP_URL must be a valid URL"),
  TZ: z.string().min(1, "TZ is required"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  NODE_ENV: z.enum(["development", "production", "test"]),
  PROCESS_ROLE: z.enum(["web", "worker"], { message: "PROCESS_ROLE must be web or worker" }),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  WHATSAPP_ENABLED: booleanish.default(false),
  AI_ENABLED: booleanish.default(false),
  SEED_ADMIN_NAME: z.string().optional(),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_WABA_ID: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  AI_CONFIDENCE_THRESHOLD: z.string().optional(),
  AI_PROMPT_VERSION: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  PG_BOSS_SCHEMA: z.string().optional(),
});

export type AppConfig = {
  databaseUrl: string;
  appUrl: string;
  tz: string;
  sessionSecret: string;
  nodeEnv: "development" | "production" | "test";
  processRole: "web" | "worker";
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
  whatsappEnabled: boolean;
  aiEnabled: boolean;
  seedAdminName?: string;
  seedAdminEmail?: string;
  seedAdminPassword?: string;
  sentryDsn?: string;
  pgBossSchema: string;
};

export function loadEnv(source?: Record<string, string | undefined>): AppConfig {
  bootstrapEnvFile();
  const resolved =
    source ??
    ({
      ...process.env,
      PROCESS_ROLE: process.env.PROCESS_ROLE ?? "web",
    } as Record<string, string | undefined>);
  const parsed = baseSchema.safeParse(resolved);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".") || "ENV";
    throw new Error(`${path}: ${issue?.message ?? "invalid"}`);
  }

  const data = parsed.data;
  if (data.WHATSAPP_ENABLED) {
    const required = [
      "WHATSAPP_TOKEN",
      "WHATSAPP_PHONE_NUMBER_ID",
      "WHATSAPP_WABA_ID",
      "WHATSAPP_APP_SECRET",
      "WHATSAPP_VERIFY_TOKEN",
    ] as const;
    for (const key of required) {
      if (!data[key]) {
        throw new Error(`${key}: required when WHATSAPP_ENABLED=true`);
      }
    }
  }
  if (data.AI_ENABLED && !data.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY: required when AI_ENABLED=true");
  }

  return {
    databaseUrl: data.DATABASE_URL,
    appUrl: data.APP_URL,
    tz: data.TZ,
    sessionSecret: data.SESSION_SECRET,
    nodeEnv: data.NODE_ENV,
    processRole: data.PROCESS_ROLE,
    logLevel: data.LOG_LEVEL,
    whatsappEnabled: data.WHATSAPP_ENABLED,
    aiEnabled: data.AI_ENABLED,
    seedAdminName: data.SEED_ADMIN_NAME,
    seedAdminEmail: data.SEED_ADMIN_EMAIL,
    seedAdminPassword: data.SEED_ADMIN_PASSWORD,
    sentryDsn: data.SENTRY_DSN,
    pgBossSchema: data.PG_BOSS_SCHEMA ?? "pgboss",
  };
}
