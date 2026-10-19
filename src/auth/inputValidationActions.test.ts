import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createResearch } from "@/app/research/_actions/createResearch";
import { updateResearch } from "@/app/research/_actions/updateResearch";
import { createSource } from "@/app/research/[id]/_actions/createSource";
import { updateSource } from "@/app/research/[id]/_actions/updateSource";
import { createFinding } from "@/app/research/[id]/_actions/createFinding";
import { updateFinding } from "@/app/research/[id]/_actions/updateFinding";
import { createComment } from "@/app/research/[id]/_actions/createComment";
import { updateComment } from "@/app/research/[id]/_actions/updateComment";
import { createTag } from "@/app/research/[id]/_actions/createTag";
import { updateConclusion } from "@/app/research/[id]/_actions/updateConclusion";
import { updateResearchStatus } from "@/app/research/[id]/_actions/updateResearchStatus";

const mocks = vi.hoisted(() => {
  function model() {
    const query = { first: vi.fn(), update: vi.fn(), delete: vi.fn() };
    return { where: vi.fn(() => query), create: vi.fn(), query };
  }
  return {
    models: {
      Research: model(), WorkspaceMembership: model(), Source: model(),
      Finding: model(), Comment: model(), Tag: model(), ResearchTag: model(),
    },
    auth: vi.fn(), currentWorkspace: vi.fn(), transaction: vi.fn(),
    index: vi.fn(), redirect: vi.fn(), notFound: vi.fn(),
  };
});

// Keep requireUser and the Research/Workspace access guards real. Mock every
// external boundary so these direct calls cannot open a DB or enqueue a job.
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/prisma/db", () => ({
  db: { orm: { public: mocks.models }, transaction: mocks.transaction },
}));
vi.mock("@/workspace/requireCurrentWorkspace", () => ({ requireCurrentWorkspace: mocks.currentWorkspace }));
vi.mock("@/inngest/request-research-index", () => ({ requestResearchIndex: mocks.index }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound }));

const state = { error: null };
const researchId = "research-id";
const workspaceId = "workspace-id";
const userId = "user-id";
const redirectError = new Error("NEXT_REDIRECT");

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("PUBLIC_DEMO_MODE", "false");
  mocks.auth.mockResolvedValue({ user: { id: userId } });
  mocks.currentWorkspace.mockResolvedValue({ id: workspaceId });
  mocks.redirect.mockImplementation(() => { throw redirectError; });
  mocks.notFound.mockImplementation(() => { throw new Error("Unexpected Demo refusal"); });
  mocks.index.mockResolvedValue(undefined);
  for (const [name, model] of Object.entries(mocks.models)) {
    model.where.mockReturnValue(model.query);
    const record = { id: `${name.toLowerCase()}-id`, researchId, workspaceId };
    model.query.first.mockResolvedValue(record);
    model.query.update.mockResolvedValue(record);
    model.create.mockResolvedValue(record);
  }
  mocks.models.Tag.query.first.mockResolvedValue(null);
  mocks.transaction.mockImplementation(async (callback) => callback({ orm: { public: mocks.models } }));
});
afterEach(() => vi.unstubAllEnvs());

function expectNoWrites() {
  for (const model of Object.values(mocks.models)) {
    expect(model.create).not.toHaveBeenCalled();
    expect(model.query.update).not.toHaveBeenCalled();
    expect(model.query.delete).not.toHaveBeenCalled();
  }
  expect(mocks.transaction).not.toHaveBeenCalled();
  expect(mocks.index).not.toHaveBeenCalled();
  expect(mocks.redirect).not.toHaveBeenCalled();
}

