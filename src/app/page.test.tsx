import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./page";
import { setSaasLocale } from "@/lib/i18n/set-saas-locale";

const mocks = vi.hoisted(() => ({
  cookie: undefined as string | undefined,
  get: vi.fn(), set: vi.fn(), user: vi.fn(), workspace: vi.fn(), workspaces: vi.fn(),
  research: vi.fn(), source: vi.fn(), finding: vi.fn(), tag: vi.fn(), redirect: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.get, set: mocks.set }) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/auth/requireUser", () => ({ requireUser: mocks.user }));
vi.mock("@/workspace/requireCurrentWorkspace", () => ({ requireCurrentWorkspace: mocks.workspace }));
vi.mock("@/workspace/getAccessibleWorkspaces", () => ({ getAccessibleWorkspaces: mocks.workspaces }));
vi.mock("@/prisma/db", () => ({ db: { orm: { public: {
  Research: { where: mocks.research }, Source: { where: mocks.source },
  Finding: { where: mocks.finding }, Tag: { where: mocks.tag },
} } } }));
// Shell cookie propagation and interactive navigation have their own tests.
vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children, header }: { children: ReactNode; header: ReactNode }) => <>{header}{children}</>,
}));
vi.mock("@/components/workspace/workspace-selector", () => ({
  WorkspaceSelector: ({ currentWorkspaceId, workspaces, locale }: {
    currentWorkspaceId: string; workspaces: { id: string; name: string }[]; locale?: string;
  }) => <div data-workspace={currentWorkspaceId} data-selector-locale={locale}>{workspaces.map(({ id, name }) => <span key={id}>{name}</span>)}</div>,
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: ReactNode; href: string }) => createElement("a", props, children),
}));

const workspace = { id: "workspace-original", name: "Original Workspace 日本語" };
const rows = [1, 4, 2, 3].map((day) => ({
  id: `research-${day}`, title: `Original Research ${day}`, description: `Original description ${day} 原文`,
  updatedAt: { epochMilliseconds: Date.UTC(2026, 0, day, 12) },
}));
const render = async () => renderToStaticMarkup(await Home());
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("PUBLIC_DEMO_MODE", "false");
  mocks.cookie = undefined;
  mocks.get.mockImplementation(() => mocks.cookie === undefined ? undefined : { value: mocks.cookie });
  mocks.set.mockImplementation((_name: string, value: string) => { mocks.cookie = value; });
  mocks.user.mockResolvedValue({ id: "user-original" });
  mocks.workspace.mockResolvedValue(workspace);
  mocks.workspaces.mockResolvedValue([workspace, { id: "other", name: "Other Workspace" }]);
  mocks.research.mockReturnValue({ all: async () => rows });
  mocks.source.mockReturnValue({ all: async () => [
    { researchId: "research-4" }, { researchId: "research-4" }, { researchId: "research-1" },
  ] });
  mocks.finding.mockReturnValue({ all: async () => [{ researchId: "research-4" }] });
  mocks.tag.mockReturnValue({ all: async () => [{ id: "tag-1" }, { id: "tag-2" }] });
});
afterEach(() => vi.unstubAllEnvs());

