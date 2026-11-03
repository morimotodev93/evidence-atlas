import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { research, source, finding, comment, researchTag } from "@/lib/demo/test-fixtures";
import { resolveLocale, type Locale } from "@/lib/i18n/locales";

const mocks = vi.hoisted(() => {
  const models = Object.fromEntries(["Research", "WorkspaceMembership", "Source", "Finding", "Comment", "ResearchTag"].map((name) => {
    const query = { first: vi.fn(), all: vi.fn(), include: vi.fn() };
    return [name, { where: vi.fn(() => query), query }];
  }));
  return { models, auth: vi.fn(), redirect: vi.fn(), notFound: vi.fn(), cookie: vi.fn() };
});
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.cookie }) }));
vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: (locale: Locale) => ReactNode }) => createElement("div", null, children(resolveLocale(mocks.cookie()?.value))),
}));
vi.mock("@/prisma/db", () => ({ db: { orm: { public: mocks.models } } }));
vi.mock("@/auth", () => ({ auth: mocks.auth, signOut: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/research/research-id", redirect: mocks.redirect, notFound: mocks.notFound }));
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
      [name]: (props: { locale?: Locale; researchId?: string; initialStatus?: string; sourceId?: string; title?: string; url?: string }) =>
        createElement("span", name === "EditResearchStatusDialog" ? {
          "data-status-locale": props.locale,
          "data-status-research": props.researchId,
          "data-status-initial": props.initialStatus,
        } : ["AddSourceDialog", "EditSourceDialog", "DeleteSourceDialog"].includes(name) ? {
          "data-source-control": name,
          "data-source-locale": props.locale,
          "data-research-id": props.researchId,
          "data-source-id": props.sourceId,
          "data-source-title": props.title,
          "data-source-url": props.url,
        } : null, name),
    }));
  }
  DetailPage = (await import("@/app/research/[id]/page")).default;
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.cookie.mockReturnValue(undefined);
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
  it.each([undefined, "invalid", "en", "ja"])("passes locale %s and original Source data to all Source controls", async (value) => {
    mocks.cookie.mockReturnValue(value === undefined ? undefined : { value });
    const stored = { ...source, title: "Original Paper 2026 p.12", url: "HTTPS://Example.COM/Paper%2FOriginal?ref=en#Citation" };
    mocks.models.Source.query.all.mockResolvedValue([stored]);
    const html = renderToStaticMarkup(await DetailPage({ params: Promise.resolve({ id: research.id }) }));
    const locale = value === "ja" ? "ja" : "en";
    expect(html).toContain(`data-source-control="AddSourceDialog" data-source-locale="${locale}" data-research-id="${research.id}"`);
    expect(html).toContain(`data-source-control="EditSourceDialog" data-source-locale="${locale}" data-source-id="${stored.id}" data-source-title="${stored.title}" data-source-url="${stored.url}"`);
    expect(html).toContain(`data-source-control="DeleteSourceDialog" data-source-locale="${locale}" data-source-id="${stored.id}"`);
    // The existing render-only safety helper normalizes href casing; displayed
    // text and editable values must still retain the original URL spelling.
    expect(html).toContain('href="https://example.com/Paper%2FOriginal?ref=en#Citation"');
    expect(html).toContain(`>${stored.url}</p>`);
    expect(html).toContain(stored.title);
    expect(mocks.models.Source.where).toHaveBeenCalledWith({ researchId: research.id });
  });

  it("preserves editing controls, Source linking, settings, and desktop/mobile AI", async () => {
    const html = renderToStaticMarkup(await DetailPage({ params: Promise.resolve({ id: research.id }) }));
    expect([...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((match) => match[1]))
      .toEqual(["Sources", "Findings", "Discussion", "Conclusion"]);
    expect(html.indexOf("</header>", html.indexOf("<main"))).toBeLessThan(html.indexOf("<section"));
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="AI Assistant"');
    expect(html).toMatch(/<aside[^>]*hidden=""[^>]*inert=""/);
    expect(html).not.toContain("lg:grid-cols-[minmax(0,1fr)_20rem]");
    expect(html).toContain(research.title);
    expect(html).toContain(research.conclusion);
    expect(html).toContain(comment.user.name);
    expect(html).toContain(`href="/research/${research.id}/edit"`);
    expect(html).toMatch(new RegExp(`href="/research/${research.id}/edit"[^>]*>Edit</a>`));
    expect(html).toContain("Remove");
    for (const name of Object.values(components)) expect(html).toContain(name);
    expect(mocks.models.WorkspaceMembership.where).toHaveBeenCalledWith({ userId: "user-id", workspaceId: research.workspaceId });
  });

  it("passes the cookie locale to read-only content while preserving data and controls", async () => {
    mocks.cookie.mockReturnValue({ value: "ja" });
    const html = renderToStaticMarkup(await DetailPage({ params: Promise.resolve({ id: research.id }) }));
    for (const text of ["lang=\"ja\"", "← Research一覧に戻る", "Source 2 件", "Finding 1 件", "作成日", "完了",
      research.title, research.description, research.conclusion, source.title, finding.content, comment.content,
      "EditResearchStatusDialog", "ResearchAiMobileDialog", "ResearchAiPanel", "Remove"])
      expect(html).toContain(text);
    expect(html).toContain(`href="/research/${research.id}/edit"`);
    expect(html).toMatch(new RegExp(`href="/research/${research.id}/edit"[^>]*>編集</a>`));
    expect(html).toContain(`data-status-locale="ja" data-status-research="${research.id}" data-status-initial="${research.status}"`);
    expect(research.status).toBe("COMPLETED");
    expect(mocks.models.WorkspaceMembership.where).toHaveBeenCalledWith({ userId: "user-id", workspaceId: research.workspaceId });
  });

  it("localizes empty read-only sections", async () => {
    mocks.cookie.mockReturnValue({ value: "ja" });
    mocks.models.Research.query.first.mockResolvedValue({ ...research, conclusion: null });
    for (const name of ["Source", "Finding", "Comment", "ResearchTag"]) mocks.models[name].query.all.mockResolvedValue([]);
    const html = renderToStaticMarkup(await DetailPage({ params: Promise.resolve({ id: research.id }) }));
    for (const text of ["Sourceはまだありません。", "Findingはまだありません。", "コメントはまだありません。", "結論はまだありません。", "Source 0 件"])
      expect(html).toContain(text);
  });

  it.each([undefined, "invalid", "en"])("retains English detail for cookie %s", async (value) => {
    mocks.cookie.mockReturnValue(value === undefined ? undefined : { value });
    const html = renderToStaticMarkup(await DetailPage({ params: Promise.resolve({ id: research.id }) }));
    for (const text of ["lang=\"en\"", "← Back to Research", "Completed", "Created", "2 sources"]) expect(html).toContain(text);
    expect(html).toMatch(new RegExp(`href="/research/${research.id}/edit"[^>]*>Edit</a>`));
    expect(html).toContain(`data-status-locale="en" data-status-research="${research.id}" data-status-initial="${research.status}"`);
  });

  it("still rejects unauthenticated detail requests before reading Research", async () => {
    const error = new Error("NEXT_REDIRECT");
    mocks.auth.mockResolvedValue(null);
    mocks.redirect.mockImplementation(() => { throw error; });
    await expect(DetailPage({ params: Promise.resolve({ id: research.id }) })).rejects.toBe(error);
    expect(mocks.models.Research.where).not.toHaveBeenCalled();
    expect(mocks.models.Source.where).not.toHaveBeenCalled();
  });

  it("keeps authenticated Source controls and association removal for an unsafe stored URL", async () => {
    const storedSource = { ...source, url: "ftp://example.com/legacy" };
    mocks.models.Source.query.all.mockResolvedValue([storedSource, { ...source, id: "unattached-source" }]);
    mocks.models.Finding.query.all.mockResolvedValue([
      { ...finding, sources: [{ sourceId: source.id, source: storedSource }] },
    ]);
    const html = renderToStaticMarkup(await DetailPage({ params: Promise.resolve({ id: research.id }) }));
    expect(html).toContain(storedSource.url);
    expect(html).not.toContain(`href="${storedSource.url}"`);
    expect(html).toContain("Remove");
    for (const name of ["EditSourceDialog", "DeleteSourceDialog", "ManageFindingSourcesDialog"]) {
      expect(html).toContain(name);
    }
    expect(html).toContain("Supporting sources");
    expect(html.match(/Supporting evidence/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it.each(["missing", "inaccessible"])(
    "returns notFound for %s Research before reading any detail children", async (reason) => {
      const error = new Error("NEXT_NOT_FOUND");
      mocks.notFound.mockImplementation(() => { throw error; });
      mocks.models[reason === "missing" ? "Research" : "WorkspaceMembership"].query.first.mockResolvedValue(null);

      await expect(DetailPage({ params: Promise.resolve({ id: research.id }) })).rejects.toBe(error);

      expect(mocks.notFound).toHaveBeenCalledTimes(1);
      expect(mocks.models.Research.where).toHaveBeenCalledExactlyOnceWith({ id: research.id });
      if (reason === "inaccessible") {
        expect(mocks.models.WorkspaceMembership.where).toHaveBeenCalledExactlyOnceWith({
          userId: "user-id", workspaceId: research.workspaceId,
        });
      }
      for (const name of ["Source", "Finding", "Comment", "ResearchTag"]) {
        expect(mocks.models[name].where).not.toHaveBeenCalled();
      }
    },
  );
});
