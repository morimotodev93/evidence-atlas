# Step 4-D2 — Manual Edge vs Playwright Chromium: offline OAuth comparison

> **Historical status note (2026-10-17 JST):** This document preserves the
> investigation-stage status and stop conditions stated below. References to
> PR #1 as Draft/unmerged or authenticated C2 E2E as pending are historical:
> [PR #1](https://github.com/morimotodev93/evidence-atlas/pull/1) merged
> into `main` at `969af82`. Bounded C2 Smoke 4/4 and Chat mock-only 6/6 were
> developer-reported passes, not Google OAuth or real Chat/AI E2E verification.
> This update grants no authorization for new live operations. See the
> [current roadmap](roadmap.md#phase-10--testing--quality).

> Status: SOURCE REVIEW ONLY / NO NEW LIVE RUN (2026-10-15 JST)  
> Baseline: `46ea97f` on `fix/c2-probe-rejection-diagnostics`, PR #1 Draft.  
> Purpose: explain the different **observed outcomes**, not assert a confirmed root cause.  
> This document contains no credentials, session cookies, browser profiles, or browser traces.

## 1. Evidence classification

**Manual Edge (Step 4-D1, developer report plus UI screenshot):**
- The developer opened `http://localhost:3001/api/auth/signin` in Microsoft Edge using an
  **existing normal profile**, selected the previously used C2-only Google test account
  on Google's account chooser, and reached `http://localhost:3001/`.
- The screenshot supports a signed-in Workspace view with
  `[C2 E2E fixture v1] Workspace` and visible counts: Research 1, Sources 1,
  Findings 1, Tags 0. It is **not** direct DB row-count or session-identity evidence.
- Google request/response timing, any previously existing Edge cookies, and whether
  the C2 Account/Session rows were inserted or updated were **not** examined.

**Earlier manual private-browser check (Step 2-C, developer report):**
- A separate manually completed Google OAuth login had already succeeded in a
  private browser, with an authenticated C2 session and database user identity
  checked at that time. Therefore private/incognito mode **by itself** is
  not established as the cause of the later Playwright failures.

**Playwright Chromium bootstrap (Steps 4-B1 to 4-B3, developer reports):**
- The third/fourth attempts reached an Auth.js POST and browser-observed redirect,
  followed by `GOOGLE_NAV_REQUEST`. Neither a Google response nor a committed
  Google main-frame navigation was observed before the observation deadline.
- The cancellation reported after the user stopped the run is a **shutdown event**,
  not evidence of an earlier network failure. No usable
  `playwright/.auth/c2-user.json` was produced.

**Native Chromium HTTPS probe (Steps 4-B4 to 4-B8, developer reports and static analysis):**
- The probe observed a second Fetch pause with a different Fetch ID but the same
  Network ID. This does **not** prove a second on-wire GET, failed TLS, or an
  OAuth root cause. The original exact-URL, at-most-one-GET assurance remains
  unmet for proposed alternate proxy/VM experiments.
- The separate Step 4-B7 design review concluded **NO-GO** for another live
  probe under the unchanged strict contract.

## 2. Comparison matrix

| Dimension | Manual Edge: success | Playwright Chromium: unresolved |
| --- | --- | --- |
| Browser | Installed Microsoft Edge | Playwright-bundled Chromium via `chromium.launch({ headless: false })` |
| Browser state | Existing ordinary Edge profile; prior cookies/settings not audited | New ephemeral `browser.newContext`; no imported user profile |
| Entry point | Direct navigation to `/api/auth/signin` | `page.goto("http://localhost:3001")`, then Auth.js sign-in form |
| Google identity | Existing C2-specific test account selected at chooser | Same expected C2 fixture identity configured for harness; Google login not completed |
| App communication | Normal Edge browser route (not intercepted by this harness) | Context-wide `route("**/*")` and WebSocket gate |
| Allowed requests | Normal browser/OS network behavior; unmeasured | `bootstrapRequestAllowed` for C2 paths and select Google-owned domains/methods |
| Redirect forwarding | No Playwright `route.fetch` / `route.fulfill` layer | `route.fetch({ maxRedirects: 0, timeout: 15_000 })`, redirect allowlist check, then `route.fulfill({ response })` |
| Provider navigation | Google chooser appeared; C2 Workspace reached | Provider main-frame request seen; response and commit not observed |
| Authentication output | Edge displayed signed-in Workspace | App-only storage-state save requires session checks; file absent in prior failures |
| DB evidence | UI counts only in this observation | No new authenticated E2E/fixture DB verification |

**Do not collapse several differences into a claim that Edge, normal profile,
or incognito mode was the decisive factor.** The current comparison is
observational, not a controlled one-variable experiment.

## 3. Implementation findings and limits

1. `scripts/c2-playwright-bootstrap.ts` starts a fresh headed Chromium browser,
   uses an ephemeral context with service workers blocked, installs the network
   boundary **before** navigation, loads the C2 root, and waits for manual sign-in.
   It does not use Edge's existing cookies or Google login profile.
2. `scripts/c2-playwright-network.ts` intercepts matching browser requests.
   It uses a separate API-side `route.fetch` with redirects disabled, checks
   `Location`, then fulfills the browser's route with the original response.
   This is a material difference from direct manual Edge navigation.
3. After a redirect, Playwright's Chromium request-handling path can
   auto-continue a navigation without producing another user `Route` event.
   `GOOGLE_NAV_REQUEST` without `GOOGLE_NAV_ROUTE` therefore **does not
   establish** that the user route rejected the Google navigation.
4. `scripts/c2-playwright-navigation-watch.ts` uses a 20-second observation
   window. A missing response/commit within that window is a bounded
   observation, not a diagnosis of DNS, TLS, Google, browser policy, or proxy.
5. `scripts/c2-playwright-policy.ts` restricts Google-family destinations.
   Actual Google sign-in may involve additional endpoints, cookies, or redirects,
   but no blocked request has been independently identified as the specific
   failure. The policy is not a complete host-level egress firewall.
6. `scripts/c2-playwright-state.ts` stores **only** a validated
   `authjs.session-token` for `localhost`, only after return/session checks,
   with strict local-file conditions. No existing Edge profile can be copied
   into it; a displayed Workspace is not equivalent to saved C2 E2E state.
7. `playwright.c2.config.ts` and `e2e-c2/global-setup.ts` deliberately enforce
   one Chromium project, selected tests, disabled recordings, and a saved-state
   preflight. Simply selecting an Edge `channel`, copying cookies or relaxing
   guards is **not** an authorized fix.

## 4. Hypotheses: investigation priority, not probability estimates

| Priority | Candidate distinction | Evidence supporting investigation | Critical missing proof |
| --- | --- | --- | --- |
| P1 | Browser interception / redirect fulfillment | Custom `route.fetch` and `route.fulfill` differ from manual Edge | No isolation showing the same failing browser succeeds without the interception layer |
| P2 | Browser build, network stack or policy/environment | Edge succeeds; Playwright bundled Chromium does not | No controlled, safe browser-to-browser comparison under matching conditions |
| P3 | Fresh vs existing profile/cookies | Edge uses an ordinary profile; Playwright is ephemeral | Edge's prior Google/C2 cookies and policy state not checked; chooser alone does not prove a clean session |
| P4 | Initial URL / navigation sequence | Manual `/api/auth/signin` vs bootstrap `/` | No controlled comparison proving this difference matters |
| Lower | Globally invalid C2 Google OAuth configuration | Manual Edge and earlier private-browser OAuth worked | Exact implementation conditions may still differ; not evidence for every browser context |

Separate the **provider navigation stall** from the distinct **HTTPS probe's
duplicate CDP pause**. The latter has plausible Chromium implementation
explanations, but no demonstrated causal connection to the former.

## 5. Recommended next step: D3 paper-only decision gate

Before a further live run, prepare **one** explicitly bounded experiment
proposal with a single diagnostic question and one changed variable. The
proposal must specify: exact browser/profile isolation, allowed local and
Google destinations, Auth.js write effects, expected diagnostic codes,
time limit, cleanup, abort conditions, sensitive-output prohibition, and how
the protected eight-row fixture remains untouched. Treat **manual OAuth**
(which can write C2 Auth tables) and the **strict one-GET HTTPS probe**
(which has a separate NO-GO) as different approval scopes.

Recommendations:
- Prioritize reasoning about route interception/redirect behavior offline,
  rather than rerunning the same frozen Chromium probe.
- Do not reuse the ordinary Edge profile with Playwright or import its
  cookies, account data, or session files.
- Do not make a browser-channel switch, `route.continue` fallback, automatic
  redirect, retry, TLS override, proxy change, log capture or network
  expansion merely to obtain a passing run.
- If an alternative isolated browser or network experiment is proposed, its
  security controls require **separate review and affirmative approval**
  before browser launch or any OAuth/DB operations.
- Keep PR #1 Draft and the original authenticated smoke 4 + Chat E–J 6
  tests unexecuted until a valid C2 auth-state path is established.

**Decision:** D2 source comparison completed with unresolved root cause.
This document authorizes **no** new live Edge/Chrome/Chromium/Playwright
execution, OAuth, HTTPS probe, app startup, session export, database
inspection or mutation. C2 eight-row fixture and security boundaries remain
protected.
