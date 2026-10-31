import { readFileSync, readdirSync } from "node:fs";
import pgvector from "@prisma/orm-extension-pgvector/runtime";
import postgres from "@prisma/orm-postgres/runtime";
import postgresStatic from "@prisma/orm-postgres/static";
import "temporal-polyfill/full/global";
import { describe, expect, it, vi } from "vitest";

import type { Contract } from "./contract.d.ts";
import contractJson from "./contract.json";
import { searchRetrievalChunks } from "@/lib/ai/search-retrieval-chunks";

// Use the actual contract and SQL builder, replacing only query execution.
// Neither the static context nor the unbound runtime client has a database URL.
const mocks = vi.hoisted(() => ({
  query: vi.fn<(plan: unknown) => Promise<unknown[]>>().mockResolvedValue([]),
}));
vi.mock("@/prisma/db", async () => {
  const { default: staticContext } = await import("@prisma/orm-postgres/static");
  const { default: vector } = await import("@prisma/orm-extension-pgvector/runtime");
  const { default: json } = await import("./contract.json");
  return {
    db: {
      ...staticContext<Contract>({ contractJson: json, extensions: [vector] }),
      runtime: () => ({ query: mocks.query }),
    },
  };
});

describe("Prisma contract compatibility without a database", () => {
  const snapshots = new URL("../../migrations/snapshots/", import.meta.url);

  // Extension-pack contracts describe types, rather than application models;
  // those are loaded by the control plane, not the application's runtime.
  const appSnapshots = readdirSync(snapshots).map((hash) => ({
    hash,
    json: JSON.parse(readFileSync(new URL(`${hash}/contract.json`, snapshots), "utf8")),
  })).filter(({ json }) => Object.keys(json.domain.namespaces.public.models).length > 0);

  it.each(appSnapshots)("loads historical application snapshot $hash", ({ hash, json }) => {
    const context = postgresStatic({ contractJson: json, extensions: [pgvector] });
    expect(context.contract.storage.storageHash).toBe(hash);
  });

  it("initializes the existing ORM and vector surfaces without connecting", async () => {
    const client = postgres<Contract>({ contractJson, extensions: [pgvector] });
    try {
      for (const model of ["Research", "Source", "Finding", "User", "AiUsageEvent"] as const) {
        expect(client.orm.public[model].where).toBeTypeOf("function");
      }
      expect(client.sql.public.retrievalChunk).toBeDefined();
      expect(client.contract.storage.storageHash).toBe(contractJson.storage.storageHash);
    } finally {
      await client.close();
    }
  });

  it("plans the real workspace-scoped cosine search with the pgvector pack", async () => {
    const embedding = Array<number>(768).fill(0.1);
    await expect(searchRetrievalChunks("workspace-offline", embedding, 3)).resolves.toEqual([]);
    expect(mocks.query).toHaveBeenCalledOnce();
    const plan = mocks.query.mock.calls[0]?.[0];
    expect(plan).toMatchObject({
      ast: {
        kind: "select",
        from: { name: "retrievalChunk", namespaceId: "public" },
        where: { op: "eq", left: { name: "workspaceId" } },
        limit: 3,
      },
      meta: { target: "postgres", storageHash: contractJson.storage.storageHash },
    });
    expect(JSON.stringify(plan)).toContain("cosineDistance");
    expect(plan).toHaveProperty("params", expect.arrayContaining([embedding, "workspace-offline"]));
  });
});
