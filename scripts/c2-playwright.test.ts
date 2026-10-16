import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  C2_ORIGIN, RESEARCH_PATH, bootstrapRequestAllowed, captureAppState, checkedGet, parseHarnessCommand,
  preflight, requireC2Url, requireExpectedUser, requireHarnessEnvironment, requireSession, testRequestDecision, validateSavedState,
  type Cookie, type ReadRequest, type ReadResponse,
} from "./c2-playwright-policy.ts";
import { hmrAllowed, installNetworkBoundary } from "./c2-playwright-network.ts";
import { blockedExternalNavigationCode, isBootstrapIcon, redirectMethod } from "./c2-playwright-network.ts";
import { bootstrapDiagnostic, type BootstrapCode } from "./c2-playwright-diagnostics.ts";
import { pathToFileURL } from "node:url";
import Google from "next-auth/providers/google";
import type { BrowserContext, FullConfig, Route, WebSocketRoute } from "@playwright/test";
import { requireC2Config } from "../e2e-c2/global-setup.ts";
import RedactedReporter from "../e2e-c2/redacted-reporter.ts";

const now = Date.parse("2026-10-13T01:00:00.000Z");
const user = { id: "offline-user", email: "offline@example.invalid" };
const session = { user, expires: new Date(now + 3_600_000).toISOString() };
const cookie: Cookie = { name: "authjs.session-token", value: "synthetic-private-token", domain: "localhost", path: "/", expires: (now + 3_600_000) / 1000, httpOnly: true, secure: false, sameSite: "Lax" };
function state() { return captureAppState({ cookies: [cookie], origins: [] }, C2_ORIGIN, session, user, now); }
function response(path: string, status = 200, body: unknown = {}, headers: Record<string, string> = {}): ReadResponse {
  return { url: () => `${C2_ORIGIN}${path}`, status: () => status, headers: () => headers, json: async () => body, text: async () => String(body) };
}
function http() {
  const bodies: Record<string, ReadResponse> = {
    "/api/inngest": response("/api/inngest", 503, { error: "Service disabled in C2 runtime." }, { "cache-control": "no-store" }),
    "/api/auth/providers": response("/api/auth/providers", 200, { google: { id: "google", type: "oidc", signinUrl: `${C2_ORIGIN}/api/auth/signin/google`, callbackUrl: `${C2_ORIGIN}/api/auth/callback/google` } }),
    "/api/auth/session": response("/api/auth/session", 200, { ...session, expires: "2099-01-01T00:00:00.000Z" }),
    "/": response("/", 200, "<h1>[C2 E2E fixture v1] Workspace</h1>"),
  };
  const request: ReadRequest = { get: vi.fn(async (url) => bodies[new URL(url).pathname]) };
  return { request, bodies };
}

