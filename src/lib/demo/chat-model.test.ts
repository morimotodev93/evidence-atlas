import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Wrap the installed SDK factory: construction is real, fetch is forbidden.
vi.mock("@ai-sdk/groq", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ai-sdk/groq")>();
  return { ...actual, createGroq: vi.fn(actual.createGroq) };
});

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  for (const [key, value] of Object.entries({
    PUBLIC_DEMO_MODE: "true", DEMO_CHAT_ENABLED: "true", C2_RUNTIME_MODE: "",
    DEMO_WORKSPACE_ID: "synthetic-workspace", DEMO_GROQ_API_KEY: "synthetic-demo-key",
    GROQ_API_KEY: "synthetic-evaluation-key", GOOGLE_GENERATIVE_AI_API_KEY: "synthetic-google-key",
    NEXT_PUBLIC_DEMO_TURNSTILE_SITE_KEY: "synthetic-site", DEMO_TURNSTILE_SECRET_KEY: "synthetic-secret",
    UPSTASH_REDIS_REST_URL: "https://redis.example.invalid", UPSTASH_REDIS_REST_TOKEN: "synthetic-token",
  })) vi.stubEnv(key, value);
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden"); }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("lazy server-only Demo Groq model", () => {
  it("imports config/model without factory calls or network", async () => {
    await import("./chat-config");
    await import("./chat-model");
    const { createGroq } = await import("@ai-sdk/groq");
    expect(createGroq).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("constructs the fixed AI SDK 6 model with only the explicit Demo key", async () => {
    const { getDemoChatModel } = await import("./chat-model");
    const { createGroq } = await import("@ai-sdk/groq");
    const model = getDemoChatModel();
    expect(createGroq).toHaveBeenCalledExactlyOnceWith({ apiKey: "synthetic-demo-key" });
    expect(model.modelId).toBe("openai/gpt-oss-120b");
    expect(model.provider).toBe("groq.chat");
    expect(model.specificationVersion).toBe("v3");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects missing Demo key despite evaluation key, before provider construction", async () => {
    const { getDemoChatModel } = await import("./chat-model");
    const { createGroq } = await import("@ai-sdk/groq");
    vi.stubEnv("DEMO_GROQ_API_KEY", undefined);
    expect(getDemoChatModel).toThrow("Demo Chat is disabled or not configured.");
    expect(createGroq).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rechecks shutdown, missing settings and C2 after prior model construction", async () => {
    const { getDemoChatModel } = await import("./chat-model");
    const { createGroq } = await import("@ai-sdk/groq");
    getDemoChatModel();
    for (const [key, value] of [["DEMO_CHAT_ENABLED", "false"],
      ["DEMO_TURNSTILE_SECRET_KEY", ""], ["PUBLIC_DEMO_MODE", "false"], ["C2_RUNTIME_MODE", "local"]]) {
      const previous = process.env[key];
      vi.stubEnv(key, value);
      expect(getDemoChatModel).toThrow("Demo Chat is disabled or not configured.");
      vi.stubEnv(key, previous);
    }
    expect(createGroq).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("leaves SaaS Gemini models and rate-limit backend independent of Demo flags", async () => {
    const saas = await import("../ai/model");
    const { getDemoChatModel } = await import("./chat-model");
    getDemoChatModel();
    vi.stubEnv("DEMO_CHAT_ENABLED", "false");
    expect(saas.researchModel.modelId).toBe("gemini-3.6-flash");
    expect(saas.embeddingModel.modelId).toBe("gemini-embedding-001");
    expect((await import("../ai/model")).researchModel).toBe(saas.researchModel);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CHAT_RATE_LIMIT_BACKEND", "memory");
    const { getChatRateLimit } = await import("../ai/chat-rate-limit");
    expect((await getChatRateLimit().limit("synthetic-workspace:user")).limit).toBe(10);
    expect(fetch).not.toHaveBeenCalled();
  });
});
