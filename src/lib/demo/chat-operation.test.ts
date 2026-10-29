import { createHash } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  createDemoChatOperationId, DEMO_CHAT_OPERATION_MAX_RECORDS,
  DemoChatStore, RESERVE_QUESTION,
} from "./chat-store";
import { OfflineRedis } from "./chat-test-redis";

const prefix = "evidence-atlas:demo-chat:v1";
const research = "public-research";
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
let redis: OfflineRedis, store: DemoChatStore;
const records = () => redis.entries.get(`${prefix}:operations`)?.value as Map<string, string> | undefined;
const leases = () => redis.entries.get(`${prefix}:concurrency`)?.value as Map<string, number> | undefined;
const record = (operation: string) => JSON.parse(records()!.get(operation)!);

beforeEach(() => {
  for (const [key, value] of Object.entries({
    PUBLIC_DEMO_MODE: "true", DEMO_CHAT_ENABLED: "true", C2_RUNTIME_MODE: "",
    DEMO_WORKSPACE_ID: "public", DEMO_GROQ_API_KEY: "synthetic",
    NEXT_PUBLIC_DEMO_TURNSTILE_SITE_KEY: "synthetic", DEMO_TURNSTILE_SECRET_KEY: "synthetic",
    UPSTASH_REDIS_REST_URL: "https://redis.example.invalid", UPSTASH_REDIS_REST_TOKEN: "synthetic",
  })) vi.stubEnv(key, value);
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden"); }));
  redis = new OfflineRedis(); store = new DemoChatStore(redis.eval);
});
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it("issues 256-bit server operation IDs independently before reservation", () => {
  const ids = Array.from({ length: 1024 }, createDemoChatOperationId);
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(redis.entries.size).toBe(0);
});

it("records operation, lease, scoped binding and Redis time in the same reservation EVAL", async () => {
  const session = await store.start("token", research);
  const operation = createDemoChatOperationId();
  let reservations = 0;
  store = new DemoChatStore(async (script, keys, args) => {
    expect(script).toBe(RESERVE_QUESTION);
    expect(args[10]).toBe(operation); // Known to the caller before any EVAL.
    expect(records()).toBeUndefined();
    const result = await redis.eval(script, keys, args);
    expect(record(operation).leaseId).toBe(args[8]);
    expect(leases()!.has(String(args[8]))).toBe(true);
    reservations++;
    return result;
  });
  const lease = await store.reserve(session.sessionId, session.threadId, research, operation);
  expect(reservations).toBe(1);
  expect(lease).not.toBe(operation);
  expect(record(operation)).toEqual({
    schema: 1, leaseId: lease,
    scopeHash: sha(JSON.stringify([sha(session.sessionId), session.threadId, research])),
    reservedAt: redis.now, reservationState: "reserved",
  });
  expect(redis.entries.get(`${prefix}:operations`)!.expires).toBeUndefined();
  expect(records()!.get(operation)).not.toMatch(new RegExp(`${session.sessionId}|${session.threadId}|${research}|synthetic`));
  // A bounded format, not a guarantee about Redis allocator/replication overhead.
  expect(Buffer.byteLength(operation + records()!.get(operation)!)).toBeLessThan(300);
});

it("denies duplicate operations across workers without a second grant or budget charge", async () => {
  const session = await store.start("token", research);
  const operation = createDemoChatOperationId();
  const results = await Promise.allSettled(Array.from({ length: 12 }, () =>
    new DemoChatStore(redis.eval).reserve(session.sessionId, session.threadId, research, operation)));
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  for (const result of results) if (result.status === "rejected") {
    expect(result.reason).toMatchObject({ status: 503, operationId: operation, outcome: "duplicate" });
  }
  expect(records()!.size).toBe(1); expect(leases()!.size).toBe(1);
  expect((redis.entries.get(`${prefix}:thread:${session.threadId}`)!.value as Map<string, string>).get("count")).toBe(1);
  expect(redis.entries.get(`${prefix}:session:${sha(session.sessionId)}`)!.value).toBe("1");
  expect((redis.entries.get(`${prefix}:global`)!.value as Map<string, number>).get("count")).toBe("1");
});

it("keeps replay protection after normal release and lease deadline expiry", async () => {
  const session = await store.start("token", research), operation = createDemoChatOperationId();
  const lease = await store.reserve(session.sessionId, session.threadId, research, operation);
  await store.release(lease);
  redis.now += 120_000;
  await store.check(session.sessionId, session.threadId, research); // Apply ordinary key expiry before snapshot.
  const before = structuredClone(redis.entries);
  await expect(store.reserve(session.sessionId, session.threadId, research, operation))
    .rejects.toMatchObject({ outcome: "duplicate" });
  expect(redis.entries).toEqual(before);
  expect(record(operation).reservationState).toBe("reserved"); // Not a live-generation state.
  expect(leases()!.size).toBe(0);
});

it("rejects capacity and ownership failures without new records or question charges", async () => {
  const session = await store.start("token", research);
  await store.reserve(session.sessionId, session.threadId, research);
  await store.reserve(session.sessionId, session.threadId, research);
  const before = structuredClone(redis.entries);
  for (const [target, status] of [[research, 429], ["different-research", 403]] as const) {
    const operation = createDemoChatOperationId();
    await expect(store.reserve(session.sessionId, session.threadId, target, operation))
      .rejects.toMatchObject({ status, operationId: operation, outcome: "rejected" });
    expect(records()!.has(operation)).toBe(false);
  }
  expect(redis.entries).toEqual(before);
});