describe("C2 Playwright pure/offline safety", () => {
  it.each(["http://localhost:3000", "https://production.invalid", "https://preview.invalid", "http://127.0.0.1:3001", "http://localhost:3001.evil.invalid", "http://user:secret@localhost:3001", "http://localhost:3001/#private", "malformed"])("rejects unsafe origins %s", (url) => {
    expect(() => requireC2Url(url)).toThrow("origin");
  });
  it("accepts only the exact fixed local origin", () => {
    expect(requireC2Url(`${C2_ORIGIN}${RESEARCH_PATH}`).origin).toBe(C2_ORIGIN);
  });
  it.each([
    { E2E_BASE_URL: C2_ORIGIN }, { E2E_BASE_URL: "https://production.invalid" }, { PUBLIC_DEMO_MODE: "true" },
    { AUTH_URL: "http://localhost:3000" }, { C2_RUNTIME_MODE: "production" }, { NODE_OPTIONS: "--import unsafe" },
    { PW_TEST_CONNECT_WS_ENDPOINT: "wss://remote.invalid" }, { DEBUG: "pw:api" }, { PWDEBUG: "1" }, { HTTPS_PROXY: "http://proxy.invalid" },
  ])("rejects environment redirects/debug/remote-browser %j", (env) => {
    expect(() => requireHarnessEnvironment(env)).toThrow("environment");
  });
  it("never uses inherited DB/provider credentials", () => {
    expect(() => requireHarnessEnvironment({ DATABASE_URL: "synthetic-unused", AUTH_GOOGLE_SECRET: "synthetic-unused", PUBLIC_DEMO_MODE: "false" })).not.toThrow();
  });
  it.each([[], ["run"], ["bootstrap"], ["preflight", "--allow-c2-auth-bootstrap"], ["run", "--allow-c2-readonly", "--base-url=https://evil.invalid"]].map((args) => ({ args })))("requires exact command and opt-in %j", ({ args }) => {
    expect(() => parseHarnessCommand(args)).toThrow("command-opt-in");
  });
  it("accepts separate manual bootstrap and read-only command opt-ins", () => {
    expect(parseHarnessCommand(["bootstrap", "--allow-c2-auth-bootstrap"])).toBe("bootstrap");
    expect(parseHarnessCommand(["run", "--allow-c2-readonly"])).toBe("run");
    expect(parseHarnessCommand(["preflight", "--allow-c2-readonly"])).toBe("preflight");
    expect(parseHarnessCommand(["chat", "--allow-c2-chat-mock"])).toBe("chat");
    expect(() => parseHarnessCommand(["chat", "--allow-c2-readonly"])).toThrow("command-opt-in");
    expect(() => parseHarnessCommand(["run", "--allow-c2-chat-mock"])).toThrow("command-opt-in");
    expect(() => parseHarnessCommand(["chat", "--allow-c2-chat-mock", "--grep=Chat"])).toThrow("command-opt-in");
  });
  it("requires private explicit fixture user selection", () => {
    expect(() => requireExpectedUser({})).toThrow("user-selection");
    expect(requireExpectedUser({ C2_FIXTURE_USER_ID: user.id, C2_FIXTURE_USER_EMAIL: user.email })).toEqual(user);
  });
  it.each([null, {}, { user: {} }, { ...session, expires: "invalid" }, { ...session, expires: "2000-01-01" }, { ...session, user: { ...user, id: "other" } }, { ...session, user: { ...user, email: "other@example.invalid" } }])("rejects anonymous/expired/wrong session %j", (value) => {
    expect(() => requireSession(value, user, now)).toThrow("session");
  });
  it("requires the session's selected existing User and future expiration", () => {
    expect(requireSession(session, user, now)).toBe(session.expires);
  });
  it("exports only the application's single cookie, without Google/browser storage", () => {
    const saved = captureAppState({ cookies: [cookie, { ...cookie, name: "SID", domain: ".google.com", value: "synthetic-google-secret" }, { ...cookie, name: "unrelated", domain: "localhost" }], origins: [{ origin: "https://accounts.google.com", localStorage: [{ name: "secret", value: "synthetic-provider-secret" }] }, { origin: C2_ORIGIN, localStorage: [{ name: "unrelated", value: "drop" }] }] }, C2_ORIGIN, session, user, now);
    expect(saved.storageState).toEqual({ cookies: [cookie], origins: [] });
    expect(JSON.stringify(saved)).not.toContain("google-secret");
    expect(JSON.stringify(saved)).not.toContain(user.id);
    expect(JSON.stringify(saved)).not.toContain(user.email);
  });
  it.each(["https://accounts.google.com", `${C2_ORIGIN}/api/auth/callback/google?code=synthetic-secret`, `${C2_ORIGIN}/onboarding`, `${C2_ORIGIN}/?unexpected=1`, "http://localhost:3000/"])("refuses persistence before a safe authenticated return %s", (url) => {
    expect(() => captureAppState({ cookies: [cookie] }, url, session, user, now)).toThrow();
  });
  it.each([
    { domain: ".google.com" }, { domain: "127.0.0.1" }, { name: "SID" }, { expires: -1 }, { expires: now / 1000 },
    { httpOnly: false }, { path: "/api" }, { secure: true }, { sameSite: "None" }, { value: "" }, { value: "secret\nheader" },
  ])("rejects unsafe cookie shape %j", (bad) => {
    const saved = state();
    Object.assign(saved.storageState.cookies[0], bad);
    expect(() => validateSavedState(saved, now)).toThrow();
  });
  it("rejects duplicate cookies, extra origins/fields and stale state", () => {
    expect(() => validateSavedState({ ...state(), storageState: { cookies: [cookie, cookie], origins: [] } }, now)).toThrow();
    expect(() => validateSavedState({ ...state(), storageState: { cookies: [cookie], origins: [{ origin: C2_ORIGIN }] } }, now)).toThrow();
    expect(() => validateSavedState({ ...state(), origin: "http://localhost:3000" }, now)).toThrow();
    expect(() => validateSavedState({ ...state(), extra: "unknown" }, now)).toThrow();
    expect(() => validateSavedState({ ...state(), capturedAt: "2000-01-01" }, now)).toThrow();
    expect(() => validateSavedState({ ...state(), capturedAt: new Date(now + 120_000).toISOString() }, now)).toThrow();
    expect(() => validateSavedState({ ...state(), sessionExpiresAt: "2000-01-01" }, now)).toThrow();
    expect(validateSavedState(state(), now)).toEqual(state());
  });
  it.each(["POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])("blocks non-GET application requests %s", (method) => {
    expect(testRequestDecision(method, `${C2_ORIGIN}${RESEARCH_PATH}`)).toBe("method");
  });
  it.each(["/onboarding", "/api/auth/signin", "/api/auth/callback/google", "/api/auth/signout", "/research/new", `${RESEARCH_PATH}/edit`, `${RESEARCH_PATH}/chat`, "/demo", "/api/unknown"])("blocks unsafe read paths %s", (path) => {
    expect(testRequestDecision("GET", `${C2_ORIGIN}${path}`)).toBe("path");
  });
  it("allows only read views/assets and Next RSC query keys", () => {
    for (const path of ["/", "/research", RESEARCH_PATH, "/api/auth/session", "/api/inngest", "/_next/static/chunks/app.js"]) expect(testRequestDecision("GET", `${C2_ORIGIN}${path}`)).toBe("allow");
    expect(testRequestDecision("GET", `${C2_ORIGIN}/research?_rsc=synthetic`)).toBe("allow");
    expect(testRequestDecision("GET", `${C2_ORIGIN}/research?query=unknown`)).toBe("query");
    expect(testRequestDecision("GET", "https://telemetry.invalid/collect")).toBe("origin");
  });
  it("keeps Google authentication exclusive to the manual bootstrap boundary", () => {
    expect(bootstrapRequestAllowed("GET", "https://accounts.google.com/o/oauth2/auth")).toBe(true);
    expect(bootstrapRequestAllowed("POST", "https://accounts.google.com/signin")).toBe(true);
    expect(bootstrapRequestAllowed("POST", `${C2_ORIGIN}/api/auth/signin/google`)).toBe(true);
    expect(bootstrapRequestAllowed("GET", `${C2_ORIGIN}/api/auth/callback/google?code=synthetic`)).toBe(true);
    for (const url of ["https://google.com.evil.invalid", "http://accounts.google.com", "https://evil.invalid", "http://localhost:3000"]) expect(bootstrapRequestAllowed("GET", url)).toBe(false);
    expect(bootstrapRequestAllowed("POST", `${C2_ORIGIN}/onboarding`)).toBe(false);
    expect(testRequestDecision("GET", "https://accounts.google.com")).toBe("origin");
  });
  it("classifies rejected external navigation without exposing URL details", () => {
    for (const [target, expected] of [
      ["chrome-error://chromewebdata/", "BLOCKED_NAV_BROWSER_INTERNAL"],
      ["http://accounts.google.com/", "BLOCKED_NAV_NON_HTTPS"],
      ["https://accounts.google.com:8443/?code=synthetic-secret", "BLOCKED_NAV_GOOGLE_HOST_REJECTED"],
      ["https://accounts.google.co.jp/signin?state=synthetic-secret", "BLOCKED_NAV_UNLISTED_GOOGLE_FAMILY"],
      ["https://www.googleapis.com/oauth2/?token=synthetic-secret", "BLOCKED_NAV_UNLISTED_GOOGLE_FAMILY"],
      ["https://unrelated.invalid/path?code=synthetic-secret", "BLOCKED_NAV_OTHER_HTTPS"],
      ["invalid-url", "BLOCKED_NAV_INVALID_URL"],
    ] as const) {
      const code = blockedExternalNavigationCode(target);
      expect(code).toBe(expected);
      expect(bootstrapDiagnostic(code)).not.toMatch(/synthetic-secret|token=|code=|state=/);
    }
  });
  it("allows only the fixed C2 dev HMR websocket", () => {
    expect(hmrAllowed("ws://localhost:3001/_next/webpack-hmr?id=synthetic")).toBe(true);
    for (const url of ["ws://localhost:3000/_next/webpack-hmr", "wss://remote.invalid/ws", "ws://localhost:3001/application-write"]) expect(hmrAllowed(url)).toBe(false);
  });
  it("combines independent HTTP/session/workspace checks without triggering OAuth", async () => {
    const { request } = http();
    await preflight(request, user);
    expect(request.get).toHaveBeenCalledTimes(4);
    for (const call of vi.mocked(request.get).mock.calls) {
      expect(call[1]).toEqual({ maxRedirects: 0, timeout: 15_000 });
      expect(call[0]).not.toMatch(/signin|callback/);
    }
  });
  it.each(["/api/inngest", "/api/auth/providers", "/api/auth/session", "/"])("rejects unexpected preflight status %s", async (path) => {
    const { request, bodies } = http();
    bodies[path] = response(path, 302, user, { location: "https://accounts.google.com/?synthetic-private-token" });
    await expect(preflight(request, user)).rejects.toThrow("preflight");
  });
  it("rejects even same-origin redirects without following them", async () => {
    const request: ReadRequest = { get: vi.fn(async () => response("/", 200, {}, { location: "/api/auth/signin" })) };
    await expect(checkedGet(request, "/", 200)).rejects.toThrow("redirect");
    expect(request.get).toHaveBeenCalledOnce();
  });
  it("rejects final origin mismatch, invalid providers, anonymous sessions and Demo HTML", async () => {
    for (const invalid of [response("/api/auth/session", 200, {}), response("/api/auth/session", 200, { user, expires: "invalid" })]) {
      const { request, bodies } = http(); bodies["/api/auth/session"] = invalid;
      await expect(preflight(request, user)).rejects.toThrow("preflight");
    }
    const { request, bodies } = http();
    bodies["/api/auth/providers"] = response("/api/auth/providers", 200, { google: { signinUrl: "https://production.invalid" } });
    await expect(preflight(request, user)).rejects.toThrow("preflight");
    const demo = http(); demo.bodies["/"] = response("/", 200, "Read-only demo [C2 E2E fixture v1] Workspace");
    await expect(preflight(demo.request, user)).rejects.toThrow("preflight");
    await expect(checkedGet({ get: async () => ({ ...response("/"), url: () => "https://evil.invalid" }) }, "/", 200)).rejects.toThrow();
  });
  it("requires the exact disabled Inngest body and no-store indicator", async () => {
    const { request, bodies } = http();
    bodies["/api/inngest"] = response("/api/inngest", 503, { error: "unrelated failure" });
    await expect(preflight(request, user)).rejects.toThrow("preflight");
  });
  it("requires a fresh anonymous bootstrap context and omits protected root before login", async () => {
    const { request, bodies } = http();
    await expect(preflight(request, user, false)).rejects.toThrow("preflight");
    bodies["/api/auth/session"] = response("/api/auth/session", 200, {});
    await preflight(request, user, false);
    expect(vi.mocked(request.get).mock.calls.some(([url]) => url === `${C2_ORIGIN}/`)).toBe(false);
  });
  it("does not emit response identities/cookies/provider metadata in errors", async () => {
    const request: ReadRequest = { get: async () => { throw new Error("synthetic-private-token offline@example.invalid callback?code=private"); } };
    let message = "";
    try { await preflight(request, user); } catch (error) { message = String(error); }
    expect(message).toContain("Details suppressed");
    expect(message).not.toMatch(/synthetic-private-token|offline@example|callback|code=private/);
  });
});

