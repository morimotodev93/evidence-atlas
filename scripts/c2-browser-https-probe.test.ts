import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BrowserType } from "@playwright/test";
import { exactProbeRequest, prepareProbe, probeDiagnostic, probeFailure, PROBE_CLEANUP_MS, PROBE_TARGET, PROBE_TIMEOUT_MS, type PausedRequest, type ProbeCode } from "./c2-browser-https-probe-policy.ts";
import { runProbe } from "./c2-browser-https-probe-runtime.ts";

const event = (extra: Partial<PausedRequest> = {}): PausedRequest => ({ requestId: "fetch-root", networkId: "network-root", frameId: "root", resourceType: "Document", request: { url: PROBE_TARGET, method: "GET" }, ...extra });
function setup(status?: number) {
  const cdpEvents = new Map<string, (value: unknown) => void>();
  const contextEvents = new Map<string, () => void>(); const browserEvents = new Map<string, () => void>();
  const send = vi.fn(async (method: string, params?: unknown): Promise<Record<string, unknown>> => {
    if (method === "Page.getFrameTree") return { frameTree: { frame: { id: "root" } } };
    if (method === "Fetch.continueRequest" && status !== undefined) {
      // A Location could point to anything; the controller must stop before the
      // fake browser has any opportunity to send the subsequent native hop.
      cdpEvents.get("Fetch.requestPaused")!(event({ responseStatusCode: status, ...{ responseHeaders: [{ name: "location", value: "https://evil.invalid/oauth?code=synthetic-private" }, { name: "set-cookie", value: "synthetic-private" }] } }));
    }
    if (method === "Fetch.failRequest") {
      cdpEvents.get("Network.loadingFailed")!({ requestId: "network-root", errorText: "net::ERR_ABORTED" });
    }
    void params;
    return {};
  });
  const cdp = { send, on: (name: string, callback: (value: unknown) => void) => cdpEvents.set(name, callback) };
  const goto = vi.fn(async () => {
    cdpEvents.get("Fetch.requestPaused")!(event());
    return await new Promise<never>(() => {}); // Native nav intentionally does not commit.
  });
  const page = { goto };
  const context = { newPage: vi.fn(async () => page), newCDPSession: vi.fn(async () => cdp), close: vi.fn(async () => {}), on: (name: string, callback: () => void) => contextEvents.set(name, callback) };
  const browser = { newContext: vi.fn(async () => context), close: vi.fn(async () => {}), on: (name: string, callback: () => void) => browserEvents.set(name, callback) };
  const launch = vi.fn(async () => browser);
  const codes: ProbeCode[] = [];
  const run = () => runProbe({ launch } as unknown as Pick<BrowserType, "launch">, {}, (code) => codes.push(code));
  return { send, cdpEvents, contextEvents, browserEvents, goto, context, browser, launch, codes, run };
}
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe("Standalone HTTPS probe pure policy", () => {
  it("needs no user/app/auth state and accepts only the explicit network-probe opt-in", () => {
    expect(prepareProbe(["--allow-c2-network-probe"], {})).toEqual({});
  });
  it.each([[], ["bootstrap"], ["--allow-c2-readonly"], ["--allow-c2-network-probe", PROBE_TARGET], ["--allow-c2-network-probe", "--url=https://evil.invalid"]].map((args) => ({ args })))("rejects extra/missing CLI arguments %j", ({ args }) => {
    expect(() => prepareProbe(args, {})).toThrow();
  });
  it.each(["NODE_OPTIONS", "NODE_PATH", "NODE_DEBUG", "NODE_DEBUG_NATIVE", "DEBUG", "PWDEBUG", "PW_TEST_CONNECT_WS_ENDPOINT", "PLAYWRIGHT_BROWSERS_PATH", "HTTPS_PROXY", "ALL_PROXY"])("rejects preloads/debug/proxy/browser overrides %s", (key) => {
    expect(() => prepareProbe(["--allow-c2-network-probe"], { [key]: "synthetic" })).toThrow();
  });
  it("does not forward database, OAuth, user/session or provider secrets to Chromium", () => {
    const env = prepareProbe(["--allow-c2-network-probe"], { PATH: "synthetic-path", TEMP: "synthetic-temp", DATABASE_URL: "synthetic-db", AUTH_SECRET: "synthetic-auth", C2_FIXTURE_USER_EMAIL: "synthetic@example.invalid", GROQ_API_KEY: "synthetic-key", GOOGLE_API_KEY: "synthetic-key" });
    expect(env).toEqual({ PATH: "synthetic-path", TEMP: "synthetic-temp" });
    expect(() => prepareProbe(["--allow-c2-network-probe"], {}, ["--import=unsafe"])).toThrow();
  });
  it.each(["https://accounts.google.com/o/oauth2/v2/auth", "https://accounts.google.com/robots.txt?private=1", "https://accounts.google.com/robots.txt#fragment", "https://evil.invalid/robots.txt", "http://localhost:3001", "http://localhost:3000", "http://accounts.google.com/robots.txt"])("rejects alternate destinations %s", (url) => {
    expect(exactProbeRequest(event({ request: { url, method: "GET" } }), "root")).toBe(false);
  });
  it("requires exact GET/document/main-frame and rejects native redirect hops", () => {
    expect(exactProbeRequest(event(), "root")).toBe(true);
    expect(exactProbeRequest(event({ request: { url: PROBE_TARGET, method: "POST" } }), "root")).toBe(false);
    expect(exactProbeRequest(event({ resourceType: "Image" }), "root")).toBe(false);
    expect(exactProbeRequest(event({ frameId: "child" }), "root")).toBe(false);
    expect(exactProbeRequest(event({ redirectedRequestId: "previous" }), "root")).toBe(false);
  });
  it.each([
    ["net::ERR_NAME_NOT_RESOLVED", "HTTPS_DNS_FAILURE"], ["NameNotResolved", "HTTPS_DNS_FAILURE"],
    ["net::ERR_CERT_AUTHORITY_INVALID", "HTTPS_TLS_FAILURE"], ["net::ERR_SSL_PROTOCOL_ERROR", "HTTPS_TLS_FAILURE"],
    ["net::ERR_CONNECTION_RESET", "HTTPS_NETWORK_FAILURE"], ["net::ERR_TIMED_OUT", "HTTPS_NETWORK_FAILURE"],
    ["net::ERR_ABORTED", "HTTPS_CANCELED"], ["synthetic-private token@example.invalid", "HTTPS_FAILURE_UNCLASSIFIED"],
  ])("classifies only exact failure categories %s", (value, expected) => {
    expect(probeFailure(value)).toBe(expected);
    expect(probeDiagnostic(probeFailure(value))).not.toContain(value);
  });
  it("the formatter never emits arbitrary URLs/errors/state/body data", () => {
    for (const value of [PROBE_TARGET, new Error("synthetic-cookie"), { token: "synthetic-token" }, "HTTPS_RESPONSE_RECEIVED code=secret"]) expect(probeDiagnostic(value)).toBe("C2 HTTPS probe [HTTPS_PROBE_REFUSED].");
  });
});

