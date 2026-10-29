import { defineConfig, devices } from "@playwright/test";

// No webServer, baseURL/env target, saved auth, persistent context or real server.
// Route interception fulfils every approved request. A dead loopback proxy and
// DNS mapping prevent accidental unrouted/background traffic from leaving host.
export default defineConfig({
  testDir: "./e2e", testMatch: "demo-chat-isolated.spec.ts",
  workers: 1, retries: 0, maxFailures: 1, timeout: 30_000,
  reporter: "list", outputDir: "test-results/demo-chat-isolated",
  use: {
    trace: "off", screenshot: "off", video: "off", serviceWorkers: "block",
    launchOptions: { args: [
      "--proxy-server=http://127.0.0.1:9", "--proxy-bypass-list=<-loopback>",
      "--host-resolver-rules=MAP * 127.0.0.1", "--disable-background-networking",
      "--disable-component-update", "--disable-domain-reliability", "--disable-sync",
    ] },
  },
  projects: [{ name: "offline-chromium", use: { ...devices["Desktop Chrome"] } }],
});
