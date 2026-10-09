import { beforeEach, describe, expect, it, vi } from "vitest";

import { createComment } from "@/app/research/[id]/_actions/createComment";
import { createFinding } from "@/app/research/[id]/_actions/createFinding";
import { createSource } from "@/app/research/[id]/_actions/createSource";
import { createTag } from "@/app/research/[id]/_actions/createTag";
import { detachTag } from "@/app/research/[id]/_actions/detachTag";
import { updateResearchStatus } from "@/app/research/[id]/_actions/updateResearchStatus";

const mocks = vi.hoisted(() => {
  class ResearchAccessError extends Error {
    constructor() {
      super("Research access denied");
      this.name = "ResearchAccessError";
    }
  }

  const tagQuery = {
    first: vi.fn(),
  };

  const researchTagQuery = {
    first: vi.fn(),
    delete: vi.fn(),
  };

  const researchQuery = {
    update: vi.fn(),
  };

  const txTagCreate = vi.fn();
  const txResearchTagCreate = vi.fn();

  const tx = {
    orm: {
      public: {
        Tag: {
          create: txTagCreate,
        },
        ResearchTag: {
          create: txResearchTagCreate,
        },
      },
    },
  };

  return {
    ResearchAccessError,
    requireUser: vi.fn(),
    requireResearchAccess: vi.fn(),
    redirect: vi.fn(),

    commentCreate: vi.fn(),
    findingCreate: vi.fn(),
    sourceCreate: vi.fn(),

    tagWhere: vi.fn(() => tagQuery),
    tagQuery,

    researchTagWhere: vi.fn(() => researchTagQuery),
    researchTagCreate: vi.fn(),
    researchTagQuery,

    researchWhere: vi.fn(() => researchQuery),
    researchQuery,

    transaction: vi.fn(),
    tx,
    txTagCreate,
    txResearchTagCreate,
  };
});

vi.mock("@/auth/requireUser", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/auth/requireResearchAccess", () => ({
  requireResearchAccess: mocks.requireResearchAccess,
  ResearchAccessError: mocks.ResearchAccessError,
}));

vi.mock("@/prisma/db", () => ({
  db: {
    orm: {
      public: {
        Comment: {
          create: mocks.commentCreate,
        },
        Finding: {
          create: mocks.findingCreate,
        },
        Source: {
          create: mocks.sourceCreate,
        },
        Tag: {
          where: mocks.tagWhere,
        },
        ResearchTag: {
          where: mocks.researchTagWhere,
          create: mocks.researchTagCreate,
        },
        Research: {
          where: mocks.researchWhere,
        },
      },
    },
    transaction: mocks.transaction,
  },
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/inngest/request-research-index", () => ({
  requestResearchIndex: vi.fn(),
}));

const state = { error: null };
const userId = "user-id";
const researchId = "research-id";
const workspaceId = "workspace-id";
const redirectError = new Error("NEXT_REDIRECT");

function contentForm() {
  const formData = new FormData();
  formData.set("content", "Authorized content");
  return formData;
}

function sourceForm() {
  const formData = new FormData();
  formData.set("title", "Example source");
  formData.set("url", "https://example.com/source");
  return formData;
}

function tagForm() {
  const formData = new FormData();
  formData.set("name", "security");
  return formData;
}

function statusForm() {
  const formData = new FormData();
  formData.set("status", "COMPLETED");
  return formData;
}

const actions = [
  {
    name: "createComment",
    run: () => createComment(researchId, state, contentForm()),
  },
  {
    name: "createFinding",
    run: () => createFinding(researchId, state, contentForm()),
  },
  {
    name: "createSource",
    run: () => createSource(researchId, state, sourceForm()),
  },
  {
    name: "createTag",
    run: () => createTag(researchId, state, tagForm()),
  },
  {
    name: "detachTag",
    run: () => detachTag(researchId, "tag-id"),
  },
  {
    name: "updateResearchStatus",
    run: () => updateResearchStatus(researchId, state, statusForm()),
  },
];

function expectNoWrites() {
  expect(mocks.commentCreate).not.toHaveBeenCalled();
  expect(mocks.findingCreate).not.toHaveBeenCalled();
  expect(mocks.sourceCreate).not.toHaveBeenCalled();
  expect(mocks.researchTagCreate).not.toHaveBeenCalled();
  expect(mocks.researchTagQuery.delete).not.toHaveBeenCalled();
  expect(mocks.researchQuery.update).not.toHaveBeenCalled();
  expect(mocks.transaction).not.toHaveBeenCalled();
}

