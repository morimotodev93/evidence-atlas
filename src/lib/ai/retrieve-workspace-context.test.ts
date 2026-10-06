import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const spanSetAttribute = vi.fn();

  const startSpan = vi.fn(
    async (
      _options: unknown,
      callback: (span: {
        setAttribute: (name: string, value: number) => void;
      }) => Promise<unknown>,
    ) => {
      return await callback({
        setAttribute: spanSetAttribute,
      });
    },
  );

  const embedQuery = vi.fn(async () => [0.1, 0.2, 0.3]);

  const searchRetrievalChunks = vi.fn(async () => [
    {
      sourceType: "FINDING",
      sourceId: "finding-1",
      researchId: "research-1",
      content: "Indexed finding content",
      distance: 0.1,
    },
    {
      sourceType: "RESEARCH",
      sourceId: "research-2",
      researchId: "research-2",
      content: "Too distant research content",
      distance: 0.9,
    },
  ]);

  const findingFirst = vi.fn(async () => ({
    id: "finding-1",
    researchId: "research-1",
    content: "Current finding content",
    research: {
      id: "research-1",
      title: "Research title",
    },
    sources: [
      {
        source: {
          id: "source-1",
          title: "Source title",
          url: "https://example.com/source",
        },
      },
    ],
  }));

  const findingIncludeSources = vi.fn(() => ({
    first: findingFirst,
  }));

  const findingIncludeResearch = vi.fn(() => ({
    include: findingIncludeSources,
  }));

  const findingWhere = vi.fn(() => ({
    include: findingIncludeResearch,
  }));

  const researchWhere = vi.fn(() => ({
    first: vi.fn(async () => null),
  }));

  return {
    spanSetAttribute,
    startSpan,
    embedQuery,
    searchRetrievalChunks,
    findingFirst,
    findingIncludeSources,
    findingIncludeResearch,
    findingWhere,
    researchWhere,
  };
});

vi.mock("@sentry/nextjs", () => ({
  startSpan: mocks.startSpan,
}));

vi.mock("@/lib/ai/embed-texts", () => ({
  embedQuery: mocks.embedQuery,
}));

vi.mock("@/lib/ai/search-retrieval-chunks", () => ({
  searchRetrievalChunks: mocks.searchRetrievalChunks,
}));

vi.mock("@/prisma/db", () => ({
  db: {
    orm: {
      public: {
        Finding: {
          where: mocks.findingWhere,
        },
        Research: {
          where: mocks.researchWhere,
        },
      },
    },
  },
}));

import { retrieveWorkspaceContext } from "@/lib/ai/retrieve-workspace-context";

describe("retrieveWorkspaceContext observability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records retrieval counts without attaching workspace or query content", async () => {
    const result = await retrieveWorkspaceContext(
      "workspace-sensitive-id",
      "sensitive research query",
    );

    expect(result).toEqual({
      results: [
        {
          type: "FINDING",
          researchId: "research-1",
          researchTitle: "Research title",
          findingId: "finding-1",
          content: "Indexed finding content",
          distance: 0.1,
          sources: [
            {
              id: "source-1",
              title: "Source title",
              url: "https://example.com/source",
            },
          ],
        },
      ],
    });

    expect(mocks.startSpan).toHaveBeenCalledTimes(1);

    expect(mocks.startSpan).toHaveBeenCalledWith(
      {
        name: "retrieve workspace context",
        op: "ai.retrieval",
      },
      expect.any(Function),
    );

    expect(mocks.spanSetAttribute.mock.calls).toEqual([
      ["evidence_atlas.retrieval.candidate_count", 2],
      ["evidence_atlas.retrieval.selected_count", 1],
      ["evidence_atlas.retrieval.result_count", 1],
    ]);

    const recordedAttributes = JSON.stringify(
      mocks.spanSetAttribute.mock.calls,
    );

    expect(recordedAttributes).not.toContain("workspace-sensitive-id");
    expect(recordedAttributes).not.toContain("sensitive research query");
    expect(recordedAttributes).not.toContain("Indexed finding content");
  });
});
