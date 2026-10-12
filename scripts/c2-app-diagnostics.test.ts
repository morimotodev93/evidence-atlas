import { describe, expect, it, vi } from "vitest";
import { createC2DiagnosticParser } from "./c2-app-diagnostics";

describe("private child output classification", () => {
  it("classifies a post-Ready configuration failure across chunks without returning raw text", () => {
    const report = vi.fn(); const parse = createC2DiagnosticParser(report);
    parse("Ready in 500ms\nFailed to transpile next.config.ts\nSyntaxError: await is only valid in async");
    expect(parse(" functions synthetic-private-secret")).toBeUndefined();
    const kinds = report.mock.calls.flat();
    expect(kinds).toContain("ready"); expect(kinds).toContain("config-error");
    expect(kinds).toContain("config-await-error");
    expect(JSON.stringify(kinds)).not.toContain("synthetic-private-secret");
  });
  it.each([
    ["EPERM synthetic-secret", "filesystem-error"],
    ["ERR_MODULE_NOT_FOUND synthetic-secret", "module-resolution-error"],
    ["EADDRINUSE synthetic-secret", "port-conflict"],
  ])("reports only a fixed category (%#)", (raw, kind) => {
    const report = vi.fn(); createC2DiagnosticParser(report)(raw);
    expect(report).toHaveBeenCalledWith(kind);
    expect(JSON.stringify(report.mock.calls)).not.toContain("synthetic-secret");
  });
});
