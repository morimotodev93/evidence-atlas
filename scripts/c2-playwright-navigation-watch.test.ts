import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createNavigationWatch, NAVIGATION_OBSERVATION_MS } from "./c2-playwright-navigation-watch.ts";
import { bootstrapDiagnostic, type BootstrapCode } from "./c2-playwright-diagnostics.ts";
import { navigationFailureCategory } from "./c2-playwright-network.ts";

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
function setup() {
  const codes: BootstrapCode[] = [];
  const watch = createNavigationWatch((code) => codes.push(code));
  return { codes, watch, key: {} };
}
describe("Bounded OAuth observation (fake clock, no browser/network)", () => {
  it("reports a still-pending un-routed request once at the fixed deadline without retries or failure claims", () => {
    const { watch, key, codes } = setup(); watch.requested(key);
    vi.advanceTimersByTime(NAVIGATION_OBSERVATION_MS - 1); expect(codes).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(codes).toEqual(["GOOGLE_NAV_PENDING_NO_RESPONSE", "GOOGLE_NAV_ROUTE_NOT_OBSERVED"]);
    expect(watch.hasPending()).toBe(true); expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60_000); expect(codes).toHaveLength(2);
    expect(codes.join(" ")).not.toContain("FAILED");
  });
  it("distinguishes a reached route and response headers without a commit", () => {
    const { watch, key, codes } = setup(); watch.routed(key); watch.requested(key); watch.responded(key);
    vi.advanceTimersByTime(NAVIGATION_OBSERVATION_MS);
    expect(codes).toEqual(["GOOGLE_NAV_PENDING_AFTER_RESPONSE"]); expect(watch.hasPending()).toBe(true);
    watch.committed(); expect(watch.hasPending()).toBe(false);
  });
  it("a response without a route callback does not imply routing blocked it", () => {
    const { watch, key, codes } = setup(); watch.requested(key); watch.responded(key);
    vi.advanceTimersByTime(NAVIGATION_OBSERVATION_MS);
    expect(codes).toEqual(["GOOGLE_NAV_PENDING_AFTER_RESPONSE", "GOOGLE_NAV_ROUTE_NOT_OBSERVED"]);
  });
  it("commit clears the observation timer, without late pending diagnostics", () => {
    const { watch, key, codes } = setup(); watch.requested(key); watch.committed();
    expect(vi.getTimerCount()).toBe(0); vi.advanceTimersByTime(NAVIGATION_OBSERVATION_MS);
    expect(codes).toEqual([]); expect(watch.hasPending()).toBe(false);
  });
  it("pre-shutdown failure cancels the timer and remains distinct from pending", () => {
    const { watch, key, codes } = setup(); watch.requested(key); watch.failed(key, "TLS");
    expect(codes).toEqual(["GOOGLE_NAV_FAILED_BEFORE_SHUTDOWN", "GOOGLE_NAV_FAILED_TLS"]);
    expect(watch.hasPending()).toBe(false); expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60_000); expect(codes).toHaveLength(2);
  });
  it("cancellation before the shutdown marker does not claim independent network failure or developer intent", () => {
    const { watch, key, codes } = setup(); watch.requested(key); watch.failed(key, "CANCELED");
    expect(codes).toEqual(["GOOGLE_NAV_CANCELED_BEFORE_SHUTDOWN"]);
    expect(codes.join(" ")).not.toContain("FAILED_NETWORK");
  });
  it("cancellation after our marker is explicitly a shutdown event", () => {
    const { watch, key, codes } = setup(); watch.requested(key); watch.beginShutdown(); watch.failed(key, "CANCELED");
    expect(codes).toEqual(["GOOGLE_NAV_CANCELED_DURING_SHUTDOWN"]);
    expect(watch.isShuttingDown()).toBe(true); expect(vi.getTimerCount()).toBe(0);
  });
  it("other errors arriving during shutdown are not labeled independent pre-stop failures", () => {
    const { watch, key, codes } = setup(); watch.requested(key); watch.beginShutdown(); watch.failed(key, "NETWORK");
    expect(codes).toEqual(["GOOGLE_NAV_FAILED_DURING_SHUTDOWN"]);
  });
  it("shutdown/disposal clear timers and cannot schedule new authentication work", () => {
    const { watch, key, codes } = setup(); watch.requested(key); watch.beginShutdown();
    expect(vi.getTimerCount()).toBe(0); watch.requested({}); expect(vi.getTimerCount()).toBe(0);
    watch.dispose(); watch.dispose(); expect(watch.hasPending()).toBe(false);
    vi.advanceTimersByTime(60_000); expect(codes).toEqual([]);
  });
  it("a native redirect settles the previous hop and starts one observation for the new request", () => {
    const { watch, key, codes } = setup(); const next = {};
    watch.requested(key); watch.responded(key); watch.requested(next, key);
    expect(vi.getTimerCount()).toBe(1); vi.advanceTimersByTime(NAVIGATION_OBSERVATION_MS);
    expect(codes).toEqual(["GOOGLE_NAV_PENDING_NO_RESPONSE", "GOOGLE_NAV_ROUTE_NOT_OBSERVED"]);
    watch.failed(key, "CANCELED"); expect(watch.hasPending()).toBe(true);
    expect(codes).not.toContain("GOOGLE_NAV_CANCELED_BEFORE_SHUTDOWN");
  });
  it("duplicate request events do not extend the observation or create extra timers", () => {
    const { watch, key, codes } = setup(); watch.requested(key); vi.advanceTimersByTime(5000); watch.requested(key);
    expect(vi.getTimerCount()).toBe(1); vi.advanceTimersByTime(NAVIGATION_OBSERVATION_MS - 5000);
    expect(codes).toContain("GOOGLE_NAV_PENDING_NO_RESPONSE");
  });
  it.each([
    ["net::ERR_SSL_PROTOCOL_ERROR", "TLS"], ["net::ERR_CERT_AUTHORITY_INVALID", "TLS"], ["net::ERR_CERT_DATE_INVALID", "TLS"],
    ["net::ERR_NAME_NOT_RESOLVED", "DNS"], ["net::ERR_CONNECTION_RESET", "NETWORK"], ["net::ERR_TIMED_OUT", "NETWORK"],
    ["net::ERR_ABORTED", "CANCELED"], ["net::ERR_BLOCKED_BY_CLIENT", "BLOCKED"], ["private-cookie?code=secret", "OTHER"],
  ])("maps exact failure strings to fixed categories: %s", (value, category) => {
    expect(navigationFailureCategory(value)).toBe(category);
    expect(bootstrapDiagnostic(`GOOGLE_NAV_FAILED_${category}`)).not.toContain(value);
    expect(navigationFailureCategory({ private: value })).toBe("OTHER");
  });
});