const researchValues = { title: " Research ", description: " \tdescription\r\nnext \t" };
const sourceValues = { title: " Source ", url: " \tHTTPS://EXAMPLE.COM:443/path \r\n" };
const contentValues = { content: " \r\nfirst\r\nsecond\rthird\nlast \t" };
const normalizedContent = "first\nsecond\nthird\nlast";
const actions = [
  {
    name: "createResearch", run: createResearch, values: researchValues,
    invalid: { ...researchValues, title: "x".repeat(201) },
    error: "Title must be 200 characters or less.", throws: true,
    model: "Research", operation: "create", indexed: true,
    payload: { workspaceId, createdById: userId, title: "Research", description: "description\r\nnext" },
  },
  {
    name: "updateResearch", run: (data: FormData) => updateResearch(researchId, data), values: researchValues,
    invalid: { ...researchValues, description: "x".repeat(2001) },
    error: "Description must be 2000 characters or less.", throws: true,
    model: "Research", operation: "update", indexed: true,
    payload: { title: "Research", description: "description\r\nnext" },
  },
  {
    name: "createSource", run: (data: FormData) => createSource(researchId, state, data), values: sourceValues,
    invalid: { ...sourceValues, url: "not a URL" }, error: "Please enter a valid URL", throws: false,
    model: "Source", operation: "create", indexed: false,
    payload: { researchId, title: "Source", url: "HTTPS://EXAMPLE.COM:443/path" },
    saveError: "Failed to add source. Please try again.",
  },
  {
    name: "updateSource", run: (data: FormData) => updateSource("source-id", state, data), values: sourceValues,
    invalid: { ...sourceValues, title: " " }, error: "Title is required", throws: false,
    model: "Source", operation: "update", indexed: false,
    payload: { title: "Source", url: "HTTPS://EXAMPLE.COM:443/path" },
    saveError: "Failed to update source. Please try again.",
  },
  {
    name: "createFinding", run: (data: FormData) => createFinding(researchId, state, data), values: contentValues,
    invalid: { content: " " }, error: "Content is required", throws: false,
    model: "Finding", operation: "create", indexed: true,
    payload: { researchId, content: normalizedContent }, saveError: "Failed to add finding. Please try again.",
  },
  {
    name: "updateFinding", run: (data: FormData) => updateFinding("finding-id", state, data), values: contentValues,
    invalid: { content: "x".repeat(10001) }, error: "Content must be 10000 characters or less", throws: false,
    model: "Finding", operation: "update", indexed: true,
    payload: { content: normalizedContent }, saveError: "Failed to update finding. Please try again.",
  },
  {
    name: "createComment", run: (data: FormData) => createComment(researchId, state, data), values: contentValues,
    invalid: { content: "x".repeat(5001) }, error: "Comment must be 5000 characters or less.", throws: false,
    model: "Comment", operation: "create", indexed: false,
    payload: { researchId, userId, content: normalizedContent }, saveError: "Failed to add comment. Please try again.",
  },
  {
    name: "updateComment", run: (data: FormData) => updateComment("comment-id", state, data), values: contentValues,
    invalid: { content: "\r\n\t" }, error: "Comment is required.", throws: false,
    model: "Comment", operation: "update", indexed: false,
    payload: { content: normalizedContent }, saveError: "Failed to update comment. Please try again.",
  },
  {
    name: "createTag", run: (data: FormData) => createTag(researchId, state, data), values: { name: " tag " },
    invalid: { name: "x".repeat(51) }, error: "Tag must be 50 characters or less", throws: false,
    model: "Tag", operation: "create", indexed: false,
    payload: { workspaceId, name: "tag" }, saveError: "Failed to attach tag. Please try again.",
  },
  {
    name: "updateConclusion", run: (data: FormData) => updateConclusion(researchId, state, data),
    values: { conclusion: contentValues.content }, invalid: { conclusion: "x".repeat(5001) },
    error: "Conclusion must be 5000 characters or less", throws: false,
    model: "Research", operation: "update", indexed: true,
    payload: { conclusion: normalizedContent },
  },
  {
    name: "updateResearchStatus", run: (data: FormData) => updateResearchStatus(researchId, state, data),
    values: { status: "ARCHIVED" }, invalid: { status: " COMPLETED " },
    error: "Invalid research status.", throws: false,
    model: "Research", operation: "update", indexed: false,
    payload: { status: "ARCHIVED" }, saveError: "Failed to update research status. Please try again.",
  },
] as const;

