import pino from "pino";
import { maskPhone } from "./mask-phone";

export function createLogger(options: { level: string; name: string }) {
  return pino({
    name: options.name,
    level: options.level,
    redact: {
      paths: ["password", "passwordHash", "token", "sessionSecret", "*.password"],
      remove: true,
    },
    hooks: {
      logMethod(args, method) {
        const mapped = args.map((arg) => {
          if (arg && typeof arg === "object") {
            return maskObjectPhones(arg as Record<string, unknown>);
          }
          return arg;
        });
        method.apply(this, mapped as Parameters<typeof method>);
      },
    },
  });
}

function maskObjectPhones(obj: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...obj };
  for (const key of Object.keys(next)) {
    const value = next[key];
    if (typeof value === "string" && /whatsapp|phone|e164/i.test(key)) {
      next[key] = maskPhone(value);
    }
  }
  return next;
}
