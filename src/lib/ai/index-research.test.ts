import { beforeEach, describe, expect, it, vi } from "vitest";

type ResearchState = {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  conclusion: string | null;
};

type FindingState = {
  id: string;
  content: string;
};

type UpsertInput = {
  create: Record<string, unknown>;
  update: Record<string, unknown>;
  conflictOn: {
    sourceType: string;
    sourceId: string;
    chunkIndex: number;
  };
};

const mocks = vi.hoisted(() => {
  const state: {
    research: ResearchState | null;
    findings: FindingState[];
    rows: Map<string, Record<string, unknown>>;
    clearOnDelete: boolean;
  } = {
    research: {
      id: "research-1",
      workspaceId: "workspace-1",
      title: "Initial title",
      description: null,
      conclusion: null,
    },
    findings: [],
    rows: new Map(),
    clearOnDelete: true,
  };

  const lockPlan = {
    kind: "research-index-lock",
  };

  const researchFirst = vi.fn(async () => state.research);

  const findingsAll = vi.fn(async () => state.findings);

  const researchWhere = vi.fn((_filter: { id: string }) => ({
    first: researchFirst,
  }));

  const findingWhere = vi.fn((_filter: { researchId: string }) => ({
    all: findingsAll,
  }));

  const txQuery = vi.fn(async () => undefined);

  const deleteChunks = vi.fn(async (researchId: string) => {
    if (!state.clearOnDelete) {
      return;
    }

    for (const [key, row] of state.rows.entries()) {
      if (row.researchId === researchId) {
        state.rows.delete(key);
      }
    }
  });

  const retrievalWhere = vi.fn(({ researchId }: { researchId: string }) => ({
    delete: async () => {
      await deleteChunks(researchId);
    },
  }));

  const upsert = vi.fn(async (input: UpsertInput) => {
    const key = [
      input.conflictOn.sourceType,
      input.conflictOn.sourceId,
      input.conflictOn.chunkIndex,
    ].join(":");

    const existing = state.rows.get(key);

    const row = existing
      ? {
          ...existing,
          ...input.update,
        }
      : {
          ...input.create,
        };

    state.rows.set(key, row);

    return row;
  });

  const tx = {
    query: txQuery,
    orm: {
      public: {
        RetrievalChunk: {
          where: retrievalWhere,
          upsert,
        },
      },
    },
  };

  const transaction = vi.fn(
    async (callback: (transaction: typeof tx) => Promise<unknown>) => {
      return await callback(tx);
    },
  );

  const chunkText = vi.fn((content: string) => [content]);

  const embedTexts = vi.fn(async (texts: string[]) =>
    texts.map((_, index) => [index + 1]),
  );

  const buildResearchIndexLockPlan = vi.fn(() => lockPlan);

  return {
    state,
    lockPlan,
    researchFirst,
    findingsAll,
    researchWhere,
    findingWhere,
    txQuery,
    deleteChunks,
    retrievalWhere,
    upsert,
    transaction,
    chunkText,
    embedTexts,
    buildResearchIndexLockPlan,
  };
});

vi.mock("@/prisma/db", () => ({
  db: {
    orm: {
      public: {
        Research: {
          where: mocks.researchWhere,
        },
        Finding: {
          where: mocks.findingWhere,
        },
      },
    },
    transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/ai/chunk-text", () => ({
  chunkText: mocks.chunkText,
}));

vi.mock("@/lib/ai/embed-texts", () => ({
  embedTexts: mocks.embedTexts,
}));

vi.mock("@/lib/ai/research-index-lock", () => ({
  buildResearchIndexLockPlan: mocks.buildResearchIndexLockPlan,
}));

import { indexResearch } from "@/lib/ai/index-research";

describe("indexResearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.state.research = {
      id: "research-1",
      workspaceId: "workspace-1",
      title: "Initial title",
      description: null,
      conclusion: null,
    };

    mocks.state.findings = [];
    mocks.state.rows.clear();
    mocks.state.clearOnDelete = true;
  });

  it("replaces retrieval chunks using the unique chunk key for upsert", async () => {
    const result = await indexResearch("research-1");

    expect(result).toEqual({
      researchId: "research-1",
      candidateCount: 1,
      chunkCount: 1,
    });

    expect(mocks.buildResearchIndexLockPlan).toHaveBeenCalledWith("research-1");

    expect(mocks.txQuery).toHaveBeenCalledWith(mocks.lockPlan);

    expect(mocks.deleteChunks).toHaveBeenCalledWith("research-1");

    expect(mocks.upsert).toHaveBeenCalledTimes(1);

    expect(mocks.upsert).toHaveBeenCalledWith({
      create: {
        id: expect.any(String),
        workspaceId: "workspace-1",
        researchId: "research-1",
        sourceType: "RESEARCH",
        sourceId: "research-1",
        chunkIndex: 0,
        content: "Initial title",
        embedding: [1],
      },
      update: {
        workspaceId: "workspace-1",
        researchId: "research-1",
        content: "Initial title",
        embedding: [1],
      },
      conflictOn: {
        sourceType: "RESEARCH",
        sourceId: "research-1",
        chunkIndex: 0,
      },
    });

    expect(mocks.txQuery.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.deleteChunks.mock.invocationCallOrder[0],
    );

    expect(mocks.deleteChunks.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.upsert.mock.invocationCallOrder[0],
    );
  });

  it("is idempotent when the same chunk already exists", async () => {
    // Simulate a stale/existing row surviving cleanup.
    // This exercises the UPSERT conflict path directly.
    mocks.state.clearOnDelete = false;

    await indexResearch("research-1");

    expect(mocks.state.rows.size).toBe(1);

    const firstRow = [...mocks.state.rows.values()][0];
    const firstId = firstRow.id;

    if (!mocks.state.research) {
      throw new Error("Expected research fixture.");
    }

    mocks.state.research.title = "Updated title";

    await expect(indexResearch("research-1")).resolves.toEqual({
      researchId: "research-1",
      candidateCount: 1,
      chunkCount: 1,
    });

    expect(mocks.state.rows.size).toBe(1);

    const finalRow = [...mocks.state.rows.values()][0];

    expect(finalRow).toMatchObject({
      id: firstId,
      workspaceId: "workspace-1",
      researchId: "research-1",
      sourceType: "RESEARCH",
      sourceId: "research-1",
      chunkIndex: 0,
      content: "Updated title",
      embedding: [1],
    });

    expect(mocks.upsert).toHaveBeenCalledTimes(2);

    expect(mocks.upsert.mock.calls[1][0].conflictOn).toEqual({
      sourceType: "RESEARCH",
      sourceId: "research-1",
      chunkIndex: 0,
    });
  });
});
