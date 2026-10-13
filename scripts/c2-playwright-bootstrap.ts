import { chromium, request } from "@playwright/test";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { C2_ORIGIN, RESEARCH_PATH, captureAppState, checkedGet, preflight, refuse, requireExpectedUser } from "./c2-playwright-policy.ts";
import { installNetworkBoundary, safePageUrl } from "./c2-playwright-network.ts";
import { saveC2State } from "./c2-playwright-state.ts";
import { bootstrapDiagnostic, type BootstrapCode } from "./c2-playwright-diagnostics.ts";

const report = (code: BootstrapCode) => console.log(bootstrapDiagnostic(code));
async function phase<T>(code: BootstrapCode, action: () => Promise<T>): Promise<T> {
  try { return await action(); }
  catch { report(code); return refuse("bootstrap-phase"); }
}
function checkNetwork(assert: () => void) {
  try { assert(); } catch { report("NETWORK_REFUSED"); refuse("bootstrap-network"); }
}

export async function bootstrapAuth() {
  if (!stdin.isTTY || !stdout.isTTY) refuse("interactive-terminal-required");
  const expected = requireExpectedUser(process.env);
  const client = await request.newContext({ baseURL: C2_ORIGIN, storageState: { cookies: [], origins: [] } });
  try { await phase("APP_PREFLIGHT_FAILED", () => preflight(client, expected, false)); }
  finally { await client.dispose(); }
  // Fresh ephemeral context: no private-browser/profile import or reuse.
  const browser = await phase("BROWSER_START_FAILED", () => chromium.launch({ headless: false }));
  try {
    const context = await browser.newContext({ serviceWorkers: "block" });
    const assertNetwork = await installNetworkBoundary(context, true, report);
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(20_000);
    await phase("APP_NAVIGATION_FAILED", () => page.goto(C2_ORIGIN, { waitUntil: "domcontentloaded" }));
    await phase("SIGNIN_UNAVAILABLE", async () => {
      const button = page.getByRole("button", { name: "Sign in with Google", exact: true });
      await button.waitFor({ state: "visible", timeout: 10_000 });
      const valid = await button.evaluate((element) => {
        const form = element.closest("form");
        return form?.method.toUpperCase() === "POST" && form.action === "http://localhost:3001/api/auth/signin/google" &&
          !!form.querySelector<HTMLInputElement>('input[type="hidden"][name="csrfToken"]')?.value;
      });
      if (!valid) refuse("signin-form");
    });
    checkNetwork(assertNetwork);
    report("SIGNIN_READY");
    const terminal = createInterface({ input: stdin, output: stdout });
    const timer = setTimeout(() => terminal.close(), 10 * 60 * 1000);
    try {
      await phase("MANUAL_WAIT_FAILED", () => terminal.question("Complete Google sign-in manually in this fresh C2 window, return to the Workspace, then press Enter. Do not enter credentials here.\n"));
    } finally {
      assertNetwork.reportProgress?.(); // Summarize observations before closing Chromium.
      clearTimeout(timer); terminal.close();
    }
    checkNetwork(assertNetwork);
    const url = await phase("RETURN_INVALID", async () => {
      const url = await safePageUrl(context);
      if (!["/", "/research", RESEARCH_PATH].includes(url.pathname) || url.search) refuse("auth-return");
      return url;
    });
    const saved = await phase("SESSION_VERIFICATION_FAILED", async () => {
      await preflight(context.request, expected);
      const session = await (await checkedGet(context.request, "/api/auth/session", 200)).json();
      return captureAppState(await context.storageState(), url.href, session, expected);
    });
    checkNetwork(assertNetwork);
    await phase("STATE_SAVE_FAILED", () => saveC2State(saved));
    report("STATE_SAVED");
    console.log("C2 application-only authentication state saved privately. No provider state exported.");
  } catch { refuse("bootstrap-incomplete-or-unsafe"); }
  finally { await browser.close(); }
}
