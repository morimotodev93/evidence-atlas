import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";
import { DemoShell } from "@/components/demo/demo-shell";

const mocks = vi.hoisted(() => ({ cookies: vi.fn(), get: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));

vi.mock("@/auth", () => ({ signOut: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: ReactNode; href: string }) => createElement("a", props, children),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cookies.mockResolvedValue({ get: mocks.get });
  mocks.get.mockReturnValue(undefined);
});

describe("Authenticated application shell", () => {
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
    expect(html.match(/href="\/settings\/organization"/g)).toHaveLength(1);
    expect(html.match(/href="\/settings\/workspace"/g)).toHaveLength(1);
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
    expect(html).toContain("Sign out");
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

  it.each(["en", "ja"] as const)("keeps the %s Public Demo independent of SaaS cookies and controls", (locale) => {
    const html = renderToStaticMarkup(<DemoShell locale={locale} localized><main>Demo</main></DemoShell>);
    expect(mocks.cookies).not.toHaveBeenCalled();
    expect(html).toContain(`href="/${locale}/demo"`);
    expect(html).not.toContain("Home only");
    expect(html).not.toContain("Sign out");
  });
});
