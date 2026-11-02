import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import type { Locale } from "./locales";
import { getSaasLocale } from "./saas-locale";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.cookies.mockResolvedValue({
    get: mocks.get,
    set: mocks.set,
    delete: mocks.delete,
    clear: mocks.clear,
  });
});

describe("getSaasLocale", () => {
  it.each([
    { value: "en", expected: "en" },
    { value: "ja", expected: "ja" },
    { value: undefined, expected: "en" },
    { value: "", expected: "en" },
    { value: "fr", expected: "en" },
    { value: "ja-JP", expected: "en" },
    { value: "JA", expected: "en" },
  ])("resolves cookie $value to $expected without changing cookies", async ({ value, expected }) => {
    mocks.get.mockReturnValue(value === undefined
      ? undefined
      : { name: "evidence_atlas_locale", value });

    const locale = await getSaasLocale();

    expectTypeOf(locale).toEqualTypeOf<Locale>();
    expect(locale).toBe(expected);
    expect(mocks.cookies).toHaveBeenCalledTimes(1);
    expect(mocks.get).toHaveBeenCalledExactlyOnceWith("evidence_atlas_locale");
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
    expect(mocks.clear).not.toHaveBeenCalled();
  });
});
