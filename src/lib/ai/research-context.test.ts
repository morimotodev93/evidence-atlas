import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildResearchContext } from "./research-context";

const mocks = vi.hoisted(() => ({
  researchWhere: vi.fn(), sourceWhere: vi.fn(), findingWhere: vi.fn(),
  researchFirst: vi.fn(), sourceAll: vi.fn(), findingAll: vi.fn(),
  include: vi.fn(),
}));

vi.mock("@/prisma/db", () => ({ db: { orm: { public: {
  Research: { where: mocks.researchWhere },
  Source: { where: mocks.sourceWhere },
  Finding: { where: mocks.findingWhere },
} } } }));

const linked = { id: "linked", researchId: "r1", title: "Linked", url: "https://example.invalid/linked", content: "SOURCE_BODY_PRIVATE" };
const unlinked = { ...linked, id: "unlinked", title: "Unlinked" };
const foreign = { ...linked, id: "foreign", researchId: "r2" };
const research = {
  id: "r1", workspaceId: "w1", title: "Research", description: null,
  conclusion: null, comments: [{ content: "COMMENT_PRIVATE" }],
};
const findings = [
  { id: "f1", researchId: "r1", content: "Linked observation", sources: [{ source: linked }] },
  { id: "f2", researchId: "r1", content: "Unsourced observation", sources: [] },
  { id: "foreign-finding", researchId: "r2", content: "FOREIGN_PRIVATE", sources: [] },
];

beforeEach(() => {
  vi.resetAllMocks();
  mocks.researchWhere.mockReturnValue({ first: mocks.researchFirst });
  mocks.researchFirst.mockResolvedValue(research);
  mocks.sourceWhere.mockImplementation(({ researchId }) => ({
    all: () => mocks.sourceAll(researchId),
  }));
  mocks.sourceAll.mockImplementation(async (researchId) => [linked, unlinked, foreign].filter((row) => row.researchId === researchId));
  mocks.findingWhere.mockImplementation(({ researchId }) => ({
    include: (name: string, callback: (query: { include: typeof mocks.include }) => unknown) => {
      expect(name).toBe("sources");
      callback({ include: mocks.include });
      return { all: () => mocks.findingAll(researchId) };
    },
  }));
  mocks.findingAll.mockImplementation(async (researchId) => findings.filter((row) => row.researchId === researchId));
});

describe("buildResearchContext with offline DB rows", () => {
  it("returns null for a missing Research before reading child records", async () => {
    mocks.researchFirst.mockResolvedValueOnce(null);
    await expect(buildResearchContext("missing")).resolves.toBeNull();
    expect(mocks.researchWhere).toHaveBeenCalledExactlyOnceWith({ id: "missing" });
    expect(mocks.sourceWhere).not.toHaveBeenCalled();
    expect(mocks.findingWhere).not.toHaveBeenCalled();
  });

  it("selects linked and unlinked metadata without Source bodies, Comments, or other Research rows", async () => {
    const metadata = ({ id, title, url }: typeof linked) => ({ id, title, url });
    const context = await buildResearchContext("r1");
    expect(context).toEqual({
      research: { id: "r1", workspaceId: "w1", title: "Research", description: null, conclusion: null },
      findings: [
        { id: "f1", content: "Linked observation", sources: [metadata(linked)] },
        { id: "f2", content: "Unsourced observation", sources: [] },
      ],
      sources: [metadata(linked), metadata(unlinked)],
    });
    expect(mocks.researchWhere).toHaveBeenCalledExactlyOnceWith({ id: "r1" });
    expect(mocks.sourceWhere).toHaveBeenCalledExactlyOnceWith({ researchId: "r1" });
    expect(mocks.findingWhere).toHaveBeenCalledExactlyOnceWith({ researchId: "r1" });
    expect(mocks.include).toHaveBeenCalledExactlyOnceWith("source");
    expect(JSON.stringify(context)).not.toMatch(/PRIVATE|foreign|comments|researchId/);
  });

  it("keeps a non-null Conclusion and empty child collections", async () => {
    mocks.researchFirst.mockResolvedValueOnce({ ...research, description: "Description", conclusion: "Conclusion" });
    mocks.sourceAll.mockResolvedValueOnce([]);
    mocks.findingAll.mockResolvedValueOnce([]);
    await expect(buildResearchContext("r1")).resolves.toEqual({
      research: { id: "r1", workspaceId: "w1", title: "Research", description: "Description", conclusion: "Conclusion" },
      findings: [], sources: [],
    });
  });

  it.each(["researchFirst", "sourceAll", "findingAll"] as const)("propagates %s failures instead of returning an empty successful context", async (stage) => {
    const error = new Error("Synthetic DB read failure");
    mocks[stage].mockRejectedValueOnce(error);
    await expect(buildResearchContext("r1")).rejects.toBe(error);
    if (stage === "researchFirst") expect(mocks.sourceWhere).not.toHaveBeenCalled();
    if (stage !== "findingAll") expect(mocks.findingWhere).not.toHaveBeenCalled();
  });
});
