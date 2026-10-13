import type { BrowserContext } from "@playwright/test";
import { C2_ORIGIN, bootstrapRequestAllowed, requireC2Url, refuse, testRequestDecision } from "./c2-playwright-policy.ts";

export function hmrAllowed(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return url.origin === "ws://localhost:3001" && url.pathname === "/_next/webpack-hmr" && !url.username && !url.password;
  } catch { return false; }
}
export async function installNetworkBoundary(context: BrowserContext, bootstrap = false) {
  let failed = false;
  const violation = () => { failed = true; };
  await context.route("**/*", async (route) => {
    const request = route.request();
    const allowed = bootstrap ? bootstrapRequestAllowed(request.method(), request.url()) : testRequestDecision(request.method(), request.url()) === "allow";
    if (!allowed) { violation(); await route.abort("blockedbyclient"); return; }
    try {
      // Playwright does not route subsequent redirect hops: fetch without following
      // redirects, inspect Location, then fulfill. No credentials leave via a hop.
      const response = await route.fetch({ maxRedirects: 0, timeout: 15_000 });
      const location = response.headers().location;
      if (location || (response.status() >= 300 && response.status() < 400)) {
        const status = response.status();
        const nextMethod = status === 303 || ((status === 301 || status === 302) && request.method() === "POST") ? "GET" : request.method();
        if (!bootstrap || !location || !bootstrapRequestAllowed(nextMethod, new URL(location, request.url()).href)) {
          violation(); await route.abort("blockedbyclient"); return;
        }
      }
      await route.fulfill({ response });
    } catch { violation(); await route.abort("failed").catch(() => {}); }
  });
  await context.routeWebSocket(/.*/, (socket) => {
    if (hmrAllowed(socket.url())) socket.connectToServer();
    else { violation(); socket.close(); }
  });
  context.on("page", (page) => {
    page.on("framenavigated", (frame) => {
      const url = frame.url();
      if (url === "about:blank") return;
      if (bootstrap) { if (!bootstrapRequestAllowed("GET", url)) violation(); }
      else { try { requireC2Url(url); } catch { violation(); } }
    });
  });
  return () => { if (failed) refuse(bootstrap ? "bootstrap-network" : "network-policy"); };
}

export async function safePageUrl(context: BrowserContext) {
  const pages = context.pages();
  if (pages.length !== 1) refuse("unexpected-page");
  const url = requireC2Url(pages[0].url());
  if (url.origin !== C2_ORIGIN) refuse("origin");
  return url;
}
