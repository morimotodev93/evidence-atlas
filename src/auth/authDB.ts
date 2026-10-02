import {
  KyselyAuth,
  type Database as AuthDatabase,
} from "@auth/kysely-adapter";
import { PostgresDialect } from "kysely";
import { Pool } from "pg";

import { AuthTableNamePlugin } from "./authTableNamePlugin";

export const authDb = new KyselyAuth<AuthDatabase>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env["DATABASE_URL"]!,
    }),
  }),
  plugins: [new AuthTableNamePlugin()],
});
