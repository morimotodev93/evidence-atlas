import { describe, expect, it, vi } from "vitest";
import RedactedReporter from "../e2e-c2/redacted-reporter.ts";
import { safeRunnerCodes } from "./c2-runner-diagnostics.ts";

describe("redacted C2 runner diagnostics (offline)", () => {
  it("reads only fixed reporter codes for four Smoke cases", () => {
    expect(safeRunnerCodes([
      "C2 cases collected: 4.", "C2 stage [CONFIG_OK].",
      "C2 stage [STATE_OK].", "C2 stage [PREFLIGHT_OK].",
      "C2 scenario passed.", "C2 runner status: passed.",
    ].join("\n"), 4)).toEqual([
      "CASES_EXPECTED", "CONFIG_OK", "STATE_OK", "PREFLIGHT_OK", "SCENARIO_PASSED", "RUNNER_PASSED",
    ]);
  });
  it("reads six Chat cases and a failing scenario without any raw details", () => {
    const output = "C2 cases collected: 6.\nC2 scenario did not pass; details suppressed.\nC2 runner status: failed.";
    expect(safeRunnerCodes(output, 6)).toEqual(["CASES_EXPECTED", "SCENARIO_FAILED", "RUNNER_FAILED"]);
  });
  it("discards raw addresses, tokens, error messages and deceptive partial matches", () => {
    const leak = "private@example.invalid https://accounts.google.com/callback?code=synthetic-secret";
    const output = `${leak}\nC2 stage [CONFIG_OK]. ${leak}\nC2 cases collected: 4. ${leak}\nC2 runner status: failed.\n${leak}`;
    const codes = safeRunnerCodes(output, 4);
    expect(codes).toEqual(["RUNNER_FAILED"]);
    expect(JSON.stringify(codes)).not.toContain("synthetic-secret");
    expect(JSON.stringify(codes)).not.toContain("private@example.invalid");
  });
  it("handles missing/mismatched reports without forwarding unknown content", () => {
    expect(safeRunnerCodes(undefined, 4)).toEqual(["REPORT_MISSING"]);
    expect(safeRunnerCodes("opaque framework failure with private details", 6)).toEqual(["REPORT_MISSING"]);
    expect(safeRunnerCodes("C2 cases collected: 4.", 6)).toEqual(["CASES_UNEXPECTED"]);
  });
  it("distinguishes zero collection and setup refusal without emitting raw errors", () => {
    expect(safeRunnerCodes([
      "C2 cases collected: 0.", "C2 stage [CONFIG_ENTERED].",
      "C2 stage [CONFIG_REFUSED].", "C2 setup/runner failed; details suppressed.",
    ].join("\n"), 4)).toEqual(["CASES_ZERO", "CONFIG_ENTERED", "CONFIG_REFUSED", "RUNNER_SETUP_ERROR"]);
    expect(safeRunnerCodes("C2 cases collected: 7.", 6)).toEqual(["CASES_UNEXPECTED"]);
  });
  it("reporter relays only exact fixed stages and a fixed setup error", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const reporter = new RedactedReporter();
    try {
      reporter.onStdOut("C2 stage [CONFIG_OK].\nprivate-token=synthetic\nC2 stage [STATE_OK].\n");
      reporter.onStdOut(Buffer.from("C2 stage [PREFLIGHT_OK].\r\n"));
      reporter.onStdOut("prefix C2 stage [CONFIG_OK].\n");
      reporter.onError();
      expect(log.mock.calls.map(([value]) => value)).toEqual([
        "C2 stage [CONFIG_OK].", "C2 stage [STATE_OK].", "C2 stage [PREFLIGHT_OK].",
        "C2 setup/runner failed; details suppressed.",
      ]);
      expect(JSON.stringify(log.mock.calls)).not.toContain("synthetic");
    } finally { log.mockRestore(); }
  });

});
