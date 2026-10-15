import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FullConfig } from "@playwright/test";
import { parseHarnessCommand, C2_ORIGIN } from "./c2-playwright-policy.ts";
import { requireC2Config } from "../e2e-c2/global-setup.ts";

const fixtureConfig = (chat: boolean): FullConfig => ({
  workers: 1,
  maxFailures: 1,
  webServer: null,
  preserveOutput: "never",
  reporter: [["C:/repo/e2e-c2/redacted-reporter.ts"]],
  projects: [{
    name: chat ? "c2-chat-chromium" : "c2-chromium",
    testMatch: chat ? "chat.spec.ts" : "authenticated-smoke.spec.ts",
    testDir: "C:/repo/e2e-c2",
    outputDir: "C:/repo/test-results-c2",
    retries: 0,
    testIgnore: [],
    dependencies: [],
    use: { baseURL: C2_ORIGIN, browserName: "chromium", trace: "off", screenshot: "off", video: "off", serviceWorkers: "block" },
  }],
}) as unknown as FullConfig;

describe("C2 suite selection (offline only)", () => {
  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (/^(E2E_BASE_URL|NODE_OPTIONS|NODE_PATH|DEBUG|PWDEBUG|PW_TEST_.*|HTTPS?_PROXY|ALL_PROXY|PUBLIC_DEMO_MODE|C2_RUNTIME_MODE|AUTH_URL)$/i.test(key)) vi.stubEnv(key, undefined);
    }
    vi.stubEnv("C2_E2E_ALLOW_READONLY", "1");
    vi.stubEnv("PLAYWRIGHT_NO_COPY_PROMPT", "1");
    vi.stubEnv("C2_E2E_ALLOW_CHAT_MOCK", undefined);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("preserves the established smoke command and requires a separate Chat opt-in", () => {
    expect(parseHarnessCommand(["run", "--allow-c2-readonly"])).toBe("run");
    expect(parseHarnessCommand(["chat", "--allow-c2-chat-mock"])).toBe("chat");
    expect(() => parseHarnessCommand(["chat", "--allow-c2-readonly"])).toThrow("command-opt-in");
  });

  it("keeps the actual smoke config locked to its original four cases", async () => {
    const { default: smoke } = await import("../playwright.c2.config.ts");
    expect(smoke.testMatch).toBe("authenticated-smoke.spec.ts");
    expect(smoke.projects?.[0]?.name).toBe("c2-chromium");
    expect(() => requireC2Config(fixtureConfig(false))).not.toThrow();
  });

  it("keeps the Chat config limited to chat.spec.ts with the same security defaults", async () => {
    const { default: smoke } = await import("../playwright.c2.config.ts");
    const { default: chat } = await import("../playwright.c2.chat.config.ts");
    expect(chat.testMatch).toBe("chat.spec.ts");
    expect(chat.projects?.[0]?.name).toBe("c2-chat-chromium");
    for (const key of ["globalSetup", "testDir", "workers", "maxFailures", "retries", "reporter", "preserveOutput", "outputDir", "use"]) {
      expect(chat[key as keyof typeof chat]).toEqual(smoke[key as keyof typeof smoke]);
    }
    vi.stubEnv("C2_E2E_ALLOW_CHAT_MOCK", "1");
    expect(() => requireC2Config(fixtureConfig(true))).not.toThrow();
  });

  it("refuses both directions of suite/config mismatch and the missing Chat opt-in", () => {
    expect(() => requireC2Config(fixtureConfig(true))).toThrow();
    vi.stubEnv("C2_E2E_ALLOW_CHAT_MOCK", "1");
    expect(() => requireC2Config(fixtureConfig(false))).toThrow();
    expect(() => requireC2Config(fixtureConfig(true))).not.toThrow();
  });

  it("rejects broadened testMatch, testIgnore and project dependencies", () => {
    for (const change of [
      { testMatch: "*.spec.ts" },
      { testMatch: ["authenticated-smoke.spec.ts", "chat.spec.ts"] },
      { testMatch: undefined },
      { testIgnore: ["other.spec.ts"] },
      { dependencies: ["unsafe-extra"] },
      { teardown: "unsafe-extra" },
    ]) {
      const candidate = fixtureConfig(false);
      Object.assign(candidate.projects[0], change);
      expect(() => requireC2Config(candidate)).toThrow();
    }
  });
});
