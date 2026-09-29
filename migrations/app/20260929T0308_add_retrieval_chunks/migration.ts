#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1d0d4103d58b2225f5359157b9537fa99a0c295c80b2e67272646ec251b98380/contract';
import endContract from '../../snapshots/1d0d4103d58b2225f5359157b9537fa99a0c295c80b2e67272646ec251b98380/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f73c4d3e9a68207a2b67ca67d1c9e33beb881b051dae3c8585d6f5d229c4535d/contract';
import startContract from '../../snapshots/f73c4d3e9a68207a2b67ca67d1c9e33beb881b051dae3c8585d6f5d229c4535d/contract.json' with { type: 'json' };
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
        table: 'retrievalChunk',
        columns: [
          col('chunkIndex', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('embedding', 'vector(768)', {
            notNull: true,
            codecRef: { codecId: 'pg/vector@1', typeParams: { length: 768 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('researchId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sourceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sourceType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('workspaceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'retrievalChunk_sourceType_check_3ff43eef',
            "\"sourceType\" IN ('FINDING', 'CONCLUSION', 'RESEARCH')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'retrievalChunk',
        constraint: 'retrievalChunk_sourceType_sourceId_chunkIndex_key',
        columns: ['sourceType', 'sourceId', 'chunkIndex'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'retrievalChunk',
        index: 'retrievalChunk_researchId_idx_36f1b4c8',
        columns: ['researchId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'retrievalChunk',
        index: 'retrievalChunk_workspaceId_idx_ba65f874',
        columns: ['workspaceId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
