import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDemoChatHandler } from "./chat-handler";
import { POST } from "@/app/api/demo/chat/route";
import { DemoChatStore, getDemoChatStore } from "./chat-store";
import { OfflineRedis } from "./chat-test-redis";
import { research, source, finding } from "./test-fixtures";
import {
  DEMO_CHAT_COOKIE, DemoChatError, readDemoChatInput, requireDemoChatOrigin,
  validTurnstileToken, verifyDemoTurnstile,
} from "./chat-security";

const origin = "https://demo.example.invalid";
const researchId = "public-research";
const unknownId = "x".repeat(43);
let redis: OfflineRedis;
let store: DemoChatStore;
let fetcher: ReturnType<typeof vi.fn<typeof fetch>>;
let read: ReturnType<typeof vi.fn>;
let handler: ReturnType<typeof createDemoChatHandler>;

function request(body: unknown, cookie?: string, headers: Record<string, string> = {}) {
  return new Request(`${origin}/api/demo/chat`, {
    method: "POST", body: JSON.stringify(body),
    headers: { origin, "content-type": "application/json", ...(cookie ? { cookie } : {}), ...headers },
  });
}
const startBody = (token = "synthetic-token") => ({ operation: "session", researchId, turnstileToken: token });
const question = (threadId = unknownId, message = "質問") => ({ operation: "question", researchId, threadId, message });
const cookie = (session: string) => `${DEMO_CHAT_COOKIE}=${session}`;

