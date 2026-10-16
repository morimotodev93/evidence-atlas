import { defineConfig, devices } from "@playwright/test";
import { C2_ORIGIN, requireHarnessEnvironment } from "./scripts/c2-playwright-policy.ts";

requireHarnessEnvironment(process.env);
// Installed Playwright 1.63 otherwise captures page aria snapshots on failures,
// even with trace/screenshot/video off. Offline regression pins this behavior.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";

export default defineConfig({
  testDir: "./e2e-c2",
  testMatch: "authenticated-smoke.spec.ts",
  globalSetup: "./e2e-c2/global-setup.ts",
  workers: 1,
  maxFailures: 1,
  retries: 0,
  fullyParallel: false,
  timeout: 45_000,
  globalTimeout: 240_000,
  expect: { timeout: 10_000 },
  outputDir: "./test-results-c2",
  preserveOutput: "never",
  reporter: [["./e2e-c2/redacted-reporter.ts"]],
  use: {
    baseURL: C2_ORIGIN,
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    trace: "off", screenshot: "off", video: "off",
    serviceWorkers: "block",
  },
  projects: [{ name: "c2-chromium", use: { ...devices["Desktop Chrome"], browserName: "chromium" } }],
});
