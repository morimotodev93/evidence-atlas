import { validateC2Target } from "../src/lib/c2/database-target.ts";
export { validateC2Target } from "../src/lib/c2/database-target.ts";

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

  env.DOTENV_QUIET = "true";
  env.DOTENV_CONFIG_QUIET = "true";
  // Connection is explicit in the child environment, not in process arguments.
  const args =
    command === "show"
      ? ["db", "migrate", "--show"]
      : ["db", command === "migrate" ? "migrate" : "verify"];
  return { args, env };
}
