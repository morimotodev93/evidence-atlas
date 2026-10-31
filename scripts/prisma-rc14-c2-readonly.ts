import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDedicated } from "./c2-app-target.ts";
import { prepareC2Prisma, validateC2Target } from "./c2-db-target.ts";
import { IDS, fixtureEntries } from "./c2-fixture-plan.ts";
import { sqlFixtureStore } from "./c2-fixture-store.ts";

// Explicit opt-in; no dotenv loader, application singleton, seed, or external API.
const root = fileURLToPath(new URL("../", import.meta.url));
const results: { name: string; status: string; code?: string }[] = [];
const osKeys = /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|HOME)$/i;
const cleanEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => osKeys.test(key)),
) as NodeJS.ProcessEnv;
let activeCheck = "configuration-and-container-isolation";
let release: (() => Promise<void>) | undefined;

async function check(name: string, action: () => unknown | Promise<unknown>) {
  activeCheck = name;
  await action();
  results.push({ name, status: "passed" });
}
function skip(name: string, code: string) {
  results.push({ name, status: "skipped", code });
}
function docker(args: string[]) {
  const result = spawnSync("docker", ["--context", "desktop-linux", ...args], {
    env: cleanEnv, encoding: "utf8", timeout: 15000, windowsHide: true,
  });
  assert.equal(result.status, 0);
  return JSON.parse(result.stdout);
}

