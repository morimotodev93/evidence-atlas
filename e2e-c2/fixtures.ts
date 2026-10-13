import { test as base, type BrowserContext } from "@playwright/test";
import { preflight, requireExpectedUser, refuse } from "../scripts/c2-playwright-policy.ts";
import { loadC2State } from "../scripts/c2-playwright-state.ts";
import { installNetworkBoundary } from "../scripts/c2-playwright-network.ts";
import { requireC2Config } from "./global-setup.ts";

export const test = base.extend<{ assertNetwork: () => void }>({
  context: async ({ browser }, provide, testInfo) => {
    requireC2Config(testInfo.config);
    const state = await loadC2State();
    const context = await browser.newContext({ storageState: state.storageState, viewport: { width: 1280, height: 720 }, serviceWorkers: "block" });
    context.setDefaultTimeout(10_000);
    context.setDefaultNavigationTimeout(20_000);
    try {
      boundaries.set(context, await installNetworkBoundary(context));
      await preflight(context.request, requireExpectedUser(process.env));
      await provide(context);
    } catch { refuse("context"); }
    finally {
      await context.close();
      boundaries.get(context)?.(); // Include late requests during teardown.
    }
  },
  assertNetwork: [async ({ context }, provide) => {
    // The second installer is avoided: fixture tracks the single installed policy.
    const assert = boundaries.get(context);
    if (!assert) refuse("network-setup");
    await provide(assert);
    assert();
  }, { auto: true }],
});

const boundaries = new WeakMap<BrowserContext, () => void>();

test.afterEach(async ({ assertNetwork }, testInfo) => {
  try { assertNetwork(); }
  finally {
    testInfo.errors.splice(0, testInfo.errors.length,
      ...testInfo.errors.map(() => ({ message: "C2 assertion failed; details suppressed." })));
  }
});
