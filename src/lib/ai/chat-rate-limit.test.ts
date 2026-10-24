import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const upstash = vi.hoisted(() => ({
  fromEnv: vi.fn(), create: vi.fn(), slidingWindow: vi.fn(), limit: vi.fn(),
}));
vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: upstash.fromEnv } }));
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: Object.assign(upstash.create, { slidingWindow: upstash.slidingWindow }),
}));

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(0);
  for (const key of ["CHAT_RATE_LIMIT_BACKEND", "C2_RUNTIME_MODE", "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN"]) vi.stubEnv(key, undefined);
  vi.stubEnv("NODE_ENV", "development");
  upstash.fromEnv.mockReturnValue({});
  upstash.create.mockImplementation(function () { return { limit: upstash.limit }; });
  upstash.slidingWindow.mockReturnValue("synthetic sliding window");
  upstash.limit.mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 60_000 });
});

afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

function configureUpstash() {
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.invalid");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "synthetic-token");
}

async function memoryLimiter() {
  vi.stubEnv("CHAT_RATE_LIMIT_BACKEND", "memory");
  return (await import("./chat-rate-limit")).getChatRateLimit();
}

describe("Chat rate-limit backend selection without service requests", () => {
  it.each([
    ["development", undefined], ["development", "upstash"],
    ["production", undefined], ["production", "upstash"], ["test", undefined],
  ])("uses Upstash in %s with backend %s", async (mode, backend) => {
    vi.stubEnv("NODE_ENV", mode);
    vi.stubEnv("CHAT_RATE_LIMIT_BACKEND", backend);
    configureUpstash();
    const { getChatRateLimit } = await import("./chat-rate-limit");
    await getChatRateLimit().limit("workspace:user");
    expect(upstash.fromEnv).toHaveBeenCalledOnce();
    expect(upstash.slidingWindow).toHaveBeenCalledExactlyOnceWith(10, "1 m");
    expect(upstash.create).toHaveBeenCalledExactlyOnceWith({
      redis: {}, limiter: "synthetic sliding window", prefix: "evidence-atlas:ai-chat", analytics: true,
    });
    expect(upstash.limit).toHaveBeenCalledExactlyOnceWith("workspace:user");
    expect(getChatRateLimit()).toBe(getChatRateLimit());
    expect(upstash.create).toHaveBeenCalledOnce();
  });

  it("uses memory only with the development opt-in, even without Redis settings", async () => {
    const limiter = await memoryLimiter();
    expect((await limiter.limit("workspace:user")).success).toBe(true);
    expect((await import("./chat-rate-limit")).getChatRateLimit()).toBe(limiter);
    expect(upstash.fromEnv).not.toHaveBeenCalled();
    expect(upstash.create).not.toHaveBeenCalled();
  });

  it.each(["production", "test", undefined])("refuses memory in %s even with valid Upstash settings", async (mode) => {
    vi.stubEnv("NODE_ENV", mode);
    vi.stubEnv("CHAT_RATE_LIMIT_BACKEND", "memory");
    configureUpstash();
    const { getChatRateLimit, ChatRateLimitConfigurationError } = await import("./chat-rate-limit");
    expect(getChatRateLimit).toThrow(ChatRateLimitConfigurationError);
    expect(upstash.fromEnv).not.toHaveBeenCalled();
    expect(upstash.create).not.toHaveBeenCalled();
  });

  it("cannot reuse a cached development memory limiter after changing to production", async () => {
    await memoryLimiter();
    vi.stubEnv("NODE_ENV", "production");
    const { getChatRateLimit, ChatRateLimitConfigurationError } = await import("./chat-rate-limit");
    expect(getChatRateLimit).toThrow(ChatRateLimitConfigurationError);
    expect(upstash.fromEnv).not.toHaveBeenCalled();
  });

  it.each(["disabled", "none", "MEMORY", "typo"])("refuses unknown backend %s", async (backend) => {
    vi.stubEnv("CHAT_RATE_LIMIT_BACKEND", backend);
    configureUpstash();
    const { getChatRateLimit, ChatRateLimitConfigurationError } = await import("./chat-rate-limit");
    expect(getChatRateLimit).toThrow(ChatRateLimitConfigurationError);
    expect(upstash.fromEnv).not.toHaveBeenCalled();
  });

  it.each(["both", "url", "token", "whitespace"])("rejects missing %s settings before constructing Redis", async (missing) => {
    configureUpstash();
    if (missing === "both" || missing === "url") vi.stubEnv("UPSTASH_REDIS_REST_URL", undefined);
    if (missing === "both" || missing === "token") vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", undefined);
    if (missing === "whitespace") vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", " \t ");
    const { getChatRateLimit, ChatRateLimitConfigurationError } = await import("./chat-rate-limit");
    expect(getChatRateLimit).toThrow(ChatRateLimitConfigurationError);
    expect(upstash.fromEnv).not.toHaveBeenCalled();
    expect(upstash.create).not.toHaveBeenCalled();
    expect(upstash.limit).not.toHaveBeenCalled();
  });

  it("retains Redis.fromEnv KV fallback compatibility", async () => {
    vi.stubEnv("KV_REST_API_URL", "https://redis.example.invalid");
    vi.stubEnv("KV_REST_API_TOKEN", "synthetic-token");
    await (await import("./chat-rate-limit")).getChatRateLimit().limit("workspace:user");
    expect(upstash.fromEnv).toHaveBeenCalledOnce();
    expect(upstash.limit).toHaveBeenCalledOnce();
  });

  it("checks the C2 guard before selecting memory or constructing Redis", async () => {
    vi.stubEnv("C2_RUNTIME_MODE", "local");
    vi.stubEnv("PUBLIC_DEMO_MODE", "false");
    vi.stubEnv("C2_MODE", "local");
    vi.stubEnv("C2_POSTGRES_PASSWORD", "synthetic-db");
    const url = "postgresql://c2_local:synthetic-db@127.0.0.1:5433/evidence_atlas_c2";
    vi.stubEnv("DATABASE_URL", url);
    vi.stubEnv("C2_DATABASE_URL", url);
    vi.stubEnv("CHAT_RATE_LIMIT_BACKEND", "memory");
    const { getChatRateLimit } = await import("./chat-rate-limit");
    expect(getChatRateLimit).toThrow("External services are disabled in C2 runtime.");
    expect(upstash.fromEnv).not.toHaveBeenCalled();
    expect(upstash.create).not.toHaveBeenCalled();
  });
});

