import { parse } from "dotenv";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseC2Command,
  prepareC2Prisma,
  validateC2Target,
} from "./c2-db-target.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const envFile = join(root, ".env.c2.local");

try {
  const command = parseC2Command(process.argv.slice(2));
  let config: Record<string, string>;
  try {
    config = parse(readFileSync(envFile));
  } catch {
    throw new Error("Cannot read the explicit .env.c2.local file.");
  }
  validateC2Target(config);
  if (command === "validate") {
    console.log(
      "C2 target validated offline. Database identity and readiness are not verified.",
    );
  } else {
    const { args, env } = prepareC2Prisma(
      command,
      config,
      envFile,
      process.env,
    );
    const require = createRequire(import.meta.url);
    const prismaPackage = require.resolve("prisma/package.json");
    const { bin } = JSON.parse(readFileSync(prismaPackage, "utf8")) as {
      bin: { prisma: string };
    };
    const result = spawnSync(
      process.execPath,
      [join(dirname(prismaPackage), bin.prisma), ...args],
      {
        cwd: root,
        env,
        // Prisma/driver errors may contain credentials. Do not forward raw output.
        stdio: "ignore",
      },
    );
    if (result.error || result.status !== 0) {
      throw new Error(
        "C2 Prisma command failed; raw output suppressed to protect credentials.",
      );
    }
    console.log(`C2 Prisma ${command} completed successfully.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "C2 command failed.");
  process.exitCode = 1;
}
