export type C2Diagnostic =
  | "ready"
  | "port-conflict"
  | "compile-error"
  | "font-network-error"
  | "config-error"
  | "config-await-error"
  | "filesystem-error"
  | "module-resolution-error";

const checks: ReadonlyArray<{
  kind: C2Diagnostic;
  pattern: RegExp;
}> = [
  { kind: "config-await-error", pattern: /await is only valid in async functions|\bERR_REQUIRE_ASYNC_MODULE\b/i },
  { kind: "config-error", pattern: /failed to (?:load|transpile).*next\.config|invalid next\.config/i },
  { kind: "filesystem-error", pattern: /\b(?:EACCES|EPERM|EROFS|ENOSPC)\b/ },
  { kind: "module-resolution-error", pattern: /\b(?:MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND)\b|cannot find module/i },
  {
    kind: "port-conflict",
    pattern: /\bEADDRINUSE\b|port\s+\d+\s+is in use/i,
  },
  {
    kind: "font-network-error",
    pattern: /failed to (?:fetch|download).*font/i,
  },
  {
    kind: "compile-error",
    pattern:
      /failed to compile|module not found|build failed|turbopack.*failed/i,
  },
  {
    kind: "ready",
    pattern: /\bready in\s+\d+(?:\.\d+)?\s*(?:ms|s)\b/i,
  },
];

export function createC2DiagnosticParser(report: (kind: C2Diagnostic) => void) {
  let tail = "";

  return (chunk: Buffer | string) => {
    // Keep only a bounded amount of raw output in memory.
    // Never return or print the raw text.
    tail = (tail + String(chunk)).slice(-2048);

    for (const { kind, pattern } of checks) {
      if (pattern.test(tail)) {
        report(kind);
      }
    }
  };
}
