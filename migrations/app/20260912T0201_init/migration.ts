#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/a10fc05cdaeb21d5b248c7292265b86644feb0b022c243aa30e1ea67abeeb7bb/contract';
import endContract from '../../snapshots/a10fc05cdaeb21d5b248c7292265b86644feb0b022c243aa30e1ea67abeeb7bb/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'comment',
        columns: [
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('researchId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'conversation',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'finding',
        columns: [
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('data', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('displayStyle', 'text', {
            notNull: true,
            default: lit('TEXT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('researchId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('finding_displayStyle_check_a09f4487', '"displayStyle" IN (\'TEXT\')'),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'findingSource',
        columns: [
          col('findingId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sourceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['findingId', 'sourceId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'membership',
        columns: [
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['userId', 'organizationId']),
          checkExpression('membership_role_check_ddb31015', "\"role\" IN ('ADMIN', 'MEMBER')"),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'message',
        columns: [
          col('authorType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('conversationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('message_authorType_check_afb06fcd', "\"authorType\" IN ('USER', 'AI')"),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'organization',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'research',
        columns: [
          col('conclusion', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('IN_PROGRESS'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('workspaceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'research_status_check_5cf55ef0',
            "\"status\" IN ('IN_PROGRESS', 'COMPLETED', 'ARCHIVED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'researchTag',
        columns: [
          col('researchId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tagId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['researchId', 'tagId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'source',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('researchId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('url', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'tag',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('workspaceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'user',
        columns: [
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('username', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'workspace',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'workspaceMembership',
        columns: [
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('workspaceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['userId', 'workspaceId']),
          checkExpression(
            'workspaceMembership_role_check_ddb31015',
            "\"role\" IN ('ADMIN', 'MEMBER')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'tag',
        constraint: 'tag_workspaceId_name_key',
        columns: ['workspaceId', 'name'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_email_key',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'comment',
        index: 'comment_researchId_idx_36f1b4c8',
        columns: ['researchId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'comment',
        index: 'comment_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'finding',
        index: 'finding_researchId_idx_36f1b4c8',
        columns: ['researchId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'findingSource',
        index: 'findingSource_findingId_idx_813b79f2',
        columns: ['findingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'findingSource',
        index: 'findingSource_sourceId_idx_d92a2571',
        columns: ['sourceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'membership',
        index: 'membership_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'membership',
        index: 'membership_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'message',
        index: 'message_conversationId_idx_669215a6',
        columns: ['conversationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'research',
        index: 'research_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'research',
        index: 'research_workspaceId_idx_ba65f874',
        columns: ['workspaceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'researchTag',
        index: 'researchTag_researchId_idx_36f1b4c8',
        columns: ['researchId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'researchTag',
        index: 'researchTag_tagId_idx_86854244',
        columns: ['tagId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'source',
        index: 'source_researchId_idx_36f1b4c8',
        columns: ['researchId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tag',
        index: 'tag_workspaceId_idx_ba65f874',
        columns: ['workspaceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'workspace',
        index: 'workspace_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'workspaceMembership',
        index: 'workspaceMembership_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'workspaceMembership',
        index: 'workspaceMembership_workspaceId_idx_ba65f874',
        columns: ['workspaceId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'comment',
        foreignKey: {
          name: 'comment_researchId_fkey',
          columns: ['researchId'],
          references: { schema: 'public', table: 'research', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'comment',
        foreignKey: {
          name: 'comment_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'finding',
        foreignKey: {
          name: 'finding_researchId_fkey',
          columns: ['researchId'],
          references: { schema: 'public', table: 'research', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'findingSource',
        foreignKey: {
          name: 'findingSource_findingId_fkey',
          columns: ['findingId'],
          references: { schema: 'public', table: 'finding', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'findingSource',
        foreignKey: {
          name: 'findingSource_sourceId_fkey',
          columns: ['sourceId'],
          references: { schema: 'public', table: 'source', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'membership',
        foreignKey: {
          name: 'membership_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'membership',
        foreignKey: {
          name: 'membership_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'message',
        foreignKey: {
          name: 'message_conversationId_fkey',
          columns: ['conversationId'],
          references: { schema: 'public', table: 'conversation', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'research',
        foreignKey: {
          name: 'research_workspaceId_fkey',
          columns: ['workspaceId'],
          references: { schema: 'public', table: 'workspace', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'research',
        foreignKey: {
          name: 'research_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'researchTag',
        foreignKey: {
          name: 'researchTag_researchId_fkey',
          columns: ['researchId'],
          references: { schema: 'public', table: 'research', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'researchTag',
        foreignKey: {
          name: 'researchTag_tagId_fkey',
          columns: ['tagId'],
          references: { schema: 'public', table: 'tag', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'source',
        foreignKey: {
          name: 'source_researchId_fkey',
          columns: ['researchId'],
          references: { schema: 'public', table: 'research', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tag',
        foreignKey: {
          name: 'tag_workspaceId_fkey',
          columns: ['workspaceId'],
          references: { schema: 'public', table: 'workspace', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'workspace',
        foreignKey: {
          name: 'workspace_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'workspaceMembership',
        foreignKey: {
          name: 'workspaceMembership_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'workspaceMembership',
        foreignKey: {
          name: 'workspaceMembership_workspaceId_fkey',
          columns: ['workspaceId'],
          references: { schema: 'public', table: 'workspace', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