describe.each(actions)("$name input boundary", (action) => {
  const model = mocks.models[action.model];
  const save = action.operation === "create" ? model.create : model.query.update;

  it("rejects invalid input with its existing error contract before auth or DB access", async () => {
    const result = action.run(form(action.invalid));
    if (action.throws) await expect(result).rejects.toThrow(action.error);
    else await expect(result).resolves.toEqual({ error: action.error });

    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.currentWorkspace).not.toHaveBeenCalled();
    for (const item of Object.values(mocks.models)) expect(item.where).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it("passes normalized data to persistence after authorization and then redirects", async () => {
    save.mockImplementationOnce(async () => {
      expect(mocks.auth).toHaveBeenCalledTimes(1);
      if (action.name === "createResearch") {
        expect(mocks.currentWorkspace).toHaveBeenCalledWith(userId);
      } else {
        expect(mocks.models.WorkspaceMembership.where).toHaveBeenCalledWith({ userId, workspaceId });
      }
      expect(mocks.index).not.toHaveBeenCalled();
      expect(mocks.redirect).not.toHaveBeenCalled();
      return { id: `${action.model.toLowerCase()}-id` };
    });

    await expect(action.run(form(action.values))).rejects.toBe(redirectError);

    expect(save).toHaveBeenCalledExactlyOnceWith(action.payload);
    if (action.operation === "update") {
      expect(model.where).toHaveBeenLastCalledWith({ id: `${action.model.toLowerCase()}-id` });
    }
    if (action.name === "createTag") {
      expect(mocks.models.Tag.where).toHaveBeenCalledWith({ workspaceId, name: "tag" });
      expect(mocks.transaction).toHaveBeenCalledTimes(1);
      expect(mocks.models.ResearchTag.create).toHaveBeenCalledExactlyOnceWith({ researchId, tagId: "tag-id" });
    }
    if (action.indexed) expect(mocks.index).toHaveBeenCalledExactlyOnceWith(researchId);
    else expect(mocks.index).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith(`/research/${researchId}`);
  });

  it("retains the save-error return/exception contract without indexing or redirect", async () => {
    const error = new Error("Database unavailable");
    save.mockRejectedValueOnce(error);

    const result = action.run(form(action.values));
    if ("saveError" in action) await expect(result).resolves.toEqual({ error: action.saveError });
    else await expect(result).rejects.toBe(error);

    expect(mocks.index).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
    if (action.name === "createTag") expect(mocks.models.ResearchTag.create).not.toHaveBeenCalled();
  });
});

describe.each([
  { name: "createSource", run: (data: FormData) => createSource(researchId, state, data), save: mocks.models.Source.create },
  { name: "updateSource", run: (data: FormData) => updateSource("source-id", state, data), save: mocks.models.Source.query.update },
])("$name URL protocol boundary", ({ name, run, save }) => {
  it.each([
    "javascript:alert(1)", "data:text/html,...", "file:///example.txt",
    "ftp://example.com/file", "mailto:person@example.com", "tel:+81312345678",
  ])("rejects %s before auth or private queries without effects", async (url) => {
    await expect(run(form({ title: "Source", url }))).resolves.toEqual({
      error: "Please enter a valid URL",
    });
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.currentWorkspace).not.toHaveBeenCalled();
    for (const model of Object.values(mocks.models)) {
      expect(model.where).not.toHaveBeenCalled();
      expect(model.query.first).not.toHaveBeenCalled();
    }
    expect(mocks.notFound).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it.each(["https://example.com", "http://example.com", "http://localhost:3000"])(
    "persists %s after authorization and redirects without indexing", async (url) => {
      save.mockImplementationOnce(async () => {
        expect(mocks.auth).toHaveBeenCalledTimes(1);
        expect(mocks.models.Research.where).toHaveBeenCalledWith({ id: researchId });
        expect(mocks.models.WorkspaceMembership.where).toHaveBeenCalledWith({ userId, workspaceId });
        expect(mocks.redirect).not.toHaveBeenCalled();
        return { id: "source-id" };
      });
      await expect(run(form({ title: " Source ", url: ` \t${url}\r\n ` }))).rejects.toBe(redirectError);
      expect(save).toHaveBeenCalledExactlyOnceWith({
        ...(name === "createSource" ? { researchId } : {}), title: "Source", url,
      });
      if (name === "updateSource") {
        expect(mocks.models.Source.where).toHaveBeenLastCalledWith({ id: "source-id" });
      }
      expect(mocks.index).not.toHaveBeenCalled();
      expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith(`/research/${researchId}`);
    },
  );

  it.each(["https://example.com", "javascript:alert(1)"])(
    "retains the Public Demo guard/validation order for %s", async (url) => {
      vi.stubEnv("PUBLIC_DEMO_MODE", "true");
      const result = run(form({ title: "Source", url }));
      if (name === "createSource" && url.startsWith("javascript:")) {
        await expect(result).resolves.toEqual({ error: "Please enter a valid URL" });
        expect(mocks.notFound).not.toHaveBeenCalled();
      } else {
        await expect(result).rejects.toThrow("Unexpected Demo refusal");
        expect(mocks.notFound).toHaveBeenCalledTimes(1);
      }
      expect(mocks.auth).not.toHaveBeenCalled();
      expect(mocks.currentWorkspace).not.toHaveBeenCalled();
      for (const model of Object.values(mocks.models)) {
        expect(model.where).not.toHaveBeenCalled();
        expect(model.query.first).not.toHaveBeenCalled();
      }
      expectNoWrites();
    },
  );
});

describe.each([
  { name: "createResearch", run: createResearch, save: mocks.models.Research.create },
  { name: "updateResearch", run: (data: FormData) => updateResearch(researchId, data), save: mocks.models.Research.query.update },
])("$name optional description", ({ run, save }) => {
  it.each([undefined, "", " \t\r\n "])("stores %j as null", async (description) => {
    const data = form({ title: " Research " });
    if (description !== undefined) data.set("description", description);
    await expect(run(data)).rejects.toBe(redirectError);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ title: "Research", description: null }));
  });
});

