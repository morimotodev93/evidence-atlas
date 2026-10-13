import { IDS, type Entry, type FixtureStore, type Identity, type Row, selectIdentity } from "./c2-fixture-plan.ts";

export interface SqlClient {
  query(sql: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
}

const scopes: Record<string, [string, string][]> = {
  organization: [["id", IDS.organization]],
  membership: [["organizationId", IDS.organization]],
  workspace: [["id", IDS.workspace], ["organizationId", IDS.organization]],
  workspaceMembership: [["workspaceId", IDS.workspace]],
  research: [["id", IDS.research], ["workspaceId", IDS.workspace]],
  source: [["id", IDS.source], ["researchId", IDS.research]],
  finding: [["id", IDS.finding], ["researchId", IDS.research]],
  findingSource: [["findingId", IDS.finding], ["sourceId", IDS.source]],
};
const extraScopes: Record<string, [string, string][]> = {
  tag: [["workspaceId", IDS.workspace]],
  researchTag: [["researchId", IDS.research]],
  comment: [["researchId", IDS.research]],
  conversation: [["researchId", IDS.research]],
  retrievalChunk: [["workspaceId", IDS.workspace], ["researchId", IDS.research], ["sourceId", IDS.finding], ["sourceId", IDS.source]],
  aiUsageEvent: [["workspaceId", IDS.workspace], ["researchId", IDS.research]],
};
// All identifiers come from this module/manifest; every value is parameterized.
const quote = (name: string) => `"${name}"`;
function predicate(scope: [string, string][]) {
  return scope.map(([key], index) => `${quote(key)} = $${index + 1}`).join(" OR ");
}

export function sqlFixtureStore(client: SqlClient): FixtureStore {
  return {
    async identity(expected: Identity) {
      const users = await client.query('SELECT "id", "email" FROM public."user" WHERE "id" = $1 OR "email" = $2', [expected.id, expected.email]);
      const accounts = await client.query('SELECT "userId", "type", "provider", "providerAccountId" FROM public."account" WHERE "userId" = $1', [expected.id]);
      const sessions = await client.query('SELECT "userId" FROM public."session" WHERE "userId" = $1 AND "expires" > CURRENT_TIMESTAMP', [expected.id]);
      return selectIdentity(expected,
        users.rows as Identity[],
        accounts.rows as { userId: string; type: string; provider: string; providerAccountId: string }[],
        sessions.rows.map((row) => String(row.userId)));
    },
    async read(entries) {
      const result: Record<string, Row[]> = {};
      for (const entry of entries) {
        const scope = scopes[entry.table];
        const rows = await client.query(`SELECT ${Object.keys(entry.row).map(quote).join(", ")} FROM public.${quote(entry.table)} WHERE ${predicate(scope)}`, scope.map(([, value]) => value));
        result[entry.table] = rows.rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value])) as Row);
      }
      return result;
    },
    async hasExtraReferences() {
      for (const [table, scope] of Object.entries(extraScopes)) {
        const result = await client.query(`SELECT 1 FROM public.${quote(table)} WHERE ${predicate(scope)} LIMIT 1`, scope.map(([, value]) => value));
        if (result.rows.length) return true;
      }
      return false;
    },
    async insert(entry: Entry) {
      const columns = Object.keys(entry.row);
      const result = await client.query(`INSERT INTO public.${quote(entry.table)} (${columns.map(quote).join(", ")}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(", ")})`, Object.values(entry.row));
      if (result.rowCount !== 1) throw new Error("Unexpected fixture insert count.");
    },
    async remove(entry: Entry) {
      const result = await client.query(`DELETE FROM public.${quote(entry.table)} WHERE ${entry.key.map((key, index) => `${quote(key)} = $${index + 1}`).join(" AND ")}`, entry.key.map((key) => entry.row[key]));
      if (result.rowCount !== 1) throw new Error("Unexpected fixture delete count.");
    },
  };
}

export async function fixtureTransaction<T>(client: SqlClient, writes: boolean, action: (store: FixtureStore) => Promise<T>): Promise<T> {
  await client.query(writes ? "BEGIN ISOLATION LEVEL SERIALIZABLE" : "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    await client.query("SET LOCAL statement_timeout = '10s'");
    await client.query("SET LOCAL lock_timeout = '3s'");
    const identity = await client.query("SELECT current_database() AS database, current_user AS role");
    if (identity.rows.length !== 1 || identity.rows[0].database !== "evidence_atlas_c2" || identity.rows[0].role !== "c2_local") {
      throw new Error("C2 server identity mismatch.");
    }
    if (writes) {
      // Serialize preflight + mutation, also blocking concurrent app additions.
      // Auth tables are intentionally absent from locks and all mutation paths.
      await client.query(`LOCK TABLE ${[...Object.keys(scopes), ...Object.keys(extraScopes)].map((table) => `public.${quote(table)}`).join(", ")} IN SHARE ROW EXCLUSIVE MODE`);
    }
    const result = await action(sqlFixtureStore(client));
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
