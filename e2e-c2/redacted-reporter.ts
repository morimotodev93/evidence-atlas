import type { Reporter, FullResult, Suite, TestCase, TestResult, TestStep } from "@playwright/test/reporter";
import { parseNetworkDiagnosticLine, scenarioCaseLine, scenarioStepLine } from "../scripts/c2-scenario-diagnostics.ts";

export default class RedactedReporter implements Reporter {
  private cases = new WeakMap<TestCase, number>();
  printsToStdio() { return true; }
  onBegin(_config: unknown, suite: Suite) {
    const tests = suite.allTests();
    if (tests.length === 4 || tests.length === 6) tests.forEach((test, index) => this.cases.set(test, index));
    console.log(`C2 cases collected: ${tests.length}.`);
  }
  onTestEnd(test: TestCase, result: TestResult) {
    // Do not forward titles, errors, attachments, request data or worker streams.
    const index = this.cases.get(test);
    const line = index === undefined ? undefined : scenarioCaseLine(index, result.status === "passed");
    if (line) console.log(line);
    console.log(result.status === "passed" ? "C2 scenario passed." : "C2 scenario did not pass; details suppressed.");
  }
  onError() { console.log("C2 setup/runner failed; details suppressed."); }
  onStepBegin(_test: TestCase, _result: TestResult, step: TestStep) {
    const line = scenarioStepLine(step, "ENTERED");
    if (line) console.log(line);
  }
  onStepEnd(_test: TestCase, _result: TestResult, step: TestStep) {
    const line = scenarioStepLine(step, step.error ? "FAILED" : "OK");
    if (line) console.log(line);
  }
  onStdOut(chunk: string | Buffer) {
    // Playwright routes setup console output through reporters. Forward only
    // an exact allowlisted stage line; never raw worker/framework stdout.
    const output = typeof chunk === "string" ? chunk : chunk.toString("utf8");
    const stages = new Set([
      "C2 stage [CONFIG_ENTERED].", "C2 stage [CONFIG_REFUSED].",
      "C2 stage [CONFIG_OK].", "C2 stage [STATE_OK].", "C2 stage [PREFLIGHT_OK].",
    ]);
    for (const line of output.split(/\r?\n/)) if (stages.has(line) || parseNetworkDiagnosticLine(line)) console.log(line);
  }
  onStdErr() {}
  onEnd(result: FullResult) { console.log(`C2 runner status: ${result.status}.`); }
}
