// Child output may contain secrets from framework/runtime logs. NEVER relay it.
// Recognize only exact, known reporter/stage lines and return constant codes.
export type C2RunnerCode =
  | "CASES_EXPECTED" | "CASES_UNEXPECTED" | "REPORT_MISSING"
  | "CONFIG_OK" | "STATE_OK" | "PREFLIGHT_OK"
  | "SCENARIO_PASSED" | "SCENARIO_FAILED"
  | "RUNNER_PASSED" | "RUNNER_FAILED";

export function safeRunnerCodes(raw: unknown, expectedCount: 4 | 6): C2RunnerCode[] {
  const seen = new Set<C2RunnerCode>();
  if (typeof raw !== "string") return ["REPORT_MISSING"];
  for (const line of raw.split(/\r?\n/)) {
    if (line.length > 96) continue;
    const match = /^C2 cases collected: ([0-9]+)\.$/.exec(line);
    if (match) {
      seen.add(Number(match[1]) === expectedCount ? "CASES_EXPECTED" : "CASES_UNEXPECTED");
      continue;
    }
    if (line === "C2 stage [CONFIG_OK].") seen.add("CONFIG_OK");
    else if (line === "C2 stage [STATE_OK].") seen.add("STATE_OK");
    else if (line === "C2 stage [PREFLIGHT_OK].") seen.add("PREFLIGHT_OK");
    else if (line === "C2 scenario passed.") seen.add("SCENARIO_PASSED");
    else if (line === "C2 scenario did not pass; details suppressed.") seen.add("SCENARIO_FAILED");
    else if (line === "C2 runner status: passed.") seen.add("RUNNER_PASSED");
    else if (/^C2 runner status: (failed|timedout|interrupted)\.$/.test(line)) seen.add("RUNNER_FAILED");
  }
  return seen.size ? [...seen] : ["REPORT_MISSING"];
}
