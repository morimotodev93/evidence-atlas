import { beforeEach, describe, expect, it, vi } from "vitest";

import { attachFindingSource } from "@/app/research/[id]/_actions/attachFindingSource";
import { deleteComment } from "@/app/research/[id]/_actions/deleteComment";
import { deleteFinding } from "@/app/research/[id]/_actions/deleteFinding";
import { deleteSource } from "@/app/research/[id]/_actions/deleteSource";
import { detachFindingSource } from "@/app/research/[id]/_actions/detachFindingSource";
import { updateComment } from "@/app/research/[id]/_actions/updateComment";
import { updateConclusion } from "@/app/research/[id]/_actions/updateConclusion";
import { updateFinding } from "@/app/research/[id]/_actions/updateFinding";
import { updateSource } from "@/app/research/[id]/_actions/updateSource";
import { updateResearch } from "@/app/research/_actions/updateResearch";

const mocks = vi.hoisted(() => {
  const write = vi.fn();
  const models = Object.fromEntries(
    [
      "Research",
      "WorkspaceMembership",
      "Comment",
      "Finding",
      "Source",
      "FindingSource",
    ].map((name) => {
      const query = { first: vi.fn(), update: write, delete: write };
      return [name, { where: vi.fn(() => query), create: write, query }];
    }),
  );
  return { models, write, requireUser: vi.fn(), redirect: vi.fn() };
});

vi.mock("@/prisma/db", () => ({ db: { orm: { public: mocks.models } } }));
vi.mock("@/auth/requireUser", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

vi.mock("@/inngest/request-research-index", () => ({
  requestResearchIndex: vi.fn(),
}));

function form() {
  const data = new FormData();
  data.set("title", "Updated title");
  data.set("content", "Updated content");
  data.set("conclusion", "Updated conclusion");
  data.set("url", "https://example.com/source");
  data.set("sourceId", "source-id");
  return data;
}

const state = { error: null };
const actions = [
  {
    name: "updateResearch",
    throws: true,
    run: () => updateResearch("research-id", form()),
  },
  {
    name: "updateConclusion",
    throws: false,
    run: () => updateConclusion("research-id", state, form()),
  },
  {
    name: "updateComment",
    throws: false,
    run: () => updateComment("comment-id", state, form()),
  },
  {
    name: "deleteComment",
    throws: false,
    run: () => deleteComment("comment-id", state),
  },
  {
    name: "updateFinding",
    throws: false,
    run: () => updateFinding("finding-id", state, form()),
  },
  {
    name: "deleteFinding",
    throws: false,
    run: () => deleteFinding("finding-id", state),
  },
  {
    name: "updateSource",
    throws: false,
    run: () => updateSource("source-id", state, form()),
  },
  {
    name: "deleteSource",
    throws: false,
    run: () => deleteSource("source-id", state),
  },
  {
    name: "attachFindingSource",
    throws: false,
    run: () => attachFindingSource("finding-id", state, form()),
  },
  {
    name: "detachFindingSource",
    throws: true,
    run: () => detachFindingSource("finding-id", "source-id"),
  },
];

describe.each(actions)("$name access control", (action) => {
  const redirectError = new Error("NEXT_REDIRECT");

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-id" });
    mocks.models.Research.query.first.mockResolvedValue({
      id: "research-id",
      workspaceId: "workspace-id",
    });
    mocks.models.WorkspaceMembership.query.first.mockResolvedValue({
      userId: "user-id",
      workspaceId: "workspace-id",
    });
    for (const name of ["Comment", "Finding", "Source", "FindingSource"]) {
      mocks.models[name].query.first.mockResolvedValue({
        id: `${name.toLowerCase()}-id`,
        researchId: "research-id",
      });
    }
    mocks.write.mockResolvedValue({ id: "research-id" });
    mocks.redirect.mockImplementation(() => {
      throw redirectError;
    });
  });

  it.each(["missing research", "non-member"])(
    "blocks writes for %s",
    async (reason) => {
      const model =
        reason === "missing research" ? "Research" : "WorkspaceMembership";
      mocks.models[model].query.first.mockResolvedValue(null);

      if (action.throws) {
        await expect(action.run()).rejects.toThrow("Research not found.");
      } else {
        await expect(action.run()).resolves.toEqual({
          error: "Research not found.",
        });
      }

      expect(mocks.write).not.toHaveBeenCalled();
      expect(mocks.redirect).not.toHaveBeenCalled();
    },
  );

  it("blocks unauthenticated writes", async () => {
    const error = new Error("Unauthorized");
    mocks.requireUser.mockRejectedValue(error);
    await expect(action.run()).rejects.toBe(error);
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it("rethrows unexpected workspace membership lookup failures without writing", async () => {
    const error = new Error("Database unavailable");

    mocks.models.WorkspaceMembership.query.first.mockRejectedValue(error);

    await expect(action.run()).rejects.toBe(error);

    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("writes and redirects after confirming workspace membership", async () => {
    mocks.write.mockImplementation(async () => {
      expect(mocks.models.WorkspaceMembership.where).toHaveBeenCalledWith({
        userId: "user-id",
        workspaceId: "workspace-id",
      });
      return { id: "research-id" };
    });

    await expect(action.run()).rejects.toBe(redirectError);
    expect(mocks.models.Research.where).toHaveBeenCalledWith({
      id: "research-id",
    });
    expect(mocks.write).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith("/research/research-id");
  });
});
