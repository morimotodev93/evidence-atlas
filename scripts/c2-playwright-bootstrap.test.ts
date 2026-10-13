import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => {
  const user = { id: "synthetic-user", email: "synthetic@example.invalid" };
  const session = { user, expires: "2099-01-01T00:00:00.000Z" };
  const button = { waitFor: vi.fn(async () => {}), evaluate: vi.fn(async () => true) };
  const page = { goto: vi.fn(async () => ({})), setDefaultNavigationTimeout: vi.fn(), getByRole: vi.fn(() => button), url: vi.fn(() => "http://localhost:3001/") };
  const request = { get: vi.fn(async () => ({ status: () => 200, url: () => "http://localhost:3001/api/auth/session", headers: () => ({}), json: async () => session })), dispose: vi.fn(async () => {}) };
  const context = { request, newPage: vi.fn(async () => page), pages: () => [page], storageState: vi.fn(async () => ({ cookies: [{ name: "authjs.session-token", value: "synthetic-local-session", domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax", expires: Date.parse("2099-01-01") / 1000 }, { name: "SID", value: "synthetic-google-session", domain: ".google.com" }], origins: [{ origin: "https://accounts.google.com" }] })) };
  const browser = { newContext: vi.fn(async () => context), close: vi.fn(async () => {}) };
  const assertNetwork = Object.assign(vi.fn(), { reportProgress: vi.fn() });
  return { user, session, button, page, request, context, browser,
    stdin: { isTTY: true }, stdout: { isTTY: true },
    launch: vi.fn(async () => browser), newRequest: vi.fn(async () => request),
    question: vi.fn(async () => ""), terminalClose: vi.fn(),
    preflight: vi.fn(async () => {}), assertNetwork, save: vi.fn<(state: import("./c2-playwright-policy.ts").SavedState) => Promise<void>>(async () => {}),
  };
});
vi.mock("@playwright/test", () => ({ chromium: { launch: fake.launch }, request: { newContext: fake.newRequest } }));
vi.mock("node:process", () => ({ stdin: fake.stdin, stdout: fake.stdout }));
vi.mock("node:readline/promises", () => ({ createInterface: () => ({ question: fake.question, close: fake.terminalClose }) }));
vi.mock("./c2-playwright-policy.ts", async (importOriginal) => ({ ...await importOriginal<object>(), preflight: fake.preflight }));
vi.mock("./c2-playwright-network.ts", async (importOriginal) => ({ ...await importOriginal<object>(), installNetworkBoundary: async () => fake.assertNetwork }));
vi.mock("./c2-playwright-state.ts", () => ({ saveC2State: fake.save }));
import { bootstrapAuth } from "./c2-playwright-bootstrap.ts";

let log: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.clearAllMocks();
  fake.stdin.isTTY = true; fake.stdout.isTTY = true;
  fake.page.url.mockReturnValue("http://localhost:3001/");
  fake.button.evaluate.mockResolvedValue(true);
  fake.assertNetwork.mockReset().mockImplementation(() => {});
  fake.request.get.mockResolvedValue({ status: () => 200, url: () => "http://localhost:3001/api/auth/session", headers: () => ({}), json: async () => fake.session });
  vi.stubEnv("C2_FIXTURE_USER_ID", fake.user.id); vi.stubEnv("C2_FIXTURE_USER_EMAIL", fake.user.email);
  log = vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => { log.mockRestore(); vi.unstubAllEnvs(); });

describe("Bootstrap lifecycle (all browser, HTTP, terminal and persistence dependencies mocked)", () => {
  it("waits for the actual sign-in button and valid native form before manual interaction", async () => {
    await bootstrapAuth();
    expect(fake.page.goto).toHaveBeenCalledWith("http://localhost:3001", { waitUntil: "domcontentloaded" });
    expect(fake.page.getByRole).toHaveBeenCalledWith("button", { name: "Sign in with Google", exact: true });
    expect(fake.button.waitFor).toHaveBeenCalledWith({ state: "visible", timeout: 10_000 });
    expect(fake.button.evaluate).toHaveBeenCalledOnce(); expect(fake.question).toHaveBeenCalledOnce();
    expect(fake.browser.close).toHaveBeenCalledOnce();
  });
  it("successful validated return saves only the application Session cookie", async () => {
    await bootstrapAuth();
    expect(fake.preflight).toHaveBeenCalledWith(fake.request, fake.user, false);
    expect(fake.preflight).toHaveBeenCalledWith(fake.request, fake.user);
    expect(fake.save).toHaveBeenCalledOnce();
    const saved = fake.save.mock.calls[0][0];
    expect(saved.storageState.cookies).toHaveLength(1);
    expect(saved.storageState.cookies[0].name).toBe("authjs.session-token");
    expect(saved.storageState.origins).toEqual([]);
    expect(JSON.stringify(saved)).not.toMatch(/synthetic-google-session|synthetic-user|synthetic@example/);
  });
  it("initial navigation failure cannot create state or reach manual interaction", async () => {
    fake.page.goto.mockRejectedValueOnce(new Error("raw-cookie callback?code=synthetic email@private.invalid"));
    await expect(bootstrapAuth()).rejects.toThrow("bootstrap-incomplete-or-unsafe");
    expect(fake.save).not.toHaveBeenCalled(); expect(fake.question).not.toHaveBeenCalled();
    expect(log.mock.calls.flat().join("\n")).toContain("APP_NAVIGATION_FAILED");
    expect(log.mock.calls.flat().join("\n")).not.toMatch(/raw-cookie|callback|email@private/);
    expect(fake.browser.close).toHaveBeenCalledOnce();
  });
  it("an invalid/unavailable sign-in form fails before the developer is left waiting", async () => {
    fake.button.evaluate.mockResolvedValueOnce(false);
    await expect(bootstrapAuth()).rejects.toThrow();
    expect(fake.save).not.toHaveBeenCalled(); expect(fake.question).not.toHaveBeenCalled();
    expect(log.mock.calls.flat().join("\n")).toContain("SIGNIN_UNAVAILABLE");
  });
  it("aborted manual input never persists authentication state", async () => {
    fake.question.mockRejectedValueOnce(new Error("synthetic abort secret"));
    await expect(bootstrapAuth()).rejects.toThrow();
    expect(fake.save).not.toHaveBeenCalled(); expect(fake.browser.close).toHaveBeenCalledOnce();
    expect(log.mock.calls.flat().join("\n")).toContain("MANUAL_WAIT_FAILED");
  });
  it("summarizes the network observations after a stopped manual wait and before Chromium closes", async () => {
    fake.question.mockRejectedValueOnce(new Error("synthetic cancellation"));
    await expect(bootstrapAuth()).rejects.toThrow();
    expect(fake.assertNetwork.reportProgress).toHaveBeenCalledOnce();
    expect(fake.assertNetwork.reportProgress.mock.invocationCallOrder[0]).toBeLessThan(fake.browser.close.mock.invocationCallOrder[0]);
    expect(fake.save).not.toHaveBeenCalled();
  });
  it("fatal network violations stop before the manual prompt and persistence", async () => {
    fake.assertNetwork.mockImplementation(() => { throw new Error("private-url?code=synthetic"); });
    await expect(bootstrapAuth()).rejects.toThrow();
    expect(fake.question).not.toHaveBeenCalled(); expect(fake.save).not.toHaveBeenCalled();
    expect(log.mock.calls.flat().join("\n")).toContain("NETWORK_REFUSED");
    expect(log.mock.calls.flat().join("\n")).not.toContain("private-url");
  });
  it.each(["http://localhost:3001/api/auth/signin", "http://localhost:3001/api/auth/callback/google?code=synthetic", "https://accounts.google.com/", "http://localhost:3000/"])("unexpected return cannot persist state: %s", async (url) => {
    fake.page.url.mockReturnValueOnce(url);
    await expect(bootstrapAuth()).rejects.toThrow(); expect(fake.save).not.toHaveBeenCalled();
    expect(log.mock.calls.flat().join("\n")).toContain("RETURN_INVALID");
    expect(log.mock.calls.flat().join("\n")).not.toContain(url);
  });
  it("wrong session identity cannot persist state", async () => {
    fake.request.get.mockResolvedValueOnce({ status: () => 200, url: () => "http://localhost:3001/api/auth/session", headers: () => ({}), json: async () => ({ ...fake.session, user: { ...fake.user, id: "another-synthetic-user" } }) });
    await expect(bootstrapAuth()).rejects.toThrow(); expect(fake.save).not.toHaveBeenCalled();
    expect(log.mock.calls.flat().join("\n")).toContain("SESSION_VERIFICATION_FAILED");
  });
  it("refuses unapproved non-interactive bootstrap before any browser or HTTP dependency", async () => {
    fake.stdin.isTTY = false;
    await expect(bootstrapAuth()).rejects.toThrow("interactive-terminal-required");
    expect(fake.launch).not.toHaveBeenCalled(); expect(fake.newRequest).not.toHaveBeenCalled(); expect(fake.save).not.toHaveBeenCalled();
  });
});
