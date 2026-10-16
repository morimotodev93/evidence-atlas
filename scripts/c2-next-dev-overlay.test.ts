import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import ts from "typescript";
import { getDefineEnv, type DefineEnvOptions } from "next/dist/build/define-env";
import { defaultConfig } from "next/dist/server/config-shared";
import { C2_ORIGIN, prepareC2App } from "./c2-app-target.ts";
import { testRequestDecision } from "./c2-playwright-policy.ts";

const require = createRequire(import.meta.url);
const flag = "NEXT_PRIVATE_DISABLE_DEV_OVERLAY_UX";
const map = JSON.parse(readFileSync(require.resolve("next/dist/compiled/next-devtools/index.js.map"), "utf8")) as {
  sources: string[];
  sourcesContent: string[];
};

function source(suffix: string) {
  const index = map.sources.findIndex((path) => path.endsWith(suffix));
  if (index < 0) throw new Error("Installed Next overlay source is unavailable.");
  return map.sourcesContent[index];
}

function definedOverlayFlag() {
  return JSON.parse(getDefineEnv({
    // Next's exported defaults omit optional user hooks that this build path
    // does not access; no project config or environment file is loaded here.
    config: defaultConfig as unknown as DefineEnvOptions["config"], dev: true, isTurbopack: true, distDir: ".next-c2", projectPath: "/synthetic",
    fetchCacheKeyPrefix: undefined, hasRewrites: false, isClient: true, isEdgeServer: false, isNodeServer: false,
    middlewareMatchers: undefined, rewrites: { beforeFiles: [], afterFiles: [], fallback: [] },
  })["process.env.__NEXT_DISABLE_DEV_OVERLAY_UX"]) as boolean;
}

function installedOverlay(disabled: boolean) {
  // Execute the installed component with inert hook/JSX doubles. No React
  // renderer, DOM, browser, timer, app server, or network connection is created.
  const file = ts.createSourceFile("overlay.tsx", source("/dev-overlay.browser.tsx"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const component = file.statements.find((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === "DevOverlayRoot");
  if (!component) throw new Error("Installed Next overlay component is unavailable.");
  const code = ts.transpileModule(`${component.getText(file)}\nexports.render = DevOverlayRoot;`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  const FontStyles = vi.fn();
  const load = vi.fn(() => ({ FontStyles, DevOverlay: vi.fn() }));
  const exports: { render?: (props: object) => unknown } = {};
  runInNewContext(code, {
    exports, process: { env: { __NEXT_DISABLE_DEV_OVERLAY_UX: disabled } },
    useErrorOverlayReducer: () => [{ theme: "system" }, vi.fn()],
    useEffect: vi.fn(), useLayoutEffect: vi.fn(), useInsertionEffect: vi.fn(),
    loadDevOverlayUX: load, DevOverlayContext: {},
    React: { Fragment: "fragment", createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({ type, props, children }) },
  });
  if (!exports.render) throw new Error("Installed Next overlay component did not load.");
  return { result: exports.render({ shadowRoot: {} }), load, FontStyles };
}

function prepare(standard: Record<string, string> = {}, inherited: Record<string, string> = {}) {
  const files: Record<string, string> = {
    ".env.c2.local": "C2_MODE=local\nC2_POSTGRES_PASSWORD=synthetic-db\nC2_DATABASE_URL=postgresql://c2_local:synthetic-db@127.0.0.1:5433/evidence_atlas_c2",
    ".env.c2.auth.local": `AUTH_SECRET=${"s".repeat(32)}\nAUTH_GOOGLE_ID=synthetic.apps.googleusercontent.com\nAUTH_GOOGLE_SECRET=synthetic-oauth`,
    ...standard,
  };
  return prepareC2App({ root: "/synthetic", args: [], execArgv: [], inherited, readText: (path) => files[path.split(/[\\/]/).at(-1)!] });
}

afterEach(() => vi.unstubAllEnvs());

describe("installed Next dev overlay compatibility without network policy expansion", () => {
  it("reproduces the four cosmetic font requests rejected by the existing policy", () => {
    const fonts = [...source("/font/font-styles.tsx").matchAll(/url\((\/__nextjs_font\/[^)]+)\)/g)].map((match) => match[1]);
    expect(fonts).toHaveLength(4);
    for (const path of fonts) expect(testRequestDecision("GET", `${C2_ORIGIN}${path}`)).toBe("path");
  });

  it.each(["0", "1"])("uses the installed Next build flag %s before loading font styles", (value) => {
    vi.stubEnv(flag, value);
    const disabled = definedOverlayFlag();
    expect(disabled).toBe(value === "1");
    const overlay = installedOverlay(disabled);
    if (disabled) {
      expect(overlay.result).toBeNull();
      expect(overlay.load).not.toHaveBeenCalled();
    } else {
      expect(overlay.load).toHaveBeenCalledOnce();
      expect(overlay.result).toMatchObject({ children: [{ type: overlay.FontStyles }, {}] });
    }
  });

  it("fixes the overlay flag in the C2 child environment despite inherited or standard-file overrides", () => {
    const result = prepare({ ".env.local": `${flag}=0` }, { [flag]: "0" });
    expect(result.env[flag]).toBe("1");
    vi.stubEnv(flag, result.env[flag]);
    expect(installedOverlay(definedOverlayFlag()).load).not.toHaveBeenCalled();
  });

  it("rejects case variants that could shadow the fixed flag in standard files", () => {
    expect(() => prepare({ ".env.local": `${flag.toLowerCase()}=0` })).toThrow("Ambiguous case variants");
  });
});
