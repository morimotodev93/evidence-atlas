import pgvector from "@prisma/orm-extension-pgvector/runtime";
import postgres from "@prisma/orm-postgres/runtime";
import "dotenv/config";
import "temporal-polyfill/full/global";

import type { Contract } from "./contract.d.ts";
import contractJson from "./contract.json" with { type: "json" };
import { resolveRuntimeDatabaseUrl } from "../lib/c2/runtime-database.ts";

const databaseUrl = resolveRuntimeDatabaseUrl(process.env);

export const db = postgres<Contract>({
  contractJson,
  url: databaseUrl,
  extensions: [pgvector],
});
