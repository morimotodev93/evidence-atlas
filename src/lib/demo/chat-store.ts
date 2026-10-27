import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { Redis } from "@upstash/redis";
import { DEMO_CHAT_LIMITS as limits, DEMO_CHAT_REDIS, requireDemoChatEnabled } from "./chat-config";
import { DEMO_CHAT_LEASE_MS, DEMO_CHAT_SESSION_SECONDS, DemoChatError, demoChatId } from "./chat-security";

export type DemoChatEval = (script: string, keys: string[], args: (string | number)[]) => Promise<unknown>;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const newId = () => randomBytes(32).toString("base64url");

// TIME comes from Redis, avoiding clock differences between server instances.
const clock = `local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000.0 + math.floor(tonumber(t[2]) / 1000)
`;

export const START_SESSION = clock + `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
redis.call('ZREMRANGEBYSCORE', KEYS[4], '-inf', now - 60000)
if redis.call('ZCARD', KEYS[4]) >= 3 then return 429 end
if redis.call('EXISTS', KEYS[2]) == 1 or redis.call('EXISTS', KEYS[3]) == 1 then return 0 end
redis.call('SET', KEYS[1], 'used', 'EX', 600, 'NX')
redis.call('SET', KEYS[2], '0', 'EX', ARGV[1], 'NX')
redis.call('HSET', KEYS[3], 'owner', ARGV[2], 'research', ARGV[3], 'count', 0)
redis.call('EXPIRE', KEYS[3], ARGV[1])
redis.call('ZADD', KEYS[4], now, ARGV[2])
redis.call('PEXPIRE', KEYS[4], 60000)
return 1`;

export const CHECK_THREAD = `
if redis.call('EXISTS', KEYS[1]) ~= 1 then return 401 end
if redis.call('HGET', KEYS[2], 'owner') ~= ARGV[1] or
   redis.call('HGET', KEYS[2], 'research') ~= ARGV[2] then return 403 end
return 1`;

export const CREATE_THREAD = `
local ttl = redis.call('PTTL', KEYS[1])
if ttl <= 0 then return 401 end
if redis.call('EXISTS', KEYS[2]) == 1 then return 503 end
redis.call('HSET', KEYS[2], 'owner', ARGV[1], 'research', ARGV[2], 'count', 0)
redis.call('PEXPIRE', KEYS[2], ttl)
return 1`;

export const RESERVE_QUESTION = clock + CHECK_THREAD.replace("return 1", "") + `
local day = math.floor(now / 86400000)
local globalDay = tonumber(redis.call('HGET', KEYS[4], 'day') or '-1')
local globalCount = 0
if globalDay == day then globalCount = tonumber(redis.call('HGET', KEYS[4], 'count') or '0') end
redis.call('ZREMRANGEBYSCORE', KEYS[3], '-inf', now - tonumber(ARGV[6]))
if tonumber(redis.call('HGET', KEYS[2], 'count')) >= tonumber(ARGV[3]) or
   tonumber(redis.call('GET', KEYS[1])) >= tonumber(ARGV[4]) or
   redis.call('ZCARD', KEYS[3]) >= tonumber(ARGV[5]) or
   globalCount >= tonumber(ARGV[7]) or
   redis.call('ZCARD', KEYS[5]) >= tonumber(ARGV[8]) then return 429 end
if redis.call('ZSCORE', KEYS[5], ARGV[9]) then return 503 end
redis.call('INCR', KEYS[1])
redis.call('HINCRBY', KEYS[2], 'count', 1)
redis.call('ZADD', KEYS[3], now, ARGV[9])
redis.call('PEXPIRE', KEYS[3], ARGV[6])
redis.call('HSET', KEYS[4], 'day', day, 'count', globalCount + 1)
redis.call('PEXPIREAT', KEYS[4], (day + 1) * 86400000.0)
redis.call('ZADD', KEYS[5], now + tonumber(ARGV[10]), ARGV[9])
return 1`;

// Expired leases remain counted (quarantine). A crashed or partitioned worker
// must never free capacity while its upstream generation could still be running.
export const RENEW_LEASE = clock + `
local deadline = tonumber(redis.call('ZSCORE', KEYS[1], ARGV[1]) or '0')
if deadline <= now then return 0 end
redis.call('ZADD', KEYS[1], now + tonumber(ARGV[2]), ARGV[1])
return 1`;
export const RELEASE_LEASE = `return redis.call('ZREM', KEYS[1], ARGV[1])`;