describe("C2 browser request interception with offline Playwright doubles", () => {
  async function boundary(bootstrap = false, report?: (code: BootstrapCode) => void) {
    let handler!: (route: Route) => Promise<void>;
    let socketHandler!: (socket: WebSocketRoute) => void;
    const context = { route: async (_pattern: string, callback: typeof handler) => { handler = callback; }, routeWebSocket: async (_pattern: RegExp, callback: typeof socketHandler) => { socketHandler = callback; }, on: vi.fn(), pages: () => [] } as unknown as BrowserContext;
    const assert = await installNetworkBoundary(context, bootstrap, report);
    return { handler, socketHandler, assert };
  }
  function route(url = `${C2_ORIGIN}/`, method = "GET", location?: string, redirectStatus = 302) {
    const fetch = vi.fn(async () => ({ status: () => location ? redirectStatus : 200, headers: () => location ? { location } : {} }));
    const abort = vi.fn(async () => {}); const fulfill = vi.fn(async () => {});
    return { fake: { request: () => ({ url: () => url, method: () => method, resourceType: () => "document", isNavigationRequest: () => true, frame: () => ({ parentFrame: () => null }) }), fetch, abort, fulfill } as unknown as Route, fetch, abort, fulfill };
  }
  it("never dispatches blocked writes/cross-origin requests, and fails instead of silently ignoring", async () => {
    for (const [url, method] of [[`${C2_ORIGIN}/`, "POST"], ["https://ai.invalid", "GET"], [`${C2_ORIGIN}/api/auth/signin`, "GET"]]) {
      const { handler, assert } = await boundary(); const fake = route(url, method);
      await handler(fake.fake);
      expect(fake.fetch).not.toHaveBeenCalled(); expect(fake.abort).toHaveBeenCalledOnce();
      expect(() => assert()).toThrow("network-policy");
    }
  });
  it("fetches allowed reads without following redirects and rejects redirect targets", async () => {
    const { handler, assert } = await boundary();
    const fake = route(`${C2_ORIGIN}/`, "GET", "https://accounts.google.com/?code=synthetic-private-token");
    await handler(fake.fake);
    expect(fake.fetch).toHaveBeenCalledWith({ maxRedirects: 0, timeout: 15_000 });
    expect(fake.fulfill).not.toHaveBeenCalled(); expect(() => assert()).toThrow("network-policy");
  });
  it("fulfills allowed reads and approved manual Google redirects", async () => {
    const normal = await boundary(); const read = route(); await normal.handler(read.fake); normal.assert(); expect(read.fulfill).toHaveBeenCalledOnce();
    const manual = await boundary(true); const auth = route(`${C2_ORIGIN}/api/auth/signin/google`, "POST", "https://accounts.google.com/signin");
    await manual.handler(auth.fake); manual.assert(); expect(auth.fulfill).toHaveBeenCalledOnce();
  });
  it("blocks cross-origin websockets while allowing local dev HMR", async () => {
    const { socketHandler, assert } = await boundary();
    const close = vi.fn(); const connect = vi.fn();
    socketHandler({ url: () => "wss://external.invalid", close, connectToServer: connect } as unknown as WebSocketRoute);
    expect(close).toHaveBeenCalledOnce(); expect(connect).not.toHaveBeenCalled(); expect(() => assert()).toThrow();
    const local = await boundary(); local.socketHandler({ url: () => "ws://localhost:3001/_next/webpack-hmr", close, connectToServer: connect } as unknown as WebSocketRoute);
    expect(connect).toHaveBeenCalledOnce(); local.assert();
  });
  it("does not permit a preserved POST redirect into an application read endpoint during bootstrap", async () => {
    const manual = await boundary(true);
    const preserved = route("https://accounts.google.com/signin", "POST", `${C2_ORIGIN}/api/auth/session`, 307);
    await manual.handler(preserved.fake);
    expect(preserved.fulfill).not.toHaveBeenCalled(); expect(() => manual.assert()).toThrow("bootstrap-network");
    const returnGet = await boundary(true);
    const converted = route("https://accounts.google.com/signin", "POST", `${C2_ORIGIN}/`, 303);
    await returnGet.handler(converted.fake);
    expect(converted.fulfill).toHaveBeenCalledOnce(); returnGet.assert();
  });
  it.each([301, 302, 303, 307, 308])("preserves upstream cookies and bridges only the exact Google OAuth 302 (%s)", async (status) => {
    const report = vi.fn(); const manual = await boundary(true, report);
    const target = "https://accounts.google.com/o/oauth2/v2/auth?state=synthetic-private&client_id=synthetic";
    const auth = route(`${C2_ORIGIN}/api/auth/signin/google`, "POST", target, status);
    const upstream = { status: () => status, headers: () => ({ location: target, "set-cookie": "csrf=synthetic; Path=/\npkce=synthetic; Path=/", "content-type": "text/html" }), body: async () => Buffer.from("synthetic-body") };
    auth.fetch.mockResolvedValue(upstream);
    await manual.handler(auth.fake);
    if (status === 302) {
      expect(auth.fulfill).toHaveBeenCalledWith({
        response: upstream, status: 200, contentType: "text/html; charset=utf-8",
        body: expect.stringContaining("state=synthetic-private&amp;client_id=synthetic"),
      });
      expect(auth.fulfill).toHaveBeenCalledWith(expect.objectContaining({
        body: expect.stringContaining('http-equiv="refresh"'),
      }));
      expect(auth.fulfill).toHaveBeenCalledWith(expect.objectContaining({
        body: expect.stringContaining('name="referrer" content="no-referrer"'),
      }));
    } else expect(auth.fulfill).toHaveBeenCalledWith({ response: upstream });
    expect(auth.fetch).toHaveBeenCalledWith({ maxRedirects: 0, timeout: 15_000 });
    manual.assert(); expect(report.mock.calls.map(([code]) => code)).toEqual(["AUTH_SUBMIT", "AUTH_REDIRECT", "AUTH_FULFILL_STARTED", "AUTH_FULFILL_COMPLETED"]);
  });
  it("bridges a validated Google main-frame GET 302, preserving upstream cookies; refuses outside the allowlist", async () => {
    const codes: BootstrapCode[] = []; const manual = await boundary(true, (code) => codes.push(code));
    const target = "https://accounts.google.com/v3/signin/identifier?state=synthetic-private&hl=en";
    const hop = route("https://accounts.google.com/o/oauth2/v2/auth", "GET", target);
    const upstream = { status: () => 302, headers: () => ({ location: target, "set-cookie": "google=synthetic; Secure; HttpOnly" }) };
    hop.fetch.mockResolvedValue(upstream);
    await manual.handler(hop.fake);
    expect(hop.fetch).toHaveBeenCalledWith({ maxRedirects: 0, timeout: 15_000 });
    expect(hop.fulfill).toHaveBeenCalledWith({ response: upstream, status: 200, contentType: "text/html; charset=utf-8",
      body: expect.stringContaining("state=synthetic-private&amp;hl=en") });
    expect(codes).toContain("GOOGLE_UPSTREAM_REDIRECT"); expect(codes).toContain("GOOGLE_HOP_BRIDGED"); manual.assert();

    const callback = await boundary(true);
    const returnHop = route("https://accounts.google.com/signin", "GET", `${C2_ORIGIN}/api/auth/callback/google?code=synthetic-private`);
    await callback.handler(returnHop.fake);
    expect(returnHop.fulfill).toHaveBeenCalledWith(expect.objectContaining({ status: 200, body: expect.stringContaining("/api/auth/callback/google") }));
    callback.assert();

    const denied = await boundary(true);
    const unsafe = route("https://accounts.google.com/signin", "GET", "https://not-google.invalid/?code=synthetic-private");
    await denied.handler(unsafe.fake);
    expect(unsafe.fulfill).not.toHaveBeenCalled(); expect(unsafe.abort).toHaveBeenCalledOnce();
    expect(() => denied.assert()).toThrow("bootstrap-network");
  });
  it("leaves 200 and Google POST responses unchanged, and caps Google GET redirect bridges", async () => {
    const normal = await boundary(true, () => {});
    const page = route("https://accounts.google.com/signin", "GET");
    await normal.handler(page.fake);
    expect(page.fulfill).toHaveBeenCalledWith({ response: expect.anything() }); normal.assert();
    const post = route("https://accounts.google.com/signin", "POST", "https://accounts.google.com/next", 307);
    await normal.handler(post.fake);
    expect(post.fulfill).toHaveBeenCalledWith({ response: expect.anything() }); normal.assert();

    const codes: BootstrapCode[] = []; const capped = await boundary(true, (code) => codes.push(code));
    for (let i = 0; i < 8; i++) {
      const hop = route("https://accounts.google.com/signin", "GET", "https://accounts.google.com/next");
      await capped.handler(hop.fake); expect(hop.fulfill).toHaveBeenCalledWith(expect.objectContaining({ status: 200 }));
    }
    const ninth = route("https://accounts.google.com/signin", "GET", "https://accounts.google.com/next");
    await capped.handler(ninth.fake);
    expect(ninth.fulfill).not.toHaveBeenCalled(); expect(ninth.abort).toHaveBeenCalledOnce();
    expect(codes).toContain("GOOGLE_HOP_LIMIT_REFUSED"); expect(() => capped.assert()).toThrow("bootstrap-network");
  });
  it.each([301, 302, 303, 307, 308])("classifies redirect method transitions for %s", (status) => {
    expect(redirectMethod(status, "POST")).toBe(status === 307 || status === 308 ? "POST" : "GET");
    expect(redirectMethod(status, "GET")).toBe("GET");
    expect(redirectMethod(status, "HEAD")).toBe("HEAD");
  });
  it("refuses unsupported redirects and a sign-in response without an authorization redirect", async () => {
    for (const [status, location] of [[304, "https://accounts.google.com/signin"], [200, undefined]] as const) {
      const codes: BootstrapCode[] = []; const manual = await boundary(true, (code) => codes.push(code));
      const auth = route(`${C2_ORIGIN}/api/auth/signin/google`, "POST", location, status);
      await manual.handler(auth.fake); expect(auth.fulfill).not.toHaveBeenCalled();
      expect(codes).toContain("AUTH_RESPONSE_INVALID"); expect(() => manual.assert()).toThrow();
    }
    expect(redirectMethod(305, "GET")).toBeUndefined();
  });
  it.each(["https://evil.invalid/?code=synthetic-private", "https://accounts.google.co.jp/signin", "https://google.com.evil.invalid/auth", "http://localhost:3000/", "https://preview.invalid/", "https://accounts.google.com:8443/auth"])("rejects unsupported/malicious redirect %s", async (destination) => {
    const codes: BootstrapCode[] = []; const manual = await boundary(true, (code) => codes.push(code));
    const auth = route(`${C2_ORIGIN}/api/auth/signin/google`, "POST", destination);
    await manual.handler(auth.fake); expect(auth.fulfill).not.toHaveBeenCalled();
    expect(codes).toContain("REDIRECT_REFUSED"); expect(() => manual.assert()).toThrow();
  });
  it("distinguishes local Auth.js error redirects from approved Google redirects", async () => {
    const codes: BootstrapCode[] = []; const manual = await boundary(true, (code) => codes.push(code));
    const auth = route(`${C2_ORIGIN}/api/auth/signin/google`, "POST", `${C2_ORIGIN}/api/auth/signin?error=synthetic-private`);
    await manual.handler(auth.fake); expect(codes).toContain("AUTH_LOCAL_REDIRECT"); expect(codes).not.toContain("AUTH_REDIRECT");
  });
  it("handles only the proven cosmetic Google icon locally during bootstrap without outbound fetch or a fatal violation", async () => {
    const codes: BootstrapCode[] = []; const manual = await boundary(true, (code) => codes.push(code));
    const icon = route("https://authjs.dev/img/providers/google.svg");
    vi.spyOn(icon.fake, "request").mockReturnValue({ url: () => "https://authjs.dev/img/providers/google.svg", method: () => "GET", resourceType: () => "image", isNavigationRequest: () => false } as never);
    await manual.handler(icon.fake);
    expect(icon.fetch).not.toHaveBeenCalled(); expect(icon.fulfill).toHaveBeenCalledWith(expect.objectContaining({ status: 200, contentType: "image/svg+xml" }));
    expect(codes).toEqual(["COSMETIC_ICON_LOCAL"]); manual.assert();
    const normal = await boundary(false); const normalIcon = route("https://authjs.dev/img/providers/google.svg");
    await normal.handler(normalIcon.fake); expect(normalIcon.fetch).not.toHaveBeenCalled(); expect(() => normal.assert()).toThrow();
  });
  it("does not widen the icon exception to scripts, queries, alternate domains or POST", () => {
    expect(isBootstrapIcon("GET", "https://authjs.dev/img/providers/google.svg", "image")).toBe(true);
    expect(isBootstrapIcon("GET", "https://authjs.dev/img/providers/google.svg?code=synthetic", "image")).toBe(false);
    expect(isBootstrapIcon("GET", "https://authjs.dev/img/providers/google.svg", "script")).toBe(false);
    expect(isBootstrapIcon("POST", "https://authjs.dev/img/providers/google.svg", "image")).toBe(false);
    expect(isBootstrapIcon("GET", "https://authjs.dev.evil.invalid/img/providers/google.svg", "image")).toBe(false);
    expect(bootstrapRequestAllowed("GET", "https://authjs.dev/img/providers/google.svg")).toBe(false);
  });
  it("emits safe different codes for fetch vs fulfillment failures, without upstream details", async () => {
    for (const stage of ["fetch", "fulfill"] as const) {
      const codes: BootstrapCode[] = []; const manual = await boundary(true, (code) => codes.push(code));
      const auth = route(`${C2_ORIGIN}/api/auth/signin/google`, "POST", "https://accounts.google.com/auth");
      auth[stage].mockRejectedValueOnce(new Error("synthetic-cookie offline@example.invalid code=synthetic"));
      await manual.handler(auth.fake); expect(codes).toContain(stage === "fetch" ? "FETCH_FAILED" : "FULFILL_FAILED");
      expect(codes.map(bootstrapDiagnostic).join("\n")).not.toMatch(/synthetic-cookie|offline@example|code=/);
      expect(() => manual.assert()).toThrow();
    }
  });
});