describe("development memory rolling window", () => {
  it("allows ten, rejects the eleventh without extending the window, and recovers at 60 seconds", async () => {
    const limiter = await memoryLimiter();
    for (let i = 0; i < 10; i++) {
      expect(await limiter.limit("workspace:user")).toEqual({ success: true, limit: 10, remaining: 9 - i, reset: 60_000 });
    }
    vi.setSystemTime(59_999);
    expect(await limiter.limit("workspace:user")).toEqual({ success: false, limit: 10, remaining: 0, reset: 60_000 });
    vi.setSystemTime(60_000);
    expect(await limiter.limit("workspace:user")).toEqual({ success: true, limit: 10, remaining: 9, reset: 120_000 });
  });

  it("expires individual requests rather than resetting the entire window together", async () => {
    const limiter = await memoryLimiter();
    await limiter.limit("workspace:user");
    vi.setSystemTime(30_000);
    for (let i = 0; i < 9; i++) await limiter.limit("workspace:user");
    vi.setSystemTime(60_000);
    expect(await limiter.limit("workspace:user")).toMatchObject({ success: true, remaining: 0, reset: 90_000 });
    expect((await limiter.limit("workspace:user")).success).toBe(false);
    vi.setSystemTime(90_000);
    expect(await limiter.limit("workspace:user")).toMatchObject({ success: true, remaining: 8, reset: 120_000 });
  });

  it("keeps Users and Workspaces independent and removes expired history on later checks", async () => {
    const limiter = await memoryLimiter();
    for (let i = 0; i < 10; i++) await limiter.limit("workspace-a:user-a");
    expect((await limiter.limit("workspace-a:user-a")).success).toBe(false);
    expect((await limiter.limit("workspace-a:user-b")).remaining).toBe(9);
    expect((await limiter.limit("workspace-b:user-a")).remaining).toBe(9);
    vi.setSystemTime(120_000);
    await limiter.limit("workspace-c:user-c");
    for (const key of ["workspace-a:user-a", "workspace-a:user-b", "workspace-b:user-a"]) {
      expect((await limiter.limit(key)).remaining).toBe(9);
    }
  });

  it("counts concurrent checks before yielding", async () => {
    const limiter = await memoryLimiter();
    const results = await Promise.all(Array.from({ length: 11 }, () => limiter.limit("workspace:user")));
    expect(results.filter((result) => result.success)).toHaveLength(10);
    expect(results[10]).toMatchObject({ success: false, remaining: 0 });
  });
});
