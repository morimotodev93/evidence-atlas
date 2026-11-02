import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSaasLocale } from "./saas-locale";
import { setSaasLocale } from "./set-saas-locale";

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

afterEach(() => vi.unstubAllEnvs());

describe("setSaasLocale", () => {
  describe.each(["production", "development", "test"])("in %s", (environment) => {
    it.each(["en", "ja"])("saves %s with the required attributes and reads it back", async (locale) => {
      vi.stubEnv("NODE_ENV", environment);
      const cookieValues = new Map<string, string>([
        ["evidence_atlas_workspace", "workspace-id"],
        ["authjs.session-token", "session-token"],
      ]);
      mocks.set.mockImplementation((name: string, value: string) => {
        cookieValues.set(name, value);
      });
      mocks.get.mockImplementation((name: string) => {
        const value = cookieValues.get(name);
        return value === undefined ? undefined : { name, value };
      });

      await expect(setSaasLocale(locale)).resolves.toBeUndefined();

      expect(mocks.cookies).toHaveBeenCalledTimes(1);
      expect(mocks.set).toHaveBeenCalledExactlyOnceWith("evidence_atlas_locale", locale, {
        path: "/",
        sameSite: "lax",
        httpOnly: true,
        secure: environment === "production",
        maxAge: 15_552_000,
      });
      await expect(getSaasLocale()).resolves.toBe(locale);
      expect(mocks.get).toHaveBeenCalledExactlyOnceWith("evidence_atlas_locale");
      expect([...cookieValues]).toEqual([
        ["evidence_atlas_workspace", "workspace-id"],
        ["authjs.session-token", "session-token"],
        ["evidence_atlas_locale", locale],
      ]);
      expect(mocks.delete).not.toHaveBeenCalled();
      expect(mocks.clear).not.toHaveBeenCalled();
    });
  });

  it.each([undefined, null, "", "fr", "ja-JP", "JA", " ja ", "__proto__", 1, true, {}, ["ja"]])(
    "rejects invalid input %j before accessing or changing cookies", async (value) => {
      await expect(setSaasLocale(value)).rejects.toThrow("Unsupported locale.");

      expect(mocks.cookies).not.toHaveBeenCalled();
      expect(mocks.get).not.toHaveBeenCalled();
      expect(mocks.set).not.toHaveBeenCalled();
      expect(mocks.delete).not.toHaveBeenCalled();
      expect(mocks.clear).not.toHaveBeenCalled();
    },
  );
});
