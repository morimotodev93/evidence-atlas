import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireUser } from "./requireUser";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound, redirect: mocks.redirect }));
const notFoundError = new Error("NEXT_HTTP_ERROR_FALLBACK;404");
const redirectError = new Error("NEXT_REDIRECT");
const user = { id: "existing-session-user" };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user });
  mocks.notFound.mockImplementation(() => { throw notFoundError; });
  mocks.redirect.mockImplementation(() => { throw redirectError; });
});
afterEach(() => vi.unstubAllEnvs());

describe("requireUser deployment boundary", () => {
  it("rejects before evaluating a valid-session-shaped auth result in Demo mode", async () => {
    vi.stubEnv("PUBLIC_DEMO_MODE", "true");
    await expect(requireUser()).rejects.toBe(notFoundError);
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it.each([undefined, "", "false"])("returns the authenticated User in normal mode %s", async (value) => {
    vi.stubEnv("PUBLIC_DEMO_MODE", value);
    await expect(requireUser()).resolves.toEqual(user);
    expect(mocks.auth).toHaveBeenCalledTimes(1);
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it.each([undefined, "incorrect-workspace"])("does not reopen SaaS when Demo Workspace configuration is %s", async (value) => {
    vi.stubEnv("PUBLIC_DEMO_MODE", "true");
    vi.stubEnv("DEMO_WORKSPACE_ID", value);
    await expect(requireUser()).rejects.toBe(notFoundError);
    expect(mocks.auth).not.toHaveBeenCalled();
  });

  it("preserves the sign-in redirect for an unauthenticated normal-mode request", async () => {
    vi.stubEnv("PUBLIC_DEMO_MODE", "false");
    mocks.auth.mockResolvedValue(null);
    await expect(requireUser()).rejects.toBe(redirectError);
    expect(mocks.redirect).toHaveBeenCalledWith("/api/auth/signin");
  });
});
