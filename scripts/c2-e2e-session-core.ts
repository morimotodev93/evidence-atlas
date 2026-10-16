import { C2_ORIGIN, captureAppState, type SavedState } from "./c2-playwright-policy.ts";
import { IDS } from "./c2-fixture-plan.ts";

export const C2_E2E_SESSION_MS = 60 * 60 * 1000;
export const C2_E2E_TOKEN_PATTERN = /^c2e2e_[0-9a-f]{64}$/;
export type C2Identity = { id: string; email: string };
export type C2Sql = { query(sql: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }> };

function reject(): never { throw new Error("C2 E2E session refused; details suppressed."); }
function object(x: unknown): x is Record<string, unknown> { return x !== null && typeof x === "object" && !Array.isArray(x); }
function keys(x: Record<string, unknown>, fields: string[]): boolean {
  return Object.keys(x).length === fields.length && fields.every((field) => Object.hasOwn(x, field));
}

export function assertC2E2EPrincipal(
  expected: C2Identity,
  users: Record<string, unknown>[],
  accounts: Record<string, unknown>[],
  memberships: Record<string, unknown>[],
): void {
  if (!expected.id || !expected.email || users.length !== 1 ||
    users[0]?.id !== expected.id || users[0]?.email !== expected.email ||
    accounts.length !== 1 || accounts[0]?.userId !== expected.id ||
    accounts[0]?.provider !== "google" || accounts[0]?.type !== "oidc" ||
    typeof accounts[0]?.providerAccountId !== "string" || !accounts[0].providerAccountId.trim() ||
    memberships.length !== 1 || memberships[0]?.userId !== expected.id ||
    memberships[0]?.workspaceId !== IDS.workspace || memberships[0]?.role !== "ADMIN") reject();
}

export function makeC2E2EState(expected: C2Identity, token: string, now: number): SavedState {
  if (!C2_E2E_TOKEN_PATTERN.test(token) || !Number.isSafeInteger(now) || now <= 0) reject();
  const expiry = new Date(now + C2_E2E_SESSION_MS).toISOString();
  const cookie = {
    name: "authjs.session-token", value: token, domain: "localhost", path: "/", expires: (now + C2_E2E_SESSION_MS) / 1000,
    httpOnly: true, secure: false, sameSite: "Lax" as const,
  };
  return captureAppState({ cookies: [cookie] }, `${C2_ORIGIN}/`, { user: expected, expires: expiry }, expected, now);
}

// Revocation must work even after the browser cookie expires. This validates
// only the session file created by this isolated script, never a normal OAuth state.
export function ownedC2E2EToken(data: unknown): string {
  if (!object(data) || !keys(data, ["version", "origin", "capturedAt", "sessionExpiresAt", "storageState"]) ||
    data.version !== 1 || data.origin !== C2_ORIGIN || typeof data.capturedAt !== "string" ||
    typeof data.sessionExpiresAt !== "string" || !Number.isFinite(Date.parse(data.capturedAt)) ||
    !Number.isFinite(Date.parse(data.sessionExpiresAt)) || !object(data.storageState) ||
    !keys(data.storageState, ["cookies", "origins"]) ||
    !Array.isArray(data.storageState.origins) || data.storageState.origins.length !== 0 ||
    !Array.isArray(data.storageState.cookies) || data.storageState.cookies.length !== 1) reject();
  const cookie = data.storageState.cookies[0];
  if (!object(cookie) || !keys(cookie, ["name", "value", "domain", "path", "expires", "httpOnly", "secure", "sameSite"]) ||
    cookie.name !== "authjs.session-token" || typeof cookie.value !== "string" || !C2_E2E_TOKEN_PATTERN.test(cookie.value) ||
    cookie.domain !== "localhost" || cookie.path !== "/" || cookie.httpOnly !== true ||
    cookie.secure !== false || cookie.sameSite !== "Lax" ||
    typeof cookie.expires !== "number" || !Number.isFinite(cookie.expires) ||
    Math.abs(cookie.expires * 1000 - Date.parse(data.sessionExpiresAt)) > 1000) reject();
  return cookie.value as string;
}

async function verifyDb(db: C2Sql) {
  const actual = await db.query("SELECT current_database() AS database, current_user AS role");
  if (actual.rows.length !== 1 || actual.rows[0]?.database !== "evidence_atlas_c2" || actual.rows[0]?.role !== "c2_local") reject();
}

export async function createC2E2ESession(db: C2Sql, expected: C2Identity, token: string, now: number): Promise<SavedState> {
  const state = makeC2E2EState(expected, token, now);
  await db.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  try {
    await db.query("SET LOCAL statement_timeout = '10s'");
    await db.query("SET LOCAL lock_timeout = '3s'");
    await verifyDb(db);
    const users = await db.query('SELECT "id", "email" FROM public."user" WHERE "id" = $1 OR "email" = $2', [expected.id, expected.email]);
    const accounts = await db.query('SELECT "userId", "type", "provider", "providerAccountId" FROM public."account" WHERE "userId" = $1', [expected.id]);
    const memberships = await db.query('SELECT "userId", "workspaceId", "role" FROM public."workspaceMembership" WHERE "userId" = $1 AND "workspaceId" = $2', [expected.id, IDS.workspace]);
    assertC2E2EPrincipal(expected, users.rows, accounts.rows, memberships.rows);
    const inserted = await db.query('INSERT INTO public."session" ("sessionToken", "userId", "expires") VALUES ($1, $2, $3)',
      [token, expected.id, new Date(now + C2_E2E_SESSION_MS)]);
    if (inserted.rowCount !== 1) reject();
    await db.query("COMMIT");
    return state;
  } catch {
    await db.query("ROLLBACK").catch(() => {});
    return reject();
  }
}

export async function revokeC2E2ESession(db: C2Sql, expected: C2Identity, token: string): Promise<void> {
  if (!C2_E2E_TOKEN_PATTERN.test(token) || !expected.id || !expected.email) reject();
  await db.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  try {
    await db.query("SET LOCAL statement_timeout = '10s'");
    await db.query("SET LOCAL lock_timeout = '3s'");
    await verifyDb(db);
    // Only a token created by this helper for this exact fixture identity can be revoked.
    const users = await db.query('SELECT "id", "email" FROM public."user" WHERE "id" = $1 OR "email" = $2', [expected.id, expected.email]);
    if (users.rows.length !== 1 || users.rows[0]?.id !== expected.id || users.rows[0]?.email !== expected.email) reject();
    await db.query('DELETE FROM public."session" WHERE "sessionToken" = $1 AND "userId" = $2', [token, expected.id]);
    await db.query("COMMIT");
  } catch {
    await db.query("ROLLBACK").catch(() => {});
    return reject();
  }
}
