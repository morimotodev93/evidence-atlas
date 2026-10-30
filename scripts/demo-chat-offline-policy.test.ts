import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIXTURE_ORIGIN, offlineRoute, WIDGET_URL } from "../e2e/fixtures/demo-chat-offline-policy";

describe("offline Browser fixture network boundary", () => {
  it("fulfils only enumerated synthetic assets and API, never permits continuation", () => {
    for (const [path, kind] of [["/", "document"], ["/fixture.js", "script"], ["/fixture.css", "style"]]) {
      expect(offlineRoute(`${FIXTURE_ORIGIN}${path}`, "GET")).toBe(kind);
      expect(offlineRoute(`${FIXTURE_ORIGIN}${path}`, "POST")).toBe("deny");
    }
    expect(offlineRoute(WIDGET_URL, "GET")).toBe("widget");
    expect(offlineRoute(`${FIXTURE_ORIGIN}/api/demo/chat`, "POST")).toBe("api");
  });
  it.each([
    "https://api.groq.com/openai/v1/chat/completions", "https://test.upstash.io", "https://production.invalid/demo",
    "https://challenges.cloudflare.com/turnstile/v0/siteverify", `${FIXTURE_ORIGIN}/api/chat`,
    `${FIXTURE_ORIGIN}/api/demo/chat?unexpected=true`, `${FIXTURE_ORIGIN}/fixture.js?other`,
    "https://demo-chat-fixture.invalid.attacker.invalid/", "http://demo-chat-fixture.invalid/",
    "https://user:password@demo-chat-fixture.invalid/", "wss://demo-chat-fixture.invalid/socket",
  ])("rejects unlisted destination %s", (url) => {
    for (const method of ["GET", "POST", "PUT", "OPTIONS", "DELETE"]) expect(offlineRoute(url, method)).toBe("deny");
  });
  it("has no server/env imports, real network continuation, saved auth or dev server", () => {
    const fixture = readFileSync(new URL("../e2e/fixtures/demo-chat-offline.ts", import.meta.url), "utf8");
    const entry = readFileSync(new URL("../e2e/fixtures/demo-chat-entry.tsx", import.meta.url), "utf8");
    const config = readFileSync(new URL("../playwright.demo-chat-isolated.config.ts", import.meta.url), "utf8");
    expect(fixture).not.toMatch(/route\.(?:continue|fallback|fetch)\(/);
    expect(fixture).toContain('context.routeWebSocket("**/*"');
    expect(fixture).toContain('context.route("**/*"');
    expect(entry).not.toMatch(/process\.env|dotenv|@\/prisma|@\/lib\/demo\/read/);
    expect(config).toContain('"--proxy-server=http://127.0.0.1:9"');
    expect(config).toContain('"--host-resolver-rules=MAP * 127.0.0.1"');
    expect(config).toContain('serviceWorkers: "block"');
    expect(config).toContain('retries: 0');
    expect(config).not.toMatch(/webServer\s*:|storageState\s*:|baseURL\s*:|process\.env/);
  });
});
