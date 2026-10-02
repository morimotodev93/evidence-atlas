#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1d0d4103d58b2225f5359157b9537fa99a0c295c80b2e67272646ec251b98380/contract';
import startContract from '../../snapshots/1d0d4103d58b2225f5359157b9537fa99a0c295c80b2e67272646ec251b98380/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/3cebfef82e624e3457cf5c4e045bbde434dcd15a9e3f8437ecbb00b6c923d235/contract';
import endContract from '../../snapshots/3cebfef82e624e3457cf5c4e045bbde434dcd15a9e3f8437ecbb00b6c923d235/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'account',
        columns: [
          col('access_token', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('expires_at', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id_token', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('provider', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('providerAccountId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('refresh_token', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('scope', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('session_state', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('token_type', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'session',
        columns: [
          col('expires', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sessionToken', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'verificationToken',
        columns: [
          col('expires', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('identifier', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('token', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['identifier', 'token'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('emailVerified', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('image', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'account',
        constraint: 'account_provider_providerAccountId_key',
        columns: ['provider', 'providerAccountId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'session',
        constraint: 'session_sessionToken_key',
        columns: ['sessionToken'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'verificationToken',
        constraint: 'verificationToken_token_key',
        columns: ['token'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'account',
        index: 'account_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'session',
        index: 'session_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'account',
        foreignKey: {
          name: 'account_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'session',
        foreignKey: {
          name: 'session_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
