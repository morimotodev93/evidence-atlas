import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Suite, TestCase, TestResult } from "@playwright/test/reporter";
import RedactedReporter from "../e2e-c2/redacted-reporter.ts";
import { runnerSucceeded, safeRunnerCodes, type C2RunnerCode } from "./c2-runner-diagnostics.ts";

const child = vi.hoisted(() => ({ spawnSync: vi.fn(), loadC2State: vi.fn() }));
vi.mock("node:child_process", () => ({ spawnSync: child.spawnSync }));
vi.mock("./c2-playwright-state.ts", () => ({ loadC2State: child.loadC2State }));

function passedReport(count: 4 | 6): string {
  return [
    `C2 cases collected: ${count}.`, "C2 stage [CONFIG_ENTERED].",
    "C2 stage [CONFIG_OK].", "C2 stage [STATE_OK].", "C2 stage [PREFLIGHT_OK].",
    ...Array.from({ length: count }, (_, index) => `C2 case [CASE_${index + 1}_PASSED].\nC2 scenario passed.`),
    "C2 runner status: passed.",
  ].join("\n");
}

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

describe("C2 runner success evidence (offline)", () => {
  it.each([4, 6] as const)("accepts only all %i passed cases with complete success evidence", (count) => {
    const codes = safeRunnerCodes(passedReport(count), count);
    expect(runnerSucceeded(codes, count, { status: 0 })).toBe(true);
    expect(runnerSucceeded([...codes, "NAVIGATION_ENTERED", "NAVIGATION_OK"], count, { status: 0 })).toBe(true);
  });

  it.each([
    { status: 1 }, { status: null }, { status: 0, error: new Error("synthetic-private-error") },
    { status: 0, signal: "SIGTERM" },
  ])("rejects unsuccessful child termination even with complete passes: %j", (result) => {
    expect(runnerSucceeded(safeRunnerCodes(passedReport(4), 4), 4, result)).toBe(false);
  });

  for (const count of [4, 6] as const) {
    it.each([
      "CASES_EXPECTED", "CONFIG_OK", "STATE_OK", "PREFLIGHT_OK", "SCENARIO_PASSED", "RUNNER_PASSED",
      ...Array.from({ length: count }, (_, index) => `CASE_${index + 1}_PASSED`),
    ])(`rejects ${count}-case output missing %s despite exit 0`, (missing) => {
      const codes = safeRunnerCodes(passedReport(count), count).filter((code) => code !== missing);
      expect(runnerSucceeded(codes, count, { status: 0 })).toBe(false);
    });
  }

  it.each([
    "CASES_ZERO", "CASES_UNEXPECTED", "REPORT_MISSING", "CONFIG_REFUSED", "RUNNER_SETUP_ERROR",
    "SCENARIO_FAILED", "RUNNER_FAILED", "CASE_1_FAILED", "CASE_6_FAILED", "CASE_5_PASSED", "CASE_6_PASSED",
    "ASSERTION_FAILED", "NAVIGATION_FAILED", "CONTEXT_CLOSE_FAILED", "NET_POLICY_REFUSED",
    "NET_FETCH_FAILED", "NET_REDIRECT_LOCAL",
  ] satisfies C2RunnerCode[])("rejects conflicting %s alongside complete Smoke passes", (conflict) => {
    expect(runnerSucceeded([...safeRunnerCodes(passedReport(4), 4), conflict], 4, { status: 0 })).toBe(false);
  });

  it.each([0, 4, 7])("rejects Chat collection count %i despite exit 0", (count) => {
    const output = passedReport(6).replace("collected: 6.", `collected: ${count}.`);
    expect(runnerSucceeded(safeRunnerCodes(output, 6), 6, { status: 0 })).toBe(false);
  });

  it("rejects contradictory collection and final-status reports", () => {
    for (const extra of ["C2 cases collected: 6.", "C2 runner status: failed.", "C2 runner status: timedout.", "C2 runner status: interrupted."]) {
      expect(runnerSucceeded(safeRunnerCodes(`${passedReport(4)}\n${extra}`, 4), 4, { status: 0 })).toBe(false);
    }
  });

  it.each([undefined, "", "private raw error", "C2 cases collected: 4.", passedReport(4).slice(0, -2)])(
    "rejects missing or incomplete reports despite exit 0 (sample %#)", (output) => {
      expect(runnerSucceeded(safeRunnerCodes(output, 4), 4, { status: 0 })).toBe(false);
    },
  );

  it.each(["skipped", "failed", "timedOut", "interrupted"] satisfies TestResult["status"][])(
    "rejects an actual reporter %s case even when the runner reports passed", (status) => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      try {
        const reporter = new RedactedReporter();
        const tests = Array.from({ length: 4 }, () => ({} as TestCase));
        reporter.onBegin({}, { allTests: () => tests } as unknown as Suite);
        reporter.onStdOut("C2 stage [CONFIG_OK].\nC2 stage [STATE_OK].\nC2 stage [PREFLIGHT_OK].");
        tests.forEach((test, index) => reporter.onTestEnd(test, { status: index === 2 ? status : "passed" } as TestResult));
        reporter.onEnd({ status: "passed" } as never);
        const codes = safeRunnerCodes(log.mock.calls.map(([line]) => line).join("\n"), 4);
        expect(codes).toContain("CASE_3_FAILED");
        expect(codes).toContain("SCENARIO_FAILED");
        expect(runnerSucceeded(codes, 4, { status: 0 })).toBe(false);
      } finally { log.mockRestore(); }
    },
  );
});

