import { prepareProbe, probeDiagnostic } from "./c2-browser-https-probe-policy.ts";
import { runProbe } from "./c2-browser-https-probe-runtime.ts";

try {
  const env = prepareProbe(process.argv.slice(2), process.env, process.execArgv);
  // No driver import/client/browser before exact opt-in and environment checks.
  const { chromium } = await import("@playwright/test");
  const seen = new Set<string>();
  const report = (value: unknown) => {
    const line = probeDiagnostic(value);
    if (!seen.has(line)) { seen.add(line); console.log(line); }
  };
  const code = await runProbe(chromium, env, report);
  report(code);
  if (code !== "HTTPS_RESPONSE_RECEIVED") process.exitCode = 1;
} catch {
  console.error(probeDiagnostic("HTTPS_PROBE_REFUSED"));
  process.exitCode = 1;
}
