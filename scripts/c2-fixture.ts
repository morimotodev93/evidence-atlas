import { readFileSync } from "node:fs";
import { runFixture } from "./c2-fixture-runner.ts";
import { parseDedicated } from "./c2-app-target.ts";

// No app singleton, Prisma config, normal dotenv files, OAuth or seed imports.
try {
  const config = parseDedicated(readFileSync(new URL("../.env.c2.local", import.meta.url), "utf8"));
  const result = await runFixture({
    args: process.argv.slice(2),
    config,
    env: process.env,
    execArgv: process.execArgv,
    async createClient(validatedUrl) {
      // Strict target validation above precedes even loading the driver.
      const { Client } = await import("pg");
      const url = new URL(validatedUrl);
      const client = new Client({
        host: url.hostname, port: Number(url.port), database: "evidence_atlas_c2",
        user: "c2_local", password: decodeURIComponent(url.password),
        ssl: false, options: "", application_name: "evidence-atlas-c2-fixture",
        connectionTimeoutMillis: 5000, statement_timeout: 10000,
      });
      client.on("error", () => { /* Never emit credential-bearing driver errors. */ });
      return client;
    },
  });
  if (result.mode === "validate") {
    console.log("C2 fixture target validated offline; database/user/fixture not verified.");
  } else {
    console.log(JSON.stringify(result)); // Only operation and counts; no identity/data.
  }
} catch {
  console.error("C2 fixture refused or failed; raw details suppressed to protect identity and credentials.");
  process.exitCode = 1;
}
