import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEMO_CHAT_LIMITS, DEMO_CHAT_REDIS, DEMO_CHAT_TURNSTILE,
  DemoChatConfigurationError, isDemoChatEnabled, requireDemoChatEnabled,
} from "./chat-config";

const required = {
  DEMO_WORKSPACE_ID: "synthetic-workspace",
  DEMO_GROQ_API_KEY: "synthetic-demo-key",
  NEXT_PUBLIC_DEMO_TURNSTILE_SITE_KEY: "synthetic-public-site",
  DEMO_TURNSTILE_SECRET_KEY: "synthetic-turnstile-secret",
  UPSTASH_REDIS_REST_URL: "https://redis.example.invalid",
  UPSTASH_REDIS_REST_TOKEN: "synthetic-redis-token",
};

beforeEach(() => {
  for (const key of ["C2_RUNTIME_MODE", "PUBLIC_DEMO_MODE", "DEMO_CHAT_ENABLED",
    "KV_REST_API_URL", "KV_REST_API_TOKEN", ...Object.keys(required)]) vi.stubEnv(key, undefined);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

function configure() {
  for (const [key, value] of Object.entries(required)) vi.stubEnv(key, value);
  vi.stubEnv("PUBLIC_DEMO_MODE", "true");
  vi.stubEnv("DEMO_CHAT_ENABLED", "true");
}

describe("Demo Chat configuration eligibility (no public execution)", () => {
  it("defaults to disabled with a fixed, secret-free error", () => {
    expect(isDemoChatEnabled()).toBe(false);
    expect(requireDemoChatEnabled).toThrow(DemoChatConfigurationError);
    expect(requireDemoChatEnabled).toThrow("Demo Chat is disabled or not configured.");
  });

  it.each([undefined, "", " ", "false", "FALSE", "TRUE", "1", "0", "yes", "unexpected", " true "])(
    "rejects flag %s even with all credentials present", (value) => {
      configure();
      vi.stubEnv("DEMO_CHAT_ENABLED", value);
      expect(isDemoChatEnabled()).toBe(false);
      expect(requireDemoChatEnabled).toThrow("Demo Chat is disabled or not configured.");
    },
  );

  it.each([undefined, "", "false", "unexpected", "1", "TRUE", " true "])(
    "rejects SaaS or malformed Public Demo mode %s", (value) => {
      configure();
      vi.stubEnv("PUBLIC_DEMO_MODE", value);
      expect(isDemoChatEnabled()).toBe(false);
    },
  );

  it.each(["local", "ci", "false", "unexpected", " "])("rejects C2 marker %s", (value) => {
    configure();
    vi.stubEnv("C2_RUNTIME_MODE", value);
    expect(isDemoChatEnabled()).toBe(false);
    expect(requireDemoChatEnabled).toThrow(DemoChatConfigurationError);
  });

  it.each(Object.keys(required).flatMap((key) => [undefined, "", " \t "].map((value) => [key, value])))(
    "fails closed when %s is %s", (key, value) => {
      configure();
      vi.stubEnv(key!, value);
      vi.stubEnv("GROQ_API_KEY", "synthetic-evaluation-key");
      vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "synthetic-google-key");
      expect(isDemoChatEnabled()).toBe(false);
      expect(requireDemoChatEnabled).toThrow("Demo Chat is disabled or not configured.");
    },
  );

  it("accepts complete config without network and observes emergency flag changes", () => {
    const fetch = vi.fn(() => { throw new Error("Network forbidden"); });
    vi.stubGlobal("fetch", fetch);
    configure();
    expect(isDemoChatEnabled()).toBe(true);
    expect(requireDemoChatEnabled()).toBeUndefined();
    vi.stubEnv("DEMO_CHAT_ENABLED", "false");
    expect(isDemoChatEnabled()).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("accepts Redis aliases with the SaaS precedence, without a memory substitute", () => {
    configure();
    vi.stubEnv("KV_REST_API_URL", required.UPSTASH_REDIS_REST_URL);
    vi.stubEnv("KV_REST_API_TOKEN", required.UPSTASH_REDIS_REST_TOKEN);
    vi.stubEnv("UPSTASH_REDIS_REST_URL", undefined);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", undefined);
    expect(isDemoChatEnabled()).toBe(true);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", " ");
    expect(isDemoChatEnabled()).toBe(false);
    vi.stubEnv("KV_REST_API_TOKEN", undefined);
    vi.stubEnv("CHAT_RATE_LIMIT_BACKEND", "memory");
    vi.stubEnv("NODE_ENV", "production");
    expect(isDemoChatEnabled()).toBe(false);
  });

  it("defines fixed and provisional contracts, without claiming enforcement", () => {
    expect(DEMO_CHAT_LIMITS).toEqual({
      maxUserQuestionsPerThread: 10, persistConversationHistory: false,
      maxInputCharacters: 500, anonymousSessionQuestions: 20,
      anonymousSessionWindowSeconds: 86400, sourceQuestions: 3, sourceWindowSeconds: 60,
      globalQuestionsPerDay: 50, maxConcurrentGenerations: 2, maxOutputTokens: 1200,
    });
    expect(Object.isFrozen(DEMO_CHAT_LIMITS)).toBe(true);
    expect(DEMO_CHAT_REDIS).toMatchObject({ backend: "upstash", failurePolicy: "deny", allowMemoryFallback: false });
    for (const prefix of [DEMO_CHAT_REDIS.sessionPrefix, DEMO_CHAT_REDIS.sourcePrefix,
      DEMO_CHAT_REDIS.globalPrefix, DEMO_CHAT_REDIS.concurrencyPrefix]) {
      expect(prefix).toMatch(/^evidence-atlas:demo-chat:v1:/);
      expect(prefix).not.toContain("evidence-atlas:ai-chat");
    }
    expect(DEMO_CHAT_TURNSTILE).toEqual({
      serverVerificationRequired: true, expectedAction: "demo-chat", trustedHostnameRequired: true,
    });
  });

  it("keeps secrets server-only and limits model consumption to Demo generation", () => {
    const root = resolve(import.meta.dirname, "../..");
    for (const name of ["chat-config.ts", "chat-model.ts"]) {
      const source = readFileSync(resolve(import.meta.dirname, name), "utf8");
      expect(source).toMatch(/^import "server-only";/);
      expect(source).not.toMatch(/NEXT_PUBLIC_(?:DEMO_GROQ|DEMO_TURNSTILE_SECRET)/);
      expect(source).not.toMatch(/use server|use client|Response\.json|console\./);
    }
    // Only the independent Demo generation adapter may consume this model.
    const consumers = readdirSync(root, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.[cm]?[jt]sx?$/.test(entry.name))
      .map((entry) => resolve(entry.parentPath, entry.name))
      .filter((file) => !/\.test\.[jt]sx?$/.test(file) && !file.endsWith("chat-model.ts") && !file.endsWith("chat-config.ts"))
      .filter((file) => /(?:demo\/|\.\/|\.\.\/)chat-model["']/.test(readFileSync(file, "utf8")));
    expect(consumers).toEqual([resolve(root, "lib/demo/chat-generation.ts")]);
    const nextConfig = readFileSync(resolve(root, "../next.config.ts"), "utf8");
    expect(nextConfig).not.toMatch(/DEMO_GROQ_API_KEY|DEMO_TURNSTILE_SECRET_KEY/);
  });
});
