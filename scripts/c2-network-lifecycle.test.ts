import type { BrowserContext, Route, WebSocketRoute } from "@playwright/test";
import { describe, expect, it, vi } from "vitest";
import { installNetworkBoundary } from "./c2-playwright-network.ts";
import { C2_ORIGIN } from "./c2-playwright-policy.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const response = () => ({ status: () => 200, headers: () => ({}) });

async function setup(bootstrap = false) {
  let http!: (route: Route) => Promise<void>;
  let socket!: (route: WebSocketRoute) => Promise<void>;
  const route = vi.fn(async (_pattern: string, handler: typeof http) => { http = handler; });
  const report = vi.fn();
  const context = {
    route,
    routeWebSocket: async (_pattern: RegExp, handler: typeof socket) => { socket = handler; },
    on: vi.fn(), pages: () => [],
  } as unknown as BrowserContext;
  const boundary = await installNetworkBoundary(context, bootstrap, undefined, report);
  return { http, socket, boundary, route, report };
}

function request(url = `${C2_ORIGIN}/`, method = "GET") {
  const fetch = vi.fn(async () => response());
  const fulfill = vi.fn(async () => {});
  const abort = vi.fn(async () => {});
  const route = {
    request: () => ({ url: () => url, method: () => method, resourceType: () => "document", isNavigationRequest: () => true, frame: () => ({ parentFrame: () => null }) }),
    fetch, fulfill, abort,
  } as unknown as Route;
  return { route, fetch, fulfill, abort };
}

function socket(url = "ws://localhost:3001/_next/hmr?id=synthetic") {
  const close = vi.fn(async () => {});
  const connectToServer = vi.fn();
  return { route: { url: () => url, close, connectToServer } as unknown as WebSocketRoute, close, connectToServer };
}

describe("C2 request-boundary shutdown (offline route doubles)", () => {
  it("waits for admitted fetch and fulfillment before allowing context teardown", async () => {
    const s = await setup();
    const r = request();
    const fetched = deferred<ReturnType<typeof response>>();
    const fulfilled = deferred<void>();
    const enteredFulfill = deferred<void>();
    r.fetch.mockImplementation(() => fetched.promise);
    r.fulfill.mockImplementation(() => { enteredFulfill.resolve(); return fulfilled.promise; });
    const running = s.http(r.route);
    s.boundary.beginShutdown();
    let drained = false;
    const draining = s.boundary.drain().then(() => { drained = true; });
    await Promise.resolve();
    expect(drained).toBe(false);
    fetched.resolve(response());
    await enteredFulfill.promise;
    expect(drained).toBe(false);
    fulfilled.resolve();
    await Promise.all([running, draining]);
    expect(drained).toBe(true);
    expect(r.fetch).toHaveBeenCalledWith({ maxRedirects: 0, timeout: 15_000 });
    s.boundary();
    // The catch-all policy remains installed throughout shutdown.
    expect(s.route).toHaveBeenCalledTimes(1);
  });

  it("aborts new allowed reads locally and drains their abort callbacks", async () => {
    const s = await setup();
    s.boundary.beginShutdown();
    const r = request();
    const aborted = deferred<void>();
    r.abort.mockImplementation(() => aborted.promise);
    const running = s.http(r.route);
    let drained = false;
    const draining = s.boundary.drain().then(() => { drained = true; });
    await Promise.resolve();
    expect(drained).toBe(false);
    expect(r.fetch).not.toHaveBeenCalled();
    expect(r.abort).toHaveBeenCalledWith("blockedbyclient");
    aborted.resolve();
    await Promise.all([running, draining]);
    s.boundary();
    expect(s.report).not.toHaveBeenCalled();
  });

  it.each([
    ["https://external.invalid/", "GET", "NET_ORIGIN_REFUSED"],
    [`${C2_ORIGIN}/`, "POST", "NET_METHOD_REFUSED"],
    [`${C2_ORIGIN}/api/auth/signin`, "GET", "NET_PATH_REFUSED"],
    [`${C2_ORIGIN}/?unexpected=1`, "GET", "NET_QUERY_REFUSED"],
  ])("still fails closed during shutdown for %s", async (url, method, code) => {
    const s = await setup();
    s.boundary.beginShutdown();
    const r = request(url, method);
    await s.http(r.route);
    await s.boundary.drain();
    expect(r.fetch).not.toHaveBeenCalled();
    expect(r.abort).toHaveBeenCalledWith("blockedbyclient");
    expect(s.report).toHaveBeenCalledWith(code);
    expect(() => s.boundary()).toThrow("network-policy");
  });

  it.each(["fetch", "fulfill"] as const)("retains a real %s failure found while draining", async (stage) => {
    const s = await setup();
    const r = request();
    const failure = deferred<void>();
    const entered = deferred<void>();
    if (stage === "fetch") r.fetch.mockImplementation(async () => { entered.resolve(); await failure.promise; return response(); });
    else r.fulfill.mockImplementation(async () => { entered.resolve(); await failure.promise; });
    const running = s.http(r.route);
    await entered.promise;
    s.boundary.beginShutdown();
    const draining = s.boundary.drain();
    failure.reject(new Error("Synthetic transport failure"));
    await Promise.all([running, draining]);
    expect(s.report).toHaveBeenCalledWith(stage === "fetch" ? "NET_FETCH_FAILED" : "NET_FULFILL_FAILED");
    expect(() => s.boundary()).toThrow("network-policy");
  });

  it("closes new approved sockets locally and awaits their completion", async () => {
    const s = await setup();
    s.boundary.beginShutdown();
    const r = socket();
    const closed = deferred<void>();
    r.close.mockImplementation(() => closed.promise);
    const running = s.socket(r.route);
    let drained = false;
    const draining = s.boundary.drain().then(() => { drained = true; });
    await Promise.resolve();
    expect(drained).toBe(false);
    expect(r.connectToServer).not.toHaveBeenCalled();
    closed.resolve();
    await Promise.all([running, draining]);
    s.boundary();
  });

  it("retains refused sockets and unexpected abort failures during shutdown", async () => {
    const s = await setup();
    s.boundary.beginShutdown();
    const r = socket("wss://external.invalid/");
    await s.socket(r.route);
    await s.boundary.drain();
    expect(r.connectToServer).not.toHaveBeenCalled();
    expect(() => s.boundary()).toThrow("network-policy");
    const other = await setup();
    other.boundary.beginShutdown();
    const read = request();
    const aborted = deferred<void>();
    read.abort.mockImplementation(() => aborted.promise);
    const running = other.http(read.route);
    const draining = other.boundary.drain();
    aborted.reject(new Error("Synthetic abort failure"));
    await expect(running).rejects.toThrow("Synthetic abort failure");
    await expect(draining).rejects.toThrow("Synthetic abort failure");
    expect(() => other.boundary()).toThrow("network-policy");
  });

  it("keeps separately authorized bootstrap shutdown behavior unchanged", async () => {
    const s = await setup(true);
    s.boundary.beginShutdown();
    const r = request();
    await s.http(r.route);
    const ws = socket();
    await s.socket(ws.route);
    await s.boundary.drain();
    expect(r.fetch).toHaveBeenCalledOnce();
    expect(ws.connectToServer).toHaveBeenCalledOnce();
    s.boundary();
  });
});