describe("Native Chromium/CDP probe orchestration (all browser/protocol calls mocked)", () => {
  it.each([200, 204, 401, 403, 404, 500, 599])("accepts ordinary response headers %s without needing HTTP 200 or consuming/rendering a body", async (status) => {
    const s = setup(status); expect(await s.run()).toBe("HTTPS_RESPONSE_RECEIVED");
    expect(s.send).toHaveBeenCalledWith("Fetch.failRequest", { requestId: "fetch-root", errorReason: "Aborted" });
    expect(s.codes).not.toContain("HTTPS_CANCELED");
    expect(s.context.close).toHaveBeenCalledOnce(); expect(s.browser.close).toHaveBeenCalledOnce();
  });
  it("selects the same full installed Chromium binary with no security weakening or profile/state reuse", async () => {
    const s = setup(200); await s.run();
    expect(s.launch).toHaveBeenCalledWith({ headless: true, channel: "chromium", timeout: expect.any(Number), env: {} });
    expect(s.context.newPage).toHaveBeenCalledOnce();
    expect(s.browser.newContext).toHaveBeenCalledWith({ serviceWorkers: "block", javaScriptEnabled: false, acceptDownloads: false, ignoreHTTPSErrors: false });
    expect(s.goto).toHaveBeenCalledWith(PROBE_TARGET, { waitUntil: "commit", timeout: expect.any(Number) });
  });
  it("enables Response interception before native navigation and never uses route.fetch/APIRequestContext", async () => {
    const s = setup(200); await s.run();
    const enable = s.send.mock.calls.findIndex(([method]) => method === "Fetch.enable");
    expect(s.send.mock.calls[enable]).toEqual(["Fetch.enable", { handleAuthRequests: true, patterns: [{ urlPattern: "*", requestStage: "Request" }, { urlPattern: "*", requestStage: "Response" }] }]);
    expect(s.send.mock.invocationCallOrder[enable]).toBeLessThan(s.goto.mock.invocationCallOrder[0]);
    expect(s.send.mock.calls.filter(([method]) => method === "Fetch.continueRequest")).toEqual([["Fetch.continueRequest", { requestId: "fetch-root", interceptResponse: true }]]);
    expect(s.send.mock.calls.some(([method]) => ["Fetch.disable", "Fetch.continueResponse", "Fetch.fulfillRequest", "Fetch.getResponseBody"].includes(method))).toBe(false);
    expect(readFileSync("scripts/c2-browser-https-probe-runtime.ts", "utf8")).not.toMatch(/\.fetch\(|\.request\.get\(|\.storageState\(|\.cookies\(|\.addCookies\(/);
  });
  it.each([300, 301, 302, 303, 304, 307, 308, 399])("stops 3xx %s at Response pause before a next hop can be continued", async (status) => {
    const s = setup(status); expect(await s.run()).toBe("HTTPS_REDIRECT_REFUSED");
    expect(s.send.mock.calls.filter(([method]) => method === "Fetch.continueRequest")).toHaveLength(1);
    expect(s.send.mock.calls.some(([method]) => method === "Fetch.continueResponse")).toBe(false);
    expect(s.codes.map(probeDiagnostic).join("\n")).not.toMatch(/evil.invalid|synthetic-private|set-cookie|location/);
  });
  it("native unexpected subresources/redirect requests are failed, without any continuation permission", async () => {
    const s = setup(); const running = s.run();
    await vi.waitFor(() => expect(s.goto).toHaveBeenCalled());
    s.cdpEvents.get("Fetch.requestPaused")!(event({ requestId: "unexpected", request: { url: "https://evil.invalid/", method: "GET" }, resourceType: "Image" }));
    expect(await running).toBe("HTTPS_REQUEST_METADATA_MISMATCH");
    expect(s.send.mock.calls.filter(([method]) => method === "Fetch.continueRequest")).toHaveLength(1);
  });
  it("classifies a rejected continuation without exposing exception text", async () => {
    const s = setup(); const original = s.send.getMockImplementation()!;
    s.send.mockImplementation((method, params) => method === "Fetch.continueRequest" ? Promise.reject(new Error("synthetic-cookie private")) : original(method, params));
    expect(await s.run()).toBe("HTTPS_CONTINUE_FAILED");
    expect(s.codes.map(probeDiagnostic).join("\n")).not.toContain("synthetic-cookie");
  });
  it("classifies navigation rejection separately from transport failure", async () => {
    const s = setup(); s.goto.mockRejectedValueOnce(new Error("synthetic-private navigation"));
    expect(await s.run()).toBe("HTTPS_NAVIGATION_FAILED");
    expect(s.codes.map(probeDiagnostic).join("\n")).not.toContain("synthetic-private");
  });
  it("never claims request mismatch when failing the unexpected request fails", async () => {
    const s = setup(); const original = s.send.getMockImplementation()!;
    s.send.mockImplementation((method, params) => method === "Fetch.failRequest" ? Promise.reject(new Error("synthetic-private abort")) : original(method, params));
    const running = s.run(); await vi.waitFor(() => expect(s.goto).toHaveBeenCalled());
    s.cdpEvents.get("Fetch.requestPaused")!(event({ requestId: "unapproved", request: { url: "https://evil.invalid/", method: "GET" } }));
    expect(await running).toBe("HTTPS_ABORT_FAILED");
  });
  it("does not navigate if CDP containment setup is rejected", async () => {
    const s = setup(200); const original = s.send.getMockImplementation()!;
    s.send.mockImplementation((method, params) => method === "Fetch.enable" ? Promise.reject(new Error("synthetic-private CDP error")) : original(method, params));
    expect(await s.run()).toBe("HTTPS_PROBE_REFUSED"); expect(s.goto).not.toHaveBeenCalled();
    expect(s.browser.close).toHaveBeenCalledOnce();
  });
  it("does not report safe response success when the response abort command is rejected", async () => {
    const s = setup(302); const original = s.send.getMockImplementation()!;
    s.send.mockImplementation((method, params) => method === "Fetch.failRequest" ? Promise.reject(new Error("synthetic-cookie command rejection")) : original(method, params));
    expect(await s.run()).toBe("HTTPS_ABORT_FAILED");
    expect(s.codes).not.toContain("HTTPS_REDIRECT_REFUSED"); expect(s.browser.close).toHaveBeenCalledOnce();
  });
  it("refuses mismatched Response request identity even if URL matches", async () => {
    const s = setup(); const running = s.run(); await vi.waitFor(() => expect(s.goto).toHaveBeenCalled());
    s.cdpEvents.get("Fetch.requestPaused")!(event({ requestId: "other", networkId: "other", responseStatusCode: 200 }));
    expect(await running).toBe("HTTPS_RESPONSE_ID_MISMATCH");
  });
  it("distinguishes mismatched Response metadata before it can be forwarded", async () => {
    const s = setup(); const running = s.run(); await vi.waitFor(() => expect(s.goto).toHaveBeenCalled());
    s.cdpEvents.get("Fetch.requestPaused")!(event({ responseStatusCode: 200, request: { url: "https://evil.invalid/", method: "GET" } }));
    expect(await running).toBe("HTTPS_RESPONSE_METADATA_MISMATCH");
    expect(s.send).toHaveBeenCalledWith("Fetch.failRequest", { requestId: "fetch-root", errorReason: "Aborted" });
  });
  it("never supplies credentials to an HTTP/proxy auth challenge", async () => {
    const s = setup(); const running = s.run(); await vi.waitFor(() => expect(s.goto).toHaveBeenCalled());
    s.cdpEvents.get("Fetch.authRequired")!({ requestId: "fetch-root", authChallenge: { realm: "synthetic-private" } });
    expect(await running).toBe("HTTPS_AUTH_CHALLENGE_REFUSED");
    expect(s.send).toHaveBeenCalledWith("Fetch.continueWithAuth", { requestId: "fetch-root", authChallengeResponse: { response: "CancelAuth" } });
  });
  it.each(["net::ERR_NAME_NOT_RESOLVED", "net::ERR_CERT_DATE_INVALID", "net::ERR_CONNECTION_REFUSED"])("classifies correlated native loading failure %s", async (errorText) => {
    const s = setup(); const running = s.run(); await vi.waitFor(() => expect(s.goto).toHaveBeenCalled());
    s.cdpEvents.get("Network.loadingFailed")!({ requestId: "network-root", errorText });
    expect(await running).toBe(probeFailure(errorText)); expect(s.browser.close).toHaveBeenCalledOnce();
  });
  it("has a bounded 15-second measurement and closes context/browser on timeout without retries", async () => {
    vi.useFakeTimers(); const s = setup(); const running = s.run(); await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(PROBE_TIMEOUT_MS - 1); expect(s.browser.close).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1); expect(await running).toBe("HTTPS_TIMEOUT");
    expect(s.goto).toHaveBeenCalledOnce(); expect(s.context.close).toHaveBeenCalledOnce(); expect(s.browser.close).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
  it("failed cleanup is explicit and never claimed as completed", async () => {
    const s = setup(200); s.context.close.mockRejectedValueOnce(new Error("private profile path"));
    expect(await s.run()).toBe("HTTPS_PROBE_REFUSED"); expect(s.codes).toContain("HTTPS_CLEANUP_FAILED");
    expect(s.browser.close).toHaveBeenCalledOnce(); expect(s.codes.map(probeDiagnostic).join("\n")).not.toContain("private profile");
  });
  it("cleanup waiting is bounded even when a close call does not acknowledge", async () => {
    vi.useFakeTimers(); const s = setup(200); s.context.close.mockImplementationOnce(() => new Promise<void>(() => {}));
    const running = s.run(); await vi.advanceTimersByTimeAsync(0); await vi.advanceTimersByTimeAsync(PROBE_CLEANUP_MS);
    expect(await running).toBe("HTTPS_PROBE_REFUSED"); expect(s.codes).toContain("HTTPS_CLEANUP_FAILED"); expect(s.browser.close).toHaveBeenCalledOnce();
  });
  it("a browser created after the measurement deadline is closed without creating a context or navigating", async () => {
    vi.useFakeTimers(); const s = setup();
    let created!: (browser: typeof s.browser) => void;
    s.launch.mockImplementationOnce(() => new Promise((resolve) => { created = resolve; }));
    const running = s.run(); await vi.advanceTimersByTimeAsync(PROBE_TIMEOUT_MS);
    expect(s.codes).toContain("HTTPS_TIMEOUT"); created(s.browser);
    await vi.advanceTimersByTimeAsync(0);
    expect(await running).toBe("HTTPS_TIMEOUT"); expect(s.browser.close).toHaveBeenCalledOnce();
    expect(s.browser.newContext).not.toHaveBeenCalled(); expect(s.goto).not.toHaveBeenCalled();
  });
  it("classifies repeated Fetch pause and distinct Fetch IDs without granting another continuation", async () => {
    for (const [requestId, secondNetworkId, expected] of [
      ["fetch-root", "network-root", "HTTPS_REPAUSED_FETCH_ID"],
      ["second", "network-root", "HTTPS_SECOND_FETCH_SAME_NETWORK"],
      ["second", "other-network", "HTTPS_SECOND_FETCH_UNLINKED"],
      ["second", undefined, "HTTPS_SECOND_FETCH_UNLINKED"],
    ] as const) {
      const s = setup(); const running = s.run(); await vi.waitFor(() => expect(s.goto).toHaveBeenCalled());
      s.cdpEvents.get("Fetch.requestPaused")!(event({ requestId, networkId: secondNetworkId }));
      expect(await running).toBe(expected);
      expect(s.send.mock.calls.filter(([method]) => method === "Fetch.continueRequest")).toHaveLength(1);
      expect(s.send).toHaveBeenCalledWith("Fetch.failRequest", { requestId, errorReason: "Aborted" });
    }
  });
  it("never follows a redirected request-stage event", async () => {
    const s = setup(); const running = s.run(); await vi.waitFor(() => expect(s.goto).toHaveBeenCalled());
    s.cdpEvents.get("Fetch.requestPaused")!(event({ requestId: "second", redirectedRequestId: "fetch-root" }));
    expect(await running).toBe("HTTPS_REQUEST_METADATA_MISMATCH");
    expect(s.send.mock.calls.filter(([method]) => method === "Fetch.continueRequest")).toHaveLength(1);
  });
  it("an early user browser closure is cancellation, not a claimed TLS failure", async () => {
    const s = setup(); const running = s.run(); await vi.waitFor(() => expect(s.goto).toHaveBeenCalled()); s.browserEvents.get("disconnected")!();
    expect(await running).toBe("HTTPS_CANCELED"); expect(s.codes).not.toContain("HTTPS_TLS_FAILURE");
  });
  it("contains no app/auth/state/file operation or automatic hookup in Bootstrap", () => {
    const runtime = readFileSync("scripts/c2-browser-https-probe-runtime.ts", "utf8");
    expect(runtime).not.toMatch(/localhost:3001|prisma|dotenv|auth\/session|storageState\(|readFile|writeFile|addCookies/);
    expect(readFileSync("scripts/c2-playwright-bootstrap.ts", "utf8")).not.toContain("c2-browser-https-probe");
    expect(readFileSync("scripts/c2-playwright.ts", "utf8")).not.toContain("c2-browser-https-probe");
    expect(readFileSync("e2e/public-demo.spec.ts", "utf8").match(/^test\("/gm)).toHaveLength(6);
    expect(readFileSync("e2e-c2/authenticated-smoke.spec.ts", "utf8").match(/^test\("/gm)).toHaveLength(4);
  });
  it("pins installed CDP pause-before-body and Chromium binary selection source evidence", () => {
    const require = createRequire(import.meta.url); const root = dirname(require.resolve("playwright-core/package.json"));
    const protocol = readFileSync(join(root, "types/protocol.d.ts"), "utf8");
    expect(protocol).toContain("Response will intercept after the response is received (but before response");
    expect(protocol).toContain("The request is paused until the client responds");
    expect(protocol).toContain("Requests resulting from a redirect will");
    expect(readFileSync(join(root, "types/types.d.ts"), "utf8")).toContain("Non-persistent browser contexts don't write any browsing data to disk.");
    const core = readFileSync(join(root, "lib/coreBundle.js"), "utf8");
    expect(core).toContain('if (options.channel && registry.isChromiumAlias(options.channel))');
    expect(core).toContain('return options.headless ? "chromium-headless-shell" : "chromium"');
  });
});