export class DemoChatStore {
  constructor(
    private readonly evaluate: DemoChatEval,
    private readonly prefix: string = DEMO_CHAT_REDIS.prefix,
  ) {
    // Alternate namespaces are restricted to disposable verification runs.
    if (prefix !== DEMO_CHAT_REDIS.prefix && !/^evidence-atlas:demo-chat:test:[a-zA-Z0-9_-]{1,80}$/.test(prefix)) {
      throw new DemoChatError(503);
    }
  }

  private async run(script: string, keys: string[], args: (string | number)[]) {
    try { return await this.evaluate(script, keys, args); }
    catch { throw new DemoChatError(503); }
  }

  private keys(session: string, thread: string) {
    if (!demoChatId.test(session) || !demoChatId.test(thread)) throw new DemoChatError(401);
    return [`${this.prefix}:session:${hash(session)}`, `${this.prefix}:thread:${thread}`];
  }

  async start(token: string, researchId: string) {
    requireDemoChatEnabled();
    const sessionId = newId();
    const threadId = newId();
    const owner = hash(sessionId);
    const result = await this.run(START_SESSION, [
      `${this.prefix}:token:${hash(token)}`, ...this.keys(sessionId, threadId), `${this.prefix}:start:shared`,
    ], [DEMO_CHAT_SESSION_SECONDS, owner, researchId]);
    if (result !== 1) throw new DemoChatError(result === 429 ? 429 : 403);
    return { sessionId, threadId };
  }

  async check(session: string, thread: string, research: string) {
    requireDemoChatEnabled();
    const result = await this.run(CHECK_THREAD, this.keys(session, thread), [hash(session), research]);
    if (result !== 1) throw new DemoChatError(result === 401 ? 401 : 403);
  }

  // Internal only. Future ingress must revalidate public Research before calling.
  // New threads inherit remaining session lifetime; they never reset its budget.
  async createThread(session: string, research: string) {
    requireDemoChatEnabled();
    const thread = newId();
    const result = await this.run(CREATE_THREAD, this.keys(session, thread), [hash(session), research]);
    if (result !== 1) throw new DemoChatError(result === 401 ? 401 : 503);
    return thread;
  }

  /** Internal future-generation contract. Never accepts a client question count.
   * Each successful reservation counts even if generation later fails; no refunds.
   * Source is intentionally shared until a trusted ingress IP adapter is supplied.
   */
  async reserve(session: string, thread: string, research: string) {
    requireDemoChatEnabled();
    const lease = newId();
    const result = await this.run(RESERVE_QUESTION, [
      ...this.keys(session, thread), `${this.prefix}:source:shared`, `${this.prefix}:global`, `${this.prefix}:concurrency`,
    ], [hash(session), research, limits.maxUserQuestionsPerThread, limits.anonymousSessionQuestions,
      limits.sourceQuestions, limits.sourceWindowSeconds * 1000, limits.globalQuestionsPerDay,
      limits.maxConcurrentGenerations, lease, DEMO_CHAT_LEASE_MS]);
    if (result !== 1) throw new DemoChatError([401, 403, 429].includes(Number(result)) ? Number(result) : 503);
    return lease;
  }

  async renew(lease: string) {
    if (!demoChatId.test(lease)) throw new DemoChatError(503);
    if (await this.run(RENEW_LEASE, [`${this.prefix}:concurrency`], [lease, DEMO_CHAT_LEASE_MS]) !== 1) {
      throw new DemoChatError(503);
    }
  }

  // Call ONLY after upstream work has stopped, including cancellation completion.
  // ZREM by unguessable lease ID is idempotent and cannot release another owner.
  async release(lease: string) {
    if (!demoChatId.test(lease)) throw new DemoChatError(503);
    await this.run(RELEASE_LEASE, [`${this.prefix}:concurrency`], [lease]);
  }
}

export function getDemoChatStore() {
  requireDemoChatEnabled();
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  try {
    if (new URL(url!).protocol !== "https:") throw new Error();
  } catch { throw new DemoChatError(503); }
  const redis = new Redis({
    url, token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
    // Installed 1.39.0 uses two attempts for retry:false; explicit zero is needed.
    retry: { retries: 0 }, signal: () => AbortSignal.timeout(3_000), enableAutoPipelining: false,
  });
  return new DemoChatStore((script, keys, args) => redis.eval(script, keys, args));
}
