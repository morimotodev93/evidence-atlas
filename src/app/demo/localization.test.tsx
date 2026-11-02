import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LocalizedDemoPage from "../[locale]/demo/page";
import LocalizedResearchPage from "../[locale]/demo/research/[researchId]/page";
import LocalizedLayout from "../[locale]/demo/layout";
import { workspace, research, source, finding } from "@/lib/demo/test-fixtures";

const mocks = vi.hoisted(() => ({ readWorkspace: vi.fn(), readResearch: vi.fn() }));
vi.mock("@/lib/demo/read", () => ({ getDemoWorkspace: mocks.readWorkspace, getDemoResearch: mocks.readResearch }));
vi.mock("@/lib/demo/chat-config", () => ({ isDemoChatEnabled: () => false }));
vi.mock("next/navigation", () => ({ notFound() { throw new Error("404"); } }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: { children: ReactNode }) => createElement("a", props, children) }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.readWorkspace.mockResolvedValue({ ...workspace, researches: [{ ...research, tags: [] }] });
  mocks.readResearch.mockResolvedValue({ research, sources: [source], findings: [finding], comments: [], tags: [] });
});

describe("localized route entrypoints with offline reads", () => {
  it.each(["en", "ja"])("renders %s UI while retaining evidence and IDs", async (locale) => {
    const params = Promise.resolve({ locale, researchId: research.id });
    const list = renderToStaticMarkup(await LocalizedDemoPage({ params }));
    expect(list).toContain(`href="/${locale}/demo/research/${research.id}"`);
    const detail = await LocalizedResearchPage({ params });
    const html = renderToStaticMarkup(await LocalizedLayout({ params, children: detail }));
    expect(html).toContain(`lang="${locale}"`);
    expect(html).toContain(locale === "ja" ? "調査結果" : "Findings");
    expect(html).toContain(locale === "ja" ? "表示言語" : "Language");
    expect(html).toContain(locale === "ja" ? "閲覧専用デモ" : "Read-only demo");
    for (const text of [research.title, research.description, research.conclusion, source.title, finding.content]) expect(html).toContain(text);
    expect(html).toContain(`href="${source.url}"`);
    expect(mocks.readResearch).toHaveBeenCalledExactlyOnceWith(research.id);
    expect(html).toContain(`href="/${locale}/demo"`);
  });
  it.each(["fr", "JA", "__proto__"])("rejects %s before reading data", async (locale) => {
    const params = Promise.resolve({ locale, researchId: research.id });
    await expect(LocalizedDemoPage({ params })).rejects.toThrow("404");
    await expect(LocalizedResearchPage({ params })).rejects.toThrow("404");
    await expect(LocalizedLayout({ params, children: null })).rejects.toThrow("404");
    expect(mocks.readWorkspace).not.toHaveBeenCalled();
    expect(mocks.readResearch).not.toHaveBeenCalled();
  });
  it("retains not-found behavior for unavailable localized evidence", async () => {
    mocks.readResearch.mockResolvedValue(null);
    await expect(LocalizedResearchPage({ params: Promise.resolve({ locale: "ja", researchId: "missing" }) })).rejects.toThrow("404");
  });
});
