import { chromium, request } from "@playwright/test";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { C2_ORIGIN, captureAppState, checkedGet, preflight, refuse, requireExpectedUser } from "./c2-playwright-policy.ts";
import { installNetworkBoundary, safePageUrl } from "./c2-playwright-network.ts";
import { saveC2State } from "./c2-playwright-state.ts";

export async function bootstrapAuth() {
  if (!stdin.isTTY || !stdout.isTTY) refuse("interactive-terminal-required");
  const expected = requireExpectedUser(process.env);
  const client = await request.newContext({ baseURL: C2_ORIGIN, storageState: { cookies: [], origins: [] } });
  try { await preflight(client, expected, false); }
  finally { await client.dispose(); }
  // Fresh ephemeral context: no private-browser/profile import or reuse.
  const browser = await chromium.launch({ headless: false });
  try {
    const context = await browser.newContext({ serviceWorkers: "block" });
    const assertNetwork = await installNetworkBoundary(context, true);
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(20_000);
    await page.goto(C2_ORIGIN);
    const terminal = createInterface({ input: stdin, output: stdout });
    const timer = setTimeout(() => terminal.close(), 10 * 60 * 1000);
    try {
      await terminal.question("Complete Google sign-in manually in this fresh C2 window, return to the Workspace, then press Enter. Do not enter credentials here.\n");
    } finally { clearTimeout(timer); terminal.close(); }
    assertNetwork();
    const url = await safePageUrl(context);
    await preflight(context.request, expected);
    const session = await (await checkedGet(context.request, "/api/auth/session", 200)).json();
    const saved = captureAppState(await context.storageState(), url.href, session, expected);
    assertNetwork();
    await saveC2State(saved);
    console.log("C2 application-only authentication state saved privately. No provider state exported.");
  } catch { refuse("bootstrap-incomplete-or-unsafe"); }
  finally { await browser.close(); }
}
