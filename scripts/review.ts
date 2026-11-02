import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { parse } from "dotenv";
import { verifyReviewContainer } from "./review-docker.ts";
import { prismaReview, provisionReview, readReviewConfig, reviewClient } from "./review-database.ts";
import { reviewFixtures } from "./review-fixtures.ts";
import { REVIEW_PORT, reviewEnvironment } from "./review-policy.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const command = process.argv[2];

async function main() {
  if (process.argv.length !== 3 || !["setup", "check", "dev", "login"].includes(command)) throw new Error("Usage: review.ts setup|check|dev|login");
  const container = verifyReviewContainer(root);
  console.log(`Local Docker ${container.slice(0, 12)}; 127.0.0.1:5432/evidence_atlas_review; role evidence_atlas_review.`);
  if (command === "setup") provisionReview(root);
  const config = readReviewConfig(root);
  let client = await reviewClient(config, command !== "setup");
  try {
    const tables = (await client.query("SELECT count(*)::int AS count FROM pg_tables WHERE schemaname IN ('public','prisma_contract')")).rows[0].count;
    if (tables === 0 && command === "setup") {
      await client.end();
      prismaReview(root, config, "preview");
      prismaReview(root, config, "migrate");
      client = await reviewClient(config, false);
    } else if (tables === 0) throw new Error("Review schema is missing; run pnpm review:setup.");
    // A partial/existing schema is verified, never automatically migrated/reset.
    prismaReview(root, config, "verify");
    const vector = await client.query("SELECT extversion FROM pg_extension WHERE extname='vector'");
    const dimensions = await client.query("SELECT format_type(atttypid,atttypmod) AS type FROM pg_attribute WHERE attrelid='public.\"retrievalChunk\"'::regclass AND attname='embedding'");
    if (vector.rowCount !== 1 || dimensions.rows[0]?.type !== "vector(768)") throw new Error("Missing review vector extension/type.");
    await client.query(command === "setup" ? "BEGIN" : "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    if (command !== "setup" && (await client.query("SHOW transaction_read_only")).rows[0].transaction_read_only !== "on") throw new Error("Read-only diagnostics guard failed.");
    if (command === "setup") await client.query("SELECT pg_advisory_xact_lock(716241802)");
    const empty = command === "setup" && (await client.query("SELECT (SELECT count(*) FROM public.\"user\")+(SELECT count(*) FROM organization)+(SELECT count(*) FROM workspace)+(SELECT count(*) FROM research) AS count")).rows[0].count === "0";
    const ids = await reviewFixtures(client, empty);
    await client.query(command === "setup" ? "COMMIT" : "ROLLBACK");
    console.log(`Review fixtures ${empty ? "created" : "verified/reused"}; vector ${vector.rows[0].extversion}.`);
    console.log(`Demo workspace ${ids.demoWorkspaceId}; SaaS workspace ${ids.workspaceId}; empty workspace ${ids.emptyWorkspaceId}.`);
    console.log(`Demo research: /ja/demo/research/${ids.demoResearchId}; SaaS research: /research/${ids.researchId}.`);
    await client.end();
    if (command === "login") {
      const { reviewLogin } = await import("./review-login.ts");
      await reviewLogin(config, ids);
    }
    if (command === "dev") {
      const env = reviewEnvironment(config, process.env);
      // @next/env gives initial process env priority. Explicit empty values
      // reserve all standard dotenv keys, preventing local/cloud credentials,
      // C2 settings and override flags from bleeding into the review process.
      for (const name of [".env.development.local", ".env.local", ".env.development", ".env"]) {
        const file = join(root, name);
        if (existsSync(file)) for (const key of Object.keys(parse(readFileSync(file)))) env[key] ??= "";
      }
      env.DEMO_WORKSPACE_ID = ids.demoWorkspaceId;
      console.log(`Review ready: http://127.0.0.1:${REVIEW_PORT}/demo and /research. For SaaS run pnpm review:login in another terminal. Ctrl+C stops the server.`);
      const child = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(REVIEW_PORT)], { cwd: root, env, stdio: "inherit", windowsHide: true });
      process.on("SIGINT", () => child.kill("SIGINT"));
      process.on("SIGTERM", () => child.kill("SIGTERM"));
      child.on("error", () => { console.error("Could not launch review Next.js."); process.exitCode = 1; });
      child.on("exit", (code) => { process.exitCode = code ?? 0; });
    }
    console.log(command === "check" ? "Read-only review diagnostics passed (transactions READ ONLY; no fixture/session writes)." : "Review ready.");
  } finally { await client.end(); }
}

main().catch((error: unknown) => {
  // PostgreSQL/Prisma error messages may contain URLs/row data. Only our own
  // errors are emitted; driver errors expose a stable SQLSTATE only.
  const code = (error as {code?: string})?.code;
  console.error(code ? `Review database failure (${code}); check dedicated setup/configuration. No fallback attempted.` : error instanceof Error ? error.message : "Review command failed.");
  process.exitCode = 1;
});
