#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/604af0e00d6abfc869d4103e15bcee6cbc19d1d5c8bbb50586ce4cb3c55bc26b/contract';
import startContract from '../../snapshots/604af0e00d6abfc869d4103e15bcee6cbc19d1d5c8bbb50586ce4cb3c55bc26b/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/9720310e8b060518e968f7f361cc3d0dd890f5e2e859fc3f54a8b9f4c0cf6984/contract';
import endContract from '../../snapshots/9720310e8b060518e968f7f361cc3d0dd890f5e2e859fc3f54a8b9f4c0cf6984/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'conversation',
        column: col('researchId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'conversation',
        index: 'conversation_researchId_idx_36f1b4c8',
        columns: ['researchId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'conversation',
        foreignKey: {
          name: 'conversation_researchId_fkey',
          columns: ['researchId'],
          references: { schema: 'public', table: 'research', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
