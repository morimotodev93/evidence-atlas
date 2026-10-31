# Step 4-D9 — proposal: re-route the Auth.js Google 302 without bypassing guards

> **Historical status note (2026-10-17 JST):** This document preserves the
> investigation-stage status and stop conditions stated below. References to
> PR #1 as Draft/unmerged or authenticated C2 E2E as pending are historical:
> [PR #1](https://github.com/morimotodev93/evidence-atlas/pull/1) merged
> into `main` at `969af82`. Bounded C2 Smoke 4/4 and Chat mock-only 6/6 were
> developer-reported passes, not Google OAuth or real Chat/AI E2E verification.
> This update grants no authorization for new live operations. See the
> [current roadmap](../planning/roadmap.md#phase-10--testing--quality).

> Status: **PROPOSED CODE / OFFLINE CHECK ONLY / LIVE NO-GO** (2026-10-16 JST)
> Baseline: `96f06b6`, Draft PR #1.
> The user requested a **minimal redirect-processing fix proposal**, not a live OAuth execution.

## Evidence and scope

Step 4-D8 (developer-reported) showed `AUTH_FULFILL_COMPLETED` and
`GOOGLE_NAV_REQUEST`, then `GOOGLE_NAV_PENDING_NO_RESPONSE` and
`GOOGLE_NAV_ROUTE_NOT_OBSERVED`; no Google response or frame commit was
recorded before a shutdown. No `BLOCKED_NAV_*` / `NETWORK_REFUSED` appeared
in that run. The C2 fixture read-only after-check passed for eight rows.
The complete set of C2 Auth-row effects was not inspected.

Playwright explicitly documents that a `3xx` returned through
`route.fulfill()` does **not** offer a new route callback for the subsequent
native redirect. See https://playwright.dev/docs/network (Redirects section).
This explains the missing user Route event, but **does not prove** the
cause of the Google response stall. Other possible causes include browser
policy, network behavior, TLS and timing.

## Smallest scoped experimental change

**Edit only `scripts/c2-playwright-network.ts`.** Existing Auth.js,
session storage, external origin allowlist and application endpoints
remain unchanged. A focused assertion update is in the existing
`scripts/c2-playwright.test.ts`; no new test suite.

When (and only when) all conditions hold:
1. Browser initiated the existing C2 POST `/api/auth/signin/google`.
2. Its API-side `route.fetch({maxRedirects: 0, timeout: 15_000})` received
   the expected **302** and a destination already approved by
   `bootstrapRequestAllowed`.
3. That destination is exactly the HTTPS origin
   `https://accounts.google.com` with path `/o/oauth2/v2/auth`,
   and redirect semantics turn the POST into a GET.

Then instead of fulfilling that **one** response as native 302,
fulfill it as an **HTML 200** using the original `response` as base,
with a sanitized `<meta http-equiv="refresh">` pointing to the previously
validated Google URL. This should initiate a **new browser navigation**
that can again enter `context.route("**/*", ...)` rather than an opaque
redirect-chain hop. The new document has no scripts or external assets
and uses `referrer=no-referrer`. All URL contents (including OAuth
state) remain in the private browser response; no URL/headers/body are
printed, persisted or shared. The target is HTML-attribute escaped.

Because `route.fulfill({response,...})` is still used, upstream
`Set-Cookie` values are intended to remain intact; unlike flattening
`response.headers()`, the patch does not manually combine cookie headers.
**This is an implementation expectation, not a browser-proven result.**
The original `Location` header may remain attached to an HTTP 200;
the browser should use the HTML meta-refresh, not HTTP redirect status.
If CSP or browser policy blocks the meta-refresh, fail rather than bypass.

Non-matching 3xx responses, non-Auth routes and existing refusal
conditions retain their previous behavior. No new origin, method, port,
redirect recursion, profile, proxy, custom CA, TLS exception,
`route.continue` fallback, secret logging or screenshot is added.

## Required checks and decision gate

- Run existing focused offline Vitest (`scripts/c2-playwright.test.ts`),
  TypeScript, targeted ESLint, and `git diff --check` in the Windows
  checkout. This verifies mocks/source wiring, **not browser behavior**.
- The targeted assertion covers exactly one response override, preservation
  of `response` (the cookie-bearing upstream response object), an
  escaped OAuth query, and unchanged behavior for other 3xx statuses.
- Review whether the actual Auth.js 302 includes CSP restrictions that
  could disallow meta refresh. Confirm via safe local/source analysis
  before considering live execution; do not log sensitive headers.
- **Do not run OAuth, the native HTTPS probe, authenticated E2E,
  app startup or database operations under this patch.** The last
  one-attempt approval for D8 was used. A later live browser run
  requires a fresh explicit approval of outbound risk, possible C2
  Auth-only writes, read-only pre/post fixture `verify`, and supervised
  stop/cleanup.
- Live success requires `GOOGLE_NAV_ROUTE` then provider response/commit,
  validated C2 return/session and `STATE_SAVED`; these are not guaranteed
  by the source patch. A 20-second pending timer is not a hard deadline.
  Stop if blocked or stuck; do not retry automatically.
- Keep the eight protected fixture rows unchanged and PR #1 Draft.

**Decision: propose this one-variable client-side redirect bridge for
offline evaluation; live OAuth and E2E remain NO-GO without new approval.**
