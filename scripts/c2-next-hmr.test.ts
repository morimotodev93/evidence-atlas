import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { hmrAllowed } from "./c2-playwright-network.ts";

const require = createRequire(import.meta.url);
const nextRoot = dirname(require.resolve("next/package.json"));

// Execute the installed client modules with synthetic browser globals. No
// package dependency executes, and no real socket, timer or browser exists.
function installedSocketUrl(requestId: string) {
  const sockets: string[] = [];
  const window = {
    location: { protocol: "http:", hostname: "localhost", port: "3001" },
    addEventListener() {},
    WebSocket: class {
      constructor(url: string) { sockets.push(url); }
    },
  };
  const globals = { window, self: { __next_r: requestId }, URL, TextDecoder,
    document: { addEventListener() {} }, process: { env: {} } };
  function load(relative: string, dependencies: Record<string, unknown>) {
    const moduleRecord = { exports: {} as Record<string, unknown> };
    runInNewContext(readFileSync(join(nextRoot, relative), "utf8"), {
      ...globals, module: moduleRecord, exports: moduleRecord.exports,
      require: (name: string) => {
        if (!(name in dependencies)) throw new Error("Unexpected installed-client dependency");
        return dependencies[name];
      },
    });
    return moduleRecord.exports;
  }
  const normalized = load("dist/shared/lib/normalized-asset-prefix.js", {});
  const socketUrl = load("dist/client/dev/hot-reloader/get-socket-url.js", {
    "../../../shared/lib/normalized-asset-prefix": normalized,
  });
  const client = load("dist/client/dev/hot-reloader/app/web-socket.js", {
    react: {},
    "../../../../shared/lib/app-router-context.shared-runtime": {},
    "../get-socket-url": socketUrl,
    "../../../../server/dev/hot-reloader-types": {},
    "../shared": {},
    "./hot-reloader-app": {},
    "../../../../next-devtools/userspace/app/forward-logs": {},
    "../../../../shared/lib/invariant-error": {},
    "../../../../lib/constants": {},
  });
  (client.createWebSocket as (prefix: string, state: object) => unknown)("", {});
  expect(sockets).toHaveLength(1);
  return sockets[0];
}

describe("C2 HMR against the installed Next client (offline)", () => {
  it.each(["synthetic-request-id_1", "86b7e266-2e99-49d1-a294-1787c0a6241f"])(
    "admits the exact local socket emitted by the installed client", (requestId) => {
      const url = installedSocketUrl(requestId);
      expect(url).toBe(`ws://localhost:3001/_next/hmr?id=${requestId}`);
      expect(hmrAllowed(url)).toBe(true);
    },
  );

  it.each([
    "ws://localhost:3000/_next/hmr?id=synthetic",
    "ws://127.0.0.1:3001/_next/hmr?id=synthetic",
    "wss://localhost:3001/_next/hmr?id=synthetic",
    "ws://example.invalid/_next/hmr?id=synthetic",
    "ws://user:secret@localhost:3001/_next/hmr?id=synthetic",
    "ws://localhost:3001/_next/webpack-hmr?id=synthetic",
    "ws://localhost:3001/_next/hmr/other?id=synthetic",
    "ws://localhost:3001/_next/hmr",
    "ws://localhost:3001/_next/hmr?id=",
    "ws://localhost:3001/_next/hmr?other=synthetic",
    "ws://localhost:3001/_next/hmr?id=synthetic&extra=1",
    "ws://localhost:3001/_next/hmr?id=synthetic&id=other",
    "ws://localhost:3001/_next/hmr?id=synthetic#fragment",
  ])("refuses a socket outside the exact installed-client contract", (url) => {
    expect(hmrAllowed(url)).toBe(false);
  });
});
