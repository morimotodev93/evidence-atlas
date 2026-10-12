import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), access: vi.fn(), db: vi.fn(), stream: vi.fn(), embed: vi.fn(), embedMany: vi.fn(),
  google: vi.fn(() => ({})), googleEmbedding: vi.fn(() => ({})), redis: vi.fn(), rateLimit: vi.fn(),
  send: vi.fn(), createEvent: vi.fn(), createWorker: vi.fn(), inngest: vi.fn(), serve: vi.fn(),
  init: vi.fn(), span: vi.fn(), capture: vi.fn(), requestError: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/auth/requireResearchAccess", () => ({ requireResearchAccess: mocks.access, ResearchAccessError: class extends Error {} }));
vi.mock("@/prisma/db", () => ({ db: { orm: { public: {
  Research: { where: mocks.db }, Finding: { where: mocks.db },
  Conversation: { create: mocks.db, where: mocks.db }, Message: { create: mocks.db, where: mocks.db },
  AiUsageEvent: { create: mocks.db },
} }, transaction: mocks.db } }));
vi.mock("ai", () => ({ streamText: mocks.stream, embed: mocks.embed, embedMany: mocks.embedMany }));
vi.mock("@ai-sdk/google", () => ({ google: Object.assign(mocks.google, { embedding: mocks.googleEmbedding }) }));
vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: mocks.redis } }));
vi.mock("@upstash/ratelimit", () => ({ Ratelimit: Object.assign(mocks.rateLimit, { slidingWindow: vi.fn() }) }));
vi.mock("inngest", () => ({
  Inngest: mocks.inngest,
  eventType: () => ({ create: mocks.createEvent }),
}));
vi.mock("inngest/next", () => ({ serve: mocks.serve }));
vi.mock("@sentry/nextjs", () => ({ init: mocks.init, startSpan: mocks.span,
  captureException: mocks.capture, captureRequestError: mocks.requestError }));

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  const url = "postgresql://c2_local:synthetic-db@127.0.0.1:5433/evidence_atlas_c2";
  for (const [key, value] of Object.entries({ C2_RUNTIME_MODE: "local", C2_MODE: "local", PUBLIC_DEMO_MODE: "false",
    DATABASE_URL: url, C2_DATABASE_URL: url, C2_POSTGRES_PASSWORD: "synthetic-db",
    GOOGLE_GENERATIVE_AI_API_KEY: "synthetic-key", UPSTASH_REDIS_REST_TOKEN: "synthetic-key",
    NEXT_PUBLIC_SENTRY_DSN: "https://synthetic.invalid", NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: "1",
  })) vi.stubEnv(key, value);
  mocks.inngest.mockImplementation(() => ({ send: mocks.send, createFunction: mocks.createWorker }));
});
afterEach(() => vi.unstubAllEnvs());

function expectNoEffects() {
  for (const spy of [mocks.auth, mocks.access, mocks.db, mocks.stream, mocks.embed, mocks.embedMany,
    mocks.google, mocks.googleEmbedding, mocks.redis, mocks.rateLimit, mocks.send, mocks.createEvent,
    mocks.inngest, mocks.createWorker, mocks.serve, mocks.init, mocks.span, mocks.capture, mocks.requestError]) {
    expect(spy).not.toHaveBeenCalled();
  }
}

describe("validated server C2 service isolation", () => {
  it.each(["send", "create", "list", "detail"])("Chat %s is 503 before auth, data and providers", async (kind) => {
    const request = new Request("http://localhost:3001/research/r/chat?c2=false", {
      method: kind === "send" || kind === "create" ? "POST" : "GET",
      headers: { "x-c2-runtime": "false" },
    });
    let response: Response;
    if (kind === "send") response = await (await import("../../app/research/[id]/chat/route")).POST(request, { params: Promise.resolve({ id: "r" }) });
    else if (kind === "detail") response = await (await import("../../app/research/[id]/chat/conversations/[conversationId]/route")).GET(request, { params: Promise.resolve({ id: "r", conversationId: "c" }) });
    else {
      const route = await import("../../app/research/[id]/chat/conversations/route");
      response = await route[kind === "create" ? "POST" : "GET"](request, { params: Promise.resolve({ id: "r" }) });
    }
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Service disabled in C2 runtime." });
    expectNoEffects();
  });
  it("never constructs Google models, and direct model use rejects", async () => {
    const models = await import("../ai/model");
    expect(() => models.researchModel.doGenerate).toThrow("disabled");
    expect(() => models.embeddingModel.doEmbed).toThrow("disabled");
    expectNoEffects();
  });
  it("embedding helpers reject including empty input before provider calls", async () => {
    const helpers = await import("../ai/embed-texts");
    await expect(helpers.embedQuery("synthetic")).rejects.toThrow("disabled");
    await expect(helpers.embedTexts(["synthetic"])).rejects.toThrow("disabled");
    await expect(helpers.embedTexts([])).rejects.toThrow("disabled");
    expectNoEffects();
  });
  it("rate limiting refuses before Redis initialization", async () => {
    async function importedRateLimit() { (await import("../ai/chat-rate-limit")).getChatRateLimit(); }
    await expect(importedRateLimit()).rejects.toThrow("disabled");
    expectNoEffects();
  });
  it("retrieval and indexing reject before spans, reads, embeddings or writes", async () => {
    await expect((await import("../ai/retrieve-workspace-context")).retrieveWorkspaceContext("w", "q")).rejects.toThrow("disabled");
    await expect((await import("../ai/index-research")).indexResearch("r")).rejects.toThrow("disabled");
    expectNoEffects();
  });
  it("enqueue is an explicit no-op before event creation, SDK and Sentry", async () => {
    await expect((await import("../../inngest/request-research-index")).requestResearchIndex("r")).resolves.toBeUndefined();
    expectNoEffects();
  });
  it("cannot initialize an Inngest worker or use its direct client", async () => {
    const { inngest } = await import("../../inngest/client");
    expect(() => inngest.send).toThrow("disabled");
    await expect(import("../../inngest/functions/index-research")).rejects.toThrow("disabled");
    expectNoEffects();
  });
  it.each(["GET", "POST", "PUT"] as const)("Inngest %s refuses before dynamic handler initialization", async (method) => {
    const route = await import("../../app/api/inngest/route");
    const response = await route[method](new Request("http://localhost:3001/api/inngest") as never);
    expect(response.status).toBe(503); expectNoEffects();
  });
  it("server/edge Sentry configs and instrumentation ignore an injected DSN", async () => {
    await import("../../sentry.server.config"); await import("../../sentry.edge.config");
    const hooks = await import("../../instrumentation");
    await hooks.register();
    hooks.onRequestError(new Error("synthetic-private"), {} as never, {} as never);
    expectNoEffects();
  });
  it("invalid runtime configuration never falls back to a provider", async () => {
    vi.stubEnv("DATABASE_URL", "synthetic-other");
    await expect(import("../ai/model")).rejects.toThrow("target mismatch");
    expectNoEffects();
  });
  it("normal mode retains production model selection", async () => {
    vi.stubEnv("C2_RUNTIME_MODE", undefined);
    await import("../ai/model");
    expect(mocks.google).toHaveBeenCalledWith("gemini-3.6-flash");
    expect(mocks.googleEmbedding).toHaveBeenCalledWith("gemini-embedding-001");
  });
});
