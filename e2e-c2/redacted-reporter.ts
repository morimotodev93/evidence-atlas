import type { Reporter, FullResult, Suite, TestCase, TestResult } from "@playwright/test/reporter";

export default class RedactedReporter implements Reporter {
  printsToStdio() { return true; }
  onBegin(_config: unknown, suite: Suite) { console.log(`C2 cases collected: ${suite.allTests().length}.`); }
  onTestEnd(_test: TestCase, result: TestResult) {
    // Do not forward titles, errors, attachments, request data or worker streams.
    console.log(result.status === "passed" ? "C2 scenario passed." : "C2 scenario did not pass; details suppressed.");
  }
  onError() { console.log("C2 setup/runner failed; details suppressed."); }
  onStdOut(chunk: string | Buffer) {
    // Playwright routes setup console output through reporters. Forward only
    // an exact allowlisted stage line; never raw worker/framework stdout.
    const output = typeof chunk === "string" ? chunk : chunk.toString("utf8");
    const stages = new Set([
      "C2 stage [CONFIG_ENTERED].", "C2 stage [CONFIG_REFUSED].",
      "C2 stage [CONFIG_OK].", "C2 stage [STATE_OK].", "C2 stage [PREFLIGHT_OK].",
    ]);
    for (const line of output.split(/\r?\n/)) if (stages.has(line)) console.log(line);
  }
  onStdErr() {}
  onEnd(result: FullResult) { console.log(`C2 runner status: ${result.status}.`); }
}