describe("C2 parent runner exit and output (mocked child, no browser or services)", () => {
  const originalArgv = process.argv;
  const originalExecArgv = process.execArgv;
  let originalExitCode: typeof process.exitCode;
  const secret = "https://private.invalid/callback?token=synthetic-secret Cookie=synthetic-cookie private@example.invalid user-id=synthetic-user";

  beforeEach(() => {
    vi.resetModules();
    child.spawnSync.mockReset();
    child.loadC2State.mockReset();
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
    process.execArgv = [];
    for (const key of Object.keys(process.env)) {
      if (/^(E2E_BASE_URL|NODE_OPTIONS|NODE_PATH|DEBUG|PWDEBUG|PW_TEST_.*|HTTPS?_PROXY|ALL_PROXY|PUBLIC_DEMO_MODE|C2_RUNTIME_MODE|AUTH_URL)$/i.test(key)) vi.stubEnv(key, undefined);
    }
    vi.stubEnv("C2_FIXTURE_USER_ID", "offline-user");
    vi.stubEnv("C2_FIXTURE_USER_EMAIL", "offline@example.invalid");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.execArgv = originalExecArgv;
    process.exitCode = originalExitCode;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each([
    { name: "Smoke 4/4", count: 4, stdout: passedReport(4), status: 0, passed: true },
    { name: "Chat 6/6", count: 6, stdout: passedReport(6), status: 0, passed: true },
    { name: "nonzero exit", count: 4, stdout: passedReport(4), status: 1, passed: false },
    { name: "missing case", count: 4, stdout: passedReport(4).replace("C2 case [CASE_4_PASSED].", ""), status: 0, passed: false },
    { name: "skipped case", count: 4, stdout: passedReport(4).replace("CASE_2_PASSED", "CASE_2_FAILED"), status: 0, passed: false },
    { name: "count mismatch", count: 6, stdout: passedReport(4), status: 0, passed: false },
    { name: "missing runner pass", count: 4, stdout: passedReport(4).replace("C2 runner status: passed.", ""), status: 0, passed: false },
    { name: "conflicting failure", count: 4, stdout: `${passedReport(4)}\nC2 case [CASE_1_FAILED].`, status: 0, passed: false },
    { name: "missing report", count: 4, stdout: undefined, status: 0, passed: false },
    { name: "incomplete report", count: 4, stdout: "C2 cases collected: 4.", status: 0, passed: false },
    { name: "child error", count: 4, stdout: passedReport(4), status: 0, error: new Error(secret), passed: false },
    { name: "child signal", count: 4, stdout: passedReport(4), status: 0, signal: "SIGTERM", passed: false },
  ])("$name preserves fail-closed parent exit and suppresses raw output", async ({ count, stdout, passed, ...result }) => {
    process.argv = [process.execPath, "scripts/c2-playwright.ts", ...(count === 6 ? ["chat", "--allow-c2-chat-mock"] : ["run", "--allow-c2-readonly"])];
    const raw = stdout === undefined ? undefined : `${secret}\n${stdout}\n${secret}`;
    child.spawnSync.mockReturnValue({ ...result, stdout: raw, stderr: secret });
    await import("./c2-playwright.ts");
    expect(child.loadC2State).toHaveBeenCalledOnce();
    expect(child.spawnSync).toHaveBeenCalledOnce();
    expect(child.spawnSync.mock.calls[0][2]).toMatchObject({
      shell: false, stdio: ["ignore", "pipe", "ignore"], encoding: "utf8", maxBuffer: 64 * 1024, timeout: 300_000,
    });
    const output = vi.mocked(console.log).mock.calls.map(([line]) => line);
    expect(output).toEqual([
      ...safeRunnerCodes(raw, count as 4 | 6).map((code) => `C2 runner [${code}].`),
      ...(result.error ? ["C2 runner [CHILD_ERROR]."] : []),
      ...(result.signal ? ["C2 runner [CHILD_INTERRUPTED]."] : []),
      ...(result.status !== 0 ? ["C2 runner [CHILD_NONZERO]."] : []),
      ...(passed ? [count === 6
        ? "C2 Chat mock-only suite passed (raw runner output suppressed)."
        : "C2 authenticated read-only suite passed (raw runner output suppressed)."] : []),
    ]);
    expect(console.error).toHaveBeenCalledTimes(passed ? 0 : 1);
    if (!passed) expect(console.error).toHaveBeenCalledWith("C2 E2E command refused or failed; sensitive details suppressed.");
    expect(process.exitCode ?? 0).toBe(passed ? 0 : 1);
    expect(JSON.stringify([output, vi.mocked(console.error).mock.calls])).not.toMatch(/private\.invalid|synthetic-secret|synthetic-cookie|private@example|synthetic-user/);
  });
});
