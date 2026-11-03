import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResearchPage from "./page";
import { research } from "@/lib/demo/test-fixtures";
import { formatDate } from "@/lib/date";
import { formatResearchStatus } from "@/components/research/research-list-items";
import { resolveLocale, type Locale } from "@/lib/i18n/locales";

const mocks = vi.hoisted(() => ({ get: vi.fn(), user: vi.fn(), workspace: vi.fn(), workspaces: vi.fn(), rows: vi.fn(), tags: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.get }) }));
vi.mock("@/auth/requireUser", () => ({ requireUser: mocks.user }));
vi.mock("@/workspace/requireCurrentWorkspace", () => ({ requireCurrentWorkspace: mocks.workspace }));
vi.mock("@/workspace/getAccessibleWorkspaces", () => ({ getAccessibleWorkspaces: mocks.workspaces }));
vi.mock("@/prisma/db", () => ({ db: { orm: { public: {
  Research: { where: mocks.rows }, ResearchTag: { where: mocks.tags },
} } } }));
vi.mock("@/components/layout/app-shell", () => ({ AppShell: ({ children }: { children: (locale: Locale) => ReactNode }) => <>{children(resolveLocale(mocks.get()?.value))}</> }));
vi.mock("@/components/workspace/workspace-selector", () => ({ WorkspaceSelector: () => null }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "reader" });
  mocks.workspace.mockResolvedValue({ id: research.workspaceId, name: "Original Workspace" });
  mocks.workspaces.mockResolvedValue([]);
  mocks.rows.mockReturnValue({ all: async () => [research] });
  mocks.tags.mockReturnValue({ include: () => ({ all: async () => [] }) });
});
const render = async (params = {}) => renderToStaticMarkup(await ResearchPage({ searchParams: Promise.resolve(params) }));

describe("Research read-only list localization", () => {
  it.each([undefined, "invalid", "en", "ja"])("renders data, dates, GET values and links for %s", async (value) => {
    mocks.get.mockReturnValue(value === undefined ? undefined : { value });
    const html = await render({ status: "COMPLETED", sort: "oldest" });
    const locale = value === "ja" ? "ja" : "en";
    for (const text of [research.title, research.description, "Original Workspace", formatDate(research.createdAt, locale),
      `href="/research/${research.id}"`, 'href="/research/new"', 'action="/research"', 'method="get"',
      'value="COMPLETED" selected=""', 'value="oldest" selected=""', locale === "ja" ? "新しいResearch" : "New Research"])
      expect(html).toContain(text);
    expect(html).toContain(locale === "ja" ? 'aria-label="Research一覧"' : 'aria-label="Research list"');
    expect(html).toContain(locale === "ja" ? "すべてのステータス" : "All statuses");
    expect(mocks.rows).toHaveBeenCalledWith({ workspaceId: research.workspaceId });
  });

  it.each(["en", "ja"])("distinguishes empty Workspace and filtered results in %s", async (value) => {
    mocks.get.mockReturnValue({ value });
    expect(await render({ query: "not-present" })).toContain(value === "ja" ? "該当するResearchはありません" : "No research found");
    mocks.rows.mockReturnValue({ all: async () => [] });
    expect(await render()).toContain(value === "ja" ? "Researchはまだありません" : "No research yet");
    expect(mocks.tags).toHaveBeenCalledTimes(1);
  });

  it.each(["IN_PROGRESS", "COMPLETED", "ARCHIVED"])("only translates the display of %s", (status) => {
    expect(formatResearchStatus(status, "en")).toBe({ IN_PROGRESS: "In progress", COMPLETED: "Completed", ARCHIVED: "Archived" }[status]);
    expect(formatResearchStatus(status, "ja")).toBe({ IN_PROGRESS: "調査中", COMPLETED: "完了", ARCHIVED: "アーカイブ済み" }[status]);
    expect(formatResearchStatus("UNKNOWN", "ja")).toBe("UNKNOWN");
  });
});
