import { test as base, expect, type Route } from "@playwright/test";
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import tailwind from "@tailwindcss/postcss";
import { FIXTURE_ORIGIN, offlineRoute, WIDGET_DOUBLE } from "./demo-chat-offline-policy";

type Post = { operation: string; researchId: string; threadId?: string; message?: string; turnstileToken?: string };
type Harness = {
  posts: Post[]; denied: string[];
  status: number; sessionStatus: number;
  answer?: string;
  hold: boolean; release: () => void;
};

// Reuse the compiler already installed with tsx; no package install/download.
// Fail closed if it disappears. Nothing executes the application on Node.
async function compileFixture() {
  const require = createRequire(import.meta.url);
  const compiler = createRequire(require.resolve("tsx"))("esbuild") as {
    build(options: object): Promise<{ outputFiles: { text: string }[]; metafile: { inputs: Record<string, unknown> } }>;
  };
  const result = await compiler.build({
    entryPoints: [fileURLToPath(new URL("./demo-chat-entry.tsx", import.meta.url))],
    bundle: true, write: false, platform: "browser", format: "iife", metafile: true,
    define: { "process.env.NODE_ENV": '"development"' }, logLevel: "silent",
  });
  const inputs = Object.keys(result.metafile.inputs);
  if (inputs.some((path) => /(?:src\/(?:prisma|app\/api)|src\/lib\/(?:db|c2)|server-only)/.test(path))) {
    throw new Error("Offline fixture imported a server boundary");
  }
  const postcss = createRequire(require.resolve("@tailwindcss/postcss"))("postcss") as (plugins: unknown[]) => {
    process(css: string, options: object): Promise<{ css: string }>;
  };
  const cssFile = fileURLToPath(new URL("../../src/app/globals.css", import.meta.url));
  const input = (await readFile(cssFile, "utf8")).replace('@import "tailwindcss";',
    '@import "tailwindcss" source(none);\n@source "../components/demo";\n@source "../components/ui";\n@source "../../e2e/fixtures/demo-chat-entry.tsx";');
  const css = await postcss([tailwind({ optimize: false })]).process(input, { from: cssFile });
  return { script: result.outputFiles[0].text, style: css.css };
}

export const test = base.extend<{ chatFixture: Harness }, { assets: Awaited<ReturnType<typeof compileFixture>> }>({
  assets: [async ({}, use, info) => {
    if (info.project.name !== "offline-chromium") throw new Error("Use the dedicated offline Playwright config");
    await use(await compileFixture());
  }, { scope: "worker" }],
  chatFixture: [async ({ context, assets }, use, info) => {
    let resume = () => {};
    const requestCounts: Record<string, number> = {};
    const harness: Harness = { posts: [], denied: [], status: 200, sessionStatus: 201, hold: false, release: () => resume() };
    await context.routeWebSocket("**/*", (socket) => {
      requestCounts.websocket = (requestCounts.websocket ?? 0) + 1;
      harness.denied.push("websocket"); socket.close();
    });
    await context.route("**/*", async (route: Route) => {
      const request = route.request();
      const kind = offlineRoute(request.url(), request.method());
      requestCounts[kind] = (requestCounts[kind] ?? 0) + 1;
      if (kind === "deny") {
        // Record categories only, never a URL/body that might contain a secret.
        harness.denied.push("unexpected-request"); await route.abort("blockedbyclient"); return;
      }
      if (kind === "document") {
        await route.fulfill({ contentType: "text/html", headers: {
          "Content-Security-Policy": "default-src 'none'; script-src 'self' https://challenges.cloudflare.com; style-src 'self'; connect-src 'self'; img-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'",
        }, body: '<!doctype html><html lang="en" class="c2-system-font"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"><title>Offline Demo Chat</title><div id="root"></div><script src="/fixture.js"></script></html>' });
      } else if (kind === "script" || kind === "widget") {
        await route.fulfill({ contentType: "application/javascript", body: kind === "script" ? assets.script : WIDGET_DOUBLE });
      } else if (kind === "style") {
        await route.fulfill({ contentType: "text/css", body: assets.style });
      } else {
        const post = request.postDataJSON() as Post;
        harness.posts.push(post);
        if (!["session", "question"].includes(post.operation) || !["first", "second"].includes(post.researchId)) {
          harness.denied.push("invalid-fixture-api"); await route.abort(); return;
        }
        if (post.operation === "session") {
          await route.fulfill({ status: harness.sessionStatus, json: { threadId: post.researchId === "first" ? "a".repeat(43) : "b".repeat(43) } });
        } else {
          if (harness.hold) await new Promise<void>((resolve) => { resume = resolve; });
          await route.fulfill({ status: harness.status, json: harness.status === 200 ? {
            answer: harness.answer ?? `Offline answer for ${post.researchId}`,
            sources: [{ id: `source-${post.researchId}`, title: `Evidence ${post.researchId}`, url: `https://sources.invalid/${post.researchId}` }],
            insufficientEvidence: false, contextTruncated: false, evidenceNotice: "Synthetic evidence only.",
          } : { error: "Synthetic refusal" } });
        }
      }
    });
    await use(harness);
    harness.release();
    await writeFile(info.outputPath("offline-network.json"), JSON.stringify({
      scope: "synthetic-browser-only; not packet capture or deployed evidence",
      requestCounts, httpPolicy: "fulfil-or-abort; no continuation", websocketPolicy: "close",
      unaccountedRequests: harness.denied.length, serverStarted: false,
    }, null, 2));
    expect(harness.denied, "All HTTP requests fulfilled locally; unexpected requests blocked").toEqual([]);
  }, { auto: true }],
});
export { expect, FIXTURE_ORIGIN };
