import {
  KyselyAuth,
  type Database as AuthDatabase,
} from "@auth/kysely-adapter";
import { PostgresDialect } from "kysely";
import { Pool } from "pg";

import { AuthTableNamePlugin } from "./authTableNamePlugin";
import { resolveRuntimeDatabaseUrl } from "../lib/c2/runtime-database.ts";

const databaseUrl = resolveRuntimeDatabaseUrl(process.env);

export const authDb = new KyselyAuth<AuthDatabase>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: databaseUrl,
    }),
  }),
  plugins: [new AuthTableNamePlugin()],
});
