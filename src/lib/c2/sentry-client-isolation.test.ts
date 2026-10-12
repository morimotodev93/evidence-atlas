import { afterEach, describe, expect, it, vi } from "vitest";

// Exercise the actual client entry with the SDK/config modules selected by
// next.config's C2 aliases, without compiling Next or loading the real SDK.
vi.mock("@sentry/nextjs", async () => {
  const disabled = await import("./sentry-disabled");
  return { ...disabled, init: vi.fn(disabled.init),
    captureException: vi.fn(disabled.captureException),
    captureRouterTransitionStart: vi.fn(disabled.captureRouterTransitionStart) };
});
vi.mock("@/lib/observability/sentry-config", () => import("./sentry-disabled"));
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("build-selected C2 client telemetry adapter", () => {
  it("client initialization and navigation cannot deliver events even with a supplied DSN", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://synthetic.invalid");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE", "1");
    const sdk = await import("@sentry/nextjs");
    const client = await import("../../instrumentation-client");
    expect(sdk.init).toHaveBeenCalledWith(expect.objectContaining({ tracesSampleRate: 0 }));
    client.onRouterTransitionStart("/synthetic", "push");
    sdk.captureException(new Error("synthetic-private"));
    expect(fetch).not.toHaveBeenCalled();
  });
});
