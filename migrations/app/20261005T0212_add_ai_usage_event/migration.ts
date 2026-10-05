#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/2538aaf38e932fcf310c5d7b7f13f53e9aae06467492d64c8c30d0724df783f5/contract';
import endContract from '../../snapshots/2538aaf38e932fcf310c5d7b7f13f53e9aae06467492d64c8c30d0724df783f5/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f6b2e04bb40d78de0b0b1dae94cadd64bc4378033247ab8e51ebc256ea1215e7/contract';
import startContract from '../../snapshots/f6b2e04bb40d78de0b0b1dae94cadd64bc4378033247ab8e51ebc256ea1215e7/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'aiUsageEvent',
        columns: [
          col('conversationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('finishReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('inputTokens', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('model', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('operation', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('outputTokens', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('provider', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('researchId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('totalTokens', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('workspaceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('aiUsageEvent_operation_check_ba79fa05', '"operation" IN (\'CHAT\')'),
        ],
      }),
      this.createIndex({
        schema: 'public',
        table: 'aiUsageEvent',
        index: 'aiUsageEvent_userId_createdAt_idx_f726f04a',
        columns: ['userId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'aiUsageEvent',
        index: 'aiUsageEvent_workspaceId_createdAt_idx_5ff7e893',
        columns: ['workspaceId', 'createdAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
