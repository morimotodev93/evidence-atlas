import { parseNetworkDiagnosticLine, parseScenarioStepLine, type C2NetworkCode, type C2ScenarioCode } from "./c2-scenario-diagnostics.ts";

// Child output may contain secrets from framework/runtime logs. NEVER relay it.
// Recognize only exact, known reporter/stage lines and return constant codes.
export type C2RunnerCode =
  | "CASES_EXPECTED" | "CASES_ZERO" | "CASES_UNEXPECTED" | "REPORT_MISSING"
  | "CONFIG_ENTERED" | "CONFIG_REFUSED" | "CONFIG_OK" | "STATE_OK" | "PREFLIGHT_OK"
  | "RUNNER_SETUP_ERROR"
  | "SCENARIO_PASSED" | "SCENARIO_FAILED"
  | "RUNNER_PASSED" | "RUNNER_FAILED" | C2ScenarioCode | C2NetworkCode;

export function safeRunnerCodes(raw: unknown, expectedCount: 4 | 6): C2RunnerCode[] {
  const seen = new Set<C2RunnerCode>();
  if (typeof raw !== "string") return ["REPORT_MISSING"];
  for (const line of raw.split(/\r?\n/)) {
    if (line.length > 96) continue;
    const step = parseScenarioStepLine(line) ?? parseNetworkDiagnosticLine(line);
    if (step) { seen.add(step); continue; }
    const match = /^C2 cases collected: ([0-9]+)\.$/.exec(line);
    if (match) {
      const count = Number(match[1]);
      seen.add(count === expectedCount ? "CASES_EXPECTED" : count === 0 ? "CASES_ZERO" : "CASES_UNEXPECTED");
      continue;
    }
    if (line === "C2 stage [CONFIG_ENTERED].") seen.add("CONFIG_ENTERED");
    else if (line === "C2 stage [CONFIG_REFUSED].") seen.add("CONFIG_REFUSED");
    else if (line === "C2 setup/runner failed; details suppressed.") seen.add("RUNNER_SETUP_ERROR");
    else if (line === "C2 stage [CONFIG_OK].") seen.add("CONFIG_OK");
    else if (line === "C2 stage [STATE_OK].") seen.add("STATE_OK");
    else if (line === "C2 stage [PREFLIGHT_OK].") seen.add("PREFLIGHT_OK");
    else if (line === "C2 scenario passed.") seen.add("SCENARIO_PASSED");
    else if (line === "C2 scenario did not pass; details suppressed.") seen.add("SCENARIO_FAILED");
    else if (line === "C2 runner status: passed.") seen.add("RUNNER_PASSED");
    else if (/^C2 runner status: (failed|timedout|interrupted)\.$/.test(line)) seen.add("RUNNER_FAILED");
  }
  return seen.size ? [...seen] : ["REPORT_MISSING"];
}