describe("Installed Auth.js default form and Playwright source evidence (offline only)", () => {
  async function coreModule(path: string) {
    const require = createRequire(import.meta.url);
    const nextRequire = createRequire(require.resolve("next-auth/package.json"));
    return import(pathToFileURL(join(dirname(nextRequire.resolve("@auth/core")), path)).href);
  }
  it("renders the actual Google native POST form with CSRF preparation and the exact cosmetic icon, without Next hydration", async () => {
    const { default: parseProviders } = await coreModule("lib/utils/providers.js");
    const { default: renderPage } = await coreModule("lib/pages/index.js");
    const parsed = parseProviders({ url: new URL(C2_ORIGIN), config: { basePath: "/api/auth", providers: [Google({ clientId: "synthetic", clientSecret: "synthetic" })] } });
    const html = renderPage({ url: new URL(`${C2_ORIGIN}/api/auth/signin`), providers: parsed.providers, csrfToken: "synthetic-csrf", callbackUrl: `${C2_ORIGIN}/`, theme: {}, cookies: [], query: {} }).signin().body;
    expect(html).toContain(`action="${C2_ORIGIN}/api/auth/signin/google" method="POST"`);
    expect(html).toContain('type="hidden" name="csrfToken" value="synthetic-csrf"');
    expect(html).toContain('type="submit"'); expect(html).toContain("Sign in with Google");
    expect(html).toContain('src="https://authjs.dev/img/providers/google.svg"');
    expect(html).not.toContain("<script"); expect(html).not.toContain("/_next/");
  });
  it("Auth.js toResponse generates 302 Location and preserves multiple authentication cookies", async () => {
    const { toResponse } = await coreModule("lib/utils/web.js");
    const response = toResponse({ redirect: "https://accounts.google.com/o/oauth2/v2/auth?state=synthetic", cookies: [{ name: "authjs.csrf-token", value: "synthetic-csrf", options: { path: "/", httpOnly: true } }, { name: "authjs.pkce.code_verifier", value: "synthetic-pkce", options: { path: "/", httpOnly: true } }] });
    expect(response.status).toBe(302); expect(response.headers.get("location")).toContain("https://accounts.google.com/");
    expect(response.headers.getSetCookie()).toHaveLength(2);
  });
  it("installed Playwright copies request body and response status/headers and Chromium splits Set-Cookie", () => {
    const require = createRequire(import.meta.url);
    const core = readFileSync(join(dirname(require.resolve("playwright-core/package.json")), "lib/coreBundle.js"), "utf8");
    expect(core).toContain("postDataBuffer = options.request?.postDataBuffer()");
    expect(core).toContain("statusOption ??= options.response.status()");
    expect(core).toContain("headersOption ??= options.response.headers()");
    expect(core).toContain("splitSetCookieHeader(response2.headers)");
  });
  it("diagnostic formatting rejects arbitrary values rather than emitting private data", () => {
    expect(bootstrapDiagnostic("AUTH_SUBMIT")).toBe("C2 bootstrap [AUTH_SUBMIT].");
    for (const value of [user.email, "callback?code=synthetic-secret", { cookie: "synthetic-token" }, new Error("private")]) {
      expect(bootstrapDiagnostic(value)).toBe("C2 bootstrap [UNKNOWN].");
    }
  });
});

