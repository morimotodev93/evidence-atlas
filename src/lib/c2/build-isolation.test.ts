import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sentryConfig: vi.fn((config) => config) }));
vi.mock("@sentry/nextjs/config", () => ({ withSentryConfig: mocks.sentryConfig }));
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  const url = "postgresql://c2_local:synthetic-db@127.0.0.1:5433/evidence_atlas_c2";
  for (const [key, value] of Object.entries({ C2_RUNTIME_MODE: "local", C2_MODE: "local", PUBLIC_DEMO_MODE: "false",
    DATABASE_URL: url, C2_DATABASE_URL: url, C2_POSTGRES_PASSWORD: "synthetic-db",
    NEXT_PUBLIC_SENTRY_DSN: "https://synthetic.invalid", SENTRY_AUTH_TOKEN: "synthetic-upload",
  })) vi.stubEnv(key, value);
});
afterEach(() => vi.unstubAllEnvs());

describe("C2 build-time module substitution without compiling Next", () => {
  it("uses dedicated artifacts/type config, skips Sentry wrapper, aliases both bundlers", async () => {
    const { default: configure } = await import("../../../next.config");
    const config = await configure();
    expect(config.distDir).toBe(".next-c2");
    expect(config.typescript?.tsconfigPath).toBe("tsconfig.c2.json");
    expect(mocks.sentryConfig).not.toHaveBeenCalled();
    const aliases = config.turbopack?.resolveAlias;
    expect(aliases).toMatchObject({
      "@/lib/app-font": "./src/lib/c2/app-font.ts",
      "@sentry/nextjs": "./src/lib/c2/sentry-disabled.ts",
      "@/lib/observability/sentry-config": "./src/lib/c2/sentry-disabled.ts",
    });
    const webpackConfig = config.webpack!({ resolve: { alias: { existing: "keep" } } }, {} as never);
    expect(webpackConfig.resolve.alias.existing).toBe("keep");
    expect(webpackConfig.resolve.alias["@/lib/app-font$"]).toBe(resolve("src/lib/c2/app-font.ts"));
    expect(webpackConfig.resolve.alias["@sentry/nextjs$"]).toBe(resolve("src/lib/c2/sentry-disabled.ts"));
    const font = readFileSync(resolve(aliases!["@/lib/app-font"] as string), "utf8");
    const sentry = readFileSync(resolve(aliases!["@sentry/nextjs"] as string), "utf8");
    expect(font).not.toMatch(/import\s|require\(|fetch\(/);
    expect(sentry).not.toMatch(/import\s|require\(|fetch\(/);
    expect(readFileSync("src/app/layout.tsx", "utf8")).not.toContain("next/font/google");
    expect(JSON.parse(readFileSync("tsconfig.c2.json", "utf8")).include).toContain(".next-c2/dev/types/**/*.ts");
  });
  it("C2 browser instrumentation uses inert exports without a public runtime flag", async () => {
    const disabled = await import("./sentry-disabled");
    const spy = vi.spyOn(disabled, "init");
    disabled.init({ dsn: "https://synthetic.invalid", enabled: true });
    expect(disabled.getSentryTracesSampleRate()).toBe(0);
    expect(disabled.captureException(new Error("synthetic-private"))).toBe("");
    disabled.captureRouterTransitionStart("synthetic");
    disabled.captureRequestError("synthetic");
    expect(spy).toHaveBeenCalledOnce();
    expect(readFileSync("src/instrumentation-client.ts", "utf8")).not.toContain("C2_RUNTIME_MODE");
  });
  it.each(["false", "true"])("normal SaaS/Demo retains Sentry wrapper and default artifacts (Demo=%s)", async (demo) => {
    vi.stubEnv("C2_RUNTIME_MODE", undefined); vi.stubEnv("PUBLIC_DEMO_MODE", demo);
    const { default: configure } = await import("../../../next.config");
    const config = await configure();
    expect(mocks.sentryConfig).toHaveBeenCalledOnce();
    expect(config.distDir).toBeUndefined(); expect(config.turbopack).toBeUndefined();
    expect(readFileSync("src/lib/app-font.ts", "utf8")).toContain("next/font/google");
  });
  it("unknown C2 mode refuses rather than selecting a normal build", async () => {
    vi.stubEnv("C2_RUNTIME_MODE", "typo");
    await expect(import("../../../next.config")).rejects.toThrow("runtime mode");
    expect(mocks.sentryConfig).not.toHaveBeenCalled();
  });
});
