import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { retrieveWorkspaceContext } from "./retrieve-workspace-context";

const mocks = vi.hoisted(() => ({
  embed: vi.fn(), search: vi.fn(), researchWhere: vi.fn(), findingWhere: vi.fn(),
  attribute: vi.fn(),
}));
vi.mock("@/lib/ai/embed-texts", () => ({ embedQuery: mocks.embed }));
vi.mock("@/lib/ai/search-retrieval-chunks", () => ({ searchRetrievalChunks: mocks.search }));
vi.mock("@sentry/nextjs", () => ({
  startSpan: async (_options: unknown, callback: (span: { setAttribute: typeof mocks.attribute }) => unknown) => callback({ setAttribute: mocks.attribute }),
}));
vi.mock("@/prisma/db", () => ({ db: { orm: { public: {
  Research: { where: mocks.researchWhere }, Finding: { where: mocks.findingWhere },
} } } }));

type Candidate = {
  sourceType: "RESEARCH" | "CONCLUSION" | "FINDING";
  sourceId: string; researchId: string; content: string; distance: number;
};
function candidate(sourceType: Candidate["sourceType"], sourceId: string, researchId = "r1", distance = 0.1): Candidate {
  return { sourceType, sourceId, researchId, distance, content: `Indexed ${sourceType} ${sourceId}` };
}
const researches = [
  ...Array.from({ length: 6 }, (_, index) => ({
    id: `r${index + 1}`, workspaceId: "w1", title: index === 0 ? "Current title" : `Research ${index + 1}`,
  })),
  { id: "foreign", workspaceId: "w2", title: "FOREIGN_PRIVATE" },
];
const source = { id: "s1", title: "Current source title", url: "https://example.invalid/current", content: "SOURCE_BODY_PRIVATE" };
const finding = { id: "f1", researchId: "r1", content: "Current body must not replace chunk", research: researches[0], sources: [{ source }] };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("C2_RUNTIME_MODE", undefined);
  mocks.embed.mockResolvedValue([0.1, 0.2]);
  mocks.search.mockResolvedValue([]);
  mocks.researchWhere.mockImplementation((filter: { id: string; workspaceId: string }) => ({
    first: async () => researches.find((row) => row.id === filter.id && row.workspaceId === filter.workspaceId) ?? null,
  }));
  mocks.findingWhere.mockImplementation((filter: { id: string; researchId: string }) => {
    const query = {
      include: vi.fn(() => query),
      first: async () => finding.id === filter.id && finding.researchId === filter.researchId ? finding : null,
    };
    return query;
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("retrieveWorkspaceContext offline selection", () => {
  it("keeps distance 0.35, distinguishes types, deduplicates, and skips missing rows without refilling", async () => {
    mocks.search.mockResolvedValueOnce([
      candidate("RESEARCH", "far", "r1", 0.350001),
      candidate("CONCLUSION", "r1", "r1", 0.35),
      candidate("RESEARCH", "r1"),
      candidate("FINDING", "f1"),
      candidate("FINDING", "f1", "r1", 0.2),
      candidate("FINDING", "deleted"),
      candidate("CONCLUSION", "deleted", "missing"),
      candidate("FINDING", "f1", "r1", 0.3),
      candidate("RESEARCH", "r2", "r2"),
    ]);
    const { results } = await retrieveWorkspaceContext("w1", "Question");
    expect(mocks.embed).toHaveBeenCalledExactlyOnceWith("Question");
    expect(mocks.search).toHaveBeenCalledExactlyOnceWith("w1", [0.1, 0.2], 10);
    expect(results).toEqual([
      { type: "CONCLUSION", researchId: "r1", researchTitle: "Current title", content: "Indexed CONCLUSION r1", distance: 0.35, sources: [] },
      { type: "RESEARCH", researchId: "r1", researchTitle: "Current title", content: "Indexed RESEARCH r1", distance: 0.1, sources: [] },
      { type: "FINDING", researchId: "r1", researchTitle: "Current title", findingId: "f1", content: "Indexed FINDING f1", distance: 0.1,
        sources: [{ id: "s1", title: "Current source title", url: "https://example.invalid/current" }] },
    ]);
    expect(mocks.findingWhere.mock.calls).toEqual([[{ id: "f1", researchId: "r1" }], [{ id: "deleted", researchId: "r1" }]]);
    expect(mocks.researchWhere.mock.calls).toEqual([
      [{ id: "r1", workspaceId: "w1" }], [{ id: "r1", workspaceId: "w1" }], [{ id: "missing", workspaceId: "w1" }],
    ]);
    expect(mocks.attribute.mock.calls).toEqual([
      ["evidence_atlas.retrieval.candidate_count", 9],
      ["evidence_atlas.retrieval.selected_count", 5],
      ["evidence_atlas.retrieval.result_count", 3],
    ]);
  });

  it("hydrates at most five unique selections even when more records exist", async () => {
    mocks.search.mockResolvedValueOnce(Array.from({ length: 6 }, (_, index) => candidate("RESEARCH", `r${index + 1}`, `r${index + 1}`)));
    const { results } = await retrieveWorkspaceContext("w1", "Question");
    expect(results.map((row) => row.researchId)).toEqual(["r1", "r2", "r3", "r4", "r5"]);
    expect(mocks.researchWhere).toHaveBeenCalledTimes(5);
  });

  it("passes Workspace scope to search and rechecks it for Research/Conclusion hydration", async () => {
    // Search is a trusted, scoped boundary; this deliberately stale candidate
    // also exercises the additional Research/Conclusion Workspace predicate.
    mocks.search.mockResolvedValueOnce([candidate("CONCLUSION", "foreign", "foreign")]);
    await expect(retrieveWorkspaceContext("w1", "Question")).resolves.toEqual({ results: [] });
    expect(mocks.search).toHaveBeenCalledExactlyOnceWith("w1", [0.1, 0.2], 10);
    expect(mocks.researchWhere).toHaveBeenCalledExactlyOnceWith({ id: "foreign", workspaceId: "w1" });
    expect(mocks.findingWhere).not.toHaveBeenCalled();
  });

  it("does not hydrate records for an empty candidate set", async () => {
    await expect(retrieveWorkspaceContext("w1", "Question")).resolves.toEqual({ results: [] });
    expect(mocks.researchWhere).not.toHaveBeenCalled();
    expect(mocks.findingWhere).not.toHaveBeenCalled();
  });

  it.each(["embedding", "search", "hydration"])("propagates a synthetic %s failure without reporting successful results", async (stage) => {
    const error = new Error("Synthetic retrieval failure");
    if (stage === "embedding") mocks.embed.mockRejectedValueOnce(error);
    if (stage === "search") mocks.search.mockRejectedValueOnce(error);
    if (stage === "hydration") {
      mocks.search.mockResolvedValueOnce([candidate("RESEARCH", "r1")]);
      mocks.researchWhere.mockImplementationOnce(() => { throw error; });
    }
    await expect(retrieveWorkspaceContext("w1", "Question")).rejects.toBe(error);
    if (stage === "embedding") expect(mocks.search).not.toHaveBeenCalled();
    if (stage !== "hydration") expect(mocks.researchWhere).not.toHaveBeenCalled();
    expect(mocks.findingWhere).not.toHaveBeenCalled();
    expect(mocks.attribute).not.toHaveBeenCalled();
  });
});
