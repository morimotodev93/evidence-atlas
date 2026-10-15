import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { C2_ORIGIN, parseHarnessCommand, preflight, requireExpectedUser, requireHarnessEnvironment, refuse } from "./c2-playwright-policy.ts";

try {
  const mode = parseHarnessCommand(process.argv.slice(2));
  requireHarnessEnvironment(process.env);
  if (process.execArgv.some((arg) => /^-r|^--(?:require|import|(?:experimental-)?loader)(?:=|$)/.test(arg))) refuse("preload");
  const expected = requireExpectedUser(process.env);
  if (mode === "bootstrap" || mode === "bootstrap-edge") {
    const { bootstrapAuth } = await import("./c2-playwright-bootstrap.ts");
    await bootstrapAuth(mode);
  } else if (mode === "preflight") {
    const { loadC2State } = await import("./c2-playwright-state.ts");
    const state = await loadC2State();
    const { request } = await import("@playwright/test");
    const client = await request.newContext({ baseURL: C2_ORIGIN, storageState: state.storageState });
    try { await preflight(client, expected); }
    finally { await client.dispose(); }
    console.log("C2 HTTP/session preflight passed. PostgreSQL container identity is not proven.");
  } else { // Fixed smoke and Chat-mock suites share preflight and storage-state guards.
    const { loadC2State } = await import("./c2-playwright-state.ts");
    await loadC2State();
    const root = fileURLToPath(new URL("../", import.meta.url));
    const require = createRequire(import.meta.url);
    const cli = join(dirname(require.resolve("@playwright/test/package.json")), "cli.js");
    const env: NodeJS.ProcessEnv = { NODE_ENV: "test" };
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined && /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|TMPDIR|HOME|USERPROFILE|APPDATA|LOCALAPPDATA|LANG|LC_ALL|TZ)$/i.test(key)) env[key] = value;
    }
    Object.assign(env, {
      C2_E2E_ALLOW_READONLY: "1", PLAYWRIGHT_NO_COPY_PROMPT: "1", NEXT_TELEMETRY_DISABLED: "1",
      C2_FIXTURE_USER_ID: expected.id, C2_FIXTURE_USER_EMAIL: expected.email,
    });
    const chat = mode === "chat";
    if (chat) env.C2_E2E_ALLOW_CHAT_MOCK = "1";
    const config = chat ? "playwright.c2.chat.config.ts" : "playwright.c2.config.ts";
    const result = spawnSync(process.execPath, [cli, "test", "--config", join(root, config)], {
      cwd: root, env, shell: false, stdio: "ignore", timeout: 300_000,
    });
    if (result.error || result.status !== 0) refuse("suite-failed-or-timed-out");
    console.log(chat
      ? "C2 Chat mock-only suite passed (raw runner output suppressed)."
      : "C2 authenticated read-only suite passed (raw runner output suppressed).");
  }
} catch {
  console.error("C2 E2E command refused or failed; sensitive details suppressed.");
  process.exitCode = 1;
}
