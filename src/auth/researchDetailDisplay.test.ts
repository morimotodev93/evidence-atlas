import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { research, source, finding, comment, researchTag } from "@/lib/demo/test-fixtures";

const mocks = vi.hoisted(() => {
  const models = Object.fromEntries(["Research", "WorkspaceMembership", "Source", "Finding", "Comment", "ResearchTag"].map((name) => {
    const query = { first: vi.fn(), all: vi.fn(), include: vi.fn() };
    return [name, { where: vi.fn(() => query), query }];
  }));
  return { models, auth: vi.fn(), redirect: vi.fn(), notFound: vi.fn() };
});
vi.mock("@/prisma/db", () => ({ db: { orm: { public: mocks.models } } }));
vi.mock("@/auth", () => ({ auth: mocks.auth, signOut: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound }));
vi.mock("@/app/research/[id]/_actions/detachFindingSource", () => ({ detachFindingSource: vi.fn() }));

const components = {
  "add-comment-dialog": "AddCommentDialog",
  "add-finding-dialog": "AddFindingDialog",
  "add-finding-source-dialog": "ManageFindingSourcesDialog",
  "add-source-dialog": "AddSourceDialog",
  "add-tag-dialog": "AddTagDialog",
  "delete-comment-dialog": "DeleteCommentDialog",
  "delete-finding-dialog": "DeleteFindingDialog",
  "delete-source-dialog": "DeleteSourceDialog",
  "detach-tag-dialog": "DetachTagDialog",
  "edit-comment-dialog": "EditCommentDialog",
  "edit-conclusion-dialog": "EditConclusionDialog",
  "edit-finding-dialog": "EditFindingDialog",
  "edit-research-status-dialog": "EditResearchStatusDialog",
  "edit-source-dialog": "EditSourceDialog",
  "research-ai-mobile-dialog": "ResearchAiMobileDialog",
  "research-ai-panel": "ResearchAiPanel",
};
let DetailPage: typeof import("@/app/research/[id]/page").default;
beforeAll(async () => {
  // Keep real guards and shared rendering; replace interactive client dialogs only.
  for (const [file, name] of Object.entries(components)) {
    vi.doMock(`@/app/research/[id]/_components/${file}`, () => ({
      [name]: () => createElement("span", null, name),
    }));
  }
  DetailPage = (await import("@/app/research/[id]/page")).default;
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "user-id" } });
  for (const model of Object.values(mocks.models)) model.query.include.mockReturnValue(model.query);
  mocks.models.Research.query.first.mockResolvedValue(research);
  mocks.models.WorkspaceMembership.query.first.mockResolvedValue({ role: "MEMBER" });
  mocks.models.Source.query.all.mockResolvedValue([source, { ...source, id: "unattached-source" }]);
  mocks.models.Finding.query.all.mockResolvedValue([finding]);
  mocks.models.Comment.query.all.mockResolvedValue([comment]);
  mocks.models.ResearchTag.query.all.mockResolvedValue([researchTag]);
});

describe("Authenticated Research detail after display extraction", () => {
  it("preserves editing controls, Source linking, settings, and desktop/mobile AI", async () => {
    const html = renderToStaticMarkup(await DetailPage({ params: Promise.resolve({ id: research.id }) }));
    expect(html).toContain(research.title);
    expect(html).toContain(research.conclusion);
    expect(html).toContain(comment.user.name);
    expect(html).toContain(`href="/research/${research.id}/edit"`);
    expect(html).toContain('href="/settings/workspace"');
    expect(html).toContain("Sign out");
    expect(html).toContain("Remove");
    for (const name of Object.values(components)) expect(html).toContain(name);
    expect(mocks.models.WorkspaceMembership.where).toHaveBeenCalledWith({ userId: "user-id", workspaceId: research.workspaceId });
  });

  it("still rejects unauthenticated detail requests before reading Research", async () => {
    const error = new Error("NEXT_REDIRECT");
    mocks.auth.mockResolvedValue(null);
    mocks.redirect.mockImplementation(() => { throw error; });
    await expect(DetailPage({ params: Promise.resolve({ id: research.id }) })).rejects.toBe(error);
    expect(mocks.models.Research.where).not.toHaveBeenCalled();
    expect(mocks.models.Source.where).not.toHaveBeenCalled();
  });
});
