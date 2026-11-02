import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Client } from "pg";
import { reviewConfig, reviewEnvironment } from "./review-policy.ts";
import { resolveRuntimeDatabaseUrl } from "../src/lib/review/runtime-database.ts";
import { reviewFixtures } from "./review-fixtures.ts";

const password = "a".repeat(64);
const url = `postgresql://evidence_atlas_review:${password}@127.0.0.1:5432/evidence_atlas_review`;
const text = `REVIEW_DATABASE_URL=${url}\nREVIEW_AUTH_SECRET=${"b".repeat(64)}`;
const config = reviewConfig(text);

describe("review database boundaries", () => {
  it.each([
    url.replace("127.0.0.1", "db.prisma.io"),
    url.replace("127.0.0.1", "localhost"),
    url.replace(":5432/", ":5433/"),
    url.replace(/review$/, "c2"),
    url.replace(/review$/, "atlas"),
    url.replace("postgresql:", "postgres:"),
    url + "?options=-csearch_path=other", url + "#fragment",
    url.replace("evidence_atlas_review:", "postgres:"),
    url.replace(password, ""),
    "",
  ])("refuses unsafe/ambiguous target without echoing credentials", (target) => {
    const input = text.replace(url, `"${target}"`);
    expect(() => reviewConfig(input)).toThrow();
    try { reviewConfig(input); } catch (error) {
      expect(String(error)).not.toContain(password);
    }
  });
  it("rejects conflicting keys and missing auth secret", () => {
    expect(() => reviewConfig(text + "\nDATABASE_URL=production")).toThrow();
    expect(() => reviewConfig(`REVIEW_DATABASE_URL=${url}`)).toThrow();
  });
  it("does not inherit ordinary/cloud/C2/service or dotenv override configuration", () => {
    const env = reviewEnvironment(config, { NODE_ENV: "production", DATABASE_URL: "cloud", C2_RUNTIME_MODE: "local", PGHOST: "cloud", DOTENV_CONFIG_OVERRIDE: "true", AUTH_SECRET: "ordinary", GROQ_API_KEY: "secret", Path: "bin" });
    expect(env.DATABASE_URL).toBe(url);
    expect(env.NODE_ENV).toBe("development");
    expect(env.Path).toBe("bin");
    for (const key of ["PGHOST", "C2_RUNTIME_MODE", "DOTENV_CONFIG_OVERRIDE", "GROQ_API_KEY"]) expect(env[key]).toBeUndefined();
    expect(env.AUTH_SECRET).not.toBe("ordinary");
  });
  it.each([
    { DATABASE_URL: undefined }, { DATABASE_URL: "cloud" },
    { NODE_ENV: "production" }, { PUBLIC_DEMO_MODE: "true" },
    { PGOPTIONS: "-csearch_path=other" }, { C2_RUNTIME_MODE: "local" },
    { DOTENV_CONFIG_OVERRIDE: "false" }, { REVIEW_RUNTIME_MODE: "typo" },
  ])("review runtime fails closed for conflicting configuration %j", (override) => {
    expect(() => resolveRuntimeDatabaseUrl({ ...reviewEnvironment(config, { NODE_ENV: "development" }), ...override })).toThrow();
  });
  it("preserves normal runtime behavior outside review mode", () => {
    expect(resolveRuntimeDatabaseUrl({ DATABASE_URL: "ordinary" })).toBe("ordinary");
    expect(resolveRuntimeDatabaseUrl(reviewEnvironment(config, { NODE_ENV: "development" }))).toBe(url);
  });
  it("installed Next dotenv loader preserves explicit database and blank service keys", () => {
    const dir = mkdtempSync(join(tmpdir(), "atlas-review-env-"));
    try {
      writeFileSync(join(dir, ".env.local"), "DATABASE_URL=cloud\nGROQ_API_KEY=ordinary\nC2_RUNTIME_MODE=local\n");
      const result = spawnSync(process.execPath, ["-e", `const {createRequire}=require('node:module');const {loadEnvConfig}=createRequire(require.resolve('next/package.json'))('@next/env');loadEnvConfig(process.argv[1],true);if(process.env.DATABASE_URL!==process.argv[2]||process.env.GROQ_API_KEY!==''||process.env.C2_RUNTIME_MODE!=='')process.exit(1)`, dir, url], {
        env: { ...reviewEnvironment(config, process.env), GROQ_API_KEY: "", C2_RUNTIME_MODE: "" }, encoding: "utf8",
      });
      expect(result.status, result.stderr).toBe(0);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe("review fixture preservation", () => {
  it("diagnostics stop at a missing fixture without issuing a write", async () => {
    const queries: string[] = [];
    const client = { query: async (sql: string) => { queries.push(sql); return { rows: [] }; } } as unknown as Client;
    await expect(reviewFixtures(client, false)).rejects.toThrow("Missing review fixture");
    expect(queries).toHaveLength(1);
    expect(queries.every((sql) => sql.startsWith("SELECT"))).toBe(true);
  });
  it("refuses ambiguous identities without repairing/replacing data", async () => {
    const client = { query: async () => ({ rows: [{ id: "one" }, { id: "two" }] }) } as unknown as Client;
    await expect(reviewFixtures(client, true)).rejects.toThrow("Ambiguous review fixture");
  });
  it("refuses modified fixture content even in setup mode", async () => {
    const client = { query: async () => ({ rows: [{ id: "one", email: "demo@evidence-atlas.local", username: "modified", name: "Evidence Atlas Demo" }] }) } as unknown as Client;
    await expect(reviewFixtures(client, true)).rejects.toThrow("Modified/inconsistent review fixture");
  });
});
