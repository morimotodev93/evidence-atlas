import type { BrowserContext, Page, Request as BrowserRequest } from "@playwright/test";
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
export function navigationFailureCategory(value: unknown): "BLOCKED" | "CANCELED" | "NETWORK" | "OTHER" {
  if (typeof value !== "string") return "OTHER";
  if (["net::ERR_BLOCKED_BY_CLIENT", "net::ERR_BLOCKED_BY_RESPONSE", "net::ERR_BLOCKED_BY_CSP", "net::ERR_UNSAFE_REDIRECT"].includes(value)) return "BLOCKED";
  if (value === "net::ERR_ABORTED") return "CANCELED";
  if (["net::ERR_CONNECTION_CLOSED", "net::ERR_CONNECTION_REFUSED", "net::ERR_CONNECTION_RESET", "net::ERR_TIMED_OUT", "net::ERR_NAME_NOT_RESOLVED", "net::ERR_SSL_PROTOCOL_ERROR", "net::ERR_CERT_AUTHORITY_INVALID"].includes(value)) return "NETWORK";
  return "OTHER";
}
function authPost(request: BrowserRequest) {
  const url = new URL(request.url());
  return request.method() === "POST" && url.origin === C2_ORIGIN && url.pathname === "/api/auth/signin/google";
}
function providerNavigation(request: BrowserRequest): "main" | "subframe" | undefined {
  const url = new URL(request.url());
  if (url.origin === C2_ORIGIN || !request.isNavigationRequest() || !bootstrapRequestAllowed(request.method(), url.href)) return;
  return request.frame().parentFrame() === null ? "main" : "subframe";
}