describe("C2 configuration and secret-free reporting", () => {
  beforeEach(() => {
    // Synthetic configuration tests do not depend on host proxy/debug settings.
    for (const key of Object.keys(process.env)) {
      if (/^(E2E_BASE_URL|NODE_OPTIONS|NODE_PATH|DEBUG|PWDEBUG|PW_TEST_.*|HTTPS?_PROXY|ALL_PROXY|PUBLIC_DEMO_MODE|C2_RUNTIME_MODE|AUTH_URL)$/i.test(key)) vi.stubEnv(key, undefined);
    }
    vi.stubEnv("C2_E2E_ALLOW_CHAT_MOCK", undefined);
  });
  afterEach(() => vi.unstubAllEnvs());
  it("configures an isolated, fixed, non-recording suite without app startup", async () => {
    const old = process.env.PLAYWRIGHT_NO_COPY_PROMPT;
    try {
      const { default: config } = await import("../playwright.c2.config.ts");
      expect(config.testDir).toBe("./e2e-c2"); expect(config.testMatch).toBe("authenticated-smoke.spec.ts");
      expect(config.workers).toBe(1); expect(config.maxFailures).toBe(1); expect(config.retries).toBe(0);
      expect(config.webServer).toBeUndefined(); expect(config.outputDir).toBe("./test-results-c2");
      expect(config.use).toMatchObject({ baseURL: C2_ORIGIN, trace: "off", screenshot: "off", video: "off", serviceWorkers: "block" });
      expect(config.preserveOutput).toBe("never"); expect(process.env.PLAYWRIGHT_NO_COPY_PROMPT).toBe("1");
    } finally { if (old === undefined) delete process.env.PLAYWRIGHT_NO_COPY_PROMPT; else process.env.PLAYWRIGHT_NO_COPY_PROMPT = old; }
  });
  it("rejects resolved config/CLI overrides before browser startup", () => {
    vi.stubEnv("C2_E2E_ALLOW_READONLY", "1"); vi.stubEnv("PLAYWRIGHT_NO_COPY_PROMPT", "1");
    const config = { workers: 1, maxFailures: 1, webServer: null, preserveOutput: "never", reporter: [["C:/repo/e2e-c2/redacted-reporter.ts"]], projects: [{ name: "c2-chromium", testMatch: "authenticated-smoke.spec.ts", testDir: "C:/repo/e2e-c2", outputDir: "C:/repo/test-results-c2", retries: 0, use: { baseURL: C2_ORIGIN, browserName: "chromium", trace: "off", screenshot: "off", video: "off", serviceWorkers: "block" } }] } as unknown as FullConfig;
    try {
      expect(() => requireC2Config(config)).not.toThrow();
      for (const use of [{ baseURL: "https://production.invalid" }, { trace: "on" }, { storageState: "other.json" }, { connectOptions: { wsEndpoint: "wss://remote.invalid" } }, { contextOptions: { recordHar: { path: "secret.har" } } }]) {
        const bad = structuredClone(config); Object.assign(bad.projects[0].use, use);
        expect(() => requireC2Config(bad)).toThrow("configuration");
      }
      expect(() => requireC2Config({ ...config, workers: 2 })).toThrow();
      expect(() => requireC2Config({ ...config, reporter: [["list"]] })).toThrow();
      expect(() => requireC2Config({ ...config, webServer: { command: "pnpm dev" } } as FullConfig)).toThrow();
    } finally { /* Environment restoration is handled by afterEach. */ }
  });
  it("preserves all six Public Demo cases and its independent configuration", async () => {
    const { default: demo } = await import("../playwright.config.ts");
    expect(demo.testDir).toBe("./e2e"); expect(demo.use?.baseURL).toBe(process.env.E2E_BASE_URL || "https://evidence-atlas-mu.vercel.app");
    expect(demo.use?.trace).toBe("retain-on-failure");
    expect(readFileSync("e2e/public-demo.spec.ts", "utf8").match(/^test\("/gm)).toHaveLength(6);
    for (const path of ["playwright/.auth/", "test-results-c2/", "playwright-report-c2/", ".c2-browser/"]) expect(readFileSync(".gitignore", "utf8")).toContain(`/${path}`);
  });
  it("pins the installed Playwright snapshot suppression behavior for upgrade review", () => {
    const require = createRequire(import.meta.url);
    const cli = join(dirname(require.resolve("playwright/package.json")), "lib/index.js");
    expect(readFileSync(cli, "utf8")).toContain("if (process.env.PLAYWRIGHT_NO_COPY_PROMPT)");
  });
  it("reporter never forwards test names, raw failures, attachments or streams", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {}); const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const reporter = new RedactedReporter();
      reporter.onTestEnd({ title: "synthetic-private-token" } as never, { status: "failed", errors: [{ message: user.email }], attachments: [{ path: "secret.json" }] } as never);
      reporter.onError(); reporter.onStdOut("synthetic-private-token"); reporter.onStdErr(); reporter.onEnd({ status: "failed" } as never);
      const output = [...log.mock.calls, ...error.mock.calls].flat().join("\n");
      expect(output).not.toMatch(/synthetic-private-token|offline@example|secret.json/);
    } finally { log.mockRestore(); error.mockRestore(); }
  });
});