it.each(["before execution", "after commit"])("fails closed on reservation response loss %s", async (mode) => {
  const session = await store.start("token", research), operation = createDemoChatOperationId();
  const evaluate = vi.fn(async (script, keys, args) => {
    if (mode === "after commit") await redis.eval(script, keys, args);
    throw new Error("Response unavailable");
  });
  await expect(new DemoChatStore(evaluate).reserve(session.sessionId, session.threadId, research, operation))
    .rejects.toMatchObject({ status: 503, operationId: operation, outcome: "unknown" });
  expect(evaluate).toHaveBeenCalledOnce();
  if (mode === "after commit") {
    expect(record(operation).reservationState).toBe("reserved");
    expect(leases()!.has(record(operation).leaseId)).toBe(true);
    const before = structuredClone(redis.entries);
    await expect(store.reserve(session.sessionId, session.threadId, research, operation))
      .rejects.toMatchObject({ outcome: "duplicate" });
    expect(redis.entries).toEqual(before);
  } else {
    expect(records()).toBeUndefined(); expect(leases()).toBeUndefined();
    // Absence is not proof the unavailable call cannot arrive later. No retry.
  }
});

it("does not double-reserve when an unacknowledged call arrives after a same-operation retry", async () => {
  const session = await store.start("token", research), operation = createDemoChatOperationId();
  let delayed!: () => Promise<unknown>;
  const unavailable = new DemoChatStore(async (script, keys, args) => {
    delayed = () => redis.eval(script, keys, args);
    throw new Error("Transport failed; execution may still arrive");
  });
  await expect(unavailable.reserve(session.sessionId, session.threadId, research, operation))
    .rejects.toMatchObject({ outcome: "unknown" });
  // Not an automatic application retry: exercise the Lua fence in the reverse ordering.
  const granted = await store.reserve(session.sessionId, session.threadId, research, operation);
  const before = structuredClone(redis.entries);
  expect(await delayed()).toBe(409);
  expect(redis.entries).toEqual(before);
  expect(record(operation).leaseId).toBe(granted);
  expect(leases()!.size).toBe(1);
});

it("fails closed before charging budgets if the correlation store has the wrong type", async () => {
  const session = await store.start("token", research), operation = createDemoChatOperationId();
  redis.entries.set(`${prefix}:operations`, { value: "corrupt state" });
  const before = structuredClone(redis.entries);
  await expect(store.reserve(session.sessionId, session.threadId, research, operation))
    .rejects.toMatchObject({ status: 503, outcome: "unknown" });
  expect(redis.entries).toEqual(before);
});

it.each(["before budgets", "during budgets", "after lease"])("fences a partial Lua failure %s", async (stage) => {
  const session = await store.start("token", research), operation = createDemoChatOperationId();
  redis.beforeCommand = (command, args) => {
    if ((stage === "before budgets" && command === "INCR")
      || (stage === "during budgets" && command === "HINCRBY")
      || (stage === "after lease" && command === "HSET" && args[0] === `${prefix}:operations`
        && args[2].includes('"reservationState":"reserved"'))) throw new Error("Injected command failure");
  };
  await expect(store.reserve(session.sessionId, session.threadId, research, operation))
    .rejects.toMatchObject({ outcome: "unknown" });
  expect(record(operation).reservationState).toBe("attempted");
  expect(leases()?.size ?? 0).toBe(stage === "after lease" ? 1 : 0);
  redis.beforeCommand = undefined;
  const before = structuredClone(redis.entries);
  await expect(store.reserve(session.sessionId, session.threadId, research, operation))
    .rejects.toMatchObject({ outcome: "duplicate" });
  expect(redis.entries).toEqual(before); // Partial charges are never refunded.
});

it("bounds record count without TTL, eviction or releasing an active owner's lease", async () => {
  const session = await store.start("token", research), operation = createDemoChatOperationId();
  const active = await store.reserve(session.sessionId, session.threadId, research, operation);
  for (let i = 1; i < DEMO_CHAT_OPERATION_MAX_RECORDS; i++) records()!.set(`retained-${i}`, "synthetic history");
  const before = structuredClone(redis.entries);
  await expect(store.reserve(session.sessionId, session.threadId, research))
    .rejects.toMatchObject({ status: 503, outcome: "rejected" });
  expect(redis.entries).toEqual(before);
  await store.renew(active);
  expect(leases()!.has(active)).toBe(true);
  expect(records()!.size).toBe(DEMO_CHAT_OPERATION_MAX_RECORDS);
  expect(redis.entries.get(`${prefix}:operations`)!.expires).toBeUndefined();
});

it.each([null, "1", 2])("treats malformed reservation acknowledgement %s as unknown", async (reply) => {
  const operation = createDemoChatOperationId();
  const evaluate = vi.fn(async () => reply);
  await expect(new DemoChatStore(evaluate).reserve("a".repeat(43), "b".repeat(43), research, operation))
    .rejects.toMatchObject({ status: 503, operationId: operation, outcome: "unknown" });
  expect(evaluate).toHaveBeenCalledOnce();
});

it("rejects malformed internal operation IDs before Redis", async () => {
  const evaluate = vi.fn();
  for (const operation of ["", "client-input", "x".repeat(44)]) {
    await expect(new DemoChatStore(evaluate).reserve("a".repeat(43), "b".repeat(43), research, operation))
      .rejects.toMatchObject({ status: 503 });
  }
  expect(evaluate).not.toHaveBeenCalled();
});
