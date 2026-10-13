import { describe, expect, it, vi } from "vitest";
import { fixtureEntries, IDS, prepareFixture, selectIdentity, type Row } from "./c2-fixture-plan.ts";
import { runFixture, type FixtureClient } from "./c2-fixture-runner.ts";
import { parseDedicated } from "./c2-app-target.ts";
import { sqlFixtureStore } from "./c2-fixture-store.ts";
import Google from "next-auth/providers/google";

// Synthetic identities/credentials only. This driver simulator never opens a socket.
const identity = { id: "offline-user", email: "offline@example.invalid" };
const env = { C2_FIXTURE_USER_ID: identity.id, C2_FIXTURE_USER_EMAIL: identity.email };
const config = { C2_MODE: "local", C2_POSTGRES_PASSWORD: "synthetic", C2_DATABASE_URL: "postgresql://c2_local:synthetic@127.0.0.1:5433/evidence_atlas_c2" };
const account = { userId: identity.id, type: "oidc", provider: "google", providerAccountId: "offline-google" };

class OfflineClient implements FixtureClient {
  rows: Record<string, Row[]> = {
    user: [{ ...identity }], account: [{ ...account }],
    session: [{ userId: identity.id }],
  };
  statements: string[] = [];
  snapshot: Record<string, Row[]> = {};
  failTable = "";
  failDeleteTable = "";
  database = "evidence_atlas_c2";
  role = "c2_local";
  readOnly = false;
  connect = vi.fn(async () => {});
  end = vi.fn(async () => {});
  async query(sql: string, values: unknown[] = []) {
    this.statements.push(sql);
    if (sql.startsWith("BEGIN")) {
      this.snapshot = structuredClone(this.rows);
      this.readOnly = sql.includes("READ ONLY");
    }
    if (sql === "ROLLBACK") this.rows = this.snapshot;
    if (sql.includes("current_database()")) return { rows: [{ database: this.database, role: this.role }], rowCount: 1 };
    const table = /(?:FROM|INTO) public\."([^"]+)"/.exec(sql)?.[1];
    if (!table) return { rows: [], rowCount: null };
    if (sql.startsWith("SELECT")) {
      const matches = [...sql.matchAll(/"(\w+)" = \$(\d+)/g)];
      const rows = (this.rows[table] ?? []).filter((row) => matches.some((match) => row[match[1]] === values[Number(match[2]) - 1]));
      return { rows, rowCount: rows.length };
    }
    if (this.readOnly) throw new Error("Read-only transaction mutation.");
    if (sql.startsWith("INSERT")) {
      if (table === this.failTable) throw new Error("Synthetic insertion failure.");
      const columns = [...sql.slice(sql.indexOf("(") + 1, sql.indexOf(")")).matchAll(/"(\w+)"/g)].map((match) => match[1]);
      const row = Object.fromEntries(columns.map((column, index) => [column, values[index]])) as Row;
      (this.rows[table] ??= []).push(row);
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith("DELETE")) {
      if (table === this.failDeleteTable) throw new Error("Synthetic deletion failure.");
      const matches = [...sql.matchAll(/"(\w+)" = \$(\d+)/g)];
      const before = this.rows[table]?.length ?? 0;
      this.rows[table] = (this.rows[table] ?? []).filter((row) => !matches.every((match) => row[match[1]] === values[Number(match[2]) - 1]));
      return { rows: [], rowCount: before - this.rows[table].length };
    }
    throw new Error("Unrecognized offline SQL.");
  }
}
function setup() {
  const client = new OfflineClient();
  const createClient = vi.fn(async () => client);
  const run = (mode: string, overrides = {}) => runFixture({ args: [mode, ...(["insert", "cleanup"].includes(mode) ? ["--allow-c2-write"] : [])], config, env, createClient, ...overrides });
  return { client, createClient, run };
}

