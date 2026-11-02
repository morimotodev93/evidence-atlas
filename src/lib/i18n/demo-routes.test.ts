import { describe, expect, it } from "vitest";
import { demoMetadata, demoPath, localizedDemoPath, requireDemoLocale } from "./demo-routes";

describe("localized Demo routes", () => {
  it.each(["en", "ja"] as const)("preserves research identity in %s", (locale) => {
    expect(requireDemoLocale(locale)).toBe(locale);
    expect(demoPath(locale, "research-123")).toBe(`/${locale}/demo/research/research-123`);
    for (const path of ["/demo/research/research-123", "/en/demo/research/research-123", "/ja/demo/research/research-123"])
      expect(localizedDemoPath(path, locale)).toBe(`/${locale}/demo/research/research-123`);
  });
  it.each(["fr", "JA", "en-US", "__proto__"])("rejects locale route %s", (locale) => {
    expect(requireDemoLocale(locale)).toBeNull();
  });
  it("keeps the legacy path and rejects foreign paths as switch targets", () => {
    expect(demoPath()).toBe("/demo");
    expect(demoPath(undefined, "same-id")).toBe("/demo/research/same-id");
    expect(localizedDemoPath("/settings", "ja")).toBe("/ja/demo");
    expect(localizedDemoPath("/demo", "ja")).toBe("/ja/demo");
  });
  it.each(["en", "ja"] as const)("provides %s metadata and matching canonical/alternates", (locale) => {
    const metadata = demoMetadata(locale, "same-id");
    expect(metadata.title).toBe(locale === "ja" ? "公開デモ" : "Public Demo");
    expect(metadata.description).toContain("Evidence Atlas");
    expect(metadata.alternates).toEqual({ canonical: `/${locale}/demo/research/same-id`, languages: {
      en: "/en/demo/research/same-id", ja: "/ja/demo/research/same-id", "x-default": "/demo/research/same-id",
    } });
  });
});
