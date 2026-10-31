# Step 4-D5 — Playwright Edge OAuth: one-run safety and authorization review

> **Historical status note (2026-10-17 JST):** This document preserves the
> investigation-stage status and stop conditions stated below. References to
> PR #1 as Draft/unmerged or authenticated C2 E2E as pending are historical:
> [PR #1](https://github.com/morimotodev93/evidence-atlas/pull/1) merged
> into `main` at `969af82`. Bounded C2 Smoke 4/4 and Chat mock-only 6/6 were
> developer-reported passes, not Google OAuth or real Chat/AI E2E verification.
> This update grants no authorization for new live operations. See the
> [current roadmap](../planning/roadmap.md#phase-10--testing--quality).

> Status: **REVIEW COMPLETE / LIVE RUN NOT YET AUTHORIZED** — 2026-10-15 JST  
> Baseline: `4339c77` (`test(c2): add opt-in Playwright Edge OAuth bootstrap`)
> on `fix/c2-probe-rejection-diagnostics`, Draft PR #1.  
> Scope: the proposed **one interactive OAuth bootstrap under Playwright Edge**
> against the isolated C2 environment. No browser, Google request, C2 app,
> database command or saved-state access was performed for this review.

## 1. Objective and evidence

**Goal:** Have Playwright start a fresh Edge browser, complete a Google OAuth
sign-in **using only the pre-existing C2 test account**, return to the C2
Workspace, verify the selected C2 identity, and securely save only the
C2 application session cookie. Successful UI navigation by itself is
insufficient; success requires `STATE_SAVED` after session and network checks.

Evidence at the review baseline:
- Step 4-D1: manual Edge using an **existing ordinary profile** reached the
  Workspace after the Google account chooser. Neither its personal profile
  nor its cookies are eligible for automation.
- Earlier private-browser OAuth had succeeded; incognito mode is not a
  demonstrated explanation for the automated failure.
- Prior Playwright bundled Chromium Bootstrap reached a browser-observed
  Auth.js redirect and `GOOGLE_NAV_REQUEST` but no Google navigation
  response/commit before the 20-second observation point.
- Step 4-D4 adds `bootstrap-edge` with a separate exact opt-in. Developer-run
  **offline** checks passed 172/172 focused Vitest cases plus TypeScript,
  targeted ESLint, and `git diff --check`. There is no live Playwright
  Edge OAuth success evidence yet.

Do **not** equate the manual ordinary Edge profile with the fresh
Playwright Edge context. The proposed one-variable change is the
**browser executable/channel** only, compared with the historical
Playwright Chromium Bootstrap.

## 2. Source-reviewed safeguards already implemented

| Control | Reviewed implementation | Limitation |
| --- | --- | --- |
| Exact opt-in | `scripts/c2-playwright-policy.ts` accepts only `bootstrap-edge --allow-c2-edge-auth-bootstrap` and rejects extra arguments | It is not itself authorization to run |
| Fixed browser | `chromium.launch({ headless: false, channel: "msedge" })` through a pure selector | Edge installation/first-run behavior not live-verified |
| Profile | `browser.newContext({ serviceWorkers: "block" })`; no persistent or external user-data directory | Does not reproduce existing normal-profile state |
| Preflight | Anonymous C2 session, disabled Inngest, expected Auth provider before browser launch | Does not independently confirm the DB container identity |
| Network | Context route with exact local/Google-family allowlist; disallowed requests abort and mark failure; WebSocket gate | **Not an OS/VM egress firewall**; redirected native hops may evade user Route interception |
| Redirects | Route-side fetch uses `maxRedirects: 0`, checks Location/method and fulfills original response | Browser-native subsequent redirect traffic may continue without a new user Route |
| Session identity | `preflight` checks expected User ID/email, expiry and Workspace; `captureAppState` checks return path and cookie | Requires live C2 Auth/Session reads, not demonstrated by the Edge screenshot |
| Saved state | `saveC2State` writes `playwright/.auth/c2-user.json` using exclusive creation and validation | Session cookie is sensitive; file must never be printed/committed/imported from personal Edge |
| Failure reporting | Fixed-code `bootstrapDiagnostic` and suppressed raw errors | Fixed-code observation alone cannot prove no unexpected network packet |
| Browser cleanup | Bootstrap closes browser in `finally` | No independently enforced total wall-clock watchdog for all failure modes |

The configured **20-second Google-navigation timer reports a pending
condition**; it does **not** automatically abort the attempt. The
interactive prompt closes after about ten minutes; that is not an
independent, hard process deadline. A future live run needs a clear
operator stop time and verified closure without killing unrelated Edge.

## 3. Scope distinction: OAuth vs standalone HTTPS probe

The strict standalone native Chromium HTTPS probe aimed at **one
exact `/robots.txt` GET on the wire** and is still **NO-GO** under its
original security requirements (Steps 4-B6/B7). Do not rerun it,
copy its URL/one-GET rules into OAuth, or regard this review as
an override.

A legitimate Google OAuth sequence needs multiple HTTPS requests and
redirects. Its allowed scope must be explicitly reviewed as a
**different class of live experiment**. The current Playwright context
boundary is defense-in-depth, not independently enforced outbound
isolation. If the user requires proof that no other egress is possible,
there is **NO-GO** until a separate, verified network boundary exists.
If accepting the residual risk of a **developer-controlled, normally
networked Edge OAuth browser**, that narrower scope must be explicitly
approved in advance. It cannot be represented as full containment.

No TLS/certificate bypass, MITM, new proxy, broader domain allowlist,
`route.continue` fallback, default browser-profile attachment, raw CDP
dump or capture may be added to make a run pass.

## 4. Database boundaries and the protected eight-row fixture

The exact protected graph consists of **eight rows**: Organization,
Membership, Workspace, WorkspaceMembership, Research, Source, Finding,
and FindingSource. It must not be edited, reseeded, cleaned up,
migrated or deleted. The existing C2 app can access the isolated
PostgreSQL DB `evidence_atlas_c2`, role `c2_local`, port `5433`.

**Separate authorization is necessary for expected Auth-side effects.**
A real OAuth sign-in can read or insert/update C2 `User`, Google
`Account`, and `Session` data. A repeated login may create a new
session or update account metadata. Never claim a completely
write-free trial. Authorized Auth-side effects, if any, must be
limited to the preselected C2 identity; unexpected onboarding,
membership, Workspace or research graph changes are a stop condition.

Suggested evidence gate (not executed):
1. **Before run:** privately confirm selected C2 User ID/email and the
   C2 DB target. If separately authorized to query the database,
   run the existing C2 fixture `verify` mode (read-only repeatable-read
   transaction), expecting `present: 8` and `plannedInserts: 0`.
   Record only counts and status, never identifiers.
2. **During run:** use the existing C2 test Google identity only;
   stop on an unexpected account, blocked route, new application
   graph operation, external destination, or authentication challenge
   requiring unrelated credentials.
3. **After run:** with separately authorized read-only DB access,
   repeat the fixture `verify` and compare its result. Do not run
   `insert`, `cleanup`, migration, seed or repair if verification fails.
   Review any Auth-row effects without emitting personal data.

The UI screenshot's Research/Source/Finding counts **do not**
independently establish that all eight fixture rows are unmodified.

## 5. Proposed tightly bounded one-attempt protocol — not a run order

**Prerequisites (all required for a future GO):**
- Fresh checkout on reviewed commit, with no unreviewed runtime or
  Playwright changes; known local-only C2 app at fixed origin and
  isolated DB/Google OAuth configuration; confirm server identity.
- User explicitly approves: one OAuth attempt, its defined Google
  outbound exposure and residual Playwright network limitation,
  possible **C2 Auth-only writes**, plus separately authorized
  before/after read-only fixture verification.
- Use only a **fresh Playwright-controlled Edge context**, never an
  existing normal Edge profile, browser cookie export, or personal
  Google account.
- Allow only exact CLI opt-in and environment already checked by
  `requireHarnessEnvironment`. No arbitrary Playwright flags,
  user-data directory, remote CDP connection, proxy or TLS relaxation.
- Check that no valid existing `playwright/.auth/c2-user.json` would be
  overwritten; if present, **stop and review privately** rather than
  remove it.
- No trace/HAR/screenshots/video/raw request logs, OAuth URLs/state,
  credentials, cookies or session values are collected or shared.

**Execution and stop policy (conditional, no command issued here):**
- At most **one** headed Edge OAuth Bootstrap invocation after a
  new explicit GO. No fallback to bundled Chromium and no automatic
  retry. Do not attempt unrelated account sign-in.
- Treat the 20-second pending diagnostic as a **manual decision point**,
  not proof of network failure or an automated timeout. An operator
  should stop a non-progressing attempt without waiting for ten minutes;
  if exit/cleanup cannot be confirmed, mark failure and investigate
  safely before further action.
- If `GOOGLE_NAVIGATION` and `LOCAL_RETURN` appear, still require
  the selected C2 session/Workspace check and `STATE_SAVED` to
  establish automated OAuth completion. Do not equate
  `AUTH_FULFILL_COMPLETED` or `GOOGLE_NAV_REQUEST` with success.
- A `BLOCKED_*`, `NETWORK_REFUSED`, `FETCH_FAILED`,
  `FULFILL_FAILED`, unrecognized account, unexpected redirect,
  missing expected C2 state, or cleanup problem means **STOP**,
  not a reason to bypass network gates.
- If a run does reach `STATE_SAVED`, do not immediately invoke
  Smoke/Chat E2E: first privately review C2 identity, Auth write
  scope, fixture verification and saved-state protection.

**Permitted report:** fixed diagnostic code sequence, generic
terminal status, whether the private saved state was created, and
the eight-row verification counts. No screenshot of a Google account
chooser, OAuth redirect URL, tokens, personal account identifiers
or cookie contents.

## 6. D5 decision matrix and next actionable handoff

| Review gate | Decision |
| --- | --- |
| Source review and offline-only D5 documentation | **GO / complete** |
| Step 4-D4 Edge selector offline implementation | **GO / developer checks passed** |
| Additional offline tests of timeout/cleanup and negative request handling | **GO / recommended before live attempt** |
| Network-containment guarantee beyond Playwright Route interception | **NOT ESTABLISHED** |
| Accepting a bounded developer-host OAuth trial with that explicit residual risk | **UNDECIDED — user approval needed** |
| Pre/post fixture read-only verification and authorization of C2 Auth-only writes | **NOT APPROVED / not run** |
| Actual one-run Playwright Edge OAuth | **NO-GO until remaining gates are explicitly resolved** |
| Native HTTPS one-GET probe, OAuth retries, C2 Smoke 4 / Chat 6 | **NO-GO / separate scope** |

**Recommended next task (D6):** Decide whether the user is willing
to authorize a *bounded, developer-controlled* OAuth experiment with
explicitly acknowledged network limitations, and separately authorize
read-only C2 fixture verification plus possible C2 Auth-side writes.
If yes, finalize one-run operator instructions and a cleanup/timeout
review before the single live attempt. If a strict verified egress
boundary is required, stop and design that boundary instead.

This review does **not** authorize any browser launch, OAuth request,
database read/write, app startup, account-state export, standalone
HTTPS probe or E2E execution. Preserve Draft PR #1 and the eight
protected fixture rows.
