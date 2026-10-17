import { describe, expect, it, vi } from "vitest";
import { validateC2Target } from "../src/lib/c2/database-target.ts";
import { IDS } from "./c2-fixture-plan.ts";
import {
  assertC2E2EPrincipal, createC2E2ESession, makeC2E2EState, ownedC2E2EToken, revokeC2E2ESession,
  type C2Sql,
} from "./c2-e2e-session-core.ts";

const now = Date.parse("2026-10-16T00:00:00.000Z");
const who = { id: "synthetic-c2-user", email: "test@example.invalid" };
const token = `c2e2e_${"a".repeat(64)}`;
const user = { ...who };
const account = { userId: who.id, provider: "google", type: "oidc", providerAccountId: "synthetic" };
const membership = { userId: who.id, workspaceId: IDS.workspace, role: "ADMIN" };

function db(asRole = "c2_local") {
  const statements: { sql: string; args: unknown[] | undefined }[] = [];
  const query = vi.fn(async (sql: string, args?: unknown[]) => {
    statements.push({ sql, args });
    if (sql.startsWith("SELECT current_database()")) return { rows: [{ database: "evidence_atlas_c2", role: asRole }], rowCount: 1 };
    if (sql.includes('FROM public."user"')) return { rows: [user], rowCount: 1 };
    if (sql.includes('FROM public."account"')) return { rows: [account], rowCount: 1 };
    if (sql.includes('FROM public."workspaceMembership"')) return { rows: [membership], rowCount: 1 };
    return { rows: [], rowCount: sql.startsWith("INSERT") || sql.startsWith("DELETE") ? 1 : null };
  });
  return { client: { query } satisfies C2Sql, statements };
}

describe("C2-only database-session setup (offline synthetic)", () => {
  it("requires the exact fixture identity, Google account and protected Workspace membership", () => {
    expect(() => assertC2E2EPrincipal(who, [user], [account], [membership])).not.toThrow();
    expect(() => assertC2E2EPrincipal(who, [user], [account, account], [membership])).toThrow();
    expect(() => assertC2E2EPrincipal(who, [user], [{ ...account, provider: "other" }], [membership])).toThrow();
    expect(() => assertC2E2EPrincipal(who, [user], [account], [{ ...membership, role: "VIEWER" }])).toThrow();
    expect(() => assertC2E2EPrincipal(who, [{ ...user, email: "wrong@example.invalid" }], [account], [membership])).toThrow();
  });

  it("builds one expiry-limited application cookie, never browser/provider storage", () => {
    const state = makeC2E2EState(who, token, now);
    expect(state.storageState.cookies).toEqual([{ name: "authjs.session-token", value: token, domain: "localhost", path: "/", expires: (now + 3_600_000) / 1000, httpOnly: true, secure: false, sameSite: "Lax" }]);
    expect(state.storageState.origins).toEqual([]);
    expect(JSON.stringify(state)).not.toContain(who.id);
    expect(JSON.stringify(state)).not.toContain(who.email);
    expect(ownedC2E2EToken(state)).toBe(token);
    expect(() => makeC2E2EState(who, "not-c2-owned", now)).toThrow();
  });

  it("accepts owned state for revocation even after expiry, but refuses unrelated OAuth state", () => {
    const state = makeC2E2EState(who, token, now);
    state.sessionExpiresAt = "2020-01-01T00:00:00.000Z";
    expect(() => ownedC2E2EToken(state)).toThrow();
    state.sessionExpiresAt = new Date(now + 3_600_000).toISOString();
    expect(ownedC2E2EToken(state)).toBe(token);
    state.storageState.cookies[0].value = "normal-google-oauth-session";
    expect(() => ownedC2E2EToken(state)).toThrow();
  });

  it("creates only one database session through the exact local role and serializable transaction", async () => {
    const mock = db();
    const state = await createC2E2ESession(mock.client, who, token, now);
    expect(ownedC2E2EToken(state)).toBe(token);
    expect(mock.statements[0].sql).toBe("BEGIN ISOLATION LEVEL SERIALIZABLE");
    expect(mock.statements.at(-1)?.sql).toBe("COMMIT");
    const writes = mock.statements.filter(({ sql }) => /^(INSERT|UPDATE|DELETE)/.test(sql));
    expect(writes).toEqual([{ sql: 'INSERT INTO public."session" ("sessionToken", "userId", "expires") VALUES ($1, $2, $3)', args: [token, who.id, new Date(now + 3_600_000)] }]);
  });

  it("fails closed before any mutation on unexpected database role", async () => {
    const mock = db("production_user");
    await expect(createC2E2ESession(mock.client, who, token, now)).rejects.toThrow();
    expect(mock.statements.map((x) => x.sql)).toContain("ROLLBACK");
    expect(mock.statements.every((x) => !/^(INSERT|UPDATE|DELETE)/.test(x.sql))).toBe(true);
  });

  it("revokes only the matching C2-owned token and expected fixture user", async () => {
    const mock = db();
    await revokeC2E2ESession(mock.client, who, token);
    const writes = mock.statements.filter(({ sql }) => /^(INSERT|UPDATE|DELETE)/.test(sql));
    expect(writes).toEqual([{ sql: 'DELETE FROM public."session" WHERE "sessionToken" = $1 AND "userId" = $2', args: [token, who.id] }]);
    await expect(revokeC2E2ESession(mock.client, who, "unrelated-secret")).rejects.toThrow();
  });

  it("accepts only the dedicated local DB host/port/database/role", () => {
    const local = { C2_MODE: "local", C2_POSTGRES_PASSWORD: "synthetic-password", C2_DATABASE_URL: "postgresql://c2_local:synthetic-password@localhost:5433/evidence_atlas_c2" };
    expect(validateC2Target(local)).toBe(local.C2_DATABASE_URL);
    expect(() => validateC2Target({ ...local, C2_DATABASE_URL: "postgresql://c2_local:synthetic-password@localhost:5432/evidence_atlas_c2" })).toThrow();
    expect(() => validateC2Target({ ...local, C2_DATABASE_URL: "postgresql://c2_local:synthetic-password@production.invalid:5433/evidence_atlas_c2" })).toThrow();
  });
});
