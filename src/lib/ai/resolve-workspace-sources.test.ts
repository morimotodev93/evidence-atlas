import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveWorkspaceSources } from "./resolve-workspace-sources";

const mocks = vi.hoisted(() => ({
  researchWhere: vi.fn(),
  sourceWhere: vi.fn(),
}));

vi.mock("@/prisma/db", () => ({
  db: {
    orm: {
      public: {
        Research: { where: mocks.researchWhere },
        Source: { where: mocks.sourceWhere },
      },
    },
  },
}));

const researchRows = [
  { id: "research-a1", workspaceId: "workspace-a" },
  { id: "research-a2", workspaceId: "workspace-a" },
  { id: "research-b", workspaceId: "workspace-b" },
];
const sourceRows = [
  { id: "source-a", researchId: "research-a1", title: "A evidence", url: "https://example.invalid/a", content: "Private A content" },
  { id: "source-b", researchId: "research-a2", title: "B evidence", url: "https://example.invalid/b", content: "Private B content" },
  { id: "unrequested-source", researchId: "research-a1", title: "Other evidence", url: "https://example.invalid/other", content: "Private content" },
  { id: "foreign-source", researchId: "research-b", title: "Foreign evidence", url: "https://example.invalid/foreign", content: "Private foreign content" },
  { id: "orphan-source", researchId: "unknown-research", title: "Orphan evidence", url: "https://example.invalid/orphan", content: "Private orphan content" },
];

type SourceColumns = {
  id: { in: (values: string[]) => boolean };
  researchId: { in: (values: string[]) => boolean };
};
type SourcePredicate = (columns: SourceColumns) => boolean;

describe("resolveWorkspaceSources", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.researchWhere.mockImplementation((filter: { workspaceId: string }) => ({
      all: vi.fn(async () => researchRows.filter((row) => row.workspaceId === filter.workspaceId)),
    }));
    mocks.sourceWhere.mockImplementation((predicate: SourcePredicate) => {
      const predicates = [predicate];
      const query = {
        where: vi.fn((next: SourcePredicate) => {
          predicates.push(next);
          return query;
        }),
        all: vi.fn(async () => sourceRows.filter((row) =>
          predicates.every((condition) => condition({
            id: { in: (values) => values.includes(row.id) },
            researchId: { in: (values) => values.includes(row.researchId) },
          })),
        )),
      };
      return query;
    });
  });

  it("returns an empty list without querying the DB for no requested IDs", async () => {
    await expect(resolveWorkspaceSources("workspace-a", [])).resolves.toEqual([]);
    expect(mocks.researchWhere).not.toHaveBeenCalled();
    expect(mocks.sourceWhere).not.toHaveBeenCalled();
  });

  it("skips Source queries when the Workspace Research set is empty", async () => {
    await expect(resolveWorkspaceSources("empty-workspace", ["source-a"]))
      .resolves.toEqual([]);
    expect(mocks.researchWhere).toHaveBeenCalledWith({ workspaceId: "empty-workspace" });
    expect(mocks.sourceWhere).not.toHaveBeenCalled();
  });

  it("deduplicates requested IDs before querying and returns only Source metadata", async () => {
    const result = await resolveWorkspaceSources("workspace-a", ["source-b", "source-a", "source-b"]);
    expect(mocks.researchWhere).toHaveBeenCalledWith({ workspaceId: "workspace-a" });
    expect(mocks.sourceWhere).toHaveBeenCalledOnce();
    const idIn = vi.fn(() => true);
    const researchIdIn = vi.fn(() => true);
    const columns = { id: { in: idIn }, researchId: { in: researchIdIn } };
    const requestedIdsFilter: SourcePredicate = mocks.sourceWhere.mock.calls[0][0];
    expect(requestedIdsFilter(columns)).toBe(true);
    expect(idIn).toHaveBeenCalledWith(["source-b", "source-a"]);

    const query = mocks.sourceWhere.mock.results[0].value;
    expect(query.where).toHaveBeenCalledOnce();
    expect(query.where.mock.calls[0][0](columns)).toBe(true);
    expect(researchIdIn).toHaveBeenCalledWith(["research-a1", "research-a2"]);
    expect(result).toEqual([
      { id: "source-a", title: "A evidence", url: "https://example.invalid/a" },
      { id: "source-b", title: "B evidence", url: "https://example.invalid/b" },
    ]);
  });

  it.each([
    { workspaceId: "workspace-a", expectedIds: ["source-a", "source-b"] },
    { workspaceId: "workspace-b", expectedIds: ["foreign-source"] },
  ])("applies both requested-ID and Research Workspace filters for $workspaceId", async ({ workspaceId, expectedIds }) => {
    const result = await resolveWorkspaceSources(workspaceId, [
      "source-a", "source-b", "foreign-source", "unknown-source", "orphan-source",
    ]);

    // The mocks evaluate the real predicates against mixed Workspace rows.
    // Dropping either filter would include foreign or unrequested records.
    expect(mocks.researchWhere).toHaveBeenCalledWith({ workspaceId });
    expect(result.map((source) => source.id).sort()).toEqual([...expectedIds].sort());
    expect(result.every((source) => Object.keys(source).sort().join(",") === "id,title,url"))
      .toBe(true);
  });

  it("returns no Sources for unknown, foreign, or orphan IDs in a nonempty Workspace", async () => {
    await expect(resolveWorkspaceSources("workspace-a", [
      "unknown-source", "foreign-source", "orphan-source",
    ])).resolves.toEqual([]);
    expect(mocks.researchWhere).toHaveBeenCalledOnce();
    expect(mocks.sourceWhere).toHaveBeenCalledOnce();
  });
});
