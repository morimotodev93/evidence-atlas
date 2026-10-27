import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { DemoChatStore } from "./chat-store";
import { OfflineRedis } from "./chat-test-redis";

let redis: OfflineRedis, store: DemoChatStore;
const research = "public-research";
beforeEach(() => {
  for (const [key, value] of Object.entries({
    PUBLIC_DEMO_MODE: "true", DEMO_CHAT_ENABLED: "true", C2_RUNTIME_MODE: "",
    DEMO_WORKSPACE_ID: "public", DEMO_GROQ_API_KEY: "synthetic", NEXT_PUBLIC_DEMO_TURNSTILE_SITE_KEY: "synthetic",
    DEMO_TURNSTILE_SECRET_KEY: "synthetic", UPSTASH_REDIS_REST_URL: "https://redis.example.invalid", UPSTASH_REDIS_REST_TOKEN: "synthetic",
  })) vi.stubEnv(key, value);
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden"); }));
  redis = new OfflineRedis(); store = new DemoChatStore(redis.eval);
});
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
async function one(sessionId: string, threadId: string) {
  const lease = await store.reserve(sessionId, threadId, research);
  await store.release(lease);
}
async function nextSession(index: number) {
  redis.now += 60_001;
  return store.start(`token-${index}`, research);
}

