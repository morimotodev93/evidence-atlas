import { C2_DATABASE_KEYS, validateC2Target } from "./database-target.ts";

export function resolveRuntimeDatabaseUrl(env: Record<string, string | undefined>): string {
  const mode = env.C2_RUNTIME_MODE;
  if (mode === undefined || mode === "") return env.DATABASE_URL!;
  if (mode !== "local" || env.PUBLIC_DEMO_MODE !== "false") {
    throw new Error("Invalid C2 runtime mode or deployment mode.");
  }
  const config = Object.fromEntries(C2_DATABASE_KEYS.map((key) => [key, env[key] ?? ""]));
  const url = validateC2Target(config);
  if (env.DATABASE_URL !== url) throw new Error("C2 runtime database target mismatch.");
  if (Object.entries(env).some(([key, value]) =>
    Boolean(value) && (/^PG/i.test(key) || /^DOTENV_(?:CONFIG_)?OVERRIDE$/i.test(key)),
  )) throw new Error("Conflicting C2 database environment settings.");
  return url;
}
