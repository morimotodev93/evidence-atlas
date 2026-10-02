// src/auth/authTableNamePlugin.ts

import {
  OperationNodeTransformer,
  type KyselyPlugin,
  type PluginTransformQueryArgs,
  type PluginTransformResultArgs,
  type QueryId,
  type QueryResult,
  type RootOperationNode,
  type TableNode,
  type UnknownRow,
} from "kysely";

const AUTH_TABLE_NAME_MAP = {
  User: "user",
  Account: "account",
  Session: "session",
  VerificationToken: "verificationToken",
} as const;

type AuthLogicalTableName = keyof typeof AUTH_TABLE_NAME_MAP;

class AuthTableNameTransformer extends OperationNodeTransformer {
  protected override transformTable(
    node: TableNode,
    queryId?: QueryId,
  ): TableNode {
    const transformed = super.transformTable(node, queryId);

    const logicalName = transformed.table.identifier.name;

    if (!(logicalName in AUTH_TABLE_NAME_MAP)) {
      return transformed;
    }

    const physicalName =
      AUTH_TABLE_NAME_MAP[logicalName as AuthLogicalTableName];

    return {
      ...transformed,
      table: {
        ...transformed.table,
        identifier: {
          ...transformed.table.identifier,
          name: physicalName,
        },
      },
    };
  }
}

export class AuthTableNamePlugin implements KyselyPlugin {
  private readonly transformer = new AuthTableNameTransformer();

  transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
    return this.transformer.transformNode(args.node, args.queryId);
  }

  async transformResult(
    args: PluginTransformResultArgs,
  ): Promise<QueryResult<UnknownRow>> {
    return args.result;
  }
}
