#!/usr/bin/env -S node
import {
  Migration,
  MigrationCLI,
  rawSql,
} from "@prisma/orm-postgres/migration";
import type { Contract as Start } from "../../snapshots/3cebfef82e624e3457cf5c4e045bbde434dcd15a9e3f8437ecbb00b6c923d235/contract";
import startContract from "../../snapshots/3cebfef82e624e3457cf5c4e045bbde434dcd15a9e3f8437ecbb00b6c923d235/contract.json" with { type: "json" };
import type { Contract as End } from "../../snapshots/f6b2e04bb40d78de0b0b1dae94cadd64bc4378033247ab8e51ebc256ea1215e7/contract";
import endContract from "../../snapshots/f6b2e04bb40d78de0b0b1dae94cadd64bc4378033247ab8e51ebc256ea1215e7/contract.json" with { type: "json" };

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      rawSql({
        id: "auth.account-primary-key",
        label: "Replace account primary key",
        summary:
          "Remove the unused account id column and use provider/providerAccountId as the primary key",
        operationClass: "destructive",
        target: { id: "postgres" },
        precheck: [],
        execute: [
          {
            description: "drop account id primary key",
            sql: 'ALTER TABLE "public"."account" DROP CONSTRAINT "account_pkey"',
          },
          {
            description: "drop redundant account provider unique constraint",
            sql: 'ALTER TABLE "public"."account" DROP CONSTRAINT "account_provider_providerAccountId_key"',
          },
          {
            description: "drop unused account id column",
            sql: 'ALTER TABLE "public"."account" DROP COLUMN "id"',
          },
          {
            description: "add account composite primary key",
            sql: 'ALTER TABLE "public"."account" ADD PRIMARY KEY ("provider", "providerAccountId")',
          },
        ],
        postcheck: [],
      }),

      rawSql({
        id: "auth.session-primary-key",
        label: "Replace session primary key",
        summary:
          "Remove the unused session id column and use sessionToken as the primary key",
        operationClass: "destructive",
        target: { id: "postgres" },
        precheck: [],
        execute: [
          {
            description: "drop session id primary key",
            sql: 'ALTER TABLE "public"."session" DROP CONSTRAINT "session_pkey"',
          },
          {
            description: "drop redundant session token unique constraint",
            sql: 'ALTER TABLE "public"."session" DROP CONSTRAINT "session_sessionToken_key"',
          },
          {
            description: "drop unused session id column",
            sql: 'ALTER TABLE "public"."session" DROP COLUMN "id"',
          },
          {
            description: "add session token primary key",
            sql: 'ALTER TABLE "public"."session" ADD PRIMARY KEY ("sessionToken")',
          },
        ],
        postcheck: [],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