describe("C2 fixture offline safety", () => {
  it("accepts the installed Auth.js Google OIDC account type without invoking OAuth", () => {
    const provider = Google({ clientId: "synthetic", clientSecret: "synthetic" });
    expect(provider.type).toBe("oidc");
    expect(selectIdentity(identity, [identity], [{ ...account, type: provider.type }], [identity.id])).toBe(identity.id);
  });
  it("validates without constructing or connecting a client", async () => {
    const { run, createClient } = setup();
    expect(await run("validate", { env: {} })).toEqual({ mode: "validate" });
    expect(createClient).not.toHaveBeenCalled();
  });
  it.each([
    { C2_MODE: "production" }, { C2_DATABASE_URL: "postgresql://c2_local:synthetic@127.0.0.1:5432/evidence_atlas_c2" },
    { C2_DATABASE_URL: "postgresql://c2_local:synthetic@remote.invalid:5433/evidence_atlas_c2" },
    { C2_DATABASE_URL: `${config.C2_DATABASE_URL}?sslmode=require` },
    { C2_DATABASE_URL: "postgresql://other:synthetic@127.0.0.1:5433/evidence_atlas_c2" },
    { C2_DATABASE_URL: "postgresql://c2_local:synthetic@127.0.0.1:5433/evidence_atlas" },
    { C2_POSTGRES_PASSWORD: "mismatch" }, { DATABASE_URL: config.C2_DATABASE_URL },
    { C2_DATABASE_URL: "" },
  ])("rejects unsafe target before client construction: %j", async (bad) => {
    const { run, createClient } = setup();
    await expect(run("insert", { config: { ...config, ...bad } })).rejects.toThrow();
    expect(createClient).not.toHaveBeenCalled();
  });
  it.each([[], ["insert"], ["cleanup"], ["verify", "--allow-c2-write"], ["dry-run", "--allow-c2-write"], ["insert", "--allow-c2-write", "extra"], ["development"]].map((args) => ({ args })))("rejects unexpected commands %j", ({ args }) => {
    expect(() => prepareFixture(args, config, env)).toThrow();
  });
  it.each([{}, { C2_FIXTURE_USER_ID: identity.id }, { C2_FIXTURE_USER_EMAIL: identity.email }, { ...env, C2_FIXTURE_USER_ID: " ambiguous " }, { ...env, PUBLIC_DEMO_MODE: "true" }, { ...env, NODE_OPTIONS: "--import=unsafe" }, { ...env, C2_RUNTIME_MODE: "production" }])("rejects identity/environment before client construction %j", async (badEnv) => {
    const { run, createClient } = setup();
    await expect(run("insert", { env: badEnv })).rejects.toThrow();
    expect(createClient).not.toHaveBeenCalled();
  });
  it("rejects preload arguments and duplicate dedicated config assignments", () => {
    expect(() => prepareFixture(["validate"], config, env, ["--import=unsafe"])).toThrow();
    expect(() => parseDedicated("C2_MODE=local\nC2_MODE=local")).toThrow();
  });
  it("does not fall back to inherited database credentials", async () => {
    const { run, createClient } = setup();
    await run("dry-run", { env: { ...env, DATABASE_URL: "postgresql://production.invalid/db", PGHOST: "production.invalid" } });
    expect(createClient).toHaveBeenCalledWith(config.C2_DATABASE_URL);
  });
  it.each([[], [identity, { id: "other", email: identity.email }], [{ ...identity, email: "different@example.invalid" }]].map((users) => ({ users })))("rejects missing/ambiguous/inconsistent user %j", ({ users }) => {
    expect(() => selectIdentity(identity, users, [account], [identity.id])).toThrow();
  });
  it.each([[], [account, account], [{ ...account, provider: "fake" }], [{ ...account, type: "credentials" }], [{ ...account, providerAccountId: "" }], [{ ...account, userId: "other" }]].map((accounts) => ({ accounts })))("rejects missing or inconsistent OAuth account %j", ({ accounts }) => {
    expect(() => selectIdentity(identity, [identity], accounts, [identity.id])).toThrow();
  });
  it.each([[], ["other"]].map((sessions) => ({ sessions })))("requires a valid session identity %j", ({ sessions }) => {
    expect(() => selectIdentity(identity, [identity], [account], sessions)).toThrow();
  });
  it("dry-run is read-only, reports counts and verify requires complete fixture", async () => {
    const { client, run } = setup();
    const before = structuredClone(client.rows);
    expect(await run("dry-run")).toMatchObject({ present: 0, plannedInserts: 8 });
    expect(client.rows).toEqual(before);
    expect(client.statements).toContain("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await expect(run("verify")).rejects.toThrow("incomplete");
    expect(client.statements.some((sql) => /^(INSERT|DELETE|UPDATE|LOCK)/.test(sql))).toBe(false);
  });
  it("inserts deterministic graph idempotently and verifies via the SQL adapter", async () => {
    const { client, run } = setup();
    await run("insert");
    const before = structuredClone(client.rows);
    expect(await run("insert")).toMatchObject({ present: 8, plannedInserts: 0 });
    expect(client.rows).toEqual(before);
    expect(await run("verify")).toMatchObject({ present: 8 });
    const mutations = client.statements.filter((sql) => sql.startsWith("INSERT"));
    expect(mutations).toHaveLength(8);
    expect(mutations.every((sql) => !sql.includes(identity.id))).toBe(true);
    expect(client.statements.some((sql) => sql.startsWith("LOCK TABLE"))).toBe(true);
  });
  it.each(fixtureEntries(identity.id).map((entry) => [entry.table]))("rejects altered/colliding %s data before any mutation", async (table) => {
    const { client, run } = setup();
    await run("insert");
    const entry = fixtureEntries(identity.id).find((entry) => entry.table === table)!;
    const field = Object.keys(entry.row).find((key) => !entry.key.includes(key)) ?? entry.key[0];
    client.rows[table][0][field] = "non-fixture";
    const before = structuredClone(client.rows);
    client.statements = [];
    await expect(run("insert")).rejects.toThrow("collision");
    await expect(run("cleanup")).rejects.toThrow("collision");
    expect(client.rows).toEqual(before);
    expect(client.statements.some((sql) => /^(INSERT|DELETE)/.test(sql))).toBe(false);
  });
  it("rejects extra users and extra descendants of owned parents", async () => {
    const { client, run } = setup();
    await run("insert");
    client.rows.membership.push({ userId: "other-user", organizationId: IDS.organization, role: "ADMIN" });
    await expect(run("cleanup")).rejects.toThrow("collision");
    client.rows.membership.pop();
    client.rows.source.push({ ...client.rows.source[0], id: "other-source" });
    await expect(run("cleanup")).rejects.toThrow("collision");
  });
  it.each(["tag", "researchTag", "comment", "conversation", "retrievalChunk", "aiUsageEvent"])("rejects external dependency %s, including cascade/no-FK boundaries", async (table) => {
    const { client, run } = setup();
    await run("insert");
    client.rows[table] = [{ workspaceId: IDS.workspace, researchId: IDS.research }];
    await expect(run("cleanup")).rejects.toThrow("dependencies");
    expect(client.statements.some((sql) => sql.startsWith("DELETE"))).toBe(false);
  });
  it("rejects orphan junction ownership", async () => {
    const { client, run } = setup();
    client.rows.membership = [{ userId: identity.id, organizationId: IDS.organization, role: "ADMIN" }];
    await expect(run("cleanup")).rejects.toThrow("ownership");
  });
  it("repairs absent records without modifying existing records", async () => {
    const { client, run } = setup();
    await run("insert");
    client.rows.findingSource = [];
    expect(await run("insert")).toMatchObject({ present: 7, plannedInserts: 1 });
    expect(client.rows.findingSource).toHaveLength(1);
  });
  it("rolls back preceding inserts on a later failure and closes the client", async () => {
    const { client, run } = setup();
    const before = structuredClone(client.rows);
    client.failTable = "finding";
    await expect(run("insert")).rejects.toThrow("Synthetic");
    expect(client.statements.some((sql) => sql.startsWith('INSERT INTO public."organization"'))).toBe(true);
    expect(client.statements).toContain("ROLLBACK");
    expect(client.statements).not.toContain("COMMIT");
    expect(client.rows).toEqual(before);
    expect(client.end).toHaveBeenCalledOnce();
  });
  it("rejects server identity before fixture reads/writes", async () => {
    const { client, run } = setup();
    client.database = "evidence_atlas";
    await expect(run("insert")).rejects.toThrow("identity mismatch");
    expect(client.statements).toContain("ROLLBACK");
    expect(client.statements.some((sql) => sql.includes('public."user"'))).toBe(false);
  });
  it("rejects incorrect server role", async () => {
    const { client, run } = setup();
    client.role = "other-role";
    await expect(run("dry-run")).rejects.toThrow("identity mismatch");
    expect(client.statements).toContain("ROLLBACK");
  });
  it("normalizes PostgreSQL Date values to deterministic UTC timestamps", async () => {
    const entries = fixtureEntries(identity.id);
    const store = sqlFixtureStore({ async query(sql) {
      const table = /public\."([^"]+)"/.exec(sql)![1];
      const entry = entries.find((entry) => entry.table === table)!;
      const row = Object.fromEntries(Object.entries(entry.row).map(([key, value]) => [key, key.endsWith("At") ? new Date(value!) : value]));
      return { rows: [row], rowCount: 1 };
    } });
    const rows = await store.read(entries);
    for (const entry of entries) expect(rows[entry.table]).toEqual([entry.row]);
  });
  it("reads active session ownership without selecting session cookies or OAuth tokens", async () => {
    const { client, run } = setup();
    await run("dry-run");
    const authQueries = client.statements.filter((sql) => /FROM public\."(user|account|session)"/.test(sql));
    expect(authQueries).toHaveLength(3);
    expect(authQueries.join("\n")).not.toMatch(/sessionToken|access_token|refresh_token|id_token|SELECT \*/);
    expect(authQueries.find((sql) => sql.includes('public."session"'))).toContain('"expires" > CURRENT_TIMESTAMP');
  });
  it("rolls back cleanup if a later deletion fails", async () => {
    const { client, run } = setup();
    await run("insert");
    const before = structuredClone(client.rows);
    client.failDeleteTable = "workspace";
    client.statements = [];
    await expect(run("cleanup")).rejects.toThrow("Synthetic deletion");
    expect(client.statements.some((sql) => sql.startsWith('DELETE FROM public."findingSource"'))).toBe(true);
    expect(client.statements).toContain("ROLLBACK");
    expect(client.statements).not.toContain("COMMIT");
    expect(client.rows).toEqual(before);
  });
  it("cleanup deletes only exact fixture keys in reverse dependency order and is repeatable", async () => {
    const { client, run } = setup();
    const auth = structuredClone(client.rows);
    client.rows.organization = [{ id: "ordinary-org", name: "ordinary" }];
    await run("insert");
    client.statements = [];
    await run("cleanup");
    const deletes = client.statements.filter((sql) => sql.startsWith("DELETE"));
    expect(deletes.map((sql) => /public\."([^"]+)"/.exec(sql)![1])).toEqual(fixtureEntries(identity.id).map((entry) => entry.table).reverse());
    expect(deletes.every((sql) => sql.includes("WHERE"))).toBe(true);
    for (const table of ["user", "account", "session"]) expect(client.rows[table]).toEqual(auth[table]);
    expect(client.rows.organization).toEqual([{ id: "ordinary-org", name: "ordinary" }]);
    expect(await run("cleanup")).toMatchObject({ present: 0, plannedDeletes: 0 });
    expect(client.statements.some((sql) => /^(INSERT|DELETE|UPDATE).*public\."(user|account|session)"/.test(sql))).toBe(false);
  });
});
