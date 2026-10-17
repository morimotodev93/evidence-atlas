# Step 4-D — isolated normal-mode browser OAuth revalidation plan

> Status: **DESIGN / OFFLINE REVIEW ONLY — NO LIVE RUN AUTHORIZED**
> Date: **2026-10-15 JST**
> Baseline: `1fe1228` on `fix/c2-probe-rejection-diagnostics` (Draft PR #1)
> Default candidate: **Microsoft Edge Stable, normal window, dedicated clean local profile**
> Alternate: Google Chrome Stable under the **same** account/profile isolation requirements

## 1. Decision and scope

The developer wants to determine whether manual Google OAuth works in a normal
browser window without mixing their everyday Google account, cookies, or browser
profile with the C2 test identity. Prefer an ordinary Edge window in a **new,
unsynced, dedicated C2 profile**. Edge is a convenient first choice because
Chrome may already be used for personal Google sessions; it is **not** assumed
to have better networking or to fix OAuth.

**Three distinct identities must remain separate:**

1. **Browser application:** Edge rather than the installed Playwright Chromium.
2. **Browser profile:** a fresh C2-only **normal** profile, distinct from any
   everyday Edge/Chrome profile. Do not use an existing or default profile.
3. **Google identity:** the already approved **C2 Google OAuth test user**, not
   the developer's ordinary Google account. A clean profile does not by itself
   prevent someone from signing in with the wrong Google account.

Do not create an additional Google account, OAuth client, or database user as a
shortcut. If the existing test account cannot be positively identified without
exposing its credentials, mark this step **NO-GO** pending a private identity
review. Never record credentials or the email address in the plan or outputs.

The Step 2-C record says real Google OAuth succeeded on **2026-10-12** in a
private browser, returned an authenticated `/api/auth/session`, and matched the
C2 database identity. Thus "private mode always breaks OAuth" is inconsistent
with the historical evidence. Later Step 4-B Playwright-managed Chromium
reached a Google main-frame request but did not observe a provider response or
navigation commit. The specific cause remains unknown. A manual Edge success
would show a **different execution path** works, not identify private mode as
the cause of the Playwright failure.

## 2. Protected baseline and limits

- Keep Draft PR #1 open and unmerged. Preserve the protected **eight C2 fixture
  rows**; no seed/reset/migration, edits, cleanup, or fixture writes.
- C2 application origin remains `http://localhost:3001`; the provider callback
  remains `/api/auth/callback/google`. Do not substitute `127.0.0.1`, another
  port, regular development/production, or the public Demo.
- The previous C2 Google OAuth client/test-user configuration and expected
  **fixture-linked user identity** are the only candidates. Do not duplicate
  or relink accounts without an independently reviewed change.
- Existing app-side Chat / AI / embedding / Redis / indexing / Inngest / Sentry
  restrictions stay in force. No external AI invocation.
- Existing OAuth bootstrap, native Chromium HTTPS probe, and read-only E2E
  harness remain **stopped**. No change to their scripts, redirect/one-GET
  containment, browser flags, TLS trust, proxy, network allowlists, saved state
  or redacted reporter is authorized by this document.
- A normal manual Edge profile does **not** inherit Playwright's network
  boundary. Normal browser sign-in may request multiple Google/Edge domains,
  issue redirects and set cookies. Browser/profile separation is **privacy
  isolation, not network egress enforcement**. The previous strict standalone
  exact-URL / at-most-one-on-wire-GET probe contract cannot be asserted for a
  normal interactive OAuth login.
- Real OAuth is **not read-only**: Auth.js may create/renew Session records and
  update related authentication data in C2 PostgreSQL. This needs separate
  scoped approval and pre/post identity and fixture integrity review.
- No existing Google account tokens, browser sessions, cookies, personal profile
  folders, or Playwright state files may be copied/imported between profiles.
- No trace, screenshot, video, HAR, raw DevTools logs, packet capture, browser
  profile export, OAuth URL/query/state or token output. Only fixed stage labels,
  dates and safe yes/no outcomes should be shared.

## 3. Investigation stages and approval gates

### D0 — this document; offline only (NOW)

Write and review the decision, controls, test sequence and STOP conditions.
Review recorded baseline only. No browser, app, database, Google, network,
Docker or OS-security-setting action. Outcome is a plan, not a success claim.

### D1 — offline readiness and account-isolation review (NEXT)

- Privately confirm that the existing C2 test Google identity is distinct from
  personal Google identities, still allowed by the OAuth client, and maps to
  the **same expected C2 fixture user**. Do not disclose identifiers in logs.
- Review the current C2-only OAuth client, callback, C2 database target and
  test-user rules without connecting to services or printing secrets. Retain
  the Step 2-C verified values unless a separate change is approved.
- Confirm the intended new **Edge normal profile** has never synced or signed
  in to a Microsoft or Google account; browser sync, autofill and extensions
  must not import existing personal data. Use Edge's **Start without your data**
  option when profile creation is separately permitted; do not use Guest or
  InPrivate as the normal-profile comparison.
- Ensure the selected browser profile is not shared with Playwright or the
  usual developer browser. Browser processes must not reuse/lock a personal
  profile directory; avoid reusing an existing profile path.
- Agree before any live run how to handle permitted auth-session mutations,
  extra provider/Edge background network traffic, expected time bounds,
  pre/post checks, profile cleanup and independent rollback.
- If strict external egress isolation remains non-negotiable, or cannot be
  demonstrated for the proposed manual browser, record **NO-GO** and stop.
  Do not replace a strict guarantee with "I used a fresh profile."

### D2 — separately approved, single MANUAL Edge attempt (NOT AUTHORIZED NOW)

Only after a new explicit approval specifying the exact test account, C2 target,
allowed OAuth/DB effects, network-assurance level, time limit and abort rules:

1. Use a **fresh dedicated local Edge profile** in normal mode, not the everyday
   default profile; avoid Microsoft-account sync and personal Google account
   selection. No extension or cookie/profile import.
2. Revalidate C2 app/process and database isolation before opening the local
   application. Starting `pnpm dev:c2` itself requires separate approval.
3. Open only the previously reviewed local C2 origin and the normal Google
   sign-in flow. Do not experiment with additional URLs, alternate accounts,
   insecure TLS flags, login shortcuts or repeated OAuth clicks.
4. If a chooser appears, select **only the approved C2 test Google identity**;
   otherwise stop. Do not copy authentication cookies or URL parameters.
5. Record only fixed observations: local sign-in page shown; Google page
   visible or stalled; returned to approved local origin; authenticated C2
   session matches expected identity; whether browser/profile cleanup succeeded.
6. Stop after the **one approved attempt** or the agreed observation deadline.
   Close only the dedicated test window/profile. Preserve unrelated browser
   processes and personal profiles. Do not delete/recreate Auth rows or the
   protected fixture.

Manual completion does **not** automatically create the Playwright-compatible
`playwright/.auth/c2-user.json` file. It should not be generated by copying
Edge/Google profile data. The C2 harness intentionally checks application-only
Auth.js session state with strict format, user identity and short expiration.

### D3 — compare outcomes; no automatic escalation

| Observation | What it supports | What it does NOT establish |
| --- | --- | --- |
| Manual dedicated Edge succeeds | C2 Google OAuth can work with this local Edge execution path | InPrivate was the cause; Playwright works; saved state exists |
| Google page stalls in manual Edge too | A shared environment/network/identity/config factor remains plausible | The specific DNS, TLS, cookie or browser cause |
| Manual Edge works but new Playwright-managed Edge fails later | Browser automation/interception/context differences merit investigation | Permission to weaken fail-closed controls or redirect checks |
| Personal account shown, sync/import detected, C2 identity mismatched, unexpected DB/egress behavior | **STOP / NO-GO** | Permission to switch accounts, retry or inspect secrets |

Before any Playwright Edge comparison, perform a **separate code/safety review**.
The current C2 configs explicitly use `chromium` and their global setup rejects
changes to project selection, launch options and storage-state settings. The
current bootstrap launches ephemeral Playwright Chromium, not ordinary Edge.
Do not patch `channel: "msedge"` into the current harness or attach the manual
Edge profile to it without that review. Playwright supports the Edge channel,
but a fresh browser context does not inherit an interactive Edge profile.

### D4 — later authenticated C2 E2E (BLOCKED)

Only after a supported, independently checked application-only saved session,
preflight, network guards and new browser-run approval: consider the four
read-only smoke cases and then the six Chat-only cases (E–J). Playwright
`--list` detection is not live E2E execution. Keep test suites isolated.

## 4. Stop checklist for the eventual live authorization

The manual Edge run is **NO-GO** if any of the following is true:

- The C2 Google test identity cannot be distinguished from an everyday account,
  or the browser offers only a personal identity.
- The selected browser profile is synced, imports personal cookies/passwords,
  uses the default profile, or is connected to another running browser process.
- C2 app/database identity, OAuth callback or expected user is not verified.
- The proposed OAuth/session database writes, third-party/background network
  behavior or cleanup are not expressly approved.
- Redirect to an unreviewed host, repeated attempts, credentials in logs,
  recording, TLS/proxy bypass or a security-guard change would be required.
- The eight-row fixture cannot be protected or a pre-existing private session
  would be overwritten/deleted.
- Normal Edge/Chrome network behavior fails the agreed egress assurance. Under
  the unchanged strict outbound-request contract, **do not run**.

## 5. Result record template (redacted, after authorized run only)

| Field | Permitted value |
| --- | --- |
| Approval reference | Internal short label; no personal identifiers |
| Browser | Edge Stable normal / Chrome Stable normal |
| Profile | Fresh C2-only unsynced: yes/no |
| Account | Approved C2 test identity only: yes/no (never email) |
| C2 origin / expected callback | Match fixed approved value: yes/no |
| C2 service/DB isolation | Pre-check passed: yes/no/not run |
| Google login UI observed | yes/no/not observed |
| C2 return observed | yes/no/not observed |
| App session matches fixture user | yes/no/not checked |
| Eight-row fixture unchanged | verified / not checked / discrepancy |
| C2 auth side effect reviewed | within approval / outside approval / unknown |
| Recording / private output | none / violation |
| Teardown | verified / incomplete / not performed |
| Conclusion | MANUAL-PATH-PASS / MANUAL-PATH-FAIL / NO-GO / INCONCLUSIVE |

Do **not** fill in outcome rows using historical Step 2-C results or offline
Vitest checks. In particular, Edge manual success is not proof that OAuth
bootstrap, Chromium network interception or C2 E2E has been fixed.

## 6. Offline references

- `docs/planning/c2-local-runtime.md`: Step 2-C, Step 4-B1 through 4-B8,
  Step 4-C1 through 4-C5; protected C2 runtime and auth state rules.
- `docs/planning/c2-https-egress-isolation-review.md`: strict one-GET
  constraint and the design-only / NO-GO boundary for the standalone probe.
- `scripts/c2-playwright-bootstrap.ts` and `scripts/c2-playwright-policy.ts`:
  current ephemeral Chromium bootstrap, strict session state and user checks.
- Microsoft Edge profile separation / **Start without your data**:
  https://support.microsoft.com/en-us/edge/sign-in-and-create-multiple-profiles-in-microsoft-edge
- Playwright branded browser channels: https://playwright.dev/docs/browsers
- Playwright separate user data directories / default-profile warning:
  https://playwright.dev/docs/api/class-browsertype

**Current decision: planning only. Keep OAuth, browser, app, DB and E2E stopped
until a separately scoped and approved live test can meet its safety criteria.**
