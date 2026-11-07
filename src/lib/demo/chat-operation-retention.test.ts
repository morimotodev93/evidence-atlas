import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DEMO_CHAT_OPERATION_TTL_MS, DEMO_CHAT_REDIS } from "./chat-config";
import { prepareDemoOperationRetentionBatch } from "./chat-operation-retention";
import { OfflineRedis } from "./chat-test-redis";

const key = `${DEMO_CHAT_REDIS.prefix}:operations`;
const id = (letter: string) => letter.repeat(43);
const record = (reservedAt: number, extra = {}) => JSON.stringify({
  schema: 1, leaseId: id("l"), scopeHash: "a".repeat(64), reservedAt, reservationState: "reserved", ...extra,
});
let redis: OfflineRedis;
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden"); }));
  redis = new OfflineRedis();
});
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); });

it("prepares a bounded, side-effect-free plan and expires legacy fields from their original creation time", async () => {
  const now = redis.now;
  const entries = [[id("a"), record(now - 1000)], [id("b"), record(now - DEMO_CHAT_OPERATION_TTL_MS)]] as const;
  redis.entries.set(key, { value: new Map(entries) });
  redis.entries.set(`${DEMO_CHAT_REDIS.prefix}:concurrency`, { value: new Map([[id("l"), now + 60_000]]) });
  redis.entries.set(`${DEMO_CHAT_REDIS.prefix}:global`, { value: new Map([["count", "50"]]) });
  const before = structuredClone(redis.entries);
  const plan = prepareDemoOperationRetentionBatch(entries);
  expect(redis.entries).toEqual(before);
  expect(await redis.eval(plan.script, plan.keys, plan.args)).toBe(1);
  const retained = redis.entries.get(key)!;
  expect((retained.value as Map<string, string>).get(id("a"))).toBe(entries[0][1]);
  expect((retained.value as Map<string, string>).has(id("b"))).toBe(false);
  expect(retained.fieldExpires?.get(id("a"))).toBe(now - 1000 + DEMO_CHAT_OPERATION_TTL_MS);
  expect(retained.expires).toBeUndefined();
  expect(redis.entries.get(`${DEMO_CHAT_REDIS.prefix}:concurrency`)).toEqual(before.get(`${DEMO_CHAT_REDIS.prefix}:concurrency`));
  expect(redis.entries.get(`${DEMO_CHAT_REDIS.prefix}:global`)).toEqual(before.get(`${DEMO_CHAT_REDIS.prefix}:global`));
  redis.now += 1000;
  const again = prepareDemoOperationRetentionBatch([entries[0]]);
  expect(await redis.eval(again.script, again.keys, again.args)).toBe(1);
  expect(retained.fieldExpires?.get(id("a"))).toBe(now - 1000 + DEMO_CHAT_OPERATION_TTL_MS);
});

it("checks the entire batch before writes and preserves changed or missing records", async () => {
  const entries = [[id("a"), record(redis.now)], [id("b"), record(redis.now)]] as const;
  redis.entries.set(key, { value: new Map([[id("a"), entries[0][1]], [id("b"), record(redis.now, { reservationState: "attempted" })]]) });
  const before = structuredClone(redis.entries);
  const plan = prepareDemoOperationRetentionBatch(entries);
  expect(await redis.eval(plan.script, plan.keys, plan.args)).toBe(409);
  expect(redis.entries).toEqual(before);
  (redis.entries.get(key)!.value as Map<string, string>).delete(id("b"));
  expect(await redis.eval(plan.script, plan.keys, plan.args)).toBe(409);
  expect(redis.entries.get(key)!.fieldExpires).toBeUndefined();
});

it("rejects a future creation time or key-wide TTL without changing data", async () => {
  const entries = [[id("a"), record(redis.now + 1)]] as const;
  redis.entries.set(key, { value: new Map(entries) });
  const plan = prepareDemoOperationRetentionBatch(entries);
  expect(await redis.eval(plan.script, plan.keys, plan.args)).toBe(503);
  expect(redis.entries.get(key)!.fieldExpires).toBeUndefined();
  redis.entries.get(key)!.expires = redis.now + 1000;
  expect(await redis.eval(plan.script, plan.keys, plan.args)).toBe(409);
  expect(redis.entries.get(key)!.expires).toBe(redis.now + 1000);
});

it("does not hide partial migration failures or extend the deadline when a batch is prepared again", async () => {
  const entries = [[id("a"), record(redis.now)], [id("b"), record(redis.now)]] as const;
  redis.entries.set(key, { value: new Map(entries) });
  const plan = prepareDemoOperationRetentionBatch(entries);
  redis.beforeCommand = (command, args) => {
    if (command === "HPEXPIREAT" && args[4] === id("b")) throw new Error("Unsupported or failed expiry");
  };
  await expect(redis.eval(plan.script, plan.keys, plan.args)).rejects.toThrow();
  expect(redis.entries.get(key)!.fieldExpires?.size).toBe(1);
  const originalExpiry = redis.entries.get(key)!.fieldExpires!.get(id("a"));
  redis.beforeCommand = undefined;
  redis.now += 1000;
  expect(await redis.eval(plan.script, plan.keys, plan.args)).toBe(1);
  expect(redis.entries.get(key)!.fieldExpires?.get(id("a"))).toBe(originalExpiry);
});

it.each([
  "invalid JSON", "null", record(-1), record(1.5), record(Number.MAX_SAFE_INTEGER + 1),
  record(0, { schema: 2 }), record(0, { leaseId: "invalid" }), record(0, { scopeHash: "invalid" }),
  record(0, { reservationState: "unknown" }),
])("rejects malformed legacy data during preparation: %s", (value) => {
  expect(() => prepareDemoOperationRetentionBatch([[id("a"), value]])).toThrow("Invalid legacy operation record.");
  expect(redis.calls).toEqual([]);
});

it("rejects empty, oversized, duplicate-ID and invalid-ID batches", () => {
  const pair = [id("a"), record(redis.now)] as const;
  for (const entries of [[], Array(101).fill(pair), [pair, pair], [["invalid", pair[1]] as const]]) {
    expect(() => prepareDemoOperationRetentionBatch(entries)).toThrow();
  }
  expect(redis.calls).toEqual([]);
});
