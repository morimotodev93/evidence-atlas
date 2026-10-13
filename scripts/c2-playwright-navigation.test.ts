import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import type { BrowserContext, Page, Request, Route } from "@playwright/test";
import { installNetworkBoundary, navigationFailureCategory } from "./c2-playwright-network.ts";
import { bootstrapDiagnostic, type BootstrapCode } from "./c2-playwright-diagnostics.ts";
import { C2_ORIGIN } from "./c2-playwright-policy.ts";

const google = "https://accounts.google.com/o/oauth2/v2/auth?code=synthetic-private&state=synthetic-private";
function request(url = google, method = "GET", subframe = false, error = "") {
  return { url: () => url, method: () => method, isNavigationRequest: () => true, resourceType: () => "document", frame: () => ({ parentFrame: () => subframe ? {} : null }), failure: () => ({ errorText: error }) } as unknown as Request;
}
function page() {
  const handlers = new Map<string, (frame: unknown) => void>();
  const main = { url: () => google };
  return { main, handlers, fake: { on: (event: string, callback: (frame: unknown) => void) => handlers.set(event, callback), mainFrame: () => main } as unknown as Page };
}
async function setup(bootstrap = true, existing = [] as Page[]) {
  const codes: BootstrapCode[] = [];
  const handlers = new Map<string, (value: unknown) => void>();
  let routeHandler!: (route: Route) => Promise<void>;
  const context = { route: async (_pattern: string, callback: typeof routeHandler) => { routeHandler = callback; }, routeWebSocket: async () => {}, on: (event: string, callback: (value: unknown) => void) => handlers.set(event, callback), pages: () => existing } as unknown as BrowserContext;
  const boundary = await installNetworkBoundary(context, bootstrap, (code) => codes.push(code));
  const post = request(`${C2_ORIGIN}/api/auth/signin/google`, "POST");
  const response = { status: () => 302, headers: () => ({ location: google, "set-cookie": "csrf=synthetic; Path=/\npkce=synthetic; Path=/" }) };
  const fetch = vi.fn(async () => response);
  const fulfill = vi.fn<(options: unknown) => Promise<void>>(async () => {});
  const abort = vi.fn(async () => {});
  const route = { request: () => post, fetch, fulfill, abort } as unknown as Route;
  return { codes, handlers, routeHandler, boundary, route, fetch, fulfill, abort, post, response };
}