it.each([undefined, "", " \t\r\n "])("clears Conclusion input %j to null", async (conclusion) => {
  const data = new FormData();
  if (conclusion !== undefined) data.set("conclusion", conclusion);
  await expect(updateConclusion(researchId, state, data)).rejects.toBe(redirectError);
  expect(mocks.models.Research.query.update).toHaveBeenCalledExactlyOnceWith({ conclusion: null });
  expect(mocks.index).toHaveBeenCalledExactlyOnceWith(researchId);
});

it.each([
  { name: "Finding", run: (data: FormData) => createFinding(researchId, state, data), max: 10000 },
  { name: "Comment", run: (data: FormData) => createComment(researchId, state, data), max: 5000 },
  { name: "Conclusion", run: (data: FormData) => updateConclusion(researchId, state, data), max: 5000 },
] as const)("normalizes CRLF before the $name length check", async ({ name, run, max }) => {
  const value = "x".repeat(max - 2) + "\r\ny";
  expect(value.length).toBe(max + 1);
  const field = name === "Conclusion" ? "conclusion" : "content";
  await expect(run(form({ [field]: value }))).rejects.toBe(redirectError);
  const model = mocks.models[name === "Conclusion" ? "Research" : name];
  const save = name === "Conclusion" ? model.query.update : model.create;
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ [field]: "x".repeat(max - 2) + "\ny" }));
});

it("rejects a missing Research title before auth or writes", async () => {
  await expect(createResearch(new FormData())).rejects.toThrow("Title is required.");
  expect(mocks.auth).not.toHaveBeenCalled();
  expectNoWrites();
});

it("rejects a File-valued Source URL after the existing FormData string coercion", async () => {
  const data = form({ title: "Source" });
  data.set("url", new File(["https://example.com"], "url.txt"));
  await expect(createSource(researchId, state, data)).resolves.toEqual({ error: "Please enter a valid URL" });
  expect(mocks.auth).not.toHaveBeenCalled();
  expectNoWrites();
});

it("retains the unauthenticated Research creation redirect before Workspace lookup", async () => {
  mocks.auth.mockResolvedValue(null);
  await expect(createResearch(form(researchValues))).rejects.toBe(redirectError);
  expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/api/auth/signin");
  expect(mocks.currentWorkspace).not.toHaveBeenCalled();
  for (const model of Object.values(mocks.models)) expect(model.create).not.toHaveBeenCalled();
  expect(mocks.index).not.toHaveBeenCalled();
});

it("propagates a Research creation Workspace selection failure without effects", async () => {
  const error = new Error("Workspace unavailable");
  mocks.currentWorkspace.mockRejectedValue(error);
  await expect(createResearch(form(researchValues))).rejects.toBe(error);
  expectNoWrites();
});
