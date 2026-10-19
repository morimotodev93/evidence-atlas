import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { attachFindingSource } from "@/app/research/[id]/_actions/attachFindingSource";
import { detachFindingSource } from "@/app/research/[id]/_actions/detachFindingSource";
import { detachTag } from "@/app/research/[id]/_actions/detachTag";
import { updateSource } from "@/app/research/[id]/_actions/updateSource";
import { deleteSource } from "@/app/research/[id]/_actions/deleteSource";
import { updateFinding } from "@/app/research/[id]/_actions/updateFinding";
import { deleteFinding } from "@/app/research/[id]/_actions/deleteFinding";
import { updateComment } from "@/app/research/[id]/_actions/updateComment";
import { deleteComment } from "@/app/research/[id]/_actions/deleteComment";

const mocks = vi.hoisted(() => {
  function model() {
    const query = { first: vi.fn(), update: vi.fn(), delete: vi.fn() };
    return { where: vi.fn(() => query), create: vi.fn(), query };
  }
  return {
    models: { Research: model(), WorkspaceMembership: model(), Source: model(),
      Finding: model(), Comment: model(), FindingSource: model(), ResearchTag: model() },
    auth: vi.fn(), redirect: vi.fn(), notFound: vi.fn(), index: vi.fn(),
  };
});
// Real requireUser/requireResearchAccess/requireWorkspaceAccess, synthetic I/O.
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/prisma/db", () => ({ db: { orm: { public: mocks.models } } }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound }));
vi.mock("@/inngest/request-research-index", () => ({ requestResearchIndex: mocks.index }));

const state = { error: null };
const redirectError = new Error("NEXT_REDIRECT");
function form() {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    title: "Source", url: "https://example.test", content: "Content", sourceId: "source-id",
  })) data.set(key, value);
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("PUBLIC_DEMO_MODE", "false");
  mocks.auth.mockResolvedValue({ user: { id: "user-id" } });
  mocks.redirect.mockImplementation(() => { throw redirectError; });
  for (const [name, model] of Object.entries(mocks.models)) {
    model.where.mockReturnValue(model.query);
    model.query.first.mockResolvedValue({ id: `${name.toLowerCase()}-id`, researchId: "research-id" });
  }
  mocks.models.Research.query.first.mockResolvedValue({ id: "research-id", workspaceId: "workspace-id" });
  mocks.models.WorkspaceMembership.query.first.mockResolvedValue({ role: "MEMBER" });
});
afterEach(() => vi.unstubAllEnvs());
function expectNoEffects() {
  for (const model of Object.values(mocks.models)) {
    expect(model.create).not.toHaveBeenCalled();
    expect(model.query.update).not.toHaveBeenCalled();
    expect(model.query.delete).not.toHaveBeenCalled();
  }
  expect(mocks.index).not.toHaveBeenCalled();
  expect(mocks.redirect).not.toHaveBeenCalled();
}

const childActions = [
  { name: "updateSource", model: "Source", run: () => updateSource("source-id", state, form()), throws: false },
  { name: "deleteSource", model: "Source", run: () => deleteSource("source-id", state), throws: false },
  { name: "updateFinding", model: "Finding", run: () => updateFinding("finding-id", state, form()), throws: false },
  { name: "deleteFinding", model: "Finding", run: () => deleteFinding("finding-id", state), throws: false },
  { name: "updateComment", model: "Comment", run: () => updateComment("comment-id", state, form()), throws: false },
  { name: "deleteComment", model: "Comment", run: () => deleteComment("comment-id", state), throws: false },
  { name: "attachFindingSource", model: "Finding", run: () => attachFindingSource("finding-id", state, form()), throws: false },
  { name: "detachFindingSource", model: "Finding", run: () => detachFindingSource("finding-id", "source-id"), throws: true },
] as const;
it.each(childActions)("preserves $name's missing-child contract without effects", async (action) => {
  mocks.models[action.model].query.first.mockResolvedValue(null);
  if (action.throws) await expect(action.run()).rejects.toThrow(`${action.model} not found.`);
  else await expect(action.run()).resolves.toEqual({ error: `${action.model} not found.` });
  expect(mocks.models[action.model].where).toHaveBeenCalledExactlyOnceWith({ id: `${action.model.toLowerCase()}-id` });
  expect(mocks.models.Research.where).not.toHaveBeenCalled();
  expect(mocks.models.WorkspaceMembership.where).not.toHaveBeenCalled();
  expectNoEffects();
});

describe("Finding–Source membership after real Research authorization", () => {
  it.each(["missing", "different Research"])("rejects a %s Source without attaching it", async (reason) => {
    mocks.models.Source.query.first.mockResolvedValue(reason === "missing"
      ? null : { id: "source-id", researchId: "other-research" });
    await expect(attachFindingSource("finding-id", state, form())).resolves.toEqual({
      error: reason === "missing" ? "Source not found." : "Source does not belong to this research.",
    });
    expect(mocks.models.WorkspaceMembership.where).toHaveBeenCalledExactlyOnceWith({ userId: "user-id", workspaceId: "workspace-id" });
    expectNoEffects();
  });

  it("attaches only the requested pair after a MEMBER's real guard succeeds", async () => {
    await expect(attachFindingSource("finding-id", state, form())).rejects.toBe(redirectError);
    expect(mocks.models.WorkspaceMembership.where).toHaveBeenCalledExactlyOnceWith({ userId: "user-id", workspaceId: "workspace-id" });
    expect(mocks.models.FindingSource.create).toHaveBeenCalledExactlyOnceWith({ findingId: "finding-id", sourceId: "source-id" });
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/research/research-id");
    expect(mocks.index).not.toHaveBeenCalled();
  });

  it("rejects a missing supporting pair instead of deleting another association", async () => {
    mocks.models.FindingSource.query.first.mockResolvedValue(null);
    await expect(detachFindingSource("finding-id", "source-id")).rejects.toThrow("Supporting source not found.");
    expect(mocks.models.FindingSource.where).toHaveBeenCalledExactlyOnceWith({ findingId: "finding-id", sourceId: "source-id" });
    expectNoEffects();
  });
});

it("does not detach an absent Research–Tag pair", async () => {
  mocks.models.ResearchTag.query.first.mockResolvedValue(null);
  await expect(detachTag("research-id", "tag-id")).resolves.toEqual({ error: "Tag is not attached to this research." });
  expect(mocks.models.WorkspaceMembership.where).toHaveBeenCalledExactlyOnceWith({ userId: "user-id", workspaceId: "workspace-id" });
  expect(mocks.models.ResearchTag.where).toHaveBeenCalledExactlyOnceWith({ researchId: "research-id", tagId: "tag-id" });
  expectNoEffects();
});
