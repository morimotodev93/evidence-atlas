#!/usr/bin/env -S node
import {
  Migration,
  MigrationCLI,
  rawSql,
} from "@prisma/orm-postgres/migration";
import type { Contract as End } from "../../snapshots/604af0e00d6abfc869d4103e15bcee6cbc19d1d5c8bbb50586ce4cb3c55bc26b/contract";
import endContract from "../../snapshots/604af0e00d6abfc869d4103e15bcee6cbc19d1d5c8bbb50586ce4cb3c55bc26b/contract.json" with { type: "json" };
import type { Contract as Start } from "../../snapshots/a10fc05cdaeb21d5b248c7292265b86644feb0b022c243aa30e1ea67abeeb7bb/contract";
import startContract from "../../snapshots/a10fc05cdaeb21d5b248c7292265b86644feb0b022c243aa30e1ea67abeeb7bb/contract.json" with { type: "json" };
export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      rawSql({
        id: "findingSource.findingId.onDeleteCascade",
        label: 'Set ON DELETE CASCADE for "findingSource"."findingId"',
        operationClass: "destructive",
        target: { id: "postgres" },

        precheck: [
          {
            description: "foreign key exists without ON DELETE CASCADE",
            sql: `
            SELECT EXISTS (
              SELECT 1
              FROM pg_constraint
              WHERE conname = 'findingSource_findingId_fkey'
                AND conrelid = 'public."findingSource"'::regclass
                AND confdeltype <> 'c'
            )
          `,
          },
        ],

        execute: [
          {
            description: "replace findingId foreign key",
            sql: `
            ALTER TABLE "public"."findingSource"
            DROP CONSTRAINT "findingSource_findingId_fkey",
            ADD CONSTRAINT "findingSource_findingId_fkey"
              FOREIGN KEY ("findingId")
              REFERENCES "public"."finding" ("id")
              ON DELETE CASCADE
          `,
          },
        ],

        postcheck: [
          {
            description: "findingId foreign key uses ON DELETE CASCADE",
            sql: `
            SELECT EXISTS (
              SELECT 1
              FROM pg_constraint
              WHERE conname = 'findingSource_findingId_fkey'
                AND conrelid = 'public."findingSource"'::regclass
                AND confdeltype = 'c'
            )
          `,
          },
        ],
      }),

      rawSql({
        id: "findingSource.sourceId.onDeleteCascade",
        label: 'Set ON DELETE CASCADE for "findingSource"."sourceId"',
        operationClass: "destructive",
        target: { id: "postgres" },

        precheck: [
          {
            description: "foreign key exists without ON DELETE CASCADE",
            sql: `
            SELECT EXISTS (
              SELECT 1
              FROM pg_constraint
              WHERE conname = 'findingSource_sourceId_fkey'
                AND conrelid = 'public."findingSource"'::regclass
                AND confdeltype <> 'c'
            )
          `,
          },
        ],

        execute: [
          {
            description: "replace sourceId foreign key",
            sql: `
            ALTER TABLE "public"."findingSource"
            DROP CONSTRAINT "findingSource_sourceId_fkey",
            ADD CONSTRAINT "findingSource_sourceId_fkey"
              FOREIGN KEY ("sourceId")
              REFERENCES "public"."source" ("id")
              ON DELETE CASCADE
          `,
          },
        ],

        postcheck: [
          {
            description: "sourceId foreign key uses ON DELETE CASCADE",
            sql: `
            SELECT EXISTS (
              SELECT 1
              FROM pg_constraint
              WHERE conname = 'findingSource_sourceId_fkey'
                AND conrelid = 'public."findingSource"'::regclass
                AND confdeltype = 'c'
            )
          `,
          },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
