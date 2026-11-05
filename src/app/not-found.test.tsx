import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotFound from "./not-found";
import { NotFoundContent } from "@/components/errors/not-found-content";
import type { Locale } from "@/lib/i18n/locales";
import { ja } from "@/lib/i18n/dictionaries/ja";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

const mocks = vi.hoisted(() => ({ cookies: vi.fn(), get: vi.fn(), pathname: "/research/private-id" as string | null, redirect: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, redirect: mocks.redirect }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.cookies.mockResolvedValue({ get: mocks.get });
  mocks.pathname = "/research/private-id";
});

describe("Application not-found presentation", () => {
  it.each([undefined, "en", "ja", "invalid"])("resolves SaaS cookie %s without requiring a session or redirect", async value => {
    mocks.get.mockReturnValue(value === undefined ? undefined : { value });
    const html = renderToStaticMarkup(await NotFound());
    expect(html).toContain(`<main lang="${value === "ja" ? "ja" : "en"}"`);
    expect(html).toContain(value === "ja" ? "ページが見つかりません" : "Page not found");
    expect(html).toContain(value === "ja" ? "お探しのページは見つかりませんでした。" : "This page could not be found.");
    expect(html).toContain(">404</p>");
    expect(html).not.toMatch(/private-id|research|<button|<a\b|<input|<select/);
    expect(mocks.get).toHaveBeenCalledExactlyOnceWith("evidence_atlas_locale");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it.each([
    ["/ja/demo/research/private-id", "en", "ja"], ["/en/demo/research/private-id", "ja", "en"],
    ["/demo/research/private-id", "ja", "en"], ["/ja/demo/unknown", "en", "ja"],
    ["/ja/demo", "en", "ja"], ["/ja/demo-other", "en", "en"],
    ["/ja/demographic", "en", "en"], ["/fr/demo/research/private-id", "ja", "ja"],
    ["/unknown", "ja", "ja"], [null, "ja", "ja"], [null, "invalid", "en"],
  ])("uses Demo URL language or safe SaaS fallback for %s", (pathname, value, expected) => {
    mocks.pathname = pathname;
    const html = renderToStaticMarkup(<NotFoundContent saasLocale={value as Locale} />);
    expect(html).toContain(`<main lang="${expected}"`);
    expect(html).not.toContain("private-id");
    expect(mocks.cookies).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("keeps the same safe output for missing/inaccessible-looking resource paths", () => {
    const html = renderToStaticMarkup(<NotFoundContent saasLocale="ja" />);
    for (const pathname of ["/research/missing", "/research/inaccessible", "/unknown/private-token"]) {
      mocks.pathname = pathname;
      expect(renderToStaticMarkup(<NotFoundContent saasLocale="ja" />)).toBe(html);
    }
    expect(html).not.toMatch(/missing|inaccessible|private-token/);
  });

  it("uses per-entry English fallback with a Japanese boundary", () => {
    const partial: { -readonly [K in keyof Dictionary]?: string } = ja;
    const saved = partial["errors.notFoundDescription"];
    try {
      delete partial["errors.notFoundDescription"];
      const html = renderToStaticMarkup(<NotFoundContent saasLocale="ja" />);
      expect(html).toContain('<main lang="ja"');
      expect(html).toContain("This page could not be found.");
      expect(html).toContain("ページが見つかりません");
    } finally { partial["errors.notFoundDescription"] = saved; }
  });

  it("propagates a failed server cookie read to the existing error boundary without swallowing Next.js control flow", async () => {
    const failure = new Error("private-cookie-failure");
    mocks.cookies.mockRejectedValue(failure);
    await expect(NotFound()).rejects.toBe(failure);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
