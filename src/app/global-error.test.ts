import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import GlobalError from "./global-error";

const mocks = vi.hoisted(() => ({ captureException: vi.fn(), useEffect: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: mocks.captureException }));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useEffect: mocks.useEffect,
}));

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());

describe("global error presentation and capture boundary", () => {
  it.each(["true", "false"])("renders generic UI and schedules capture in Public Demo mode %s", (mode) => {
    vi.stubEnv("PUBLIC_DEMO_MODE", mode);
    const error = Object.assign(new Error("synthetic-private-content-and-secret"), {
      digest: "synthetic-private-digest",
      stack: "synthetic-private-stack",
    });

    // Inspect the registered effect without mounting a browser or loading Sentry.
    const tree = GlobalError({ error });
    expect(mocks.useEffect).toHaveBeenCalledExactlyOnceWith(expect.any(Function), [error]);
    expect(mocks.captureException).not.toHaveBeenCalled();
    const effect = mocks.useEffect.mock.calls[0][0] as () => void;
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("<html");
    expect(html).toContain("<body");
    expect(html).toContain("Application error");
    for (const value of [error.message, error.stack, error.digest]) {
      expect(html).not.toContain(value);
    }

    effect();
    expect(mocks.captureException).toHaveBeenCalledExactlyOnceWith(error);
  });
});
