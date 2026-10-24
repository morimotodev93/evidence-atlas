import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";

vi.mock("@/auth", () => ({ signOut: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: ReactNode; href: string }) => createElement("a", props, children),
}));

describe("Authenticated application shell", () => {
  it("composes header, navigation, server content and the existing Workspace selector slot", () => {
    const html = renderToStaticMarkup(
      <AppShell header={<button>Workspace selector</button>}>
        <main><h1>Server page content</h1></main>
      </AppShell>,
    );
    expect(html).toContain("Evidence Atlas");
    expect(html).toContain("Sign out");
    expect(html).toContain("Menu");
    expect(html).toContain('aria-label="Application"');
    expect(html).toContain("Workspace selector");
    expect(html).toContain("Server page content");
    expect(html.match(/<main>/g)).toHaveLength(1);
    expect(html.match(/href="\/settings\/organization"/g)).toHaveLength(1);
    expect(html.match(/href="\/settings\/workspace"/g)).toHaveLength(1);
  });
});
