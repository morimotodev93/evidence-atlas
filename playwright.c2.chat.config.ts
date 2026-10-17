import { defineConfig, devices } from "@playwright/test";
import smoke from "./playwright.c2.config.ts";

// Separate Chat-only discovery. The original smoke config remains unchanged.
// The shared global-setup rejects this suite without the distinct chat opt-in.
export default defineConfig({
  ...smoke,
  testMatch: "chat.spec.ts",
  projects: [
    { name: "c2-chat-chromium", use: { ...devices["Desktop Chrome"], browserName: "chromium" } },
  ],
});
