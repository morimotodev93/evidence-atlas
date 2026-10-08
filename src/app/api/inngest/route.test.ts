import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  serve: vi.fn(),
  GET: vi.fn(),
  POST: vi.fn(),
  PUT: vi.fn(),
  clientLoaded: vi.fn(),
  functionLoaded: vi.fn(),
  requireProductionSafeInngestMode: vi.fn(),
  client: {},
  fn: {},
}));

vi.mock("inngest/next", () => ({
  serve: mocks.serve,
}));

vi.mock("@/inngest/client", () => {
  mocks.clientLoaded();

  return {
    inngest: mocks.client,
    requireProductionSafeInngestMode: mocks.requireProductionSafeInngestMode,
  };
});

vi.mock("@/inngest/functions/index-research", () => {
  mocks.functionLoaded();

  return {
    indexResearchFunction: mocks.fn,
  };
});

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();

  vi.stubEnv("NODE_ENV", "development");

  mocks.requireProductionSafeInngestMode.mockImplementation(() => undefined);

  mocks.serve.mockReturnValue({
    GET: mocks.GET,
    POST: mocks.POST,
    PUT: mocks.PUT,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Inngest deployment dispatch", () => {
  it.each(["GET", "POST", "PUT"] as const)(
    "disables Demo %s before SDK/client/function initialization",
    async (method) => {
      vi.stubEnv("PUBLIC_DEMO_MODE", "true");
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("INNGEST_DEV", "true");

      const route = await import("./route");

      const response = await route[method](
        new NextRequest("https://example.test/api/inngest", {
          method,
        }),
      );

      expect(response.status).toBe(404);
      expect(response.headers.get("Cache-Control")).toBe("no-store");

      expect(mocks.serve).not.toHaveBeenCalled();
      expect(mocks.clientLoaded).not.toHaveBeenCalled();
      expect(mocks.functionLoaded).not.toHaveBeenCalled();
      expect(mocks.requireProductionSafeInngestMode).not.toHaveBeenCalled();

      for (const handler of [mocks.GET, mocks.POST, mocks.PUT]) {
        expect(handler).not.toHaveBeenCalled();
      }
    },
  );

  it.each([undefined, "", "false"])(
    "preserves all normal-mode request/response delegation for %s",
    async (mode) => {
      vi.stubEnv("PUBLIC_DEMO_MODE", mode);

      const route = await import("./route");

      for (const method of ["GET", "POST", "PUT"] as const) {
        const request = new NextRequest("https://example.test/api/inngest", {
          method,
        });

        const context = {
          params: Promise.resolve({}),
        };

        const response = new Response("SDK response", {
          status: 202,
        });

        mocks[method].mockResolvedValueOnce(response);

        expect(await route[method](request, context)).toBe(response);

        expect(mocks[method]).toHaveBeenCalledExactlyOnceWith(request, context);
      }

      expect(mocks.requireProductionSafeInngestMode).toHaveBeenCalledTimes(1);

      expect(mocks.serve).toHaveBeenCalledExactlyOnceWith({
        client: mocks.client,
        functions: [mocks.fn],
        enableUnauthedSync: undefined,
      });
    },
  );

  it("enforces the supported signed-sync serve option in normal production", async () => {
    vi.stubEnv("PUBLIC_DEMO_MODE", "false");
    vi.stubEnv("NODE_ENV", "production");

    mocks.GET.mockResolvedValue(new Response());

    const route = await import("./route");

    await route.GET(new NextRequest("https://example.test/api/inngest"));

    expect(mocks.requireProductionSafeInngestMode).toHaveBeenCalledTimes(1);

    expect(mocks.serve).toHaveBeenCalledWith({
      client: mocks.client,
      functions: [mocks.fn],
      enableUnauthedSync: false,
    });
  });

  it("rejects unsafe production mode before creating Inngest handlers", async () => {
    vi.stubEnv("PUBLIC_DEMO_MODE", "false");
    vi.stubEnv("NODE_ENV", "production");

    const error = new Error(
      "Inngest dev mode is not permitted in production. Check INNGEST_DEV.",
    );

    mocks.requireProductionSafeInngestMode.mockImplementationOnce(() => {
      throw error;
    });

    const route = await import("./route");

    await expect(
      route.GET(new NextRequest("https://example.test/api/inngest")),
    ).rejects.toBe(error);

    expect(mocks.requireProductionSafeInngestMode).toHaveBeenCalledTimes(1);

    expect(mocks.serve).not.toHaveBeenCalled();
    expect(mocks.GET).not.toHaveBeenCalled();
    expect(mocks.POST).not.toHaveBeenCalled();
    expect(mocks.PUT).not.toHaveBeenCalled();
  });
});