export function hmrAllowed(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return url.origin === "ws://localhost:3001" && url.pathname === "/_next/webpack-hmr" && !url.username && !url.password;
  } catch { return false; }
}
export async function installNetworkBoundary(context: BrowserContext, bootstrap = false, report?: (code: BootstrapCode) => void) {
  let failed = false;
  let authRedirect = false;
  let fulfillStarted = false;
  let fulfillCompleted = false;
  let fulfillFailed = false;
  let googleRequested = false;
  let googleCommitted = false;
  const seen = new Set<BootstrapCode>();
  const diagnostic = (code: BootstrapCode) => {
    if (bootstrap && !seen.has(code)) { seen.add(code); report?.(code); }
  };
  const violation = () => { failed = true; };
  if (bootstrap) {
    // Context events also cover requests that Chromium auto-continues after a
    // redirect, before frame commit and before a new page's listeners exist.
    context.on("request", (request) => {
      try {
        if (!bootstrapRequestAllowed(request.method(), request.url()) && !isBootstrapIcon(request.method(), request.url(), request.resourceType())) {
          violation(); diagnostic("REQUEST_OBSERVED_REFUSED");
        }
        if (authPost(request)) diagnostic("AUTH_BROWSER_POST");
        const navigation = providerNavigation(request);
        if (navigation === "main") { googleRequested = true; diagnostic("GOOGLE_NAV_REQUEST"); }
        if (navigation === "subframe") diagnostic("GOOGLE_SUBFRAME_NAV_REQUEST");
      } catch { diagnostic("OBSERVATION_UNAVAILABLE"); }
    });
    context.on("response", (response) => {
      try {
        const request = response.request();
        if (authPost(request)) diagnostic([301, 302, 303, 307, 308].includes(response.status()) ? "AUTH_BROWSER_REDIRECT" : "AUTH_BROWSER_RESPONSE_OTHER");
        if (providerNavigation(request) === "main") diagnostic(response.status() >= 400 ? "GOOGLE_NAV_HTTP_ERROR" : "GOOGLE_NAV_RESPONSE");
        const url = new URL(request.url());
        if (url.origin === C2_ORIGIN && url.pathname === "/api/auth/signin" && /(?:^|;)\s*form-action\s/i.test(response.headers()["content-security-policy"] ?? "")) diagnostic("SIGNIN_CSP_FORM_ACTION");
      } catch { diagnostic("OBSERVATION_UNAVAILABLE"); }
    });
    context.on("requestfailed", (request) => {
      try {
        const category = navigationFailureCategory(request.failure()?.errorText);
        if (authPost(request)) diagnostic(`AUTH_BROWSER_FAILED_${category}`);
        if (providerNavigation(request) === "main") diagnostic(`GOOGLE_NAV_FAILED_${category}`);
      } catch { diagnostic("OBSERVATION_UNAVAILABLE"); }
    });
  }
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
    const authSubmit = bootstrap && authPost(request);
    if (authSubmit) diagnostic("AUTH_SUBMIT");
    try { if (bootstrap && providerNavigation(request) === "main") diagnostic("GOOGLE_NAV_ROUTE"); }
    catch { diagnostic("OBSERVATION_UNAVAILABLE"); }
    let fetched = false;
    try {
      // Validate this response's Location without following it in the API client.
      // Native later hops can bypass route interception; event observation is not
      // a network firewall and cannot prove a disallowed hop was never sent.
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
        if (authSubmit) {
          const external = new URL(location, request.url()).origin !== C2_ORIGIN;
          if (external) authRedirect = true;
          diagnostic(external ? "AUTH_REDIRECT" : "AUTH_LOCAL_REDIRECT");
        }
      }
      // Keep the original status, Location, duplicate Set-Cookie and body intact.
      // Browser-level redirect/CSRF/Google behavior still requires a live retest.
      if (authSubmit) { fulfillStarted = true; diagnostic("AUTH_FULFILL_STARTED"); }
      await route.fulfill({ response });
      if (authSubmit) { fulfillCompleted = true; diagnostic("AUTH_FULFILL_COMPLETED"); }
    } catch {
      if (authSubmit && fetched) fulfillFailed = true;
      violation(); diagnostic(fetched ? "FULFILL_FAILED" : "FETCH_FAILED"); await route.abort("failed").catch(() => {});
    }
  });
  await context.routeWebSocket(/.*/, (socket) => {
    if (hmrAllowed(socket.url())) socket.connectToServer();
    else { violation(); diagnostic("BLOCKED_EXTERNAL_RESOURCE"); socket.close(); }
  });
  const observedPages = new WeakSet<Page>();
  const observePage = (page: Page) => {
    if (observedPages.has(page)) return;
    observedPages.add(page);
    page.on("framenavigated", (frame) => {
      const url = frame.url();
      if (url === "about:blank") return;
      if (bootstrap) {
        if (!bootstrapRequestAllowed("GET", url)) { violation(); diagnostic("BLOCKED_EXTERNAL_NAVIGATION"); }
        else {
          const parsed = new URL(url);
          if (frame === page.mainFrame()) {
            if (parsed.origin !== C2_ORIGIN) { googleCommitted = true; diagnostic("GOOGLE_NAVIGATION"); }
            else if (["/", "/research"].includes(parsed.pathname)) diagnostic("LOCAL_RETURN");
          }
        }
      }
      else { try { requireC2Url(url); } catch { violation(); } }
    });
  };
  context.on("page", observePage);
  for (const page of context.pages()) observePage(page);
  return Object.assign(() => { if (failed) refuse(bootstrap ? "bootstrap-network" : "network-policy"); }, {
    reportProgress() {
      if (!bootstrap || !authRedirect) return;
      if (fulfillStarted && !fulfillCompleted && !fulfillFailed) diagnostic("AUTH_FULFILL_PENDING");
      if (fulfillCompleted && !googleRequested && !googleCommitted) diagnostic("GOOGLE_NAV_NOT_OBSERVED");
      if (googleRequested && !googleCommitted) diagnostic("GOOGLE_NAV_UNCOMMITTED");
    },
  });
}

export async function safePageUrl(context: BrowserContext) {
  const pages = context.pages();
  if (pages.length !== 1) refuse("unexpected-page");
  const url = requireC2Url(pages[0].url());
  if (url.origin !== C2_ORIGIN) refuse("origin");
  return url;
}