describe("Atomic production Lua with mocked Redis commands", () => {
  it("shares source limits across sessions, threads and independent workers", async () => {
    const a = await store.start("a", research), b = await store.start("b", research);
    for (const ids of [a, b, a]) await one(ids.sessionId, ids.threadId);
    await expect(new DemoChatStore(redis.eval).reserve(b.sessionId, b.threadId, research)).rejects.toMatchObject({ status: 429 });
  });
  it("isolates the verification namespace from production keys", async () => {
    const isolated = new DemoChatStore(redis.eval, "evidence-atlas:demo-chat:test:offline");
    const ids = await isolated.start("same-token", research);
    await expect(store.check(ids.sessionId, ids.threadId, research)).rejects.toMatchObject({ status: 401 });
    const production = await store.start("same-token", research);
    await store.check(production.sessionId, production.threadId, research);
  });
  it("Lua runtime errors fail closed, with no retry or memory fallback", async () => {
    let calls = 0;
    const broken = new DemoChatStore(async (script, keys, args) => {
      calls++;
      return redis.eval(`error('synthetic Lua error')\n${script}`, keys, args);
    });
    await expect(broken.start("token", research)).rejects.toMatchObject({ status: 503 });
    expect(calls).toBe(1);
  });
  it("rejects question 11 using server thread count; release never refunds budgets", async () => {
    const { sessionId, threadId } = await store.start("one", research);
    for (let n = 0; n < 10; n++) {
      redis.now += 60_001; await one(sessionId, threadId);
    }
    redis.now += 60_001;
    await expect(store.reserve(sessionId, threadId, research)).rejects.toMatchObject({ status: 429 });
  });
  it("enforces 20 per fixed session lifetime across server-issued threads", async () => {
    const { sessionId } = await store.start("one", research);
    for (let group = 0; group < 2; group++) {
      const thread = await store.createThread(sessionId, research);
      for (let n = 0; n < 10; n++) { redis.now += 60_001; await one(sessionId, thread); }
    }
    const thread = await store.createThread(sessionId, research);
    redis.now += 60_001;
    await expect(store.reserve(sessionId, thread, research)).rejects.toMatchObject({ status: 429 });
    redis.now += 86400000;
    await expect(store.createThread(sessionId, research)).rejects.toMatchObject({ status: 401 });
  });
  it("enforces rolling 3 / 60s, exact boundary, and ignores forged IP headers by sharing the source key", async () => {
    const { sessionId, threadId } = await store.start("one", research);
    for (let n = 0; n < 3; n++) await one(sessionId, threadId);
    redis.now += 59_999;
    await expect(store.reserve(sessionId, threadId, research)).rejects.toMatchObject({ status: 429 });
    redis.now += 1; await one(sessionId, threadId);
  });
  it("enforces 50 / UTC calendar day across sessions then resets at UTC midnight", async () => {
    for (let group = 0; group < 5; group++) {
      const { sessionId, threadId } = await nextSession(group);
      for (let n = 0; n < 10; n++) { redis.now += 60_001; await one(sessionId, threadId); }
    }
    const { sessionId, threadId } = await nextSession(5);
    await expect(store.reserve(sessionId, threadId, research)).rejects.toMatchObject({ status: 429 });
    redis.now = Math.floor(redis.now / 86400000) * 86400000 + 86400000;
    await one(sessionId, threadId);
  });
  it("simultaneous requests through independent stores cannot exceed two leases", async () => {
    const issued = await store.start("one", research);
    const stores = Array.from({ length: 20 }, () => new DemoChatStore(redis.eval));
    const results = await Promise.allSettled(stores.map((s) => s.reserve(issued.sessionId, issued.threadId, research)));
    const leases = results.flatMap((r) => r.status === "fulfilled" ? [r.value] : []);
    expect(leases).toHaveLength(2);
    for (const result of results) if (result.status === "rejected") expect(result.reason).toMatchObject({ status: 429 });
    for (const lease of leases) await store.release(lease);
    // Failed reservations did not consume question/source counters.
    await one(issued.sessionId, issued.threadId);
    await expect(store.reserve(issued.sessionId, issued.threadId, research)).rejects.toMatchObject({ status: 429 });
  });
  it("parallel requests cannot exceed the final thread and session allowance", async () => {
    const { sessionId } = await store.start("one", research);
    const threads = [await store.createThread(sessionId, research), await store.createThread(sessionId, research)];
    for (const thread of threads) {
      for (let n = 0; n < 9; n++) { redis.now += 60_001; await one(sessionId, thread); }
    }
    redis.now += 60_001;
    const results = await Promise.allSettled(Array.from({ length: 12 }, (_, n) =>
      new DemoChatStore(redis.eval).reserve(sessionId, threads[n % 2], research)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    for (const result of results) if (result.status === "fulfilled") await store.release(result.value);
    const third = await store.createThread(sessionId, research); redis.now += 60_001;
    await expect(store.reserve(sessionId, third, research)).rejects.toMatchObject({ status: 429 });
  });
  it("parallel requests cannot exceed the last global allowance", async () => {
    for (let group = 0; group < 5; group++) {
      const { sessionId, threadId } = await nextSession(group);
      for (let n = 0; n < (group === 4 ? 9 : 10); n++) { redis.now += 60_001; await one(sessionId, threadId); }
    }
    const { sessionId, threadId } = await nextSession(5);
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => new DemoChatStore(redis.eval).reserve(sessionId, threadId, research)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
  it("renewal cannot revive an expired lease; expiry quarantines capacity; release is idempotent", async () => {
    const { sessionId, threadId } = await store.start("one", research);
    const a = await store.reserve(sessionId, threadId, research), b = await store.reserve(sessionId, threadId, research);
    redis.now += 59_000; await store.renew(a);
    redis.now += 1_000; await expect(store.renew(b)).rejects.toMatchObject({ status: 503 });
    redis.now += 120_000;
    await expect(store.reserve(sessionId, threadId, research)).rejects.toMatchObject({ status: 429 });
    await store.release(a); await store.release(a); // Never removes b.
    const c = await store.reserve(sessionId, threadId, research);
    await expect(store.reserve(sessionId, threadId, research)).rejects.toMatchObject({ status: 429 });
    await store.release(b); await store.release(c);
    await one(sessionId, threadId);
  });
  it("Redis uncertainty fails closed on reservation, renewal and release", async () => {
    const { sessionId, threadId } = await store.start("one", research);
    const lease = await store.reserve(sessionId, threadId, research); redis.fail = true;
    for (const operation of [() => store.reserve(sessionId, threadId, research), () => store.renew(lease), () => store.release(lease)]) {
      await expect(operation()).rejects.toMatchObject({ status: 503, message: "Demo Chat request refused." });
    }
  });
  it("new threads inherit remaining lifetime and do not renew sessions", async () => {
    const { sessionId } = await store.start("one", research);
    redis.now += 86_399_000;
    const thread = await store.createThread(sessionId, research); await store.check(sessionId, thread, research);
    redis.now += 1000; await expect(store.check(sessionId, thread, research)).rejects.toMatchObject({ status: 401 });
  });
  it("session start is bounded separately and replay reservations are atomic", async () => {
    const results = await Promise.allSettled(Array.from({ length: 12 }, (_, n) => store.start(`token-${n}`, research)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
  });
});
