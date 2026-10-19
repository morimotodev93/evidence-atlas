import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createInitialWorkspace } from "@/app/onboarding/_actions/createInitialWorkspace";
import { createResearch } from "@/app/research/_actions/createResearch";
import { updateResearch } from "@/app/research/_actions/updateResearch";
import { updateOrganizationMemberRole } from "@/app/settings/organization/_actions/updateOrganizationMemberRole";
import { updateWorkspaceMemberRole } from "@/app/settings/workspace/_actions/updateWorkspaceMemberRole";
import { switchWorkspace } from "@/workspace/switchWorkspace";
import { attachFindingSource } from "@/app/research/[id]/_actions/attachFindingSource";
import { detachFindingSource } from "@/app/research/[id]/_actions/detachFindingSource";
import { updateSource } from "@/app/research/[id]/_actions/updateSource";
import { deleteSource } from "@/app/research/[id]/_actions/deleteSource";
import { updateFinding } from "@/app/research/[id]/_actions/updateFinding";
import { deleteFinding } from "@/app/research/[id]/_actions/deleteFinding";
import { updateComment } from "@/app/research/[id]/_actions/updateComment";
import { deleteComment } from "@/app/research/[id]/_actions/deleteComment";
import { createSource } from "@/app/research/[id]/_actions/createSource";
import { createFinding } from "@/app/research/[id]/_actions/createFinding";
import { createComment } from "@/app/research/[id]/_actions/createComment";
import { createTag } from "@/app/research/[id]/_actions/createTag";
import { updateConclusion } from "@/app/research/[id]/_actions/updateConclusion";
import { updateResearchStatus } from "@/app/research/[id]/_actions/updateResearchStatus";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), query: vi.fn(), write: vi.fn(), cookies: vi.fn(), notFound: vi.fn(), index: vi.fn(),
  refresh: vi.fn(), revalidatePath: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/prisma/db", () => ({ db: {
  transaction: mocks.write,
  orm: { public: new Proxy({}, { get: () => ({ where: mocks.query, create: mocks.write }) }) },
} }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound, redirect: vi.fn() }));
vi.mock("next/cache", () => ({ refresh: mocks.refresh, revalidatePath: mocks.revalidatePath }));
vi.mock("@/inngest/request-research-index", () => ({ requestResearchIndex: mocks.index }));

const notFoundError = new Error("NEXT_HTTP_ERROR_FALLBACK;404");
const state = { error: null };
function form() {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    title: "Research", content: "Content", url: "https://example.com", sourceId: "source-id",
    organizationName: "Organization", workspaceName: "Workspace", role: "MEMBER",
    name: "Tag", conclusion: "Conclusion", status: "COMPLETED",
  })) data.set(key, value);
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("PUBLIC_DEMO_MODE", "true");
  mocks.auth.mockResolvedValue({ user: { id: "existing-session-user" } });
  mocks.notFound.mockImplementation(() => { throw notFoundError; });
  mocks.query.mockImplementation(() => { throw new Error("Private query must not run"); });
  mocks.write.mockImplementation(() => { throw new Error("Mutation must not run"); });
});
afterEach(() => vi.unstubAllEnvs());

function expectNoSideEffects() {
  expect(mocks.auth).not.toHaveBeenCalled();
  expect(mocks.query).not.toHaveBeenCalled();
  expect(mocks.write).not.toHaveBeenCalled();
  expect(mocks.cookies).not.toHaveBeenCalled();
  expect(mocks.index).not.toHaveBeenCalled();
  expect(mocks.refresh).not.toHaveBeenCalled();
  expect(mocks.revalidatePath).not.toHaveBeenCalled();
}

describe("Direct Server Action deployment lock using real requireUser", () => {
  it.each([
    { name: "onboarding", run: () => createInitialWorkspace(state, form()) },
    { name: "Research creation", run: () => createResearch(form()) },
    { name: "Research update", run: () => updateResearch("research-id", form()) },
    { name: "Workspace switching", run: () => switchWorkspace("workspace-id") },
    { name: "Organization role update", run: () => updateOrganizationMemberRole("org-id", "user-id", state, form()) },
    { name: "Workspace role update", run: () => updateWorkspaceMemberRole("workspace-id", "user-id", state, form()) },
    { name: "Source creation", run: () => createSource("research-id", state, form()) },
    { name: "Finding creation", run: () => createFinding("research-id", state, form()) },
    { name: "Comment creation", run: () => createComment("research-id", state, form()) },
    { name: "Tag creation", run: () => createTag("research-id", state, form()) },
    { name: "Conclusion update", run: () => updateConclusion("research-id", state, form()) },
    { name: "Research status update", run: () => updateResearchStatus("research-id", state, form()) },
  ])("rejects $name even with an existing-session-shaped auth mock", async ({ run }) => {
    await expect(run()).rejects.toBe(notFoundError);
    expectNoSideEffects();
  });

  it.each([
    { name: "attachFindingSource", run: () => attachFindingSource("finding-id", state, form()) },
    { name: "detachFindingSource", run: () => detachFindingSource("finding-id", "source-id") },
    { name: "updateSource", run: () => updateSource("source-id", state, form()) },
    { name: "deleteSource", run: () => deleteSource("source-id", state) },
    { name: "updateFinding", run: () => updateFinding("finding-id", state, form()) },
    { name: "deleteFinding", run: () => deleteFinding("finding-id", state) },
    { name: "updateComment", run: () => updateComment("comment-id", state, form()) },
    { name: "deleteComment", run: () => deleteComment("comment-id", state) },
  ])("rejects $name at entry before its child lookup", async ({ run }) => {
    await expect(run()).rejects.toBe(notFoundError);
    expectNoSideEffects();
  });
});
