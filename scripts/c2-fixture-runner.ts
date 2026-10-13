import { operateFixture, prepareFixture } from "./c2-fixture-plan.ts";
import { fixtureTransaction, type SqlClient } from "./c2-fixture-store.ts";

export interface FixtureClient extends SqlClient {
  connect(): Promise<unknown>;
  end(): Promise<unknown>;
}

export async function runFixture(input: {
  args: readonly string[];
  config: Record<string, string>;
  env: Record<string, string | undefined>;
  execArgv?: readonly string[];
  createClient: (validatedUrl: string) => Promise<FixtureClient>;
}) {
  const prepared = prepareFixture(input.args, input.config, input.env, input.execArgv);
  if (prepared.mode === "validate") return { mode: "validate" };
  const client = await input.createClient(prepared.databaseUrl);
  try {
    await client.connect();
    const mode = prepared.mode;
    return await fixtureTransaction(client, prepared.writes, (store) => operateFixture(store, mode, prepared.identity));
  } finally {
    await client.end();
  }
}
