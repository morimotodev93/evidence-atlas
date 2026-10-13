import { request, type FullConfig } from "@playwright/test";
import { C2_ORIGIN, preflight, requireExpectedUser, requireHarnessEnvironment, refuse } from "../scripts/c2-playwright-policy.ts";
import { loadC2State } from "../scripts/c2-playwright-state.ts";

export function requireC2Config(config: FullConfig) {
  requireHarnessEnvironment(process.env);
  if (process.env.C2_E2E_ALLOW_READONLY !== "1" || process.env.PLAYWRIGHT_NO_COPY_PROMPT !== "1" ||
    config.workers !== 1 || config.maxFailures !== 1 || config.webServer || config.projects.length !== 1 ||
    config.preserveOutput !== "never" || config.reporter.length !== 1 || !config.reporter[0][0].endsWith("redacted-reporter.ts")) refuse("configuration-or-opt-in");
  const project = config.projects[0];
  const use = project.use;
  if (project.name !== "c2-chromium" || !project.testDir.endsWith("e2e-c2") || project.retries !== 0 ||
    use.baseURL !== C2_ORIGIN || use.browserName !== "chromium" || use.trace !== "off" || use.screenshot !== "off" || use.video !== "off" ||
    use.serviceWorkers !== "block" || use.storageState || use.connectOptions || use.contextOptions?.recordHar || use.contextOptions?.recordVideo ||
    use.launchOptions?.proxy || use.contextOptions?.proxy || use.launchOptions?.args?.length || use.launchOptions?.executablePath ||
    !project.outputDir.endsWith("test-results-c2")) refuse("configuration");
}
export default async function globalSetup(config: FullConfig) {
  requireC2Config(config);
  const expected = requireExpectedUser(process.env);
  const state = await loadC2State();
  const client = await request.newContext({ baseURL: C2_ORIGIN, storageState: state.storageState, timeout: 15_000, ignoreHTTPSErrors: false });
  try { await preflight(client, expected); }
  catch { refuse("preflight"); }
  finally { await client.dispose(); }
}
