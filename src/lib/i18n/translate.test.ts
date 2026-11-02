import { describe, expect, expectTypeOf, it } from "vitest";

import { en, type TranslationKey } from "./dictionaries/en";
import { ja } from "./dictionaries/ja";
import { defaultLocale, isLocale, resolveLocale, supportedLocales } from "./locales";
import { translate } from "./translate";

describe("locale selection", () => {
  it("keeps English as the default and supports English and Japanese", () => {
    expect(defaultLocale).toBe("en");
    expect(supportedLocales).toEqual(["en", "ja"]);
    for (const locale of supportedLocales) {
      expect(isLocale(locale)).toBe(true);
      expect(resolveLocale(locale)).toBe(locale);
    }
  });

  it.each([undefined, null, "", "fr", "en-US", "ja-JP", "JA", " ja ", "__proto__", 1, {}, ["ja"]])(
    "falls back to English for unsupported input %j", (value) => {
      expect(isLocale(value)).toBe(false);
      expect(resolveLocale(value)).toBe("en");
      expect(translate("demo.readOnly", value)).toBe("Read-only demo");
    },
  );
});

describe("UI translations", () => {
  it("preserves the stable keys and existing English copy", () => {
    expect(en).toEqual({
      "demo.readOnly": "Read-only demo",
      "demo.sourceCode": "Source code",
      "demo.researchList": "Research list",
      "demo.noResearch": "No research available.",
      "demo.backToWorkspace": "← Back to Demo Workspace",
    });
    expectTypeOf<Parameters<typeof translate>[0]>().toEqualTypeOf<TranslationKey>();
    for (const key of Object.keys(en) as TranslationKey[]) {
      expect(translate(key)).toBe(en[key]);
      expect(translate(key, "en")).toBe(en[key]);
    }
  });

  it("selects the representative Japanese translations without affecting English", () => {
    for (const key of Object.keys(ja) as (keyof typeof ja)[]) {
      expect(translate(key, "ja")).toBe(ja[key]);
      expect(translate(key, "en")).toBe(en[key]);
    }
    expect(translate("demo.readOnly", "ja")).toBe("閲覧専用デモ");
  });

  it("falls back per key when a Japanese translation is absent", () => {
    expect(Object.hasOwn(ja, "demo.noResearch")).toBe(false);
    expect(translate("demo.noResearch", "ja")).toBe("No research available.");
  });
});
