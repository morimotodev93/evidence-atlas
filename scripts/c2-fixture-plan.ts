import { validateC2Target } from "../src/lib/c2/database-target.ts";

export type Mode = "validate" | "dry-run" | "insert" | "verify" | "cleanup";
export type Row = Record<string, string | null>;
export type Entry = { table: string; key: string[]; row: Row };
export type Identity = { id: string; email: string };
export const IDS = {
  organization: "c2-e2e-v1-organization",
  workspace: "c2-e2e-v1-workspace",
  research: "c2-e2e-v1-research",
  source: "c2-e2e-v1-source",
  finding: "c2-e2e-v1-finding",
} as const;
const marker = "[C2 E2E fixture v1]";
const time = "2026-01-01T00:00:00.000Z";

// Dedicated script-only manifest; never imported by app/demo/ordinary seeds.
export function fixtureEntries(userId: string): Entry[] {
  const entry = (table: string, row: Row, key = ["id"]): Entry => ({ table, key, row });
  const timestamps = { createdAt: time, updatedAt: time };
  return [
    entry("organization", { id: IDS.organization, name: `${marker} Organization` }),
    entry("membership", { userId, organizationId: IDS.organization, role: "ADMIN" }, ["userId", "organizationId"]),
    entry("workspace", { id: IDS.workspace, organizationId: IDS.organization, name: `${marker} Workspace`, description: marker, ...timestamps }),
    entry("workspaceMembership", { userId, workspaceId: IDS.workspace, role: "ADMIN" }, ["userId", "workspaceId"]),
    entry("research", { id: IDS.research, workspaceId: IDS.workspace, createdById: userId, title: `${marker} Research`, description: marker, status: "IN_PROGRESS", conclusion: null, ...timestamps }),
    entry("source", { id: IDS.source, researchId: IDS.research, title: `${marker} Source`, url: "https://example.invalid/c2-e2e-v1", ...timestamps }),
    entry("finding", { id: IDS.finding, researchId: IDS.research, content: `${marker} Deterministic evidence for browser assertions.`, data: null, displayStyle: "TEXT", ...timestamps }),
    entry("findingSource", { findingId: IDS.finding, sourceId: IDS.source }, ["findingId", "sourceId"]),
  ];
}

export function prepareFixture(args: readonly string[], config: Record<string, string>, env: Record<string, string | undefined>, execArgv: readonly string[] = []) {
  const mode = args[0] as Mode;
  const writes = mode === "insert" || mode === "cleanup";
  if (!["validate", "dry-run", "insert", "verify", "cleanup"].includes(mode) ||
    (writes ? args.length !== 2 || args[1] !== "--allow-c2-write" : args.length !== 1)) {
    throw new Error("Invalid fixture command or missing explicit write opt-in.");
  }
  if (Object.entries(env).some(([key, value]) => value &&
    (/^(NODE_OPTIONS|NODE_PATH)$/i.test(key) || (/^PUBLIC_DEMO_MODE$/i.test(key) && value !== "false") ||
      (/^C2_RUNTIME_MODE$/i.test(key) && value !== "local"))) ||
    execArgv.some((arg) => /^-r|^--(?:require|import|(?:experimental-)?loader)(?:=|$)/.test(arg))) {
    throw new Error("Unsafe fixture execution environment.");
  }
  const databaseUrl = validateC2Target(config);
  const id = env.C2_FIXTURE_USER_ID;
  const email = env.C2_FIXTURE_USER_EMAIL;
  if (mode !== "validate" && (!id || !email || [id, email].some((value) => value !== value.trim() || /[\r\n\0]/.test(value)))) {
    throw new Error("Explicit fixture user ID and email are required.");
  }
  return { mode, writes, databaseUrl, identity: { id: id ?? "", email: email ?? "" } };
}

export function selectIdentity(expected: Identity, users: Identity[], accounts: { userId: string; type: string; provider: string; providerAccountId: string }[], activeSessionUsers: string[]): string {
  if (users.length !== 1 || users[0].id !== expected.id || users[0].email !== expected.email) {
    throw new Error("Missing, ambiguous or inconsistent fixture user.");
  }
  if (accounts.length !== 1 || accounts[0].userId !== expected.id || accounts[0].provider !== "google" ||
    accounts[0].type !== "oidc" || !accounts[0].providerAccountId.trim() ||
    !activeSessionUsers.length || activeSessionUsers.some((id) => id !== expected.id)) {
    throw new Error("A consistent Google OAuth account and active database session are required.");
  }
  return expected.id;
}

export interface FixtureStore {
  identity(expected: Identity): Promise<string>;
  read(entries: Entry[]): Promise<Record<string, Row[]>>;
  hasExtraReferences(): Promise<boolean>;
  insert(entry: Entry): Promise<void>;
  remove(entry: Entry): Promise<void>;
}

function ownedRows(entries: Entry[], rows: Record<string, Row[]>) {
  for (const entry of entries) {
    const found = rows[entry.table] ?? [];
    if (found.length > 1 || found.some((row) => Object.entries(entry.row).some(([key, value]) => row[key] !== value))) {
      throw new Error("Fixture collision or modified/unowned data; refusing operation.");
    }
  }
  // Junctions have no marker columns: both fully verified parents must exist.
  const parents: Record<string, string[]> = {
    membership: ["organization"], workspaceMembership: ["workspace"],
    findingSource: ["finding", "source"],
  };
  for (const [table, required] of Object.entries(parents)) {
    if (rows[table]?.length && required.some((parent) => !rows[parent]?.length)) {
      throw new Error("Fixture junction ownership cannot be established.");
    }
  }
}

// Caller must run the entire operation in one transaction, including all checks.
export async function operateFixture(store: FixtureStore, mode: Exclude<Mode, "validate">, identity: Identity) {
  const userId = await store.identity(identity);
  const entries = fixtureEntries(userId);
  const rows = await store.read(entries);
  ownedRows(entries, rows);
  if (await store.hasExtraReferences()) throw new Error("Non-fixture dependencies exist; refusing operation.");
  const present = entries.filter((entry) => rows[entry.table]?.length).length;
  if (mode === "verify" && present !== entries.length) throw new Error("Fixture is incomplete.");
  if (mode === "insert") {
    for (const entry of entries) if (!rows[entry.table]?.length) await store.insert(entry);
  }
  if (mode === "cleanup") {
    for (const entry of [...entries].reverse()) if (rows[entry.table]?.length) await store.remove(entry);
  }
  return { mode, present, plannedInserts: entries.length - present, plannedDeletes: present };
}
