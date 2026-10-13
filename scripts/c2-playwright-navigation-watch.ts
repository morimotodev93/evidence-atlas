import type { BootstrapCode } from "./c2-playwright-diagnostics.ts";

export const NAVIGATION_OBSERVATION_MS = 20_000;
export type NavigationFailure = "BLOCKED" | "CANCELED" | "NETWORK" | "TLS" | "DNS" | "OTHER";
type Observation = { requested: boolean; routed: boolean; responded: boolean; settled: boolean; timer?: ReturnType<typeof setTimeout> };

// Observes event state only: no URLs, network calls, navigation, retries or writes.
export function createNavigationWatch(report: (code: BootstrapCode) => void) {
  const records = new WeakMap<object, Observation>();
  const pending = new Set<Observation>();
  let shuttingDown = false;
  function get(key: object) {
    let record = records.get(key);
    if (!record) {
      record = { requested: false, routed: false, responded: false, settled: false };
      records.set(key, record);
    }
    return record;
  }
  function clear(record: Observation) {
    if (record.timer !== undefined) clearTimeout(record.timer);
    record.timer = undefined;
  }
  function settle(record: Observation) {
    clear(record); record.settled = true; pending.delete(record);
  }
  return {
    requested(key: object, redirectedFrom?: object | null) {
      if (shuttingDown) return;
      if (redirectedFrom) { const previous = records.get(redirectedFrom); if (previous) settle(previous); }
      const record = get(key);
      if (record.requested || record.settled) return;
      record.requested = true; pending.add(record);
      record.timer = setTimeout(() => {
        record.timer = undefined;
        if (shuttingDown || record.settled) return;
        report(record.responded ? "GOOGLE_NAV_PENDING_AFTER_RESPONSE" : "GOOGLE_NAV_PENDING_NO_RESPONSE");
        if (!record.routed) report("GOOGLE_NAV_ROUTE_NOT_OBSERVED");
      }, NAVIGATION_OBSERVATION_MS);
      record.timer.unref?.();
    },
    routed(key: object) { get(key).routed = true; },
    responded(key: object) { get(key).responded = true; },
    failed(key: object, category: NavigationFailure) {
      const record = get(key);
      if (record.settled) return; // Ignore late events from a retired redirect hop.
      settle(record);
      if (category === "CANCELED") {
        report(shuttingDown ? "GOOGLE_NAV_CANCELED_DURING_SHUTDOWN" : "GOOGLE_NAV_CANCELED_BEFORE_SHUTDOWN");
      } else if (shuttingDown) report("GOOGLE_NAV_FAILED_DURING_SHUTDOWN");
      else { report("GOOGLE_NAV_FAILED_BEFORE_SHUTDOWN"); report(`GOOGLE_NAV_FAILED_${category}`); }
    },
    committed() { for (const record of pending) settle(record); },
    hasPending() { return pending.size > 0; },
    isShuttingDown() { return shuttingDown; },
    beginShutdown() { shuttingDown = true; for (const record of pending) clear(record); },
    dispose() { shuttingDown = true; for (const record of pending) clear(record); pending.clear(); },
  };
}
