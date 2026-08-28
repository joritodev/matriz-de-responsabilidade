import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

let bootstrapped = false;

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const equals = trimmed.indexOf("=");
  if (equals === -1) return null;

  const key = trimmed.slice(0, equals).trim();
  let value = trimmed.slice(equals + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

function findEnvFile(): string | null {
  const candidates = new Set<string>();

  let dir = process.cwd();
  for (let depth = 0; depth < 6; depth += 1) {
    candidates.add(resolve(dir, ".env"));
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }

  candidates.add(resolve(dirname(fileURLToPath(import.meta.url)), "../../.env"));

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  return null;
}

export function bootstrapEnvFile(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  const envPath = findEnvFile();
  if (!envPath) return;

  const contents = readFileSync(envPath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    const [key, value] = parsed;
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
