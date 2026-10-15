import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bootstrapBrowserLaunchOptions, parseHarnessCommand } from "./c2-playwright-policy.ts";

// Pure contract tests only. Neither Edge nor Chromium is launched.
describe("C2 opt-in Edge OAuth bootstrap (offline)", () => {
  it("preserves the original Chromium bootstrap's exact command and launch options", () => {
    expect(parseHarnessCommand(["bootstrap", "--allow-c2-auth-bootstrap"])).toBe("bootstrap");
    expect(bootstrapBrowserLaunchOptions("bootstrap")).toEqual({ headless: false });
  });

  it("selects only installed Edge with the separate exact bootstrap-edge opt-in", () => {
    const mode = parseHarnessCommand(["bootstrap-edge", "--allow-c2-edge-auth-bootstrap"]);
    expect(mode).toBe("bootstrap-edge");
    expect(bootstrapBrowserLaunchOptions("bootstrap-edge")).toEqual({ headless: false, channel: "msedge" });
  });

  it("rejects missing, mixed, repeated and arbitrary browser arguments", () => {
    for (const argv of [
      ["bootstrap-edge"],
      ["bootstrap-edge", "--allow-c2-auth-bootstrap"],
      ["bootstrap", "--allow-c2-edge-auth-bootstrap"],
      ["bootstrap-edge", "--allow-c2-edge-auth-bootstrap", "--channel=msedge"],
      ["bootstrap-edge", "--allow-c2-edge-auth-bootstrap", "--user-data-dir=C:/personal"],
      ["bootstrap-edge", "--allow-c2-edge-auth-bootstrap", "--proxy=unsafe"],
      ["bootstrap-edge", "--allow-c2-edge-auth-bootstrap", "--allow-c2-edge-auth-bootstrap"],
    ]) expect(() => parseHarnessCommand(argv)).toThrow("command-opt-in");
    expect(() => bootstrapBrowserLaunchOptions("chrome" as never)).toThrow("command-opt-in");
  });

  it("cannot enable Edge through the read-only, Chat or preflight commands", () => {
    expect(parseHarnessCommand(["run", "--allow-c2-readonly"])).toBe("run");
    expect(parseHarnessCommand(["chat", "--allow-c2-chat-mock"])).toBe("chat");
    expect(parseHarnessCommand(["preflight", "--allow-c2-readonly"])).toBe("preflight");
    for (const mode of ["run", "chat", "preflight"]) {
      expect(() => parseHarnessCommand([mode, "--allow-c2-edge-auth-bootstrap"])).toThrow("command-opt-in");
    }
  });

  it("wires only the bootstrap branch to the fixed Edge selector without changing the network guard", () => {
    const launcher = readFileSync(new URL("./c2-playwright.ts", import.meta.url), "utf8");
    const bootstrap = readFileSync(new URL("./c2-playwright-bootstrap.ts", import.meta.url), "utf8");
    expect(launcher).toContain('mode === "bootstrap" || mode === "bootstrap-edge"');
    expect(launcher).toContain("await bootstrapAuth(mode)");
    expect(bootstrap).toContain("chromium.launch(bootstrapBrowserLaunchOptions(mode))");
    expect(bootstrap).toContain('browser.newContext({ serviceWorkers: "block" })');
    expect(bootstrap).toContain("installNetworkBoundary(context, true, report)");
    expect(bootstrap).toContain("captureAppState(await context.storageState(), url.href, session, expected)");
    expect(bootstrap).toContain("saveC2State(saved)");
  });
});