beforeEach(() => {
  for (const [key, value] of Object.entries({
    PUBLIC_DEMO_MODE: "true", DEMO_CHAT_ENABLED: "true", C2_RUNTIME_MODE: "",
    DEMO_WORKSPACE_ID: "public-workspace", DEMO_GROQ_API_KEY: "synthetic-groq-secret",
    NEXT_PUBLIC_DEMO_TURNSTILE_SITE_KEY: "synthetic-site", DEMO_TURNSTILE_SECRET_KEY: "synthetic-turnstile-secret",
    UPSTASH_REDIS_REST_URL: "https://redis.example.invalid", UPSTASH_REDIS_REST_TOKEN: "synthetic-redis-secret",
    DEMO_CHAT_ALLOWED_ORIGINS: origin,
  })) vi.stubEnv(key, value);
  redis = new OfflineRedis(); store = new DemoChatStore(redis.eval);
  // All fetches, including an accidentally connected provider, are forbidden.
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden"); }));
  fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({
    success: true, hostname: "demo.example.invalid", action: "demo-chat",
  }));
  read = vi.fn(async (id: string) => id === researchId ? {
    research: { ...research, id, status: "COMPLETED" as const }, sources: [source],
    findings: [{ ...finding, displayStyle: "TEXT" as const }], comments: [], tags: [],
  } : null);
  handler = createDemoChatHandler({ store: () => store, publicResearch: read,
    generate: async () => ({ text: JSON.stringify({ answer: "Grounded answer", sourceIds: [source.id], insufficientEvidence: false }), finishReason: "stop" }),
    verify: (token, host) => verifyDemoTurnstile(token, host, fetcher) });
});
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Demo API ingress (offline dependencies)", () => {
  it("real Route Handler closes before DB or network with the switch disabled", async () => {
    vi.stubEnv("DEMO_CHAT_ENABLED", "false");
    expect((await POST(request(startBody()))).status).toBe(404);
  });
  it.each([
    ["DEMO_CHAT_ENABLED", "false"], ["PUBLIC_DEMO_MODE", "false"], ["C2_RUNTIME_MODE", "malformed"],
    ["DEMO_GROQ_API_KEY", ""], ["DEMO_TURNSTILE_SECRET_KEY", ""], ["UPSTASH_REDIS_REST_TOKEN", ""],
  ])("refuses %s=%s before services", async (key, value) => {
    vi.stubEnv(key, value);
    expect((await handler(request(startBody()))).status).toBe(404);
    expect(read).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled(); expect(redis.calls).toEqual([]);
  });
  it.each(["https://evil.invalid", "null", "https://demo.example.invalid.evil.invalid", ""])("rejects Origin %s", async (value) => {
    expect((await handler(request(startBody(), undefined, { origin: value, host: "demo.example.invalid" }))).status).toBe(403);
    expect(read).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(["", "http://demo.example.invalid", `${origin}/`, `${origin},`, "https://user:pass@demo.example.invalid"])("rejects invalid configured origins %s", (value) => {
    vi.stubEnv("DEMO_CHAT_ALLOWED_ORIGINS", value);
    expect(() => requireDemoChatOrigin(request(startBody()))).toThrow(DemoChatError);
  });
  it("uses configured Origin hostname even with forged Host headers", async () => {
    expect((await handler(request(startBody(), undefined, { host: "evil.invalid", "x-forwarded-host": "evil.invalid" }))).status).toBe(201);
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("issues a random server session and thread, with hardened cookie and no secrets", async () => {
    const response = await handler(request(startBody()));
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const value = response.headers.get("set-cookie")!;
    expect(value).toMatch(/^__Host-ea-demo-chat=[\w-]{43}; Path=\/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400$/);
    const body = await response.json(); expect(body).toEqual({ threadId: expect.stringMatching(/^[\w-]{43}$/) });
    expect(value + JSON.stringify(body)).not.toMatch(/synthetic|public-workspace|secret|token/i);
    expect(JSON.stringify([...redis.entries])).not.toContain("synthetic-token");
    const session = value.split(";")[0];
    const refused = await handler(request(question(body.threadId), session));
    expect(refused.status).toBe(200);
    expect(await refused.json()).toMatchObject({ answer: "Grounded answer", sources: [{ id: source.id }] });
    expect(redis.entries.get("evidence-atlas:demo-chat:v1:concurrency")?.value).toEqual(new Map());
  });
  it("rejects replay even if mocked Siteverify incorrectly accepts it twice", async () => {
    const results = await Promise.all([handler(request(startBody())), handler(request(startBody()))]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 403]);
  });
  it("rejects missing, forged, duplicate and expired session cookies", async () => {
    const issued = await store.start("one", researchId);
    for (const value of [undefined, cookie("bad"), cookie(unknownId), `${cookie(issued.sessionId)}; ${cookie(issued.sessionId)}`]) {
      expect((await handler(request(question(issued.threadId), value))).status).toBe(401);
    }
    redis.now += 86400000;
    expect((await handler(request(question(issued.threadId), cookie(issued.sessionId)))).status).toBe(401);
    expect(read).not.toHaveBeenCalled();
  });
  it("refuses another session's thread and a thread's different Research", async () => {
    const a = await store.start("a", researchId), b = await store.start("b", researchId);
    expect((await handler(request(question(a.threadId), cookie(b.sessionId)))).status).toBe(403);
    expect(read).not.toHaveBeenCalled();
    await expect(store.check(a.sessionId, a.threadId, "other-research")).rejects.toMatchObject({ status: 403 });
  });
  it("verifies Turnstile before public Research, and never issues a private session", async () => {
    expect((await handler(request({ ...startBody(), researchId: "private" }))).status).toBe(404);
    expect(fetcher).toHaveBeenCalledOnce(); expect(redis.calls).toEqual([]);
    expect(fetcher.mock.invocationCallOrder[0]).toBeLessThan(read.mock.invocationCallOrder[0]);
  });
  it("rechecks publication only after ownership, including a withdrawn Research", async () => {
    const issued = await store.start("one", researchId);
    read.mockResolvedValue(null);
    expect((await handler(request(question(issued.threadId), cookie(issued.sessionId)))).status).toBe(404);
    expect(read).toHaveBeenCalledExactlyOnceWith(researchId);
    read.mockClear();
    expect((await handler(request({ ...question(issued.threadId), researchId: "private" }, cookie(issued.sessionId)))).status).toBe(403);
    expect(read).not.toHaveBeenCalled();
  });
  it.each([researchId, "private", "missing"])("does not disclose Research %s before authentication", async (id) => {
    fetcher.mockResolvedValue(Response.json({ success: false }));
    expect((await handler(request({ ...startBody(), researchId: id }))).status).toBe(403);
    expect((await handler(request({ ...question(), researchId: id }))).status).toBe(401);
    expect(read).not.toHaveBeenCalled();
  });
  it.each(["start", "question"])("fails closed on Redis %s failure with only fixed diagnostics", async (operation) => {
    const issued = await store.start("a", researchId);
    const log = vi.spyOn(console, "error").mockImplementation(() => {}); redis.fail = true;
    const response = await handler(request(operation === "start" ? startBody() : question(issued.threadId), cookie(issued.sessionId)));
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: "Demo Chat unavailable." });
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(log).toHaveBeenCalledExactlyOnceWith(
      `[demo-chat] failure category=lease_error phase=${operation === "start" ? "session" : "check"} status=503`,
    );
    if (operation === "question") expect(read).not.toHaveBeenCalled();
  });
  it("production store construction is lazy and rejects non-HTTPS Redis config", () => {
    expect(getDemoChatStore()).toBeInstanceOf(DemoChatStore);
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "http://redis.example.invalid");
    expect(getDemoChatStore).toThrow(DemoChatError);
  });
});