describe.each(actions)("$name research authorization", (action) => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireUser.mockResolvedValue({
      id: userId,
    });

    mocks.requireResearchAccess.mockResolvedValue({
      id: researchId,
      workspaceId,
    });

    mocks.redirect.mockImplementation(() => {
      throw redirectError;
    });

    mocks.tagQuery.first.mockResolvedValue({
      id: "tag-id",
      workspaceId,
      name: "security",
    });

    mocks.researchTagQuery.first.mockResolvedValue(null);

    mocks.commentCreate.mockResolvedValue({
      id: "comment-id",
      researchId,
      userId,
    });

    mocks.findingCreate.mockResolvedValue({
      id: "finding-id",
      researchId,
    });

    mocks.sourceCreate.mockResolvedValue({
      id: "source-id",
      researchId,
    });

    mocks.researchTagCreate.mockResolvedValue({
      researchId,
      tagId: "tag-id",
    });

    mocks.researchTagQuery.delete.mockResolvedValue({
      researchId,
      tagId: "tag-id",
    });

    mocks.researchQuery.update.mockResolvedValue({
      id: researchId,
      workspaceId,
      status: "COMPLETED",
    });

    mocks.transaction.mockImplementation(async (callback) =>
      callback(mocks.tx),
    );
  });

  it("blocks unauthenticated writes", async () => {
    const error = new Error("Unauthorized");
    mocks.requireUser.mockRejectedValue(error);

    await expect(action.run()).rejects.toBe(error);

    expect(mocks.requireResearchAccess).not.toHaveBeenCalled();
    expectNoWrites();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("returns research not found when research access is denied", async () => {
    mocks.requireResearchAccess.mockRejectedValue(
      new mocks.ResearchAccessError(),
    );

    await expect(action.run()).resolves.toEqual({
      error: "Research not found.",
    });

    expect(mocks.requireResearchAccess).toHaveBeenCalledWith(
      userId,
      researchId,
    );
    expectNoWrites();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("rethrows unexpected research access failures without writing", async () => {
    const error = new Error("Database unavailable");
    mocks.requireResearchAccess.mockRejectedValue(error);

    await expect(action.run()).rejects.toBe(error);

    expectNoWrites();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("authorized research writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireUser.mockResolvedValue({
      id: userId,
    });

    mocks.requireResearchAccess.mockResolvedValue({
      id: researchId,
      workspaceId,
    });

    mocks.redirect.mockImplementation(() => {
      throw redirectError;
    });

    mocks.tagQuery.first.mockResolvedValue({
      id: "tag-id",
      workspaceId,
      name: "security",
    });

    mocks.researchTagQuery.first.mockResolvedValue(null);

    mocks.commentCreate.mockResolvedValue({
      id: "comment-id",
      researchId,
      userId,
    });

    mocks.findingCreate.mockResolvedValue({
      id: "finding-id",
      researchId,
    });

    mocks.sourceCreate.mockResolvedValue({
      id: "source-id",
      researchId,
    });

    mocks.researchTagCreate.mockResolvedValue({
      researchId,
      tagId: "tag-id",
    });

    mocks.researchTagQuery.delete.mockResolvedValue({
      researchId,
      tagId: "tag-id",
    });

    mocks.researchQuery.update.mockResolvedValue({
      id: researchId,
      workspaceId,
      status: "COMPLETED",
    });
  });

  it("creates a comment with the authenticated user as author", async () => {
    await expect(createComment(researchId, state, contentForm())).rejects.toBe(
      redirectError,
    );

    expect(mocks.requireResearchAccess).toHaveBeenCalledWith(
      userId,
      researchId,
    );

    expect(mocks.commentCreate).toHaveBeenCalledWith({
      researchId,
      userId,
      content: "Authorized content",
    });

    expect(mocks.redirect).toHaveBeenCalledWith(`/research/${researchId}`);
  });

  it("creates a finding only after research access is confirmed", async () => {
    await expect(createFinding(researchId, state, contentForm())).rejects.toBe(
      redirectError,
    );

    expect(mocks.requireResearchAccess).toHaveBeenCalledWith(
      userId,
      researchId,
    );

    expect(mocks.findingCreate).toHaveBeenCalledWith({
      researchId,
      content: "Authorized content",
    });

    expect(mocks.redirect).toHaveBeenCalledWith(`/research/${researchId}`);
  });

  it("creates a source only after research access is confirmed", async () => {
    await expect(createSource(researchId, state, sourceForm())).rejects.toBe(
      redirectError,
    );

    expect(mocks.requireResearchAccess).toHaveBeenCalledWith(
      userId,
      researchId,
    );

    expect(mocks.sourceCreate).toHaveBeenCalledWith({
      researchId,
      title: "Example source",
      url: "https://example.com/source",
    });

    expect(mocks.redirect).toHaveBeenCalledWith(`/research/${researchId}`);
  });

  it("reuses a tag only from the authorized research workspace", async () => {
    await expect(createTag(researchId, state, tagForm())).rejects.toBe(
      redirectError,
    );

    expect(mocks.requireResearchAccess).toHaveBeenCalledWith(
      userId,
      researchId,
    );

    expect(mocks.tagWhere).toHaveBeenCalledWith({
      workspaceId,
      name: "security",
    });

    expect(mocks.researchTagCreate).toHaveBeenCalledWith({
      researchId,
      tagId: "tag-id",
    });

    expect(mocks.redirect).toHaveBeenCalledWith(`/research/${researchId}`);
  });

  it("detaches a tag only from the authorized research", async () => {
    mocks.researchTagQuery.first.mockResolvedValue({
      researchId,
      tagId: "tag-id",
    });

    await expect(detachTag(researchId, "tag-id")).rejects.toBe(redirectError);

    expect(mocks.requireResearchAccess).toHaveBeenCalledWith(
      userId,
      researchId,
    );

    expect(mocks.researchTagWhere).toHaveBeenCalledWith({
      researchId,
      tagId: "tag-id",
    });

    expect(mocks.researchTagQuery.delete).toHaveBeenCalledTimes(1);

    expect(mocks.redirect).toHaveBeenCalledWith(`/research/${researchId}`);
  });

  it("updates status only on the authorized research", async () => {
    await expect(
      updateResearchStatus(researchId, state, statusForm()),
    ).rejects.toBe(redirectError);

    expect(mocks.requireResearchAccess).toHaveBeenCalledWith(
      userId,
      researchId,
    );

    expect(mocks.researchWhere).toHaveBeenCalledWith({
      id: researchId,
    });

    expect(mocks.researchQuery.update).toHaveBeenCalledWith({
      status: "COMPLETED",
    });

    expect(mocks.redirect).toHaveBeenCalledWith(`/research/${researchId}`);
  });
});
