# Step 4-D11 — Google main-frame redirect hop containment (offline review)

**Status:** Proposed/offline validation only; **LIVE OAuth NOT APPROVED** (2026-10-16 JST). Base `296243a`; Draft PR #1.

## Observations vs. unverified explanation

Developer-reported Step 4-D10 showed `GOOGLE_NAV_ROUTE` and `GOOGLE_NAV_RESPONSE` after the D9 HTML redirect bridge, but later `GOOGLE_NAV_PENDING_NO_RESPONSE` and `GOOGLE_NAV_ROUTE_NOT_OBSERVED`. The latter can be for **a different redirect request**, since the fixed-code diagnostics are emitted only once per code. There is no raw status/Location evidence proving that the first provider response was 3xx. The white window might be the bridge document; it is not proof Google rendered a UI. OAuth ended without `STATE_SAVED`; after-run eight-row fixture verify passed. C2 Auth User/Account/Session effects were not audited.

Playwright's documented redirect behavior: a 3xx returned through `route.fulfill()` may be followed by the browser **without invoking the matching route callback**. See https://playwright.dev/docs/next/network#redirects. This is a technically plausible mechanism, **not a proven root cause** in D10.

## Narrow conditional fix

In `scripts/c2-playwright-network.ts`, keep the existing D9 Auth.js POST Google 302 bridge unchanged in scope. Additionally, for a provider **main-frame GET navigation** already permitted by `bootstrapRequestAllowed`, inspect the **API-side** `route.fetch({ maxRedirects: 0, timeout: 15_000 })` response:

- Non-3xx responses: keep original `route.fulfill({ response })`; report only fixed code `GOOGLE_UPSTREAM_OTHER`.
- 3xx responses (301, 302, 303, 307, 308): fixed code `GOOGLE_UPSTREAM_REDIRECT`, validate the next URL **and method** with the existing `bootstrapRequestAllowed`, then bridge only to an existing permitted external Google-family destination or exact local `/api/auth/callback/google`. Convert the one redirected main document to HTTP 200 with the same small, attribute-escaped, no-script `meta refresh` as D9; fixed code `GOOGLE_HOP_BRIDGED`. This induces a fresh navigation that may re-enter `context.route`.
- After at most **8** such Google GET hops per fresh context, refuse with `GOOGLE_HOP_LIMIT_REFUSED`. Never silently fall back to an unguarded native 3xx.
- Existing destination refusal behavior remains: no new domains, ports, methods, endpoints, redirects into arbitrary local read paths, `route.continue()`, proxy, TLS exception, profile import, or retries. POST redirects and subframe requests retain their original method/response behavior.

`route.fulfill({ response, status: 200, ... })` is intended to preserve upstream cookie headers without manually flattening `Set-Cookie`. It is not a guarantee that browser cookies or CSP behave as desired; runtime proof requires separate authorization. OAuth URLs (including query/token/state) remain in the ephemeral browser response only, never printed or persisted as logs. Fixed codes are deliberately non-identifying.

## Validation and gate

Run only the existing `scripts/c2-playwright.test.ts` Vitest file (two focused cases added), TypeScript `tsc --noEmit`, targeted ESLint and `git diff --check`. These checks do not establish actual Google redirect status or prove authenticated E2E works. If results pass, commit the four network/diagnostic/test/doc files only. Do not stage independent `docs/planning/c2-edge-normal-oauth-revalidation-plan.md`.

**No browser/OAuth, C2 DB modification, native Chromium HTTPS probe, host firewall change or authenticated E2E is authorized by this patch.** The D10 one-run permission was consumed. Another real OAuth attempt would need separately granted consent, C2-only identity, supervised stop, and read-only `verify` before/after confirming the 8 protected fixtures. Playwright routing remains a browser-layer guard, **not** an independently proven host/OS outbound firewall.

The useful runtime outcomes would be fixed codes `GOOGLE_UPSTREAM_REDIRECT` + `GOOGLE_HOP_BRIDGED` + further `GOOGLE_NAV_ROUTE`, versus `GOOGLE_UPSTREAM_OTHER` and a continued stall. Success still requires validated local return and `STATE_SAVED`; none is guaranteed here. Keep Draft PR #1.