describe("SaaS Dashboard localization", () => {
  it.each([undefined, "", "invalid", "ja-JP", "JA", "en"])("retains English for cookie %s", async (cookie) => {
    mocks.cookie = cookie;
    const html = await render();
    for (const text of ["Explore, organize, and build reusable knowledge from your research.",
      "Recent Research", "View all", "Workspace Summary", "Research", "Sources", "Findings", "Tags",
      "1 findings · 2 sources · Updated Jan 4, 2026"]) expect(html).toContain(text);
    expect(html).toContain('<main lang="en"');
    expect(html).toContain('data-selector-locale="en"');
    expect(mocks.get).toHaveBeenCalledWith("evidence_atlas_locale");
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("renders natural Japanese while preserving product terms and original data", async () => {
    mocks.cookie = "ja";
    const html = await render();
    for (const text of ["Researchを探索・整理し、繰り返し活用できる知識を蓄積しましょう。",
      "最近のResearch", "すべて表示", "Workspaceの概要", "Research", "Source", "Finding", "タグ",
      "Finding 1 件 · Source 2 件 · 更新日 2026年1月4日", "Finding 0 件 · Source 0 件",
      workspace.name, "Other Workspace", "Original Research 4", "Original description 4 原文"]) expect(html).toContain(text);
    expect(html).toContain('<main lang="ja"');
    expect(html).toContain('data-selector-locale="ja"');
    expect(html).toContain('data-workspace="workspace-original"');
    expect(html).not.toMatch(/リサーチ|情報源|調査結果/);
  });

  it.each(["en", "ja"])("preserves aggregation, recent ordering, links and query scopes in %s", async (locale) => {
    mocks.cookie = locale;
    const html = await render();
    expect([...html.matchAll(/href="([^"]*)"/g)].map((match) => match[1]))
      .toEqual(["/research", "/research/research-4", "/research/research-3", "/research/research-2"]);
    expect(html).not.toContain("Original Research 1");
    const summary = html.slice(html.indexOf('<section aria-labelledby="workspace-summary-heading"'));
    expect([...summary.matchAll(/text-2xl font-semibold">(\d+)/g)].map((match) => match[1]))
      .toEqual(["4", "3", "1", "2"]);
    expect(mocks.workspace).toHaveBeenCalledExactlyOnceWith("user-original");
    expect(mocks.workspaces).toHaveBeenCalledExactlyOnceWith("user-original");
    expect(mocks.research).toHaveBeenCalledExactlyOnceWith({ workspaceId: workspace.id });
    expect(mocks.tag).toHaveBeenCalledExactlyOnceWith({ workspaceId: workspace.id });
    for (const mock of [mocks.source, mocks.finding]) {
      const inIds = vi.fn();
      mock.mock.calls[0][0]({ researchId: { in: inIds } });
      expect(inIds).toHaveBeenCalledExactlyOnceWith(rows.map(({ id }) => id));
    }
    expect(rows.map(({ id }) => id)).toEqual(["research-1", "research-4", "research-2", "research-3"]);
  });

  it.each(["en", "ja"])("renders the empty Workspace and zero totals in %s", async (locale) => {
    mocks.cookie = locale;
    mocks.research.mockReturnValue({ all: async () => [] });
    mocks.tag.mockReturnValue({ all: async () => [] });
    const html = await render();
    expect(html).toContain(locale === "ja" ? "Researchはまだありません。" : "No research yet.");
    expect(html.match(/text-2xl font-semibold">0/g)).toHaveLength(4);
    expect(html).toContain('href="/research"');
    expect(mocks.source).not.toHaveBeenCalled();
    expect(mocks.finding).not.toHaveBeenCalled();
  });

  it("uses the saved cookie on the next Dashboard server render", async () => {
    expect(await render()).toContain("Recent Research");
    await setSaasLocale("ja");
    expect(await render()).toContain("最近のResearch");
    await setSaasLocale("en");
    expect(await render()).toContain("Recent Research");
    expect(mocks.set.mock.calls.map((call) => call.slice(0, 2))).toEqual([
      ["evidence_atlas_locale", "ja"], ["evidence_atlas_locale", "en"],
    ]);
  });

  it("redirects Public Demo before reading locale, auth or business data", async () => {
    vi.stubEnv("PUBLIC_DEMO_MODE", "true");
    mocks.redirect.mockImplementation(() => { throw new Error("redirect"); });
    await expect(Home()).rejects.toThrow("redirect");
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/demo");
    for (const mock of [mocks.get, mocks.user, mocks.workspace, mocks.workspaces,
      mocks.research, mocks.source, mocks.finding, mocks.tag]) expect(mock).not.toHaveBeenCalled();
  });
});
