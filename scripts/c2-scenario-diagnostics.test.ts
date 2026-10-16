import { afterEach, describe, expect, it, vi } from "vitest";
import type { Suite, TestCase, TestStep } from "@playwright/test/reporter";
import RedactedReporter from "../e2e-c2/redacted-reporter.ts";
import { safeRunnerCodes } from "./c2-runner-diagnostics.ts";
import { parseScenarioStepLine, scenarioCaseLine, scenarioStepLine } from "./c2-scenario-diagnostics.ts";

afterEach(() => vi.restoreAllMocks());

describe("C2 scenario diagnostics (offline reporter events)", () => {
  it.each([
    ["fixture", 'Fixture "browser"', "BROWSER_FIXTURE"],
    ["fixture", 'Fixture "context"', "CONTEXT_FIXTURE"],
    ["fixture", 'Fixture "page"', "PAGE_FIXTURE"],
    ["fixture", 'Fixture "assertNetwork"', "NETWORK_FIXTURE"],
    ["fixture", 'Fixture "conversationMocks"', "CHAT_MOCK_FIXTURE"],
    ["test.step", "C2 fixture config", "CONTEXT_CONFIG"],
    ["test.step", "C2 fixture state", "CONTEXT_STATE"],
    ["test.step", "C2 context creation", "CONTEXT_CREATE"],
    ["test.step", "C2 loopback permission", "LOOPBACK_PERMISSION"],
    ["test.step", "C2 network installation", "NETWORK_INSTALL"],
    ["test.step", "C2 context preflight", "CONTEXT_PREFLIGHT"],
    ["test.step", "C2 navigation", "NAVIGATION"],
    ["test.step", "C2 context close", "CONTEXT_CLOSE"],
    ["test.step", "C2 Chat research heading", "CHAT_RESEARCH_HEADING"],
    ["test.step", "C2 Chat panel", "CHAT_PANEL"],
    ["test.step", "C2 Chat initial state", "CHAT_INITIAL_STATE"],
    ["test.step", "C2 Chat creation", "CHAT_CREATE"],
  ])("relays fixed outcomes for %s / %s", (category, title, code) => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const reporter = new RedactedReporter();
    const step = { category, title } as TestStep;
    reporter.onStepBegin({} as never, {} as never, step);
    reporter.onStepEnd({} as never, {} as never, step);
    reporter.onStepEnd({} as never, {} as never, { ...step, error: { message: "synthetic-private" } });
    const lines = log.mock.calls.map(([line]) => String(line));
    expect(lines).toEqual([`C2 step [${code}_ENTERED].`, `C2 step [${code}_OK].`, `C2 step [${code}_FAILED].`]);
    expect(safeRunnerCodes(lines.join("\n"), 4)).toEqual([`${code}_ENTERED`, `${code}_OK`, `${code}_FAILED`]);
  });

  it("does not inspect or forward step parameters, error detail, titles or test identities", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const reporter = new RedactedReporter();
    const step = {
      category: "expect", title: "private locator and cookie",
      error: { get message() { throw new Error("must not read private errors"); } },
      get params() { throw new Error("must not read private parameters"); },
    } as unknown as TestStep;
    reporter.onStepBegin({} as never, {} as never, step);
    reporter.onStepEnd({} as never, {} as never, step);
    expect(log.mock.calls).toEqual([["C2 step [ASSERTION_FAILED]."]]);
  });

  it("refuses unknown and lookalike labels and does not relay worker-forged step lines", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const reporter = new RedactedReporter();
    for (const [category, title] of [
      ["pw:api", "C2 navigation"], ["fixture", "browser"],
      ["test.step", "C2 navigation private"], ["fixture", 'Fixture "browser"\nprivate'],
    ]) {
      reporter.onStepBegin({} as never, {} as never, { category, title } as TestStep);
      reporter.onStepEnd({} as never, {} as never, { category, title, error: {} } as TestStep);
    }
    reporter.onStdOut("C2 step [NAVIGATION_OK].\nprivate raw output\n");
    expect(log).not.toHaveBeenCalled();
    for (const line of [
      "C2 step [UNKNOWN_OK].", "prefix C2 step [NAVIGATION_OK].",
      "C2 step [NAVIGATION_OK]. private", "C2 step [NAVIGATION_OK]. ",
    ]) expect(parseScenarioStepLine(line)).toBeUndefined();
    expect(safeRunnerCodes("C2 step [NAVIGATION_OK]. private", 6)).toEqual(["REPORT_MISSING"]);
  });

  it("keeps scenario failure and runner onError distinct from phase observations", () => {
    expect(scenarioStepLine({ category: "expect", title: "private" }, "OK")).toBeUndefined();
    expect(safeRunnerCodes([
      "C2 step [NAVIGATION_OK].", "C2 step [ASSERTION_FAILED].",
      "C2 scenario did not pass; details suppressed.",
      "C2 setup/runner failed; details suppressed.", "C2 runner status: failed.",
    ].join("\n"), 6)).toEqual([
      "NAVIGATION_OK", "ASSERTION_FAILED", "SCENARIO_FAILED", "RUNNER_SETUP_ERROR", "RUNNER_FAILED",
    ]);
  });

  it("relays only enumerated network categories without request or error details", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const reporter = new RedactedReporter();
    reporter.onStdOut([
      "C2 boundary [NET_WEBSOCKET_REFUSED].", "C2 boundary [NET_FETCH_FAILED].",
      "C2 boundary [UNKNOWN].", "C2 boundary [NET_PATH_REFUSED]. private",
      "private cookie and URL", "C2 boundary [NET_FETCH_FAILED].",
    ].join("\n"));
    const output = log.mock.calls.map(([line]) => String(line)).join("\n");
    expect(safeRunnerCodes(output, 4)).toEqual(["NET_WEBSOCKET_REFUSED", "NET_FETCH_FAILED"]);
    expect(output).not.toMatch(/private|UNKNOWN/);
  });

  it("reports fixed case ordinals without reading names, identities or error content", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const reporter = new RedactedReporter();
    const tests = Array.from({ length: 6 }, () => ({ get title() { throw new Error("must not read titles"); } } as unknown as TestCase));
    reporter.onBegin({}, { allTests: () => tests } as unknown as Suite);
    reporter.onTestEnd(tests[0], { status: "passed" } as never);
    reporter.onTestEnd(tests[2], { status: "failed" } as never);
    reporter.onTestEnd(tests[5], { status: "passed" } as never);
    const output = log.mock.calls.map(([line]) => String(line)).join("\n");
    expect(safeRunnerCodes(output, 6)).toEqual([
      "CASES_EXPECTED", "CASE_1_PASSED", "SCENARIO_PASSED", "CASE_3_FAILED", "SCENARIO_FAILED", "CASE_6_PASSED",
    ]);
  });

  it("rejects unknown ordinals and labels for unexpected collections", () => {
    for (const index of [-1, 6, 0.5, NaN]) expect(scenarioCaseLine(index, true)).toBeUndefined();
    expect(parseScenarioStepLine("C2 case [CASE_7_PASSED].")).toBeUndefined();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const reporter = new RedactedReporter();
    const test = {} as TestCase;
    reporter.onBegin({}, { allTests: () => [test] } as unknown as Suite);
    reporter.onTestEnd(test, { status: "failed" } as never);
    expect(log.mock.calls.map(([line]) => line)).toEqual([
      "C2 cases collected: 1.", "C2 scenario did not pass; details suppressed.",
    ]);
  });
});
