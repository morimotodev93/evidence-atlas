import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getDemoChatStore } from "./chat-store";

const id = "a".repeat(43);
let fetcher: ReturnType<typeof vi.fn<typeof fetch>>;
beforeEach(() => {
  for (const [key, value] of Object.entries({
    PUBLIC_DEMO_MODE: "true", DEMO_CHAT_ENABLED: "true", C2_RUNTIME_MODE: "",
    DEMO_WORKSPACE_ID: "public", DEMO_GROQ_API_KEY: "synthetic", NEXT_PUBLIC_DEMO_TURNSTILE_SITE_KEY: "synthetic",
    DEMO_TURNSTILE_SECRET_KEY: "synthetic", UPSTASH_REDIS_REST_URL: "https://redis.example.invalid",
    UPSTASH_REDIS_REST_TOKEN: "synthetic-redis-secret",
  })) vi.stubEnv(key, value);
  fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ result: 1 }));
  // Exercise the installed Upstash SDK, intercepting ALL fetches before networking.
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it("sends one EVAL with a bounded signal through the real SDK adapter", async () => {
  await getDemoChatStore().check(id, id, "public-research");
  expect(fetcher).toHaveBeenCalledOnce();
  const [url, options] = fetcher.mock.calls[0];
  expect(String(url)).toBe("https://redis.example.invalid");
  expect(options?.signal).toBeInstanceOf(AbortSignal);
  expect(JSON.parse(String(options?.body))[0].toLowerCase()).toBe("eval");
});

it.each(["network", "timeout", "http", "redis"])("fails closed without retry on %s", async (failure) => {
  fetcher.mockImplementation(async () => {
    if (failure === "http") return new Response("synthetic-secret", { status: 503 });
    if (failure === "redis") return Response.json({ error: "synthetic-secret" });
    throw new DOMException("synthetic-secret", failure === "timeout" ? "TimeoutError" : "Error");
  });
  await expect(getDemoChatStore().check(id, id, "public-research")).rejects.toMatchObject({
    status: 503, message: "Demo Chat request refused.",
  });
  expect(fetcher).toHaveBeenCalledOnce();
});
