import { defineConfig, devices } from "@playwright/test";

// Synthetic browser routes only. Every request is fulfilled or aborted locally.
export default defineConfig({
  testDir: "./e2e", testMatch: "demo-i18n-isolated.spec.ts",
  workers: 1, retries: 0, maxFailures: 1, timeout: 30_000,
  reporter: "list", outputDir: "test-results/demo-i18n-isolated",
  use: {
    channel: process.env.DEMO_I18N_BROWSER_CHANNEL,
    trace: "off", screenshot: "off", video: "off", serviceWorkers: "block",
    launchOptions: { args: [
      "--proxy-server=http://127.0.0.1:9", "--proxy-bypass-list=<-loopback>",
      "--host-resolver-rules=MAP * 127.0.0.1", "--disable-background-networking",
      "--disable-component-update", "--disable-domain-reliability", "--disable-sync",
    ] },
  },
  projects: [{ name: "offline-chromium", use: { ...devices["Desktop Chrome"] } }],
});
