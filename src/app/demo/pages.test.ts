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
  // Appearance remains static until mounted; public research stays read-only.
  expect(html).toContain('data-slot="appearance-placeholder"');
  expect(html).toContain("Appearance");
  // Only the dedicated, unavailable Chat preview may contain disabled controls.
  const chat = html.match(/<section aria-labelledby="demo-chat-heading"[\s\S]*?<\/section>/)?.[0];
  if (chat) {
    expect(chat.match(/<textarea\b[^>]*>/g)).toHaveLength(1);
    expect(chat.match(/<button\b[^>]*>/g)).toHaveLength(1);
    for (const control of chat.matchAll(/<(?:textarea|button)\b[^>]*>/g)) {
      expect(control[0]).toContain('disabled=""');
    }
    expect(chat).not.toMatch(/<form|<input|<select|\baction=|\bformAction=/);
  }
  const readOnlyHtml = chat ? html.replace(chat, "") : html;
  expect(readOnlyHtml).not.toMatch(/<form|<button|<input|<textarea|<select|role="combobox"|\/edit|\/settings|\/research\/new|\/chat|Ask AI|Sign out/);
  expect(readOnlyHtml.slice(readOnlyHtml.indexOf("<main"))).not.toMatch(/<form|<button|<input|<textarea|<select/);
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
  it.each([undefined, "true"])("renders the Workspace without a session or research controls in deployment mode %s", async (mode) => {
    vi.stubEnv("PUBLIC_DEMO_MODE", mode);
    const html = renderWithLayout(await DemoPage());
    expectReadOnly(html);
    expect(renderToStaticMarkup(await DemoPage())).not.toMatch(/<button|<input|<textarea|<select|<form/);
    for (const value of [workspace.name, workspace.description, research.title, research.description, "Completed", "Productivity"]) {
      expect(html).toContain(value);
    }
    expect(html).toContain(`href="/demo/research/${research.id}"`);
  });

  it.each([undefined, "true"])("renders Research detail without a session or research controls in deployment mode %s", async (mode) => {
    vi.stubEnv("PUBLIC_DEMO_MODE", mode);
    const html = renderWithLayout(await detailPage());
    expectReadOnly(html);
    expect([...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((match) => match[1]))
      .toEqual(["Sources", "Findings", "Discussion", "Conclusion", "AI Chat"]);
    expect(html.indexOf("</header>", html.indexOf("<main"))).toBeLessThan(html.indexOf("<section"));
    for (const value of [research.title, research.description, research.conclusion, source.title, finding.content, comment.content, "Demo Author", "Supporting sources", "Completed"]) {
      expect(html).toContain(value);
    }
    expect(html).toContain('href="/demo"');
    expect(html.match(/href="https:\/\/example.com\/evidence"/g)).toHaveLength(2);
    expect(html).not.toContain(comment.user.email);
    expect(mocks.getDemoResearch).toHaveBeenCalledExactlyOnceWith(research.id);
  });

  it.each(["false", "true"])("keeps Chat unavailable without full eligibility even with DEMO_CHAT_ENABLED=%s", async (flag) => {
    vi.stubEnv("DEMO_CHAT_ENABLED", flag);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected network request"));
    try {
      const html = renderWithLayout(await detailPage());
      expectReadOnly(html);
      expect(html).toContain("Coming soon");
      expect(html).toContain("Chat is not available yet. Questions cannot be entered or sent.");
      expect(html).toContain('aria-label="Conversation messages"');
      expect(html).toContain("No messages yet.");
      expect(html).toContain('for="demo-chat-question"');
      expect(html).toContain('aria-describedby="demo-chat-availability demo-chat-input-help demo-chat-limits"');
      expect(html).toContain("Up to 500 characters");
      expect(html).toContain("10 questions per thread and 20 per anonymous session (24 hours)");
      expect(html).toContain("Answers will be grounded in this Research");
      expect(html).not.toMatch(/\/api\/demo\/chat|threadId|turnstile|gpt-oss|UPSTASH|DEMO_GROQ/);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it.each(["enabled", "disabled", "saas", "c2"])("gates client integration with server eligibility (%s), not the flag alone", async (mode) => {
    const config = {
      PUBLIC_DEMO_MODE: "true", DEMO_CHAT_ENABLED: "true", C2_RUNTIME_MODE: "",
      DEMO_WORKSPACE_ID: "synthetic-workspace", DEMO_GROQ_API_KEY: "synthetic-private-groq-key",
      NEXT_PUBLIC_DEMO_TURNSTILE_SITE_KEY: "synthetic-public-site-key",
      DEMO_TURNSTILE_SECRET_KEY: "synthetic-private-turnstile-key",
      UPSTASH_REDIS_REST_URL: "https://synthetic-redis.invalid", UPSTASH_REDIS_REST_TOKEN: "synthetic-private-redis-token",
    };
    for (const [key, value] of Object.entries(config)) vi.stubEnv(key, value);
    if (mode === "disabled") vi.stubEnv("DEMO_CHAT_ENABLED", "false");
    if (mode === "saas") vi.stubEnv("PUBLIC_DEMO_MODE", "false");
    if (mode === "c2") vi.stubEnv("C2_RUNTIME_MODE", "malformed");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected network request"));
    try {
      const page = await detailPage();
      const html = renderWithLayout(page);
      if (mode === "enabled") {
        expect(html).toContain("Start verified session");
        expect(html).not.toContain("Coming soon");
        expect(html).toContain('aria-live="polite"');
      } else {
        expectReadOnly(html);
        expect(html).toContain("Coming soon");
      }
      expect(html).not.toMatch(/<script|challenges\.cloudflare|synthetic-private|synthetic-redis/);
      expect(fetchSpy).not.toHaveBeenCalled();
      // Inspect server-to-client props as well as markup: only the Site Key and
      // the public Research/Source projection may cross this boundary.
      const panel = page.props.children.at(-1);
      expect(panel.props).toEqual({ researchTitle: research.title,
        researchId: mode === "enabled" ? research.id : undefined,
        siteKey: mode === "enabled" ? config.NEXT_PUBLIC_DEMO_TURNSTILE_SITE_KEY : undefined,
        sources: mode === "enabled" ? [{ id: source.id, title: source.title, url: source.url }] : undefined,
      });
    } finally { fetchSpy.mockRestore(); }
  });

  it.each(["javascript:alert(1)", "//example.com", "https://"])("keeps invalid saved Source %s visible and read-only without linking", async (url) => {
    const storedSource = { ...source, url };
    mocks.getDemoResearch.mockResolvedValue({
      research, sources: [storedSource], tags, comments: [],
      findings: [{ ...finding, sources: [{ sourceId: source.id, source: storedSource }] }],
    });
    const page = await detailPage();
    const html = renderWithLayout(page);
    expectReadOnly(html);
    expect(html.match(/Supporting evidence/g)).toHaveLength(2);
    expect(html).toContain(url);
    expect(html).toContain("Supporting sources");
    expect(renderToStaticMarkup(page).match(/href="[^"]*"/g)).toEqual(['href="/demo"']);
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
