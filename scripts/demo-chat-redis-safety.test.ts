import { describe, expect, it, vi } from "vitest";
import { boundedVerificationScript, redisVerificationTarget } from "./demo-chat-redis-safety";
import { DemoChatStore } from "../src/lib/demo/chat-store";
import { OfflineRedis } from "../src/lib/demo/chat-test-redis";

const target = {
  DEMO_CHAT_REDIS_VERIFY: "dedicated-test-database",
  DEMO_CHAT_TEST_REDIS_REST_URL: "https://test.upstash.io",
  DEMO_CHAT_TEST_REDIS_REST_TOKEN: "synthetic-test-only",
};
describe("manual Redis verification safeguards (offline)", () => {
  it("requires explicit opt-in and dedicated credentials", () => {
    expect(() => redisVerificationTarget({})).toThrow();
    expect(() => redisVerificationTarget({ ...target, DEMO_CHAT_REDIS_VERIFY: "true" })).toThrow();
    expect(() => redisVerificationTarget({ ...target, DEMO_CHAT_TEST_REDIS_REST_TOKEN: "" })).toThrow();
    expect(redisVerificationTarget(target)).toEqual({ url: target.DEMO_CHAT_TEST_REDIS_REST_URL, token: target.DEMO_CHAT_TEST_REDIS_REST_TOKEN });
  });
  it.each(["UPSTASH_REDIS_REST_URL", "KV_REST_API_URL"])("rejects application target %s", (key) => {
    expect(() => redisVerificationTarget({ ...target, [key]: `${target.DEMO_CHAT_TEST_REDIS_REST_URL}/` })).toThrow();
  });
  it.each(["http://test.upstash.io", "https://user:secret@test.upstash.io", "https://test.upstash.io/path", "https://evil.invalid"])("rejects unsafe endpoint", (url) => {
    expect(() => redisVerificationTarget({ ...target, DEMO_CHAT_TEST_REDIS_REST_URL: url })).toThrow();
  });
  it("restricts injected prefixes and every verification key", () => {
    const evaluate = vi.fn();
    expect(() => new DemoChatStore(evaluate, "evidence-atlas:demo-chat:v1:probe")).toThrow();
    const prefix = "evidence-atlas:demo-chat:test:offline";
    expect(() => boundedVerificationScript("return 1", ["evidence-atlas:demo-chat:v1:global"], prefix)).toThrow();
    expect(() => boundedVerificationScript("return 1", [`${prefix}-other:key`], prefix)).toThrow();
    expect(boundedVerificationScript("return 1", [`${prefix}:key`], prefix)).toContain("pcall");
    expect(evaluate).not.toHaveBeenCalled();
  });
  it.each([false, true])("installs bounded TTL inside EVAL even on partial-write failure=%s", async (failure) => {
    const redis = new OfflineRedis();
    const prefix = "evidence-atlas:demo-chat:test:ttl";
    const key = `${prefix}:key`;
    const script = boundedVerificationScript(`redis.call('SET', KEYS[1], 'value'); ${failure ? "error('synthetic')" : "return 1"}`, [key], prefix);
    if (failure) await expect(redis.eval(script, [key], [])).rejects.toThrow();
    else expect(await redis.eval(script, [key], [])).toBe(1);
    expect(redis.entries.get(key)?.expires).toBe(redis.now + 900000);
  });
});
