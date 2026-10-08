import { afterEach, describe, expect, it, vi } from "vitest";

import { isPublicDemoMode, requireApplicationEnabled } from "./deployment-mode";

const mocks = vi.hoisted(() => ({ notFound: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe("deployment mode", () => {
  it.each([undefined, "", "   ", "false", " false ", "\tfalse\n"])(
    "keeps normal SaaS mode for %s", (value) => {
      vi.stubEnv("PUBLIC_DEMO_MODE", value);
      expect(isPublicDemoMode()).toBe(false);
      requireApplicationEnabled();
      expect(mocks.notFound).not.toHaveBeenCalled();
    },
  );

  it.each(["true", " true ", "1", " 1 ", "unexpected", "FALSE", "0"])(
    "locks authenticated application usage for %s", (value) => {
      vi.stubEnv("PUBLIC_DEMO_MODE", value);
      const error = new Error("NEXT_HTTP_ERROR_FALLBACK;404");
      mocks.notFound.mockImplementation(() => { throw error; });
      expect(isPublicDemoMode()).toBe(true);
      expect(() => requireApplicationEnabled()).toThrow(error);
      expect(mocks.notFound).toHaveBeenCalledTimes(1);
    },
  );
});
