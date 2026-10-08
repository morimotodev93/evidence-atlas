import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "production");

  for (const name of [
    "INNGEST_DEV",
    "INNGEST_BASE_URL",
    "INNGEST_API_BASE_URL",
    "INNGEST_EVENT_API_BASE_URL",
  ]) {
    vi.stubEnv(name, undefined);
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("production Inngest configuration using the installed SDK", () => {
  it.each([
    "true",
    "1",
    " TRUE ",
    "http://localhost:8288",
    "https://dev.example.test",
  ])("rejects SDK dev mode selected by %s", async (value) => {
    vi.stubEnv("INNGEST_DEV", value);

    const { inngest, requireProductionSafeInngestMode } =
      await import("./client");

    expect(inngest.mode).toBe("dev");

    expect(() => {
      requireProductionSafeInngestMode();
    }).toThrow("Inngest dev mode is not permitted in production");
  });

  it.each([undefined, "", "false", "0", " FALSE ", " 0 "])(
    "allows cloud configuration %s",
    async (value) => {
      vi.stubEnv("INNGEST_DEV", value);

      const { inngest } = await import("./client");

      expect(inngest.mode).toBe("cloud");
    },
  );

  it("allows a self-hosted endpoint while remaining in cloud mode", async () => {
    vi.stubEnv("INNGEST_DEV", "0");
    vi.stubEnv("INNGEST_BASE_URL", "http://localhost:8288");

    const { inngest } = await import("./client");

    expect(inngest.mode).toBe("cloud");
  });

  it("allows explicit custom endpoints when the SDK remains in cloud mode", async () => {
    vi.stubEnv("INNGEST_DEV", "false");
    vi.stubEnv("INNGEST_API_BASE_URL", "https://api.inngest.com");
    vi.stubEnv("INNGEST_EVENT_API_BASE_URL", "https://inn.gs");

    const { inngest } = await import("./client");

    expect(inngest.mode).toBe("cloud");
  });

  it.each(["true", "http://localhost:8288"])(
    "preserves local development dev mode %s",
    async (value) => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("INNGEST_DEV", value);
      vi.stubEnv("INNGEST_BASE_URL", "http://localhost:8288");

      const { inngest } = await import("./client");

      expect(inngest.mode).toBe("dev");
    },
  );

  it("does not include credential values in the production dev-mode error", async () => {
    const signingKey = "synthetic-signing-value";
    const eventKey = "synthetic-event-value";

    vi.stubEnv("INNGEST_SIGNING_KEY", signingKey);
    vi.stubEnv("INNGEST_EVENT_KEY", eventKey);
    vi.stubEnv("INNGEST_DEV", "true");

    const { requireProductionSafeInngestMode } = await import("./client");

    let error: unknown;

    try {
      requireProductionSafeInngestMode();
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);

    const message = (error as Error).message;

    expect(message).toContain(
      "Inngest dev mode is not permitted in production",
    );
    expect(message).not.toContain(signingKey);
    expect(message).not.toContain(eventKey);
  });
});