describe("Siteverify boundary", () => {
  afterEach(() => { expect(read).not.toHaveBeenCalled(); expect(redis.calls).toEqual([]); });
  it.each(["", " ", "bad/token", "x".repeat(2049), null, 123])("rejects token shape %s locally", async (value) => {
    expect(validTurnstileToken(value)).toBe(false);
    expect((await handler(request(startBody(value as string)))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    { success: false, "error-codes": ["timeout-or-duplicate"] },
    { success: false }, { success: "true", hostname: "demo.example.invalid", action: "demo-chat" },
    { success: true, hostname: "evil.invalid", action: "demo-chat" },
    { success: true, hostname: "demo.example.invalid", action: "login" }, {}, null,
  ])("rejects unverified/expired/duplicate or mismatched results %j", async (result) => {
    fetcher.mockResolvedValue(Response.json(result));
    expect((await handler(request(startBody()))).status).toBe(403); expect(redis.calls).toEqual([]);
    expect(read).not.toHaveBeenCalled();
  });
  it.each(["network", "timeout", "http", "json"])("fails closed on %s", async (failure) => {
    fetcher.mockImplementation(async () => {
      if (failure === "http") return new Response("", { status: 500 });
      if (failure === "json") return new Response("bad json");
      throw new DOMException("synthetic secret", failure === "timeout" ? "TimeoutError" : "Error");
    });
    expect((await handler(request(startBody()))).status).toBe(403); expect(redis.calls).toEqual([]);
    expect(read).not.toHaveBeenCalled();
  });
  it("uses the fixed Siteverify URL, POST, bounded signal and no retry", async () => {
    await verifyDemoTurnstile("valid-token", "demo.example.invalid", fetcher);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith("https://challenges.cloudflare.com/turnstile/v0/siteverify", expect.objectContaining({
      method: "POST", redirect: "error", cache: "no-store", signal: expect.any(AbortSignal),
    }));
  });
});

describe("Bounded input", () => {
  afterEach(() => {
    expect(read).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled(); expect(redis.calls).toEqual([]);
  });
  it.each(["", "  \n\t", "x".repeat(501), "😀".repeat(501), "\ud800"])("rejects invalid message", async (message) => {
    expect((await handler(request(question(unknownId, message)))).status).toBe(400);
  });
  it("counts Unicode code points, including combining marks, before trim", async () => {
    expect(await readDemoChatInput(request(question(unknownId, "😀".repeat(500))))).toMatchObject({ message: "😀".repeat(500) });
    await expect(readDemoChatInput(request(question(unknownId, "a\u0301".repeat(251))))).rejects.toMatchObject({ status: 400 });
  });
  it.each([{ model: "arbitrary" }, { system: "override" }, { workspaceId: "private" }, { history: [] }, { questionCount: 0 }, { operationId: "a".repeat(43) }, { leaseId: "b".repeat(43) }])("rejects extra contract fields %j", async (extra) => {
    expect((await handler(request({ ...question(), ...extra }))).status).toBe(400);
  });
  it("rejects non-JSON, malformed JSON and oversized declared bodies without reading", async () => {
    expect((await handler(request(startBody(), undefined, { "content-type": "text/plain" }))).status).toBe(415);
    expect((await handler(new Request(`${origin}/api/demo/chat`, { method: "POST", body: "{", headers: { origin, "content-type": "application/json" } }))).status).toBe(400);
    const req = request(startBody(), undefined, { "content-length": "1000000000" });
    expect((await handler(req)).status).toBe(413); expect(req.bodyUsed).toBe(false);
  });
  it("stops an undeclared oversized stream before reading remaining chunks", async () => {
    let pulls = 0, cancelled = false;
    const stream = new ReadableStream({ pull(controller) {
      pulls++; controller.enqueue(new Uint8Array(4096));
    }, cancel() { cancelled = true; } }, { highWaterMark: 0 });
    const req = new Request(`${origin}/api/demo/chat`, { method: "POST", body: stream,
      headers: { origin, "content-type": "application/json" }, duplex: "half" } as RequestInit);
    expect((await handler(req)).status).toBe(413); expect(pulls).toBe(3); expect(cancelled).toBe(true);
  });
  it("times out a body stream, including a syntactically valid unfinished body", async () => {
    vi.useFakeTimers();
    try {
      let sent = false;
      const stream = new ReadableStream({ pull(controller) {
        if (!sent) { sent = true; controller.enqueue(new TextEncoder().encode(JSON.stringify(startBody()))); }
      } }, { highWaterMark: 0 });
      const req = new Request(`${origin}/api/demo/chat`, { method: "POST", body: stream,
        headers: { origin, "content-type": "application/json" }, duplex: "half" } as RequestInit);
      const response = handler(req);
      await vi.advanceTimersByTimeAsync(5_000);
      expect((await response).status).toBe(408); expect(fetcher).not.toHaveBeenCalled();
    } finally { vi.useRealTimers(); }
  });
});