try {
  assert.deepEqual(process.argv.slice(2), ["--read-only"]);
  assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH);
  assert(!process.execArgv.some((arg) => /^-r|^--(?:require|import|(?:experimental-)?loader)(?:=|$)/.test(arg)));
  const envFile = join(root, ".env.c2.local");
  const config = parseDedicated(readFileSync(envFile, "utf8"));
  const url = new URL(validateC2Target(config));
  await check(activeCheck, () => {
    const endpoint = docker(["context", "inspect", "desktop-linux", "--format", "{{json .Endpoints.docker.Host}}"]);
    assert.equal(endpoint, "npipe:////./pipe/dockerDesktopLinuxEngine");
    const labels = docker(["inspect", "evidence-atlas-c2-postgres", "--format", "{{json .Config.Labels}}"]);
    assert.equal(labels["com.docker.compose.project"], "evidence-atlas-c2");
    assert.equal(labels["com.docker.compose.service"], "postgres-c2");
    assert.equal(labels["com.docker.compose.project.working_dir"].toLowerCase(), root.replace(/[\\/]$/, "").toLowerCase());
    const ports = docker(["inspect", "evidence-atlas-c2-postgres", "--format", "{{json .HostConfig.PortBindings}}"]);
    assert.deepEqual(ports, { "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "5433" }] });
    const mounts = docker(["inspect", "evidence-atlas-c2-postgres", "--format", "{{json .Mounts}}"]);
    assert.equal(mounts.length, 1);
    assert.equal(mounts[0].Type, "volume");
    assert.equal(mounts[0].Name, "evidence-atlas-c2-postgres-data");
    assert.equal(mounts[0].Destination, "/var/lib/postgresql");
    const volumeLabels = docker(["volume", "inspect", mounts[0].Name, "--format", "{{json .Labels}}"]);
    assert.equal(volumeLabels["com.docker.compose.project"], "evidence-atlas-c2");
    const networks = docker(["inspect", "evidence-atlas-c2-postgres", "--format", "{{json .NetworkSettings.Networks}}"]);
    assert.deepEqual(Object.keys(networks), ["evidence-atlas-c2_default"]);
    assert.equal(docker(["inspect", "evidence-atlas-c2-postgres", "--format", "{{json .Config.Image}}"]), "pgvector/pgvector:pg18-trixie");
  });

  // Import database libraries only after validating the dedicated local target.
  const { Client } = await import("pg");
  const { default: postgres } = await import("@prisma/orm-postgres/runtime");
  const { default: pgvector } = await import("@prisma/orm-extension-pgvector/runtime");
  await import("temporal-polyfill/full/global");
  const { default: contractJson } = await import("../src/prisma/contract.json", { with: { type: "json" } });
  type Contract = import("../src/prisma/contract.d.ts").Contract;
  const client = new Client({
    host: "127.0.0.1", port: 5433, database: "evidence_atlas_c2", user: "c2_local",
    password: decodeURIComponent(url.password), ssl: false,
    options: "-c default_transaction_read_only=on", application_name: "prisma-rc14-c2-readonly",
    connectionTimeoutMillis: 5000, statement_timeout: 10000, lock_timeout: 3000,
  });
  client.on("error", () => { /* Never forward raw driver errors. */ });
  let db: ReturnType<typeof postgres<Contract>> | undefined;
  let connected = false;
  release = async () => {
    try { await db?.close(); } finally {
      try { if (connected) await client.query("ROLLBACK"); } finally { await client.end(); }
    }
  };
  await check("local-connection-and-server-identity", async () => {
    await client.connect();
    connected = true;
    const identity = await client.query("SELECT current_database() AS database, current_user AS role, inet_server_port() AS port");
    assert.deepEqual(identity.rows, [{ database: "evidence_atlas_c2", role: "c2_local", port: 5432 }]);
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const mode = await client.query("SHOW transaction_read_only");
    assert.equal(mode.rows[0].transaction_read_only, "on");
  });
  await check("pgvector-extension-and-column", async () => {
    const extension = await client.query("SELECT extversion FROM pg_extension WHERE extname = 'vector'");
    assert.equal(extension.rows.length, 1);
    assert.match(extension.rows[0].extversion, /^\d+\.\d+/);
    const column = await client.query("SELECT format_type(atttypid, atttypmod) AS type FROM pg_attribute WHERE attrelid = 'public.\"retrievalChunk\"'::regclass AND attname = 'embedding'");
    assert.equal(column.rows[0].type, "vector(768)");
  });
  await check("upgraded-prisma-client-initialization", async () => {
    db = postgres<Contract>({ contractJson, pg: client, extensions: [pgvector] });
    await db.connect();
    assert(db.orm.public.Research && db.sql.public.retrievalChunk);
  });
  const orm = db!;
  let userId = "";
  await check("research-lookup-and-relations", async () => {
    const research = await orm.orm.public.Research.where({ id: IDS.research })
      .include("sources").include("findings").first();
    assert(research);
    assert.equal(research.workspaceId, IDS.workspace);
    assert(research.sources.some((row) => row.id === IDS.source));
    assert(research.findings.some((row) => row.id === IDS.finding));
    userId = research.createdById;
  });
  await check("source-retrieval", async () => {
    const source = await orm.orm.public.Source.where({ id: IDS.source, researchId: IDS.research }).first();
    assert(source);
    assert.equal(source.url, "https://example.invalid/c2-e2e-v1");
  });
  await check("finding-and-source-junction", async () => {
    const finding = await orm.orm.public.Finding.where({ id: IDS.finding, researchId: IDS.research })
      .include("sources", (links) => links.include("source")).first();
    assert(finding);
    assert(finding.sources.some((link) => link.source.id === IDS.source));
  });
  await check("protected-eight-row-fixture-integrity", async () => {
    const entries = fixtureEntries(userId);
    const rows = await sqlFixtureStore(client).read(entries);
    for (const entry of entries) assert.deepEqual(rows[entry.table], [entry.row]);
  });
  await check("pgvector-server-type-and-cosine-operator", async () => {
    // A scalar operator smoke check, not a similarity benchmark or persisted fixture.
    const vector = `[${[1, ...Array<number>(767).fill(0)].join(",")}]`;
    const result = await client.query("SELECT vector_dims($1::vector(768)) AS dimensions, ($1::vector(768) <=> $1::vector(768)) AS distance", [vector]);
    assert.deepEqual(result.rows, [{ dimensions: 768, distance: 0 }]);
  });
  const chunks = await orm.orm.public.RetrievalChunk.where({ workspaceId: IDS.workspace }).limit(1).all();
  if (!chunks.length) {
    skip("persisted-vector-codec-and-similarity-retrieval", "NO_EXISTING_C2_VECTOR_FIXTURE_READ_ONLY");
  } else {
    await check("persisted-vector-codec-and-similarity-retrieval", async () => {
      const row = chunks[0];
      assert.equal(row.embedding.length, 768);
      assert(row.embedding.every(Number.isFinite));
      assert(row.embedding.some((value) => value !== 0));
      const plan = orm.sql.public.retrievalChunk.select("id")
        .select("distance", (fields, fns) => fns.cosineDistance(fields.embedding, row.embedding))
        .where((fields, fns) => fns.eq(fields.workspaceId, IDS.workspace))
        .orderBy((fields, fns) => fns.cosineDistance(fields.embedding, row.embedding), { direction: "asc" })
        .limit(5).build();
      const hits = await orm.runtime().query(plan);
      assert(hits.length);
      assert(Math.abs(hits[0].distance) < 1e-6);
    });
  }
  await check("prisma-live-schema-verification", () => {
    const require = createRequire(import.meta.url);
    const pkgPath = require.resolve("prisma/package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    const prepared = prepareC2Prisma("verify", config, envFile, cleanEnv);
    prepared.env.PGOPTIONS = "-c default_transaction_read_only=on";
    const result = spawnSync(process.execPath, [join(dirname(pkgPath), pkg.bin.prisma), ...prepared.args], {
      cwd: root, env: prepared.env, encoding: "utf8", timeout: 30000, windowsHide: true,
    });
    // Raw output stays in memory; no schema data or credential-bearing error is logged.
    assert.equal(result.status, 0);
  });
  skip("fresh-migration-replay", "EXISTING_DATA_PRESERVED_NO_WRITES_AUTHORIZED");
  skip("representative-insert-update", "READ_ONLY_AUTHORIZATION");
} catch (error) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "CHECK_FAILED";
  results.push({ name: activeCheck, status: "failed", code: /^[A-Z0-9_.]{1,80}$/.test(code) ? code : "CHECK_FAILED" });
  process.exitCode = 1;
} finally {
  if (release) {
    try { await release(); results.push({ name: "connection-cleanup", status: "passed" }); }
    catch { results.push({ name: "connection-cleanup", status: "failed", code: "CLEANUP_FAILED" }); process.exitCode = 1; }
  }
  console.log(JSON.stringify({
    mode: "read-only", target: "local C2 only", results,
    passed: results.filter((row) => row.status === "passed").length,
    failed: results.filter((row) => row.status === "failed").length,
    skipped: results.filter((row) => row.status === "skipped").length,
  }, null, 2));
}
