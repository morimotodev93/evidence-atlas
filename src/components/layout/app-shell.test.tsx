import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";
import { DemoShell } from "@/components/demo/demo-shell";

const mocks = vi.hoisted(() => ({ cookies: vi.fn(), get: vi.fn(), pathname: "/" }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));

vi.mock("@/auth", () => ({ signOut: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
// Expose the mobile tree to compare its locale with the desktop tree. Real
// portal, focus and dismissal behavior is outside this static-markup test.
vi.mock("@base-ui/react/dialog", () => ({ Dialog: {
  Root: "dialog-root", Trigger: "button", Portal: "dialog-portal", Backdrop: "dialog-backdrop",
  Popup: "dialog-popup", Title: "h2", Close: "dialog-close",
} }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: ReactNode; href: string }) => createElement("a", props, children),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cookies.mockResolvedValue({ get: mocks.get });
  mocks.get.mockReturnValue(undefined);
  mocks.pathname = "/";
});

describe("Authenticated application shell", () => {
  it.each([
    [undefined, "en"], ["invalid", "en"], ["en", "en"], ["ja", "ja"],
  ])("resolves cookie %s once for the server body slot and navigation", async (value, expected) => {
    mocks.get.mockReturnValue(value === undefined ? undefined : { value });
    const body = vi.fn((locale) => <main lang={locale}>Original Organization</main>);
    const html = renderToStaticMarkup(await AppShell({ children: body }));
    expect(body).toHaveBeenCalledExactlyOnceWith(expected);
    expect(mocks.get).toHaveBeenCalledExactlyOnceWith("evidence_atlas_locale");
    expect(html).toContain(`<main lang="${expected}">Original Organization</main>`);
    expect(html).toContain(expected === "ja" ? "ログアウト" : "Sign out");
  });

  it.each([
    [undefined, "en"], ["invalid", "en"], ["en", "en"], ["ja", "ja"],
  ])("passes resolved cookie %s to the server header slot once", async (value, expected) => {
    mocks.get.mockReturnValue(value === undefined ? undefined : { value });
    const header = vi.fn((locale) => <button data-locale={locale}>Original Workspace</button>);
    const html = renderToStaticMarkup(await AppShell({ header, children: <main>Body</main> }));
    expect(header).toHaveBeenCalledExactlyOnceWith(expected);
    expect(mocks.get).toHaveBeenCalledExactlyOnceWith("evidence_atlas_locale");
    expect(html).toContain(`data-locale="${expected}"`);
    expect(html).toContain("Original Workspace");
  });

  it("composes header, navigation, server content and the existing Workspace selector slot", async () => {
    const html = renderToStaticMarkup(await AppShell({
      header: <button>Workspace selector</button>,
      children: <main><h1>Server page content</h1></main>,
    }));
    expect(html).toContain("Evidence Atlas");
    expect(html).toContain("Sign out");
    expect(html).toContain("Menu");
    expect(html).toContain('aria-label="Application"');
    expect(html).toContain("Workspace selector");
    expect(html).toContain("Server page content");
    expect(html.match(/<main>/g)).toHaveLength(1);
    expect(html.match(/href="\/settings\/organization"/g)).toHaveLength(2);
    expect(html.match(/href="\/settings\/workspace"/g)).toHaveLength(2);
    expect(html.match(/<select/g)).toHaveLength(1);
    expect(html).toContain("flex-wrap");
  });

  it.each([
    [undefined, "en"], ["invalid", "en"], ["en", "en"], ["ja", "ja"],
  ])("passes cookie %s through the server Shell and Header to the initial client selection %s", async (value, expected) => {
    mocks.get.mockReturnValue(value === undefined ? undefined : { value });
    const html = renderToStaticMarkup(await AppShell({ children: <main>English page content</main> }));
    expect(mocks.get).toHaveBeenCalledExactlyOnceWith("evidence_atlas_locale");
    expect(html).toContain(`<option value="${expected}" lang="${expected}" selected=""`);
    expect(html).toContain("English page content");
    expect(html).toContain(expected === "ja" ? "ログアウト" : "Sign out");
    expect(html.match(new RegExp(`aria-label="${expected === "ja" ? "アプリケーション" : "Application"}"`, "g")))
      .toHaveLength(2);
    expect(html).toContain(expected === "ja" ? "メニュー" : "Menu");
    expect(html).toContain(expected === "ja" ? "外観" : "Appearance");
  });

  it("reflects a changed cookie on the next server render without changing the content or navigation", async () => {
    const children = <main><input defaultValue="Unsaved example" /></main>;
    mocks.get.mockReturnValue({ value: "en" });
    const english = renderToStaticMarkup(await AppShell({ children }));
    mocks.get.mockReturnValue({ value: "ja" });
    const japanese = renderToStaticMarkup(await AppShell({ children }));
    expect(english).toContain('value="en" lang="en" selected=""');
    expect(japanese).toContain('value="ja" lang="ja" selected=""');
    expect(japanese).toContain("言語");
    expect(english.match(/href="[^"]*"/g)).toEqual(japanese.match(/href="[^"]*"/g));
    expect(japanese).toContain('value="Unsaved example"');
    // This is server markup, not proof of live input-state preservation.
  });

  it("keeps shared Japanese navigation on Research while preserving names, page text and the Home-only guard", async () => {
    mocks.get.mockReturnValue({ value: "ja" });
    mocks.pathname = "/research/research-id";
    const html = renderToStaticMarkup(await AppShell({
      header: <button data-workspace-id="workspace-id">Original Workspace / Original Organization</button>,
      children: <main><h1>Original Research title</h1><p>English page content</p><span>User Name / user@example.test</span></main>,
    }));
    for (const text of ["ログアウト", "ホーム", "設定", "外観", "テーマ", "メニュー", "ホームのみ",
      "Original Workspace / Original Organization", "Original Research title", "English page content", "User Name / user@example.test"]) {
      expect(html).toContain(text);
    }
    expect(html.match(/href="\/research" aria-current="page"/g)).toHaveLength(2);
    expect(html).toContain('data-workspace-id="workspace-id"');
    expect(html.match(/<select\b[^>]*>/)?.[0]).toContain('disabled=""');
    expect(html).toContain("未保存の入力やAIの会話を保護するため");
    expect(html).toContain('value="ja" lang="ja" selected=""');
  });

  it.each(["en", "ja"] as const)("keeps the %s Public Demo independent of SaaS cookies and controls", (locale) => {
    const html = renderToStaticMarkup(<DemoShell locale={locale} localized><main>Demo</main></DemoShell>);
    expect(mocks.cookies).not.toHaveBeenCalled();
    expect(html).toContain(`href="/${locale}/demo"`);
    expect(html).not.toContain("Home only");
    expect(html).not.toContain("Sign out");
  });
});