describe("OAuth browser navigation observations (offline event/route doubles)", () => {
  it("AUTH_REDIRECT is emitted before fulfillment and a pending promise is observable", async () => {
    const s = await setup();
    let finish!: () => void;
    s.fulfill.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    const running = s.routeHandler(s.route);
    await Promise.resolve(); await Promise.resolve();
    expect(s.codes).toContain("AUTH_REDIRECT"); expect(s.codes).toContain("AUTH_FULFILL_STARTED");
    expect(s.codes).not.toContain("AUTH_FULFILL_COMPLETED");
    s.boundary.reportProgress(); expect(s.codes).toContain("AUTH_FULFILL_PENDING");
    finish(); await running;
    expect(s.codes).toContain("AUTH_FULFILL_COMPLETED");
    s.boundary.reportProgress(); expect(s.codes).toContain("GOOGLE_NAV_NOT_OBSERVED");
  });
  it("a rejected fulfill never reports completion and still fails closed", async () => {
    const s = await setup(); s.fulfill.mockRejectedValueOnce(new Error("private-cookie private@example.invalid"));
    await s.routeHandler(s.route); s.boundary.reportProgress();
    expect(s.codes).toContain("AUTH_REDIRECT"); expect(s.codes).toContain("FULFILL_FAILED");
    expect(s.codes).not.toContain("AUTH_FULFILL_COMPLETED"); expect(s.codes).not.toContain("AUTH_FULFILL_PENDING");
    expect(() => s.boundary()).toThrow("bootstrap-network");
    expect(s.codes.map(bootstrapDiagnostic).join("\n")).not.toMatch(/private-cookie|private@example/);
  });
  it("observes a redirected Google request even if no route or frame commit event occurs", async () => {
    const s = await setup(); await s.routeHandler(s.route);
    s.handlers.get("request")!(request()); s.boundary.reportProgress();
    expect(s.codes).toContain("GOOGLE_NAV_REQUEST"); expect(s.codes).toContain("GOOGLE_NAV_UNCOMMITTED");
    expect(s.codes).not.toContain("GOOGLE_NAV_ROUTE"); expect(s.codes).not.toContain("GOOGLE_NAVIGATION");
    expect(s.codes).not.toContain("GOOGLE_NAV_NOT_OBSERVED");
  });
  it("distinguishes browser-delivered Auth.js redirect response from API fetch validation", async () => {
    const s = await setup(); await s.routeHandler(s.route);
    expect(s.codes).not.toContain("AUTH_BROWSER_REDIRECT");
    s.handlers.get("request")!(s.post);
    s.handlers.get("response")!({ request: () => s.post, status: () => 302, headers: () => ({}) });
    expect(s.codes).toContain("AUTH_BROWSER_POST"); expect(s.codes).toContain("AUTH_BROWSER_REDIRECT");
    expect(s.fulfill).toHaveBeenCalledWith({ response: s.response });
  });
  it.each([
    ["net::ERR_BLOCKED_BY_CLIENT", "BLOCKED"], ["net::ERR_UNSAFE_REDIRECT", "BLOCKED"], ["net::ERR_ABORTED", "CANCELED"],
    ["net::ERR_NAME_NOT_RESOLVED", "NETWORK"], ["private-cookie code=synthetic-private", "OTHER"],
  ])("classifies failed navigation without logging raw text: %s", async (error, category) => {
    const s = await setup();
    s.handlers.get("requestfailed")!(request(google, "GET", false, error));
    expect(s.codes).toContain(`GOOGLE_NAV_FAILED_${category}`);
    expect(s.codes.map(bootstrapDiagnostic).join("\n")).not.toContain("code=synthetic-private");
    expect(navigationFailureCategory(error)).toBe(category);
  });
  it("does not treat a Google subframe as main-frame navigation success", async () => {
    const p = page(); const s = await setup(true, [p.fake]);
    s.handlers.get("request")!(request(google, "GET", true));
    p.handlers.get("framenavigated")!({ url: () => google });
    expect(s.codes).toContain("GOOGLE_SUBFRAME_NAV_REQUEST");
    expect(s.codes).not.toContain("GOOGLE_NAV_REQUEST"); expect(s.codes).not.toContain("GOOGLE_NAVIGATION");
    p.handlers.get("framenavigated")!(p.main);
    expect(s.codes).toContain("GOOGLE_NAVIGATION");
  });
  it("observes both existing and future pages without duplicate listener registration", async () => {
    const existing = page(); const s = await setup(true, [existing.fake]);
    s.handlers.get("page")!(existing.fake); expect(existing.handlers.size).toBe(1);
    const future = page(); s.handlers.get("page")!(future.fake); expect(future.handlers.size).toBe(1);
    future.handlers.get("framenavigated")!(future.main); expect(s.codes).toContain("GOOGLE_NAVIGATION");
  });
  it("a refused un-intercepted redirect hop latches refusal without claiming that observation prevented transmission", async () => {
    const s = await setup(); s.handlers.get("request")!(request("https://evil.invalid/?code=synthetic-private"));
    expect(s.codes).toContain("REQUEST_OBSERVED_REFUSED"); expect(() => s.boundary()).toThrow("bootstrap-network");
    expect(s.codes.map(bootstrapDiagnostic).join("\n")).not.toContain("evil.invalid");
  });
  it("observes response/error classes and CSP form-action presence without body/header logging", async () => {
    const s = await setup();
    s.handlers.get("response")!({ request: () => request(), status: () => 403, headers: () => ({}) });
    s.handlers.get("response")!({ request: () => request(`${C2_ORIGIN}/api/auth/signin`), status: () => 200, headers: () => ({ "content-security-policy": "default-src 'self'; form-action 'self'; report-uri /private" }) });
    s.handlers.get("requestfailed")!(request(`${C2_ORIGIN}/api/auth/signin/google`, "POST", false, "net::ERR_FAILED secret-header"));
    expect(s.codes).toContain("GOOGLE_NAV_HTTP_ERROR"); expect(s.codes).toContain("SIGNIN_CSP_FORM_ACTION"); expect(s.codes).toContain("AUTH_BROWSER_FAILED_OTHER");
    expect(s.codes.map(bootstrapDiagnostic).join("\n")).not.toMatch(/report-uri|secret-header|private/);
  });
  it("normal read-only E2E does not install bootstrap-only observers or emit diagnostics", async () => {
    const s = await setup(false);
    expect([...s.handlers.keys()]).toEqual(["page"]); expect(s.codes).toEqual([]);
    s.boundary.reportProgress(); expect(s.codes).toEqual([]);
  });
  it("unavailable frame data does not expose exceptions", async () => {
    const s = await setup(); const req = request();
    vi.spyOn(req, "frame").mockImplementation(() => { throw new Error("private callback?code=secret"); });
    s.handlers.get("request")!(req); expect(s.codes).toContain("OBSERVATION_UNAVAILABLE");
    expect(s.codes.map(bootstrapDiagnostic).join("\n")).not.toMatch(/callback|code=/);
  });
});

describe("Installed Playwright Chromium fulfillment source evidence", () => {
  function coreSource() {
    const require = createRequire(import.meta.url);
    return readFileSync(join(dirname(require.resolve("playwright-core/package.json")), "lib/coreBundle.js"), "utf8");
  }
  it("the installed fulfillment helper can resolve after swallowing a protocol failure", async () => {
    const core = coreSource();
    const start = core.indexOf("async function catchDisallowedErrors(callback)");
    const end = core.indexOf("function removeCookieHeader", start);
    expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
    // Execute only the installed helper, with a mocked protocol predicate; no
    // Playwright connection/session/browser/network is constructed.
    const helper = runInNewContext(`${core.slice(start, end)}; catchDisallowedErrors`, { isProtocolError: () => true }) as (callback: () => Promise<unknown>) => Promise<unknown>;
    await expect(helper(async () => { throw new Error("Invalid InterceptionId"); })).resolves.toBeUndefined();
    await expect(helper(async () => { throw new Error("Unsafe header"); })).rejects.toThrow("Unsafe header");
    expect(core).toContain('await this._session.send("Fetch.fulfillRequest"');
  });
  it("Chromium auto-continues redirect requests instead of creating another user route", () => {
    const core = coreSource();
    expect(core).toContain("if (redirectedFrom || !this._userRequestInterceptionEnabled");
    expect(core).toContain('this.emit(Events.BrowserContext.Request, request2)');
    expect(core).toContain('this.emit(Events.BrowserContext.RequestFailed, request2)');
  });
});
