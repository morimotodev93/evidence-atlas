import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  init: vi.fn(), captureRequestError: vi.fn(), captureRouterTransitionStart: vi.fn(),
}));
// No real SDK or transport is loaded, even for the synthetic configured DSN.
vi.mock("@sentry/nextjs", () => mocks);

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("C2_RUNTIME_MODE", undefined);
  vi.stubEnv("NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE", undefined);
});
afterEach(() => vi.unstubAllEnvs());

const runtimes = [
  { name: "client", load: () => import("../../instrumentation-client") },
  { name: "server", load: () => import("../../sentry.server.config") },
  { name: "edge", load: () => import("../../sentry.edge.config") },
];

describe.each(runtimes)("$name Sentry configuration", ({ load }) => {
  it.each(["true", "false"].flatMap((mode) => [undefined, "https://synthetic.invalid"].map((dsn) => ({ mode, dsn }))))(
    "uses the DSN delivery setting and restricted data collection for Demo=$mode DSN=$dsn",
    async ({ mode, dsn }) => {
      vi.stubEnv("PUBLIC_DEMO_MODE", mode);
      vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", dsn);

      await load();

      expect(mocks.init).toHaveBeenCalledExactlyOnceWith({
        dsn,
        enabled: Boolean(dsn),
        environment: process.env.NODE_ENV,
        tracesSampleRate: 0,
        dataCollection: {
          userInfo: false,
          cookies: false,
          httpHeaders: false,
          httpBodies: [],
          urlQueryParams: false,
          stackFrameVariables: false,
          genAI: { inputs: false, outputs: false },
          databaseQueryData: false,
          queues: false,
          graphQL: { document: false, variables: false },
        },
      });
      expect(mocks.captureRequestError).not.toHaveBeenCalled();
    },
  );
});
