#!/usr/bin/env -S node
import { Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as Start } from "../../snapshots/9720310e8b060518e968f7f361cc3d0dd890f5e2e859fc3f54a8b9f4c0cf6984/contract";
import startContract from "../../snapshots/9720310e8b060518e968f7f361cc3d0dd890f5e2e859fc3f54a8b9f4c0cf6984/contract.json" with { type: "json" };
import type { Contract as End } from "../../snapshots/f73c4d3e9a68207a2b67ca67d1c9e33beb881b051dae3c8585d6f5d229c4535d/contract";
import endContract from "../../snapshots/f73c4d3e9a68207a2b67ca67d1c9e33beb881b051dae3c8585d6f5d229c4535d/contract.json" with { type: "json" };

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.setNotNull({
        schema: "public",
        table: "conversation",
        column: "researchId",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
