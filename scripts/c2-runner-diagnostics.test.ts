import { describe, expect, it } from "vitest";
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
});
