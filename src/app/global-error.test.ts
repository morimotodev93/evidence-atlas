import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import GlobalError from "./global-error";
import { ja } from "@/lib/i18n/dictionaries/ja";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

const mocks = vi.hoisted(() => ({ captureException: vi.fn(), useEffect: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: mocks.captureException }));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useEffect: mocks.useEffect,
}));

beforeEach(() => vi.clearAllMocks());
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("global error presentation and capture boundary", () => {
  it.each(["true", "false"])("renders generic UI and schedules capture in Public Demo mode %s", (mode) => {
    vi.stubEnv("PUBLIC_DEMO_MODE", mode);
    const error = Object.assign(new Error("synthetic-private-content-and-secret"), {
      digest: "synthetic-private-digest",
      stack: "synthetic-private-stack",
    });

    // Inspect the registered effect without mounting a browser or loading Sentry.
    const tree = GlobalError({ error });
    expect(mocks.useEffect).toHaveBeenCalledExactlyOnceWith(expect.any(Function), [error]);
    expect(mocks.captureException).not.toHaveBeenCalled();
    const effect = mocks.useEffect.mock.calls[0][0] as () => void;
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("<html");
    expect(html).toContain("<body");
    expect(html).toContain("Application error");
    expect(html).toContain('lang="en"');
    expect(html).toContain('<section lang="en">');
    expect(html).toContain('<section lang="ja"');
    expect(html).toContain("Something went wrong. Please try again later.");
    expect(html).toContain("アプリケーションエラー");
    expect(html).toContain("問題が発生しました。時間をおいてから、もう一度お試しください。");
    expect(html).toContain("system-ui, sans-serif");
    expect(html).not.toMatch(/<button|<a\b|<input|<select/);
    for (const value of [error.message, error.stack, error.digest]) {
      expect(html).not.toContain(value);
    }

    effect();
    expect(mocks.captureException).toHaveBeenCalledExactlyOnceWith(error);
  });

  it("retains static bilingual rendering without window, a layout, cookies or an AppShell", () => {
    vi.stubGlobal("window", undefined);
    const html = renderToStaticMarkup(GlobalError({ error: new Error("private") }));
    expect(html).toContain("<html");
    expect(html).toContain("<body");
    expect(html).toContain("アプリケーションエラー");
    expect(html).not.toContain("private");
  });

  it("falls back to English copy when a Japanese entry is missing without exposing the exception", () => {
    const partial: { -readonly [K in keyof Dictionary]?: string } = ja;
    const saved = partial["errors.applicationDescription"];
    try {
      delete partial["errors.applicationDescription"];
      const html = renderToStaticMarkup(GlobalError({ error: new Error("private-error") }));
      expect(html.match(/Something went wrong\. Please try again later\./g)).toHaveLength(2);
      expect(html).toContain('<section lang="ja"');
      expect(html).not.toContain("private-error");
    } finally { partial["errors.applicationDescription"] = saved; }
  });
});
