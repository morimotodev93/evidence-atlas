import { test as base, type BrowserContext } from "@playwright/test";
import { C2_ORIGIN, preflight, requireExpectedUser, refuse } from "../scripts/c2-playwright-policy.ts";
import { loadC2State } from "../scripts/c2-playwright-state.ts";
import { installNetworkBoundary } from "../scripts/c2-playwright-network.ts";
import { requireC2Config } from "./global-setup.ts";
import { installConversationMocks, type ConversationMocks } from "./conversation-mocks.ts";
import { networkDiagnosticLine } from "../scripts/c2-scenario-diagnostics.ts";

export const test = base.extend<{ assertNetwork: () => void }>({
  context: async ({ browser }, provide, testInfo) => {
    await test.step("C2 fixture config", async () => requireC2Config(testInfo.config));
    const state = await test.step("C2 fixture state", () => loadC2State());
    const context = await test.step("C2 context creation", () => browser.newContext({ storageState: state.storageState, viewport: { width: 1280, height: 720 }, serviceWorkers: "block" }));
    context.setDefaultTimeout(10_000);
    context.setDefaultNavigationTimeout(20_000);
    try {
      // Intercepted documents do not establish a native loopback connection.
      // Chromium still requires this origin-scoped permission for Next's HMR.
      await test.step("C2 loopback permission", () => context.grantPermissions(["local-network-access"], { origin: C2_ORIGIN }));
      boundaries.set(context, await test.step("C2 network installation", () => installNetworkBoundary(context, false, undefined,
        (code) => console.log(networkDiagnosticLine(code)))));
      await test.step("C2 context preflight", () => preflight(context.request, requireExpectedUser(process.env)));
      await provide(context);
    } catch { refuse("context"); }
    finally {
      const boundary = boundaries.get(context);
      boundary?.beginShutdown();
      try { await boundary?.drain(); }
      finally {
        await test.step("C2 context close", () => context.close());
        await boundary?.drain();
        boundary?.(); // Include all settled requests during teardown.
      }
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

const boundaries = new WeakMap<BrowserContext, Awaited<ReturnType<typeof installNetworkBoundary>>>();

test.afterEach(async ({ assertNetwork }, testInfo) => {
  try { assertNetwork(); }
  finally {
    testInfo.errors.splice(0, testInfo.errors.length,
      ...testInfo.errors.map(() => ({ message: "C2 assertion failed; details suppressed." })));
  }
});

// Explicitly opt in with `chatTest` in a future Chat-only spec. The original
// four authenticated smoke cases continue importing `test` and cannot use these
// routes. The shared C2 request boundary is installed before these mocks.
export const chatTest = test.extend<{ conversationMocks: ConversationMocks }>({
  conversationMocks: [async ({ context }, provide) => {
    const mock = await installConversationMocks(context);
    try { await provide(mock); }
    finally {
      try { await mock.dispose(); }
      catch { refuse("chat-mock-cleanup"); }
      mock.assert();
    }
  }, { auto: true }],
});
