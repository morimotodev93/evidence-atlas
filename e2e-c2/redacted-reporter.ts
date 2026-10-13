import type { Reporter, FullResult, Suite, TestCase, TestResult } from "@playwright/test/reporter";

export default class RedactedReporter implements Reporter {
  printsToStdio() { return true; }
  onBegin(_config: unknown, suite: Suite) { console.log(`C2 cases collected: ${suite.allTests().length}.`); }
  onTestEnd(_test: TestCase, result: TestResult) {
    // Do not forward titles, errors, attachments, request data or worker streams.
    console.log(result.status === "passed" ? "C2 scenario passed." : "C2 scenario did not pass; details suppressed.");
  }
  onError() { console.error("C2 setup/runner failed; details suppressed."); }
  onStdOut() {}
  onStdErr() {}
  onEnd(result: FullResult) { console.log(`C2 runner status: ${result.status}.`); }
}
