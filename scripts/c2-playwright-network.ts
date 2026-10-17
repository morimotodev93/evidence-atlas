import type { BrowserContext, Page, Request as BrowserRequest } from "@playwright/test";
import { C2_ORIGIN, bootstrapRequestAllowed, requireC2Url, refuse, testRequestDecision } from "./c2-playwright-policy.ts";
import type { BootstrapCode } from "./c2-playwright-diagnostics.ts";
import { createNavigationWatch, type NavigationFailure } from "./c2-playwright-navigation-watch.ts";
import type { C2NetworkCode } from "./c2-scenario-diagnostics.ts";

export function redirectMethod(status: number, method: string): string | undefined {
  if (![301, 302, 303, 307, 308].includes(status)) return;
  return ((status === 301 || status === 302) && method === "POST") || (status === 303 && method !== "HEAD") ? "GET" : method;
}
export function isBootstrapIcon(method: string, rawUrl: string, resource: string): boolean {
  // Installed @auth/core renders this exact lazy image in its default Google form.
  // Serve an inert local image instead of requesting/authenticating to authjs.dev.
  return method === "GET" && resource === "image" && rawUrl === "https://authjs.dev/img/providers/google.svg";
}
// Only a validated, GET-capable main-frame redirect uses this small HTML
// document. The full URL stays inside the browser; diagnostics stay fixed-code.
const MAX_GOOGLE_HOP_BRIDGES = 8;
function routedRedirectDocument(target: string): string {
  const attribute = target.replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="refresh" content="0;url=${attribute}"></head><body></body></html>`;
}
// Report only coarse fixed categories, never host/path/query/token values.
// Classification is observation only; it never allows a blocked navigation.
function inHostnameFamily(host: string, family: string): boolean {
  return host === family || host.endsWith(`.${family}`);
}
export function blockedExternalNavigationCode(rawUrl: string): BootstrapCode {
  try {
    const url = new URL(rawUrl);
    if (["chrome-error:", "chrome:", "edge:", "about:"].includes(url.protocol)) return "BLOCKED_NAV_BROWSER_INTERNAL";
    if (url.protocol !== "https:") return "BLOCKED_NAV_NON_HTTPS";
    if (["google.com", "gstatic.com", "googleusercontent.com"].some((family) => inHostnameFamily(url.hostname, family))) {
      return "BLOCKED_NAV_GOOGLE_HOST_REJECTED";
    }
    if (["google.co.jp", "google.co.uk", "googleapis.com", "youtube.com"].some((family) => inHostnameFamily(url.hostname, family))) {
      return "BLOCKED_NAV_UNLISTED_GOOGLE_FAMILY";
    }
    return "BLOCKED_NAV_OTHER_HTTPS";
  } catch { return "BLOCKED_NAV_INVALID_URL"; }
}
export function navigationFailureCategory(value: unknown): NavigationFailure {
  if (typeof value !== "string") return "OTHER";
  if (["net::ERR_BLOCKED_BY_CLIENT", "net::ERR_BLOCKED_BY_RESPONSE", "net::ERR_BLOCKED_BY_CSP", "net::ERR_UNSAFE_REDIRECT"].includes(value)) return "BLOCKED";
  if (value === "net::ERR_ABORTED") return "CANCELED";
  if (["net::ERR_SSL_PROTOCOL_ERROR", "net::ERR_SSL_VERSION_OR_CIPHER_MISMATCH", "net::ERR_CERT_AUTHORITY_INVALID", "net::ERR_CERT_DATE_INVALID", "net::ERR_CERT_COMMON_NAME_INVALID"].includes(value)) return "TLS";
  if (value === "net::ERR_NAME_NOT_RESOLVED") return "DNS";
  if (["net::ERR_CONNECTION_CLOSED", "net::ERR_CONNECTION_REFUSED", "net::ERR_CONNECTION_RESET", "net::ERR_TIMED_OUT"].includes(value)) return "NETWORK";
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
    // Installed Next 16 uses this exact socket and a document request ID.
    // Replace the obsolete webpack-hmr path; do not admit other sockets.
    return url.origin === "ws://localhost:3001" && url.pathname === "/_next/hmr" && !url.username && !url.password && !url.hash &&
      [...url.searchParams.keys()].length === 1 && url.searchParams.has("id") && !!url.searchParams.get("id");
  } catch { return false; }
}
export async function installNetworkBoundary(context: BrowserContext, bootstrap = false, report?: (code: BootstrapCode) => void, reportNetwork?: (code: C2NetworkCode) => void) {
  let failed = false;
  let stopping = false;
  let authRedirect = false;
  let fulfillStarted = false;
  let fulfillCompleted = false;
  let fulfillFailed = false;
  let googleRequested = false;
  let googleCommitted = false;
  let googleHopBridges = 0;
  const seen = new Set<BootstrapCode>();
  const diagnostic = (code: BootstrapCode) => {
    if (bootstrap && !seen.has(code)) { seen.add(code); report?.(code); }
  };
  const networkSeen = new Set<C2NetworkCode>();
  const violation = (code: C2NetworkCode = "NET_POLICY_REFUSED") => {
    failed = true;
    if (!bootstrap && !networkSeen.has(code)) { networkSeen.add(code); reportNetwork?.(code); }
  };
  // BrowserContext.close disposes its API client without awaiting route
  // callbacks. Keep the guard installed while admitted reads finish, then
  // close the context; a final drain also includes callbacks already queued.
  const pending = new Set<Promise<void>>();
  const track = (operation: () => Promise<void>) => {
    const work = (async () => {
      try { await operation(); }
      catch (error) { violation(); throw error; }
    })();
    pending.add(work);
    void work.then(() => pending.delete(work), () => pending.delete(work));
    return work;
  };
  const navigationWatch = createNavigationWatch(diagnostic);
  const mainRequests = new WeakSet<BrowserRequest>();
  if (bootstrap) {
    // Context events also cover requests that Chromium auto-continues after a
    // redirect, before frame commit and before a new page's listeners exist.
    context.on("request", (request) => {
      try {
        if (!bootstrapRequestAllowed(request.method(), request.url()) && !isBootstrapIcon(request.method(), request.url(), request.resourceType())) {
          violation(); diagnostic("REQUEST_OBSERVED_REFUSED");
          if (request.isNavigationRequest()) {
            const url = new URL(request.url());
            if (url.origin !== C2_ORIGIN) diagnostic(blockedExternalNavigationCode(request.url()));
          }
        }
        if (authPost(request)) diagnostic("AUTH_BROWSER_POST");
        const navigation = providerNavigation(request);
        if (navigation === "main") {
          mainRequests.add(request); googleRequested = true; googleCommitted = false; diagnostic("GOOGLE_NAV_REQUEST");
          navigationWatch.requested(request, request.redirectedFrom?.());
        }
        if (navigation === "subframe") diagnostic("GOOGLE_SUBFRAME_NAV_REQUEST");
      } catch { diagnostic("OBSERVATION_UNAVAILABLE"); }
    });
    context.on("response", (response) => {
      try {
        const request = response.request();
        if (authPost(request)) diagnostic([301, 302, 303, 307, 308].includes(response.status()) ? "AUTH_BROWSER_REDIRECT" : "AUTH_BROWSER_RESPONSE_OTHER");
        if (mainRequests.has(request) || providerNavigation(request) === "main") {
          navigationWatch.responded(request);
          diagnostic(response.status() >= 400 ? "GOOGLE_NAV_HTTP_ERROR" : "GOOGLE_NAV_RESPONSE");
        }
        const url = new URL(request.url());
        if (url.origin === C2_ORIGIN && url.pathname === "/api/auth/signin" && /(?:^|;)\s*form-action\s/i.test(response.headers()["content-security-policy"] ?? "")) diagnostic("SIGNIN_CSP_FORM_ACTION");
      } catch { diagnostic("OBSERVATION_UNAVAILABLE"); }
    });
    context.on("requestfailed", (request) => {
      try {
        const category = navigationFailureCategory(request.failure()?.errorText);
        if (authPost(request)) diagnostic(navigationWatch.isShuttingDown() ? "AUTH_BROWSER_FAILED_DURING_SHUTDOWN" : `AUTH_BROWSER_FAILED_${category}`);
        // A failed request's frame can already be detached during close. Cache
        // classification from request time rather than losing cancellation data.
        if (mainRequests.has(request) || providerNavigation(request) === "main") navigationWatch.failed(request, category);
      } catch { diagnostic("OBSERVATION_UNAVAILABLE"); }
    });
  }
  await context.route("**/*", (route) => track(async () => {
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
      if (bootstrap && !local && request.isNavigationRequest()) diagnostic(blockedExternalNavigationCode(request.url()));
      let code: C2NetworkCode = "NET_POLICY_REFUSED";
      if (!bootstrap) {
        const decision = testRequestDecision(request.method(), request.url());
        code = decision === "method" ? "NET_METHOD_REFUSED" : decision === "origin" ? "NET_ORIGIN_REFUSED"
          : decision === "query" ? "NET_QUERY_REFUSED" : "NET_PATH_REFUSED";
        if (decision === "path") {
          const path = new URL(request.url()).pathname;
          if (path.startsWith("/_next/static/")) code = "NET_STATIC_REFUSED";
          if (path.startsWith("/__nextjs")) code = "NET_DEVTOOLS_REFUSED";
        }
      }
      violation(code); await route.abort("blockedbyclient"); return;
    }
    // Shutdown narrows the boundary: newly arriving allowed reads are aborted
    // locally, while disallowed requests above still latch a policy failure.
    if (!bootstrap && stopping) { await route.abort("blockedbyclient"); return; }
    const authSubmit = bootstrap && authPost(request);
    if (authSubmit) diagnostic("AUTH_SUBMIT");
    let googleMainGet = false;
    try {
      const navigation = bootstrap ? providerNavigation(request) : undefined;
      googleMainGet = navigation === "main" && request.method() === "GET";
      if (bootstrap && (mainRequests.has(request) || navigation === "main")) {
        mainRequests.add(request); navigationWatch.routed(request); diagnostic("GOOGLE_NAV_ROUTE");
      }
    }
    catch { diagnostic("OBSERVATION_UNAVAILABLE"); }
    let fetched = false;
    try {
      // Validate this response's Location without following it in the API client.
      // Native later hops can bypass route interception; event observation is not
      // a network firewall and cannot prove a disallowed hop was never sent.
      const response = await route.fetch({ maxRedirects: 0, timeout: 15_000 });
      fetched = true;
      const location = response.headers().location;
      let google302Target: string | undefined;
      let googleHopTarget: string | undefined;
      if (googleMainGet) diagnostic([301, 302, 303, 307, 308].includes(response.status())
        ? "GOOGLE_UPSTREAM_REDIRECT" : "GOOGLE_UPSTREAM_OTHER");
      if (authSubmit && (!location || ![301, 302, 303, 307, 308].includes(response.status()))) {
        violation(); diagnostic("AUTH_RESPONSE_INVALID"); await route.abort("blockedbyclient"); return;
      }
      // 304 is conditional-cache validation, not a navigation redirect.
      // Preserve it for the browser; actual 3xx redirects remain fail-closed.
      if (location || (response.status() >= 300 && response.status() < 400 && response.status() !== 304)) {
        const nextMethod = redirectMethod(response.status(), request.method());
        if (!bootstrap || !location || !nextMethod || !bootstrapRequestAllowed(nextMethod, new URL(location, request.url()).href)) {
          diagnostic(nextMethod ? "REDIRECT_REFUSED" : "REDIRECT_STATUS_UNSUPPORTED");
          let refusal: C2NetworkCode = "NET_REDIRECT_REFUSED";
          if (!bootstrap && location) {
            const destination = new URL(location, request.url());
            refusal = destination.origin !== C2_ORIGIN ? "NET_REDIRECT_EXTERNAL"
              : destination.pathname.startsWith("/api/auth/") ? "NET_REDIRECT_TO_AUTH"
              : destination.pathname === "/onboarding" ? "NET_REDIRECT_TO_ONBOARDING" : "NET_REDIRECT_LOCAL";
          }
          violation(refusal); await route.abort("blockedbyclient"); return;
        }
        const destination = new URL(location, request.url());
        if (authSubmit) {
          const external = destination.origin !== C2_ORIGIN;
          if (external) authRedirect = true;
          // Only this exact Auth.js Google authorization 302 is bridged.
          // Other redirects retain the original fail-closed validation path.
          if (external && response.status() === 302 && nextMethod === "GET" &&
              destination.origin === "https://accounts.google.com" &&
              destination.pathname === "/o/oauth2/v2/auth") google302Target = destination.href;
          diagnostic(external ? "AUTH_REDIRECT" : "AUTH_LOCAL_REDIRECT");
        }
        // A Google main-frame GET can have another approved 3xx hop. Turn it
        // into a fresh, routable navigation, never a hidden native redirect.
        // Local destinations are limited to the exact Google OAuth callback.
        if (googleMainGet && nextMethod === "GET" &&
            (destination.origin !== C2_ORIGIN || destination.pathname === "/api/auth/callback/google")) {
          if (googleHopBridges >= MAX_GOOGLE_HOP_BRIDGES) {
            violation(); diagnostic("GOOGLE_HOP_LIMIT_REFUSED"); await route.abort("blockedbyclient"); return;
          }
          googleHopBridges++;
          googleHopTarget = destination.href;
        }
      }
      // Preserve the original response (including repeated Set-Cookie) as the
      // base. Do not construct cookie headers, change the allowlist or log URLs.
      // Browser CSP/cookie behavior still needs separately approved validation.
      if (authSubmit) { fulfillStarted = true; diagnostic("AUTH_FULFILL_STARTED"); }
      const bridgeTarget = google302Target ?? googleHopTarget;
      if (bridgeTarget) {
        await route.fulfill({ response, status: 200, contentType: "text/html; charset=utf-8", body: routedRedirectDocument(bridgeTarget) });
        if (googleHopTarget) diagnostic("GOOGLE_HOP_BRIDGED");
      } else {
        await route.fulfill({ response });
      }
      if (authSubmit) { fulfillCompleted = true; diagnostic("AUTH_FULFILL_COMPLETED"); }
    } catch {
      if (authSubmit && fetched) fulfillFailed = true;
      violation(fetched ? "NET_FULFILL_FAILED" : "NET_FETCH_FAILED"); diagnostic(fetched ? "FULFILL_FAILED" : "FETCH_FAILED"); await route.abort("failed").catch(() => {});
    }
  }));
  await context.routeWebSocket(/.*/, (socket) => track(async () => {
    if (hmrAllowed(socket.url())) {
      if (!bootstrap && stopping) await socket.close();
      else socket.connectToServer();
    } else { violation("NET_WEBSOCKET_REFUSED"); diagnostic("BLOCKED_EXTERNAL_RESOURCE"); await socket.close(); }
  }));
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
            if (parsed.origin !== C2_ORIGIN) { googleCommitted = true; navigationWatch.committed(); diagnostic("GOOGLE_NAVIGATION"); }
            else if (["/", "/research"].includes(parsed.pathname)) diagnostic("LOCAL_RETURN");
          }
        }
      }
      else { try { requireC2Url(url); } catch { violation("NET_FRAME_REFUSED"); } }
    });
  };
  context.on("page", observePage);
  for (const page of context.pages()) observePage(page);
  return Object.assign(() => { if (failed) refuse(bootstrap ? "bootstrap-network" : "network-policy"); }, {
    reportProgress() {
      if (!bootstrap || !authRedirect) return;
      if (fulfillStarted && !fulfillCompleted && !fulfillFailed) diagnostic("AUTH_FULFILL_PENDING");
      if (fulfillCompleted && !googleRequested && !googleCommitted) diagnostic("GOOGLE_NAV_NOT_OBSERVED");
      if (googleRequested && !googleCommitted && navigationWatch.hasPending()) diagnostic("GOOGLE_NAV_UNCOMMITTED");
    },
    beginShutdown() {
      if (!bootstrap) stopping = true;
      if (bootstrap && !navigationWatch.isShuttingDown()) diagnostic("BOOTSTRAP_SHUTDOWN_STARTED");
      navigationWatch.beginShutdown();
    },
    async drain() { while (pending.size) await Promise.all([...pending]); },
    dispose() { navigationWatch.dispose(); },
  });
}

export async function safePageUrl(context: BrowserContext) {
  const pages = context.pages();
  if (pages.length !== 1) refuse("unexpected-page");
  const url = requireC2Url(pages[0].url());
  if (url.origin !== C2_ORIGIN) refuse("origin");
  return url;
}
