import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Script } from "node:vm";
import { describe, expect, it, vi } from "vitest";

// The sync Next/SWC entry only loads locally installed native bindings; it does
// not take the async loader's download fallback. No compiler server is started.
const require = createRequire(import.meta.url);
const swc = require("next/dist/build/swc") as {
  transformSync: (source: string, options: unknown) => { code: string };
};
function compile(source: string) {
  try {
    return swc.transformSync(source, {
      jsc: { parser: { syntax: "typescript" } },
      module: { type: "commonjs" }, isModule: "unknown",
    }).code;
  } catch { throw new Error("Local config compilation failed (details suppressed)."); }
}

describe("installed Next CommonJS config loader compatibility", () => {
  it("reproduces the old top-level-await failure without evaluating a config or accessing a service", () => {
    const code = compile('const c2 = true; const sentry = c2 ? null : await import("synthetic-module"); export default {};');
    let rejected = false;
    try { new Script(`(function(require,module,exports){${code}\n})`); }
    catch (error) { rejected = error instanceof SyntaxError && /await/.test(error.message); }
    expect(rejected).toBe(true);
  });
  it.each([true, false])("loads the actual fixed config via CommonJS with mocked service imports (C2=%s)", async (c2) => {
    const source = readFileSync("next.config.ts", "utf8");
    const code = compile(source);
    const wrap = vi.fn((config) => config);
    const sdkImport = vi.fn(() => ({ withSentryConfig: wrap }));
    const compiledModule = { exports: {} as { default?: () => Promise<{ distDir?: string }> } };
    const safeRequire = (name: string) => {
      if (name === "node:path") return require(name);
      if (name.endsWith("service-policy.ts")) return { isC2Runtime: () => c2 };
      if (name === "@sentry/nextjs/config") return sdkImport();
      throw new Error("Unexpected config import (details suppressed).");
    };
    try {
      const fn = new Script(`(function(require,module,exports){${code}\n})`).runInThisContext();
      fn(safeRequire, compiledModule, compiledModule.exports);
      expect(typeof compiledModule.exports.default).toBe("function");
      const config = await compiledModule.exports.default!();
      expect(config.distDir).toBe(c2 ? ".next-c2" : undefined);
      expect(sdkImport).toHaveBeenCalledTimes(c2 ? 0 : 1);
      expect(wrap).toHaveBeenCalledTimes(c2 ? 0 : 1);
    } catch { throw new Error("CommonJS config regression check failed (details suppressed)."); }
  });
});
