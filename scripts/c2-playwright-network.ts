import type { BrowserContext } from "@playwright/test";
import { C2_ORIGIN, bootstrapRequestAllowed, requireC2Url, refuse, testRequestDecision } from "./c2-playwright-policy.ts";
import type { BootstrapCode } from "./c2-playwright-diagnostics.ts";

export function redirectMethod(status: number, method: string): string | undefined {
  if (![301, 302, 303, 307, 308].includes(status)) return;
  return ((status === 301 || status === 302) && method === "POST") || (status === 303 && method !== "HEAD") ? "GET" : method;
}
export function isBootstrapIcon(method: string, rawUrl: string, resource: string): boolean {
  // Installed @auth/core renders this exact lazy image in its default Google form.
  // Serve an inert local image instead of requesting/authenticating to authjs.dev.
  return method === "GET" && resource === "image" && rawUrl === "https://authjs.dev/img/providers/google.svg";
}

export function hmrAllowed(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return url.origin === "ws://localhost:3001" && url.pathname === "/_next/webpack-hmr" && !url.username && !url.password;
  } catch { return false; }
}
export async function installNetworkBoundary(context: BrowserContext, bootstrap = false, report?: (code: BootstrapCode) => void) {
  let failed = false;
  const seen = new Set<BootstrapCode>();
  const diagnostic = (code: BootstrapCode) => {
    if (bootstrap && !seen.has(code)) { seen.add(code); report?.(code); }
  };
  const violation = () => { failed = true; };
  await context.route("**/*", async (route) => {
    const request = route.request();
    if (bootstrap && isBootstrapIcon(request.method(), request.url(), request.resourceType())) {
      try {
        await route.fulfill({ status: 200, contentType: "image/svg+xml", headers: { "cache-control": "no-store" }, body: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"/>' });
        diagnostic("COSMETIC_ICON_LOCAL");
      } catch { violation(); diagnostic("FULFILL_FAILED"); await route.abort("failed").catch(() => {}); }
      return;
    }
    const allowed = bootstrap ? bootstrapRequestAllowed(request.method(), request.url()) : testRequestDecision(request.method(), request.url()) === "allow";
    if (!allowed) {
      let local = false;
      try { local = new URL(request.url()).origin === C2_ORIGIN; } catch { /* Classified as external. */ }
      diagnostic(local ? (request.isNavigationRequest() ? "BLOCKED_C2_NAVIGATION" : "BLOCKED_C2_RESOURCE") : (request.isNavigationRequest() ? "BLOCKED_EXTERNAL_NAVIGATION" : "BLOCKED_EXTERNAL_RESOURCE"));
      violation(); await route.abort("blockedbyclient"); return;
    }
    const authSubmit = bootstrap && request.method() === "POST" && new URL(request.url()).origin === C2_ORIGIN && new URL(request.url()).pathname === "/api/auth/signin/google";
    if (authSubmit) diagnostic("AUTH_SUBMIT");
    let fetched = false;
    try {
      // Playwright does not route subsequent redirect hops: fetch without following
      // redirects, inspect Location, then fulfill. No credentials leave via a hop.
      const response = await route.fetch({ maxRedirects: 0, timeout: 15_000 });
      fetched = true;
      const location = response.headers().location;
      if (authSubmit && (!location || ![301, 302, 303, 307, 308].includes(response.status()))) {
        violation(); diagnostic("AUTH_RESPONSE_INVALID"); await route.abort("blockedbyclient"); return;
      }
      if (location || (response.status() >= 300 && response.status() < 400)) {
        const nextMethod = redirectMethod(response.status(), request.method());
        if (!bootstrap || !location || !nextMethod || !bootstrapRequestAllowed(nextMethod, new URL(location, request.url()).href)) {
          diagnostic(nextMethod ? "REDIRECT_REFUSED" : "REDIRECT_STATUS_UNSUPPORTED");
          violation(); await route.abort("blockedbyclient"); return;
        }
        if (authSubmit) diagnostic(new URL(location, request.url()).origin === C2_ORIGIN ? "AUTH_LOCAL_REDIRECT" : "AUTH_REDIRECT");
      }
      // Keep the original status, Location, duplicate Set-Cookie and body intact.
      // Browser-level redirect/CSRF/Google behavior still requires a live retest.
      await route.fulfill({ response });
    } catch { violation(); diagnostic(fetched ? "FULFILL_FAILED" : "FETCH_FAILED"); await route.abort("failed").catch(() => {}); }
  });
  await context.routeWebSocket(/.*/, (socket) => {
    if (hmrAllowed(socket.url())) socket.connectToServer();
    else { violation(); diagnostic("BLOCKED_EXTERNAL_RESOURCE"); socket.close(); }
  });
  context.on("page", (page) => {
    page.on("framenavigated", (frame) => {
      const url = frame.url();
      if (url === "about:blank") return;
      if (bootstrap) {
        if (!bootstrapRequestAllowed("GET", url)) { violation(); diagnostic("BLOCKED_EXTERNAL_NAVIGATION"); }
        else {
          const parsed = new URL(url);
          if (parsed.origin !== C2_ORIGIN) diagnostic("GOOGLE_NAVIGATION");
          else if (["/", "/research"].includes(parsed.pathname)) diagnostic("LOCAL_RETURN");
        }
      }
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
