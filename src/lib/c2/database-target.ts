export const C2_DATABASE_KEYS = [
  "C2_MODE", "C2_POSTGRES_PASSWORD", "C2_DATABASE_URL",
] as const;

export function requireAllowedKeys(config: Record<string, string>, allowed: readonly string[]) {
  if (Object.keys(config).some((key) => !allowed.includes(key))) {
    throw new Error("Unexpected keys in dedicated C2 configuration.");
  }
}

// Pure configuration validation; never loads dotenv or a database client.
export function validateC2Target(config: Record<string, string>): string {
  requireAllowedKeys(config, C2_DATABASE_KEYS);
  if (config.C2_MODE !== "local") throw new Error("C2_MODE must be local.");
  if (!config.C2_POSTGRES_PASSWORD || !config.C2_DATABASE_URL) {
    throw new Error("Explicit C2 password and C2_DATABASE_URL are required.");
  }
  try {
    const target = new URL(config.C2_DATABASE_URL);
    if (
      !["postgresql:", "postgres:"].includes(target.protocol) ||
      !["127.0.0.1", "localhost"].includes(target.hostname) ||
      target.port !== "5433" ||
      target.pathname !== "/evidence_atlas_c2" ||
      target.username !== "c2_local" ||
      !target.password ||
      decodeURIComponent(target.password) !== config.C2_POSTGRES_PASSWORD ||
      target.search !== "" || target.hash !== "" ||
      target.href !== config.C2_DATABASE_URL
    ) throw new Error();
  } catch {
    throw new Error("Rejected C2 connection target or password mismatch.");
  }
  return config.C2_DATABASE_URL;
}
