// Deliberately not named *.test.ts: normal pnpm test never collects this file.
import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import { expect, it, vi } from "vitest";
import { DemoChatStore, type DemoChatEval } from "../src/lib/demo/chat-store";
import { boundedVerificationScript, redisVerificationTarget } from "../scripts/demo-chat-redis-safety";

it("verifies production Lua on an explicitly selected disposable Upstash database", async () => {
  // Fail before constructing a client. Never print target, tokens or raw SDK errors.
  const target = redisVerificationTarget(process.env);
  const nativeFetch = globalThis.fetch;
  vi.stubGlobal("fetch", (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.origin !== new URL(target.url).origin || url.pathname !== "/") {
      throw new Error("Non-test-Redis networking forbidden.");
    }
    return nativeFetch(input, { ...init, redirect: "error" });
  });
  const redis = new Redis({ ...target, retry: { retries: 0 }, signal: () => AbortSignal.timeout(3_000), enableAutoPipelining: false });
  const run = randomUUID();
  let group = 0;
  const fixture = () => {
    const prefix = `evidence-atlas:demo-chat:test:${run}_${group++}`;
    const keys = new Set<string>();
    const evaluate: DemoChatEval = async (script, requested, args) => {
      const bounded = boundedVerificationScript(script, requested, prefix);
      requested.forEach((key) => keys.add(key));
      try { return await redis.eval(bounded, requested, args); }
      catch { throw new Error("Redis verification command failed (details suppressed)."); }
    };
    return { prefix, keys, evaluate, store: new DemoChatStore(evaluate, prefix) };
  };
  const fixtures: ReturnType<typeof fixture>[] = [];
  const make = () => { const f = fixture(); fixtures.push(f); return f; };
  // Only this Vitest process receives synthetic eligibility settings. No provider
  // module, handler or DB is imported; application dotenv files are never loaded.
  for (const [key, value] of Object.entries({
    PUBLIC_DEMO_MODE: "true", DEMO_CHAT_ENABLED: "true", C2_RUNTIME_MODE: "",
    DEMO_WORKSPACE_ID: "synthetic", DEMO_GROQ_API_KEY: "synthetic",
    NEXT_PUBLIC_DEMO_TURNSTILE_SITE_KEY: "synthetic", DEMO_TURNSTILE_SECRET_KEY: "synthetic",
    UPSTASH_REDIS_REST_URL: target.url, UPSTASH_REDIS_REST_TOKEN: target.token,
  })) vi.stubEnv(key, value);
  const research = "synthetic-public";
  try {
    const f = make();
    const starts = await Promise.allSettled(Array.from({ length: 8 }, () => f.store.start("same-token", research)));
    const issued = starts.flatMap((r) => r.status === "fulfilled" ? [r.value] : []);
    expect(issued).toHaveLength(1);
    for (const r of starts) if (r.status === "rejected") expect(r.reason).toMatchObject({ status: 403 });
    const { sessionId, threadId } = issued[0];
    const other = await f.store.start("different-token", research);
    await expect(f.store.check(other.sessionId, threadId, research)).rejects.toMatchObject({ status: 403 });
    const reservations = await Promise.allSettled(Array.from({ length: 12 }, () =>
      new DemoChatStore(f.evaluate, f.prefix).reserve(sessionId, threadId, research)));
    const leases = reservations.flatMap((r) => r.status === "fulfilled" ? [r.value] : []);
    expect(leases).toHaveLength(2);
    for (const r of reservations) if (r.status === "rejected") expect(r.reason).toMatchObject({ status: 429 });
    await f.store.renew(leases[0]);
    // Inject expired deadlines, never release automatically. Both still count.
    await f.evaluate("for i=1,#ARGV do redis.call('ZADD', KEYS[1], 0, ARGV[i]) end return 1", [`${f.prefix}:concurrency`], leases);
    await expect(f.store.renew(leases[0])).rejects.toMatchObject({ status: 503 });
    await expect(f.store.reserve(sessionId, threadId, research)).rejects.toMatchObject({ status: 429 });
    await f.store.release(leases[0]); await f.store.release(leases[0]);
    expect(await f.evaluate("return redis.call('ZCARD', KEYS[1])", [`${f.prefix}:concurrency`], [])).toBe(1);
    await f.store.release(leases[1]);
    await f.store.release(await f.store.reserve(sessionId, threadId, research));
    await expect(f.store.reserve(sessionId, threadId, research)).rejects.toMatchObject({ status: 429 }); // shared 3/min

    // Seed boundary state only in run-owned keys; production EVAL must reject
    // the last allowance under competition. No real-time minute/day waiting.
    for (const boundary of ["thread", "session", "global"] as const) {
      const b = make(); const ids = await b.store.start(`token-${boundary}`, research);
      await b.store.check(ids.sessionId, ids.threadId, research);
      const sessionKey = [...b.keys].find((k) => k.includes(":session:"))!;
      const threadKey = `${b.prefix}:thread:${ids.threadId}`;
      if (boundary === "global") {
        await b.evaluate("local t=redis.call('TIME'); redis.call('HSET', KEYS[1], 'day', math.floor(tonumber(t[1])/86400), 'count', 49); return 1", [`${b.prefix}:global`], []);
      } else if (boundary === "thread") {
        await b.evaluate("redis.call('HSET', KEYS[1], 'count', 9); return 1", [threadKey], []);
      } else {
        await b.evaluate("redis.call('SET', KEYS[1], 19, 'KEEPTTL'); return 1", [sessionKey], []);
      }
      const results = await Promise.allSettled(Array.from({ length: 8 }, () => b.store.reserve(ids.sessionId, ids.threadId, research)));
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      for (const r of results) if (r.status === "rejected") expect(r.reason).toMatchObject({ status: 429 });
      if (boundary === "global") {
        await b.evaluate("local t=redis.call('TIME'); redis.call('HSET', KEYS[1], 'day', math.floor(tonumber(t[1])/86400)-1, 'count', 50); return 1", [`${b.prefix}:global`], []);
        await b.store.release(await b.store.reserve(ids.sessionId, ids.threadId, research));
      }
    }
    const sessionKey = [...f.keys].find((k) => k.includes(":session:"))!;
    await f.evaluate("return redis.call('PEXPIRE', KEYS[1], 30000)", [sessionKey], []);
    const inherited = await f.store.createThread(sessionId, research);
    const inheritedTtl = Number(await f.evaluate("return redis.call('PTTL', KEYS[1])", [`${f.prefix}:thread:${inherited}`], []));
    expect(inheritedTtl).toBeGreaterThan(0);
    expect(inheritedTtl).toBeLessThanOrEqual(30000);
    await f.evaluate("return redis.call('PEXPIREAT', KEYS[1], 1)", [sessionKey], []);
    await expect(f.store.check(sessionId, inherited, research)).rejects.toMatchObject({ status: 401 });
    await expect(f.store.createThread(sessionId, research)).rejects.toMatchObject({ status: 401 });
    // Prove partial-write error cleanup is atomic, too.
    const errorKey = `${f.prefix}:partial-error`;
    await expect(f.evaluate("redis.call('SET', KEYS[1], 'value'); error('synthetic')", [errorKey], [])).rejects.toThrow();
    for (const b of fixtures) for (const key of b.keys) {
      const ttl = Number(await b.evaluate("return redis.call('PTTL', KEYS[1])", [key], []));
      expect(ttl === -2 || (ttl > 0 && ttl <= 900000)).toBe(true);
    }
  } finally {
    // No DEL/scan/global cleanup: the same-EVAL TTL bounds all test keys even
    // if this process is killed or the response is lost. No real upstream exists.
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  }
});
