export type C2Command = "validate" | "show" | "verify" | "migrate";

export function parseC2Command(args: readonly string[]): C2Command {
  const [command, ...flags] = args;
  if (
    !["validate", "show", "verify", "migrate"].includes(command ?? "") ||
    (command === "migrate"
      ? flags.length !== 1 || flags[0] !== "--allow-c2-write"
      : flags.length !== 0)
  ) {
    throw new Error(
      "Usage: c2-db.ts validate|show|verify OR migrate --allow-c2-write",
    );
  }
  return command as C2Command;
}

// Deliberately accepts file contents, never process.env DATABASE_URL.
export function validateC2Target(config: Record<string, string>): string {
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
      target.search !== "" ||
      target.hash !== "" ||
      target.href !== config.C2_DATABASE_URL
    ) {
      throw new Error();
    }
  } catch {
    // Never include the supplied URL/password in errors.
    throw new Error("Rejected C2 connection target or password mismatch.");
  }
  return config.C2_DATABASE_URL;
}

export function prepareC2Prisma(
  command: Exclude<C2Command, "validate">,
  config: Record<string, string>,
  envFile: string,
  inherited: NodeJS.ProcessEnv,
) {
  const databaseUrl = validateC2Target(config);
  const env = { ...inherited };

  for (const name of Object.keys(env)) {
    if (
      /^PG/i.test(name) ||
      /^DOTENV_/i.test(name) ||
      /^DATABASE_URL$/i.test(name)
    ) {
      delete env[name];
    }
  }

  env.DATABASE_URL = databaseUrl;

  env.DOTENV_PATH = envFile;
  env.DOTENV_CONFIG_PATH = envFile;

  env.DOTENV_OVERRIDE = "false";
  env.DOTENV_CONFIG_OVERRIDE = "false";

  env.DOTENV_QUIET = "true";
  env.DOTENV_CONFIG_QUIET = "true";
  // Connection is explicit in the child environment, not in process arguments.
  const args =
    command === "show"
      ? ["db", "migrate", "--show"]
      : ["db", command === "migrate" ? "migrate" : "verify"];
  return { args, env };
}
