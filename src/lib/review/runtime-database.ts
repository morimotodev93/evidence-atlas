import { resolveRuntimeDatabaseUrl as resolveOrdinaryDatabaseUrl } from "../c2/runtime-database.ts";
import { validateReviewUrl } from "./database-target.ts";

export function resolveRuntimeDatabaseUrl(env: Record<string, string | undefined>) {
  if (!env.REVIEW_RUNTIME_MODE) return resolveOrdinaryDatabaseUrl(env);
  if (env.REVIEW_RUNTIME_MODE !== "local" || env.NODE_ENV !== "development" ||
      env.PUBLIC_DEMO_MODE !== "false" || env.C2_RUNTIME_MODE ||
      Object.entries(env).some(([key, value]) => Boolean(value) && (/^PG/i.test(key) || /^DOTENV_(?:CONFIG_)?OVERRIDE$/i.test(key)))) {
    throw new Error("Conflicting review runtime environment.");
  }
  return validateReviewUrl(env.DATABASE_URL);
}
