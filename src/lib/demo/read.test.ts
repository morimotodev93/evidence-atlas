import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { getDemoWorkspace, getDemoResearch } from "./read";
import { workspace, research, source, finding, comment, researchTag } from "./test-fixtures";

const mocks = vi.hoisted(() => {
  const models = Object.fromEntries(["Workspace", "Research", "Source", "Finding", "Comment", "ResearchTag"].map((name) => {
    const query = {
      first: vi.fn(), all: vi.fn(), select: vi.fn(), include: vi.fn(), orderBy: vi.fn(),
    };
    return [name, { where: vi.fn((_where: Record<string, string>) => query), query }];
  }));
  return { models };
});
vi.mock("@/prisma/db", () => ({ db: { orm: { public: mocks.models } } }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("DEMO_WORKSPACE_ID", workspace.id);
  for (const model of Object.values(mocks.models)) {
    model.where.mockReturnValue(model.query);
    model.query.select.mockReturnValue(model.query);
    model.query.orderBy.mockReturnValue(model.query);
    model.query.include.mockImplementation((_relation, callback) => {
      callback?.(model.query);
      return model.query;
    });
  }
  mocks.models.Workspace.query.first.mockResolvedValue(workspace);
  mocks.models.Research.query.first.mockResolvedValue(research);
  mocks.models.Research.query.all.mockResolvedValue([research]);
  mocks.models.Source.query.all.mockResolvedValue([source]);
  mocks.models.Finding.query.all.mockResolvedValue([finding]);
  mocks.models.Comment.query.all.mockResolvedValue([comment]);
  mocks.models.ResearchTag.query.all.mockResolvedValue([researchTag]);
});
afterEach(() => vi.unstubAllEnvs());

function expectNoChildren() {
  for (const name of ["Source", "Finding", "Comment", "ResearchTag"]) {
    expect(mocks.models[name].where).not.toHaveBeenCalled();
  }
}

describe("Public Demo Workspace boundary", () => {
  it("looks up the configured ID and returns only its Research and display fields", async () => {
    const data = await getDemoWorkspace();
    expect(mocks.models.Workspace.where).toHaveBeenCalledExactlyOnceWith({ id: workspace.id });
    expect(mocks.models.Research.where).toHaveBeenCalledExactlyOnceWith({ workspaceId: workspace.id });
    expect(data).toEqual({
      ...workspace, researches: [{
        id: research.id, title: research.title, description: research.description, status: research.status,
        createdAt: research.createdAt, tags: [{ id: researchTag.tag.id, name: researchTag.tag.name }],
      }]
    });
  });

  it.each([undefined, "", "   "])("does not read or fall back when configuration is %s", async (value) => {
    vi.stubEnv("DEMO_WORKSPACE_ID", value);
    expect(await getDemoWorkspace()).toBeNull();
    expect(await getDemoResearch(research.id)).toBeNull();
    expect(mocks.models.Workspace.where).not.toHaveBeenCalled();
    expect(mocks.models.Research.where).not.toHaveBeenCalled();
    expectNoChildren();
  });

  it.each(["unknown ID", "Workspace mismatch", "Organization mismatch"])("fails closed for %s without fallback", async (reason) => {
    mocks.models.Workspace.query.first.mockResolvedValue(reason === "unknown ID" ? null :
      reason === "Workspace mismatch" ? { ...workspace, name: "Private Workspace" } :
        { ...workspace, organization: { ...workspace.organization, name: "Private Organization" } });
    expect(await getDemoWorkspace()).toBeNull();
    expect(await getDemoResearch(research.id)).toBeNull();
    expect(mocks.models.Workspace.where).toHaveBeenCalledTimes(2);
    expect(mocks.models.Workspace.where).toHaveBeenCalledWith({ id: workspace.id });
    expect(mocks.models.Research.where).not.toHaveBeenCalled();
    expectNoChildren();
  });
});

describe("Public Demo Research boundary", () => {
  it("scopes the parent query and reads children only after it resolves", async () => {
    let parentResolved = false;
    mocks.models.Research.query.first.mockImplementation(async () => {
      expectNoChildren();
      parentResolved = true;
      return research;
    });
    for (const name of ["Source", "Finding", "Comment", "ResearchTag"]) {
      const model = mocks.models[name];
      model.where.mockImplementation(() => {
        expect(parentResolved).toBe(true);
        return model.query;
      });
    }
    const data = await getDemoResearch(research.id);
    expect(data?.research.title).toBe(research.title);
    expect(mocks.models.Research.where).toHaveBeenCalledExactlyOnceWith({
      id: research.id, workspaceId: workspace.id,
    });
    for (const name of ["Source", "Finding", "Comment", "ResearchTag"]) {
      expect(mocks.models[name].where).toHaveBeenCalledWith({ researchId: research.id });
    }
  });

  it.each(["private-research", "missing-research"])("rejects %s without loading any child data", async (id) => {
    // A real WHERE id AND workspaceId excludes the private row.
    mocks.models.Research.where.mockImplementation((where) => {
      expect(where).toEqual({ id, workspaceId: workspace.id });
      return mocks.models.Research.query;
    });
    mocks.models.Research.query.first.mockResolvedValue(null);
    expect(await getDemoResearch(id)).toBeNull();
    expectNoChildren();
  });

  it("excludes linked Sources from other Research and Tags from other Workspaces", async () => {
    mocks.models.Finding.query.all.mockResolvedValue([{
      ...finding, sources: [
        ...finding.sources,
        { sourceId: "private-source", source: { ...source, id: "private-source", researchId: "private-research", title: "Private evidence" } },
      ]
    }]);
    mocks.models.ResearchTag.query.all.mockResolvedValue([researchTag, {
      researchId: research.id, tag: { id: "private-tag", name: "Private tag", workspaceId: "private-workspace" },
    }]);
    const data = await getDemoResearch(research.id);
    expect(data?.findings[0].sources.map((link) => link.source.id)).toEqual([source.id]);
    expect(data?.tags).toEqual([{ id: researchTag.tag.id, name: researchTag.tag.name }]);
    expect((await getDemoWorkspace())?.researches[0].tags).toEqual(data?.tags);
  });

  it("returns only public Comment fields even if the database mock contains private User metadata", async () => {
    const data = await getDemoResearch(research.id);
    expect(data?.comments).toEqual([{
      id: comment.id, content: comment.content, authorName: "Demo Author",
      createdAt: comment.createdAt, updatedAt: comment.updatedAt,
    }]);
    expect(mocks.models.Comment.query.select).toHaveBeenCalledWith("name", "username");
  });

  it.each(["Workspace", "Research", "Source", "Finding", "Comment", "ResearchTag"])("propagates unexpected %s database failures", async (name) => {
    const error = new Error("Database unavailable");
    const terminal = name === "Workspace" || name === "Research" ? "first" : "all";
    mocks.models[name].query[terminal].mockRejectedValue(error);
    await expect(getDemoResearch(research.id)).rejects.toBe(error);
  });
});
