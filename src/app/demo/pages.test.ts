import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DemoPage from "./page";
import DemoLayout from "./layout";
import DemoResearchPage from "./research/[researchId]/page";
import { workspace, research, source, finding, comment, researchTag } from "@/lib/demo/test-fixtures";

const mocks = vi.hoisted(() => ({
  getDemoWorkspace: vi.fn(), getDemoResearch: vi.fn(), notFound: vi.fn(), auth: vi.fn(),
}));
vi.mock("@/lib/demo/read", () => ({
  getDemoWorkspace: mocks.getDemoWorkspace, getDemoResearch: mocks.getDemoResearch,
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: ReactNode; href: string }) => createElement("a", props, children),
}));

const notFoundError = new Error("NEXT_NOT_FOUND");
const tags = [{ id: researchTag.tag.id, name: researchTag.tag.name }];
function detailPage() {
  return DemoResearchPage({ params: Promise.resolve({ researchId: research.id }) });
}
function renderWithLayout(page: ReactNode) {
  return renderToStaticMarkup(createElement(DemoLayout, null, page));
}
function expectReadOnly(html: string) {
  expect(html).toContain("Read-only demo");
  expect(html).toContain(">Demo<");
  expect(html).not.toMatch(/<form|<button|<input|<textarea|<select|\/edit|\/settings|\/research\/new|\/chat|Ask AI|Sign out/);
  expect(mocks.auth).not.toHaveBeenCalled();
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("PUBLIC_DEMO_MODE", undefined);
  mocks.auth.mockImplementation(() => { throw new Error("Public UI must not load a session"); });
  mocks.notFound.mockImplementation(() => { throw notFoundError; });
  mocks.getDemoWorkspace.mockResolvedValue({ ...workspace, researches: [{ ...research, tags }] });
  mocks.getDemoResearch.mockResolvedValue({
    research, sources: [source], findings: [finding], tags,
    comments: [{ id: comment.id, content: comment.content, authorName: "Demo Author", createdAt: comment.createdAt }],
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("Public Demo pages", () => {
  it.each([undefined, "true"])("renders the Workspace without a session or controls in deployment mode %s", async (mode) => {
    vi.stubEnv("PUBLIC_DEMO_MODE", mode);
    const html = renderWithLayout(await DemoPage());
    expectReadOnly(html);
    for (const value of [workspace.name, workspace.description, research.title, research.description, "Completed", "Productivity"]) {
      expect(html).toContain(value);
    }
    expect(html).toContain(`href="/demo/research/${research.id}"`);
  });

  it.each([undefined, "true"])("renders Research detail without a session or controls in deployment mode %s", async (mode) => {
    vi.stubEnv("PUBLIC_DEMO_MODE", mode);
    const html = renderWithLayout(await detailPage());
    expectReadOnly(html);
    for (const value of [research.title, research.description, research.conclusion, source.title, finding.content, comment.content, "Demo Author", "Supporting sources", "Completed"]) {
      expect(html).toContain(value);
    }
    expect(html).toContain('href="/demo"');
    expect(html).not.toContain(comment.user.email);
    expect(mocks.getDemoResearch).toHaveBeenCalledExactlyOnceWith(research.id);
  });

  it.each(["workspace", "research"])("uses notFound for unavailable %s public data", async (kind) => {
    (kind === "workspace" ? mocks.getDemoWorkspace : mocks.getDemoResearch).mockResolvedValue(null);
    await expect(kind === "workspace" ? DemoPage() : detailPage()).rejects.toBe(notFoundError);
    expect(mocks.notFound).toHaveBeenCalledTimes(1);
  });

  it.each(["workspace", "research"])("does not turn unexpected %s failures into 404", async (kind) => {
    const error = new Error("Database unavailable");
    (kind === "workspace" ? mocks.getDemoWorkspace : mocks.getDemoResearch).mockRejectedValue(error);
    await expect(kind === "workspace" ? DemoPage() : detailPage()).rejects.toBe(error);
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it("keeps the public import graph free of authenticated actions, Workspace controls, and AI", () => {
    const visited = new Set<string>();
    const sourceRoot = resolve("src");
    const pending = ["src/app/demo/layout.tsx", "src/app/demo/page.tsx", "src/app/demo/research/[researchId]/page.tsx"].map((path) => resolve(path));
    while (pending.length) {
      const path = pending.pop()!;
      if (visited.has(path)) continue;
      visited.add(path);
      const code = readFileSync(path, "utf8");
      expect(code).not.toMatch(/["']use server["']/);
      for (const match of code.matchAll(/(?:from\s+|import\s*)["']([^"']+)["']/g)) {
        const specifier = match[1];
        expect(specifier).not.toMatch(/^@\/(auth|workspace|app\/research|lib\/ai|inngest)(\/|$)|_actions|_components/);
        const target = specifier.startsWith("@/") ? resolve(sourceRoot, specifier.slice(2)) :
          specifier.startsWith(".") ? resolve(dirname(path), specifier) : null;
        if (target) {
          const file = [target, `${target}.ts`, `${target}.tsx`].find((candidate) => existsSync(candidate));
          if (file && /\.tsx?$/.test(file)) pending.push(file);
        }
      }
    }
  });
});
