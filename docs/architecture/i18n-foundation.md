# English/Japanese localization foundation

Status: SaaS fixed UI localization through Phase 4.8c-3 and Phase 3 curated
Public Demo Research presentation localization are implemented. Phase 4.9a
static audit, Phase 4.9b targeted browser verification and Phase 4.9c release
assessment are complete as of 2026-11-05. No release-blocking i18n defect was
confirmed within the audited scope; this is not exhaustive error-path, E2E or
Production verification. Canonical content is unchanged. Broader business
Action error localization, root layout HTML language and broader SaaS language
switching remain outside this scope.

Current SaaS coverage includes shared navigation/Appearance, Home, Organization
and Workspace settings, onboarding, Research list/detail/create/edit, business
dialogs, AI fixed UI/local error notices/history dates and application-owned
Google sign-in/authentication error pages. Global failures use a context-free
bilingual fallback; 404s use the SaaS cookie or established Demo URL language.
User-authored content,
Source metadata, IDs and AI prose retain their original values. Onboarding and
Organization/Workspace role and Research status Actions use structured localized
errors. Research creation/editing exceptions and other Research Action errors
remain English. The phase-by-phase entries below describe each phase's original
scope and verification; their deferred work is historical when a later entry
records its completion.

Phases 4.1a and 4.1b-1 add the SaaS locale-cookie reader and saving Server Action.
Phase 4.1b-2 connects them to the shared SaaS Header, with switching limited to
Home until input-state preservation is verified. SaaS page translation is deferred.
Phase 4.2a localizes shared SaaS navigation only, using that same cookie-derived
locale; page bodies and business forms/dialogs remain English.
Phase 4.2b adds opt-in translation of the shared Dialog's own Close controls;
existing business Dialogs have not been connected to the locale.
Phase 4.3 localizes the authenticated Home Dashboard body. Research/settings page
bodies, business forms/dialogs, onboarding and AI Panel remain untranslated.
Phase 4.4a-1 localizes only the Workspace Selector's existing placeholder on
Home and the Research list; Organization/Workspace settings bodies remain English.
Phase 4.4a-2 adds the Organization settings body and member-role form. Workspace
settings, onboarding and Action error localization remain outside this scope.
Phase 4.4a-3 adds the Workspace settings body and member-role form using the same
locale flow and shared dictionary entries. Onboarding and Research bodies remain untranslated.
Phase 4.4b adds the standalone Onboarding page/form. Research bodies, AI Panel
and Action error-contract adoption remain outside this scope.
Phase 4.5a adds Research list/detail read-only UI through AppShell's locale slots.
Phase 4.5b-1 adds fixed UI on Research creation and its list entry link through
the same locale flow. Phase 4.5b-2 adds fixed Research edit UI and the detail
page's Edit link. Phase 4.5b-3 adds the Research status Dialog through the same
locale flow. Other business dialogs and AI remain deferred.

Phase 4.6a adds Source creation/editing/deletion Dialogs through the same locale
flow. Finding, comment, tag and AI controls remain deferred.

Phase 4.6b adds Finding creation/editing/deletion and supporting Source
association/removal UI. Comment, tag, conclusion editing and AI controls remain
deferred.

Phase 4.6c adds comment creation/editing/deletion, tag addition/detachment and
conclusion editing UI. AI controls and Action error localization remain deferred.

Phase 4.7a adds fixed SaaS AI conversation UI through the existing AppShell locale.
AI errors, history date formatting and the API's preview fallback remain deferred.

Phase 4.7b completes local AI error feedback and history date/time localization.
The ambiguous API preview fallback and broader error/state contracts remain deferred.

## i18n final audit (Phases 4.9a–4.9c)

Completed 2026-11-05. Phase 4.9a read-only static inspection found 319 English
and 319 Japanese dictionary entries with identical key sets, no duplicate or
empty values, and matching interpolation placeholders. All 255 checked direct
literal translation references resolved; selected dynamic paths and error
mappings were inspected separately. No release-blocking i18n defect or required
translation-only patch was confirmed. These are inspection findings, not an
exhaustive proof that every runtime string is localized.

Phase 4.9b browser checks performed by the project owner covered deployed and
local Public Demo English/Japanese routes, Research identity across language
switching, independence from the SaaS locale cookie, mobile wrapping, AI chat,
Evidence and dialog fixed UI. Deployed Demo Turnstile verification and an AI
response succeeded in the owner's browser. An additional automated-browser
review observed Turnstile verification failures and a reportedly persistent
language-switch lock; the cause and lock persistence were not reproduced or
established. Code inspection found possible indefinite pending states without
an application-controlled cancel/deadline, but no confirmed failure-callback
regression. No Turnstile security or recovery behavior was changed.

Authenticated local SaaS checks covered Home language switching and persistence,
Dashboard, Organization/Workspace, Research create/edit/status, Source/Finding,
AI conversation, authentication presentation, localized 404 and translated
feedback for a simulated offline network failure. These are targeted manual
checks, not exhaustive failure-branch, accessibility, Production Build or E2E
verification. The existing Next.js/React client-inserted inline-script warning
was investigated separately; no theme malfunction was confirmed, and the
existing initialization order was retained. The design-system document already
records the upstream compatibility risk.

Phase 4.9c release assessment: i18n passes the targeted v1.0.0 audit without
additional code changes. Accepted limitations remain: English child-dialog
business Action errors, Research create/edit exception handling (Phase 4.8c-4),
the ambiguous `New conversation` API preview fallback, fixed root HTML language
and English default root metadata, and nonuniform English date formatting.
Broader Action-state conversion, root-layout language redesign and Turnstile
recovery hardening are separate future work; no authorization, persistence,
translation dictionary, routing or security contract was changed by this audit.

## Research dialog Action errors (Phase 4.8c-3)

Implemented 2026-11-05 against clean `main` at `69abf40`. Inspection found that
Research creation/editing are server-rendered page forms directly bound to
exception-based `createResearch(formData)` and `updateResearch(id, formData)`
Actions. Status editing uses `EditResearchStatusDialog` with `useActionState`
and `UpdateResearchStatusState`. This phase adopts structured errors only in
that existing state-returning Action/dialog. Creation/editing contracts remain
unchanged and are explicitly deferred below.

| `updateResearchStatus` existing branch | Code | Dictionary key | Exact English copy |
| --- | --- | --- | --- |
| Status schema validation fails | `RESEARCH_INVALID_STATUS` | `errors.researchInvalidStatus` | Invalid research status. |
| Research access guard throws `ResearchAccessError` for missing/inaccessible Research | `RESEARCH_NOT_FOUND` | `errors.researchNotFound` | Research not found. |
| Existing status-update catch | `RESEARCH_STATUS_UPDATE_FAILED` | `errors.researchStatusUpdateFailed` | Failed to update research status. Please try again. |

These three parameter-free codes extend `DisplayError`/`ErrorCode` and reuse
`getErrorMessage()`. Existing generic input/not-found/internal codes do not retain
the original status/Research/update-specific wording, so they are not substituted.
Japanese is `Researchのステータスが無効です。`, `Researchが見つかりません。` and
`Researchのステータスを更新できませんでした。もう一度お試しください。`.
Codes are assigned at the existing structured conditions, never selected from
English messages, Zod wording, exception messages or DB error identifiers.

`UpdateResearchStatusState.error` is now `DisplayError | null`. The dialog passes
its three expected codes to the helper with the existing resolved locale; default/
invalid locale is English. Unexpected/malformed/legacy error data uses English
through the established scoped fallback and an explicit `lang="en"`. Known errors
use the resolved language; missing Japanese entries retain per-key English copy.
The same `role="alert"`, classes, placement, initial null error, selected enum,
pending Save behavior, still-enabled Select, bound Research ID, FormData/dispatch,
Dialog/Select portal locale and uncontrolled lifecycle are preserved. No new
effects, locale-based keys, resets, focus changes, Close/retry controls or language
switching are introduced. No diagnostic fields or arbitrary parameters are rendered.

Execution/security contracts are unchanged: schema validation and String coercion
precede `requireUser()`, then the real Research/Workspace access guards, then one
update using the guard-returned Research ID, followed by the same detail redirect.
Missing and inaccessible Research share the same code without exposing identity
or access reason. Both Workspace MEMBER and ADMIN permissions remain valid.
Unexpected authentication/Research/membership read failures still propagate outside
the catches. Save exceptions return only the code; redirect exceptions still
propagate. An update resolving null retains its original redirect behavior; same-
status submissions still update once. No new revalidation, index enqueue, cookie,
transaction, persistence check, schema or authentication change is added. Source,
Finding, Comment, Tag, Conclusion and Organization/Workspace Actions are untouched.

### Deferred exception-based cases for Phase 4.8c-4

- `createResearch`: first schema issue (or `Invalid research data.` fallback) is
  thrown; auth/current-Workspace and persistence exceptions propagate. Its page
  uses the Action directly, without returned error state.
- `updateResearch`: the same schema exception behavior; expected access denial
  becomes a thrown `Research not found.`, and an absent update result throws the
  same notice. Unexpected auth/access/persistence exceptions propagate.
  Its page binds the Research ID directly, without returned error state.

Both retain the existing best-effort `requestResearchIndex()` helper; its enqueue
failure capture/logging policy is unchanged. Any rejection escaping that helper
remains uncaught at the Action boundary.

Converting those paths would require separately scoping the Action signature,
form submission/error state and redirect/indexing behavior. Neither Actions nor
their pages are changed here; no catch/translation wrapper is added around them.
Their existing exception, normalized-write, authorization and redirect regressions
are included in this phase's checks. Broader child-dialog Action adoption also
remains outside this creation/edit/status scope.

Phase 4.8c-4 read-only investigation completed 2026-11-05. English exceptions
were confirmed in both Actions, but neither form renders them inline; production
exception presentation remains unverified. Converting to `DisplayError` would
change the throw-or-redirect Action contract and require form-state changes,
with authentication, authorization, indexing and redirect risks. Implementation
is explicitly deferred until after v1.0.0; no code or tests were changed.

Validation: focused DB-free Vitest **10 files / 354 tests**, changed-file ESLint,
TypeScript (`--noEmit --incremental false`) and diff whitespace checks passed.
A new status Action suite keeps real User/Research/Workspace guards and mocks
all external I/O. It covers validation before auth, malformed/File status values,
missing/inaccessible indistinguishability, unauthenticated redirect, unexpected
read/auth failures, sanitized save failures, all three enums for MEMBER/ADMIN,
exact call ordering/payload/redirect, guard-returned identity, unchanged null-update
behavior and Public Demo refusal/validation order. Dialog/helper tests cover both
languages, default/invalid locale, every new English meaning, missing-key fallback,
unknown/malformed/prototype-like codes, old strings without matching, unread
diagnostics and unchanged alert/pending/selection/dispatch/portal/lifecycle props.
Existing mixed Action suites update only status-specific expectations; creation/
edit/page and Public Demo regressions also pass. Initial sandbox Vitest startup
hit `spawn EPERM`; the same selection passed with subprocess permission and the
existing command-line artifact exclusion. No package/test configuration changes.

These are mocked-I/O/React-hook checks, without live DB writes, authentication,
Review session, browser, full suite, full E2E or Production Build. Real persistence/
concurrency, Server Action serialization, browser scheduling/portal/focus and
native-language review remain unverified. The existing Select label association
and runtime handling of deferred exceptions are not redesigned. Missing Japanese
entry fallback retains the enclosing resolved language tag.

## Organization and Workspace role Action errors (Phase 4.8c-2)

Implemented 2026-11-05 against clean `main` at `2561d9b`. Inspection found exactly
two membership-management Actions: `updateOrganizationMemberRole` and
`updateWorkspaceMemberRole`, each used by its matching settings member-role form.
Both Action-owned `error` properties now use `DisplayError | null` and render
through the existing `getErrorMessage()` infrastructure. Six new parameter-free
codes preserve all eight returned failure branches and exact English messages;
shared missing-member and update-failure meanings reuse the same codes.

| Action / existing failure branch | Code | Dictionary key | English meaning retained |
| --- | --- | --- | --- |
| Organization role schema fails | `ORGANIZATION_INVALID_ROLE` | `errors.organizationInvalidRole` | Invalid organization role. |
| Workspace role schema fails | `WORKSPACE_INVALID_ROLE` | `errors.workspaceInvalidRole` | Invalid workspace role. |
| Either Action: target membership absent after ADMIN guard | `MEMBER_NOT_FOUND` | `errors.memberNotFound` | Member not found. |
| Organization ADMIN → MEMBER with scoped admin count ≤ 1 | `ORGANIZATION_LAST_ADMIN` | `errors.organizationLastAdmin` | An organization must have at least one admin. |
| Workspace ADMIN → MEMBER with scoped admin count ≤ 1 | `WORKSPACE_LAST_ADMIN` | `errors.workspaceLastAdmin` | A workspace must have at least one admin. |
| Either Action: existing update catch | `MEMBER_ROLE_UPDATE_FAILED` | `errors.memberRoleUpdateFailed` | Failed to update member role. Please try again. |

Japanese preserves the Organization/Workspace product terms and uses ロール,
メンバー and 管理者: invalid role notices distinguish the scope, missing-member
feedback is `メンバーが見つかりません。`, last-ADMIN feedback says that the scope
requires at least one administrator, and save failure asks the user to try again.
Only these actual structured branches choose codes. No message matching, schema
issue parsing, arbitrary parameters or exception details enter returned state.

The security/execution order is unchanged: role validation → `requireUser()` →
the scope-specific ADMIN guard → target membership lookup → no-op comparison →
scoped last-ADMIN count when needed → exact scoped update → settings-path
revalidation. Invalid-role feedback remains before authentication and contains no
membership information. Unauthorized callers still throw/redirect before target
lookup, including when a target exists elsewhere or the actor is ADMIN only in
another scope/tenant. Target absence is disclosed only after the existing ADMIN
guard. Authentication, actor/target/count read failures and revalidation failures
still propagate outside the update catch; they are not converted to membership
notices. No guard, query predicate, mutation payload, transaction, redirect,
cookie, revalidation path or last-ADMIN comparison is changed. Authorized no-ops
still return `{ error: null }` without update/count/revalidation; successful updates
return the same null error and revalidate only their existing settings path.

Forms resolve their existing optional locale prop with `resolveLocale` and use
the same scoped display approach as Onboarding: their four expected codes follow
that locale, while unexpected/malformed/legacy error data uses English through
the helper and `lang="en"`. Raw legacy English messages are not echoed or matched.
Missing Japanese keys retain per-entry English fallback. Existing bound IDs,
`useState`/`useActionState`, initial null error, selected role, internal
`ADMIN`/`MEMBER` values, option labels, pending/unchanged Save disablement, Select
change handlers/portal placement, CSS and plain error-paragraph semantics remain
unchanged. No effects, remounts, state resets, input clearing, live region, focus
change or broader language switching is introduced. Onboarding, Research Actions,
authentication configuration, schemas and provisioning remain unchanged.

Validation: focused DB-free Vitest **9 files / 422 tests**, changed-file ESLint,
TypeScript (`--noEmit --incremental false`) and diff whitespace checks passed.
Real guard-chain tests cover both Actions' failure branches, authentication and
ADMIN scope/tenant boundaries, indistinguishable target existence before
authorization, last-ADMIN refusal at counts zero/one, allowed demotion with another
ADMIN, promotions, authorized no-ops, exact scoped updates, execution order and
revalidation paths. Unexpected read/auth/cache failures preserve their exception
identity; update exceptions return only the code. Form/helper tests cover both
languages/default/invalid locale, all new English meanings, missing-entry fallback,
unknown/malformed/prototype-like codes and raw legacy strings, unread diagnostic
getters, retained selection/pending Save state and exact retry IDs/FormData/state.
Existing Onboarding, access, Public Demo Action restrictions and Home-only selector
regressions pass. The initial sandbox Vitest startup hit `spawn EPERM`; the same
offline selection passed with subprocess permission and the existing artifact
exclusion. No dependency, package-manager or test-configuration changes were made.

These are mocked-I/O/React-hook checks, not browser scheduling, Server Action
serialization, focus/keyboard or live persistence evidence. Concurrent demotions
and real rollback remain unverified: the original read/count/update sequence has
no new atomicity guarantee. Existing role Select triggers still lack an explicit
accessible name; error paragraphs retain no alert/live-region semantics. Missing
Japanese entry fallback inherits the selected locale tag. Native-language copy
review remains outstanding. No live database writes, authentication, Review
session, browser, full suite, full E2E or Production Build was performed.

## Onboarding structured Action errors (Phase 4.8c-1)

Implemented 2026-11-05 against clean `main` at `e98bd9f`. Onboarding is the first
Action/form adopting the Phase 4.1c `DisplayError`/`ErrorCode`/`getErrorMessage()`
contract. `CreateInitialWorkspaceState.error` is now `DisplayError | null`.
Two parameter-free codes extend that existing union/key map; generic
`INVALID_INPUT`/`INTERNAL_ERROR` would lose the original names/workspace-specific
guidance, so their messages and shared fallback behavior are unchanged.

| Actual failure branch | Code | Dictionary key | English meaning retained |
| --- | --- | --- | --- |
| Existing `onboardingSchema.safeParse` fails, including missing/blank/over-100-character names | `ONBOARDING_INVALID_INPUT` | `errors.onboardingInvalidInput` | Enter an organization name and workspace name. |
| Existing transaction catch, including any of its four creation steps | `ONBOARDING_CREATE_FAILED` | `errors.onboardingCreateFailed` | Failed to create your workspace. Please try again. |

Japanese messages are `Organization名とWorkspace名を入力してください。` and
`Workspaceを作成できませんでした。もう一度お試しください。`. Codes are selected at
those two existing branches, never by matching English/Zod/exception text.
No raw diagnostic fields or arbitrary interpolation are added to returned state.
The form calls `getErrorMessage()` for display and marks recognized Onboarding
errors with its resolved locale. Missing/invalid locale falls back to English;
missing Japanese entries retain the existing per-key English fallback.

The existing shared helper produces a localized generic notice for unknown codes;
that established behavior differs from this phase's explicit English-fallback
requirement. Only Onboarding handles that difference: values outside its two
expected codes are passed to the helper with English and marked `lang="en"`.
Unknown/malformed codes and legacy raw strings, including both old English
messages, therefore display the safe English internal-error notice rather than
being echoed or matched. This does not globally change the shared helper or
adopt structured errors in any role/Research Action.

Only error state/display changes. The validation schema/order, input coercion/
trimming and 1–100 limits, `requireUser()`, accessible-Workspace lookup and early
already-provisioned redirect remain unchanged. The original single transaction,
Organization → ADMIN Membership → Workspace → ADMIN WorkspaceMembership creation
sequence, identifiers, cookie name/value/options and final `/` redirect are
unchanged. Authentication, Workspace-read, cookie-read/set failures and redirect
exceptions remain outside the existing transaction catch and propagate as before.
There is no new catch, write, retry, locale input, transaction, schema or Prisma
change. Form initial `{ error: null }`, `useActionState`/Action identity,
uncontrolled values, raw FormData, required fields, pending disablement, CSS and
plain error-paragraph semantics are retained; no live-region/focus/state-reset
behavior or language switching is introduced.

Validation: focused DB-free Vitest **8 files / 222 tests**, changed-file ESLint,
TypeScript (`--noEmit --incremental false`) and diff whitespace checks passed.
Coverage includes both returned branches, all four transaction-stage rejections,
exact successful creation order/payloads/ADMIN roles, trimmed length boundaries,
already-provisioned redirect, real User-guard authenticated/unauthenticated paths,
unchanged Workspace lookup/cookie failure propagation and production cookie flags.
Form/helper tests cover English/Japanese/default/invalid locale, missing-entry
fallback, unknown/malformed/prototype-like codes, legacy strings without matching,
unread diagnostic getters, original pending/input/submission state and retry
FormData identity. Existing page/access/Public Demo write restrictions pass.
The initial sandbox Vitest startup hit `spawn EPERM`; the same focused checks
passed with subprocess permission and the existing artifact exclusion. Two early
getter tests needed identity assertions because Vitest's deep matcher inspected
the deliberately throwing diagnostics; production display did not read them.

All database/auth/cookie I/O is mocked. Real transaction rollback/concurrency,
Server Action serialization, browser submission scheduling/hydration/focus,
native-language review and live initial provisioning remain unverified. Existing
error paragraphs still have no alert/live-region semantics, and missing-entry
English fallback inherits the selected locale tag. No browser, Review session,
live provisioning, DB/fixture writes, full suite, full E2E or Production Build was
performed. Broader role/Research Action adoption remains separate work.

## Generic failures and 404 presentation (Phase 4.8b-2)

Implemented 2026-11-05 against `main` at `03fdfbe`, with Next.js `16.3.8`.
The existing `app/global-error.tsx` now renders application-owned generic copy
instead of `next/error`. It retains its own `html`/`body`, neutral Evidence Atlas
title and the same `useEffect(() => Sentry.captureException(error), [error])`.
English and Japanese sections have explicit `lang` attributes and use four new
`errors.*` dictionary entries shared with 404 presentation. Inline system-font,
spacing and contrast styles work without root CSS/fonts, ThemeProvider, AppShell,
server context, cookies, pathname or locale effects. No exception message, stack,
digest, identifier or request text is displayed. There is no recovery control.
No extra `error.tsx` is needed: unhandled failures retain the existing global
boundary, including root-layout failures; this phase does not change error routing.

The new root `app/not-found.tsx` is an async Server Component reading the existing
SaaS locale cookie with its established default/invalid English fallback. It
passes that resolved locale to `components/errors/not-found-content.tsx`, a small
Client Component using `usePathname` only to recognize existing Demo language
boundaries: `/ja/demo` and descendants use Japanese; `/en/demo` and legacy `/demo`
use English. Other/unknown paths and unavailable pathname use the supplied SaaS
locale. No pathname, query, resource identity, access reason or diagnostic is
rendered; all cases use the same fixed 404 heading/description. No new Provider,
root-layout cookie read, request header, redirect, cookie write, language selector,
route rewrite, catch-all route or experimental global-not-found flag is added.
Cookie-reader failures propagate to the existing global boundary rather than
swallowing Next.js control-flow errors. The 404 component relies on the normal
root layout; the fatal global component does not.

Existing `notFound()` calls and access guards are unchanged. Missing and
inaccessible Research still produce the same Next.js 404 signal before reading
detail children or returning an edit form. Presentation does not substitute a
redirect, successful page or JSON response for that signal. Next.js retains
ownership of status/noindex handling. Its documented behavior is HTTP 404 for
non-streamed responses and HTTP 200 if a response was already streamed; this
phase adds no loading/Suspense boundary and does not claim to change that runtime
limitation. Authentication, authorization, redirect targets, API contracts,
database/persistence and Research identity remain unchanged.

Validation: focused DB-free Vitest **6 files / 97 tests**, changed-file ESLint,
TypeScript (`--noEmit --incremental false`) and diff whitespace checks passed.
Coverage includes both fatal languages without a browser/layout, English entry
fallback, exact original Sentry capture/effect dependency, no diagnostic/control
rendering, cookie/URL/default/invalid/null-pathname 404 language, stable safe
resource-independent output and cookie failure propagation. Existing detail/edit
access tests now invoke real Next.js `notFound()` and assert its identical
`NEXT_HTTP_ERROR_FALLBACK;404` digest for missing/inaccessible Research. Demo
not-found/unexpected-failure and dictionary regressions also pass. Initial
sandbox Vitest startup hit `spawn EPERM`; the same focused selection passed with
subprocess permission and the existing command-line artifact exclusion.

An isolated Next.js dev/webpack fixture on loopback copied the production 404,
global fallback, locale helpers and Research access guards, with a minimal root
layout, local Sentry stub and a mocked DB module. Edge verified nine actual
HTTP 404 responses: unknown/query-bearing URLs, missing/invalid cookie, conflicting
Demo/cookie language, legacy Demo, matched localized Demo and missing/inaccessible
Research. The two Research cases display identical text. There were no redirects,
controls, hydration errors or unexpected network requests during these checks;
client navigation and Back also passed. A deliberately failed fixture root
returned HTTP 500 while the actual global component rendered both tagged languages
and invoked the Sentry stub. Application fallback markup omitted the private
error; Next's development overlay still reports the intentional exception, as
expected, and its diagnostic POST requests were blocked. The fixture loads no
auth/session, production root/font configuration, real database or Sentry transport.
Artifacts/script remain ignored under `test-results/phase48b2/`; its subprocess
was stopped after verification.

References reviewed 2026-11-05: Next.js
[global error convention](https://nextjs.org/docs/app/api-reference/file-conventions/error)
and [not-found/status convention](https://nextjs.org/docs/app/api-reference/file-conventions/not-found),
checked against the installed runtime and isolated HTTP evidence above.
Production bundling/global CSS/font failures, live Review/deployed routing,
already-streamed failures, rewrites, provider transport, physical devices and
screen-reader/native-language review remain unverified. Per-entry English fallback
retains the enclosing language tag. The normal root HTML language remains English.
No full suite, full E2E, Production Build, live authentication, DB/fixture writes
or real Sentry delivery was performed.

## Authentication presentation (Phase 4.8b-1)

Implemented 2026-11-05 against `main` at `45fa3e9`, with installed
`next-auth@5.0.0-beta.32` / `@auth/core@0.41.3`. `auth.ts` adds only
`pages.signIn: "/auth/signin"` and `pages.error: "/auth/error"`. Both are
standalone Server Component pages with `getSaasLocale()`, existing dictionaries,
resolved `main lang`, localized titles and no-index metadata. They do not call
`auth()`/`requireUser()` or add a language selector; Home-only switching is intact.
They and the sign-in Action call `requireApplicationEnabled()` so Public Demo
deployment still rejects authentication before locale or auth work.

The Google button calls the existing exported `signIn("google", { redirectTo })`
through a Next.js Server Action. This is the supported Auth.js custom-page
integration, not a hand-written OAuth request. The framework protects the Server
Action submission; the library's helper uses its internal trusted-action CSRF
path and writes its normal OAuth cookies. No application `skipCSRFCheck` setting
is added. The existing `/api/auth` POST endpoints retain token-based CSRF checks.
Google's provider ID/issuer/credentials, PKCE defaults, callback endpoint,
Kysely adapter, database sessions, session User ID callback, authorization guards,
sign-out Action and deployment dispatch are unchanged. There is no new redirect
callback, cookie format, provider, account-linking policy or dependency.

`requireUser()` and sign-out still target `/api/auth/signin`; Auth.js forwards
that GET to the configured presentation with its validated `callbackUrl`.
Direct custom-page visits and failure redirects without one return through that
existing GET, which resolves and validates the saved callback cookie before
rendering the page. This prevents the custom page's Referer from replacing the
original destination. Ambiguous/empty callback parameters take the same recovery
path. A supplied callback is passed to Auth.js unchanged for its existing
validation; the application never redirects directly to it. Valid relative and
same-origin absolute destinations remain valid; external destinations retain
Auth.js's origin fallback and malformed schemes retain its configuration-error
path. Neither page automatically redirects an authenticated User. The error page
requires no session, makes no automatic retry and links to `/api/auth/signin`,
avoiding auth-guard/error-page loops.

`auth/public-errors.ts` maps exact allowlisted public identifiers to `auth.*`
dictionary keys: `Default`, `Configuration`, `AccessDenied`, `Verification`,
`Signin`, `OAuthSignin`, `OAuthCallbackError`, `OAuthCreateAccount`, `Callback`,
`OAuthAccountNotLinked`, `AccountNotLinked`, `SessionRequired` and `MissingCSRF`.
The last uses the existing sign-in-required notice. Verification uses generic
feedback; no email/password/WebAuthn login is introduced. Unknown, non-string,
repeated, internal or prototype-like values use generic feedback. No raw query
values, diagnostic fields, error messages/causes/codes, tokens or secrets are
rendered. A thrown `AuthError` uses only that allowlisted identifier in a fixed
local error-page redirect. Next.js redirect exceptions and unexpected failures
propagate to the existing framework error boundary, without message rendering.
English retains the Google button and existing account/access guidance; generic
and configuration feedback use safe application copy. Japanese uses natural
fixed messages. Business Action errors and global error localization remain
outside this phase.

Integration references reviewed 2026-11-05:
[Auth.js custom sign-in](https://authjs.dev/guides/pages/signin),
[custom error pages](https://authjs.dev/guides/pages/error) and
[sign-in/sign-out helpers](https://authjs.dev/getting-started/session-management/login).
Version-specific behavior was checked in the installed `next-auth/lib/actions`,
core page renderer, callback URL resolver, default callbacks and CSRF/OAuth code;
the installed implementation takes precedence over unversioned examples.

Validation: focused DB-free Vitest **10 files / 219 tests**, changed-file ESLint,
TypeScript (`--noEmit --incremental false`) and diff whitespace checks passed.
New tests cover English/Japanese/default/invalid cookie presentation, metadata,
missing-entry fallback, known/unknown/repeated/prototype-like error identifiers,
diagnostic suppression, exact Google initiation and redirect exception identity.
Real installed Auth.js handler/helper checks use a mocked Kysely adapter and a
fail-closed local discovery response: provider configuration, same-origin/external/
malformed callbacks, saved callback-cookie recovery, missing/mismatched CSRF,
valid-CSRF/PKCE initiation, denied/missing-PKCE callbacks without token exchange
and existing session User identity pass. Existing access/child authorization,
Public Demo GET/POST/Action restrictions and Home-only selector regressions pass.
The initial sandbox Vitest startup hit `spawn EPERM`; subprocess permission was
used for the same offline checks, with the existing command-line artifact
exclusion. Vitest now narrowly transforms `next-auth` to resolve its extensionless
Next imports outside the application bundler. Early test-harness issues (module
resolution, installed-library expectations and incomplete discovery metadata)
were corrected before the final run; no runtime auth setting was changed to make
tests pass. No external fetch or real database connection was used.

Remaining verification: live Google consent/cancellation, real callback/state/
PKCE validation and token exchange, session creation/rotation/expiry/sign-out,
configured origins/proxies/cookies, real Next.js Server Action Origin rejection,
RSC/hydration/progressive enhancement, focus/screen-reader behavior and responsive
Japanese layout must be verified in an authorized isolated environment. Public
Demo deployment 404 behavior also needs browser/deployed confirmation for the new
pages. Offline checks do not establish those runtime contracts. No live OAuth,
database write, fixture/session creation, server startup, full suite, full E2E or
Production Build is part of this task. Root HTML remains English; no broader
language switching, deployment configuration or AI architecture change is made.

## Language boundaries and consistency (Phase 4.8a)

Implemented 2026-11-05 against `main` at `aa388af`. Header, Sidebar, mobile Menu
trigger/portaled Popup and Appearance wrapper/portaled SelectContent use the
existing `resolveLocale` helper for explicit English/Japanese boundaries, including
missing/unsupported locale fallback to English. No shared primitive refactoring,
cookie/selection changes, root HTML language or Public Demo routing changes.
Onboarding and Organization/Workspace member-role Action error paragraphs now
explicitly use `lang="en"`, retaining their original text, styling, conditional
rendering and Action contracts. The detail page's visible Research ID prefix
reuses `saasAi.researchId`; the ID itself is unchanged. Both dictionaries currently
retain the original `Research ID:` wording.

Navigation destinations, active state, theme values/handlers, Dialog lifecycle,
focus settings, form state and Home-only language switching are preserved.
No Action errors are translated and no English-message matching is introduced.
The current-coverage table below now reflects the completed SaaS phases and
points to the actual validation modules rather than the empty `validation.ts`.

Validation: focused DB-free Vitest **8 files / 160 tests**, changed-file ESLint,
TypeScript (`--noEmit --incremental false`) and diff whitespace checks passed.
Tests cover English/Japanese, omitted/invalid locale, per-entry English fallback,
unchanged navigation/theme handlers, accessible names, original IDs/FormData and
English Action error text/presentation. Initial sandbox Vitest startup failed
with `spawn EPERM`; the same selected checks passed with subprocess permission
and the existing command-line `test-results/**` exclusion.

An isolated Edge fixture rendered actual Base UI navigation and Appearance
portals with project CSS for English/Japanese/omitted/invalid locale. Portal DOM
language, standalone/nested Appearance, theme persistence, navigation destinations,
active state, accessible names, nested Escape/focus return, Close and desktop-resize
dismissal passed. The same interactions passed against components read from
baseline `aa388af`. Early fixture failures were corrected by enabling automatic
JSX, loading project CSS, awaiting focus transfer and targeting open portals
rather than closed animation DOM. This is synthetic component/browser evidence,
not Next.js hydration or live Review verification. The script/results remain
ignored under `test-results/phase48a/`; every HTTP request was fulfilled locally
or denied, WebSockets blocked, with no unexpected requests or page errors.

Remaining accessibility limits: root HTML remains English; these plain error
paragraphs retain their existing lack of alert/live-region semantics, and role
Select triggers retain their existing lack of an explicit accessible label.
Per-entry English fallback inherits the resolved subtree language. Original
user-authored content has no language detection. Screen-reader pronunciation,
live Review layout, hydration and native-language copy review remain unverified.
No Review server/session creation, database/fixture writes, live AI, full suite,
full E2E or Production Build was performed. Existing AI architecture conflicts
recorded below remain unresolved and outside this consistency scope.

## SaaS AI conversation errors and history dates (Phase 4.7b)

Implemented 2026-11-05 against `main` at `65ea3b1`. ResearchAiPanel and
ResearchAiConversationsDialog reuse Phase 4.7a's resolved locale props and five new
`saasAi.*` entries: `errorCreate`, `errorSend`, `errorRestore`, `errorLoad` and
`errorUnavailable`. English retains the original wording; Japanese uses fixed
client-selected messages, with existing missing/invalid locale and per-entry
English fallback. Error paragraphs use the resolved locale for `lang`.

The existing `string | null` error state, assignment/clearing branches, pending
locks, request ownership, history retention and request counts are preserved.
Send selects a local translation key at the same generic/HTTP 503 branches;
the thrown diagnostic still uses the original English wording. Other diagnostic
exceptions are unchanged and logged as before. Display text is selected from
known client failure branches, never by matching English strings, reading server
error bodies or translating exceptions. All non-503 send rejections retain generic
feedback; the special 503 notice still suggests contacting the administrator or
trying later. Creation/restoration/list failures retain their own generic notices.
Recovery GETs, error-clearing boundaries and manual-only resend behavior remain
unchanged; no retry, cancellation or structured server-error adoption is added.

History timestamps now use `new Date(updatedAt).toLocaleString("ja-JP")` for
Japanese. English, omitted locale and unsupported locale retain the original
zero-argument `toLocaleString()` call. Both paths retain date and time and the
runtime's local timezone, with no timezone override or date-only helper. Original
timestamp strings/instants, server ordering, previews and Conversation IDs are
unchanged. The existing Restoring label still temporarily replaces the timestamp
for a selected row.

No effects, locale-based keys, remounts, resets or new locale state are introduced.
Errors remain strings translated when assigned; already displayed/in-flight
errors are not automatically retranslated if props change. Broader live language
switching still needs separate state/browser verification and remains disabled
outside Home. Draft/input behavior, all five status meanings/transitions, message
content/IDs, citations and Source metadata are unchanged. Chat routes, status
codes, Retry-After, payloads, authentication/authorization, persistence, schema and
Public Demo AI remain unchanged. The `New conversation` API preview fallback still
needs a structured distinction from identical user-authored text before it can be
localized. The two AI architecture conflicts recorded below remain unresolved;
this phase does not rewrite that architecture document.

Validation: focused DB-free Vitest **11 files / 352 tests**, changed-file ESLint,
TypeScript (`--noEmit --incremental false`) and diff whitespace checks passed.
New coverage exercises all five error notices in English/Japanese/default/invalid
locale and missing-entry fallback, original English diagnostics, 503 versus other
HTTP failures, unread rejected-response bodies, pending/duplicate guards,
error-clearing behavior, exact request bodies/counts, manual resend, earlier
history/IDs and stream error/abort recovery. Timestamp checks inspect formatter
arguments, invoke the actual runtime formatter, retain year/month/day/hour/minute/
second output, and preserve original instants and list ordering. Existing fixed
UI/Portal, Markdown/citation, page locale, API mock, Home-only switching and Demo
client regressions pass. Initial sandbox Vitest startup hit `spawn EPERM`; the
same selected tests passed with subprocess permission and the existing command-line
`test-results/**` artifact exclusion. No dependencies or test config were changed.

Hook/stream doubles do not establish real React scheduling, browser Portal/focus,
hydration, RSC merging or provider behavior. Review layout and native-language copy
review remain unverified. No browser/E2E, full suite, Production Build, server
startup, authentication-session creation, database/fixture writes or live AI calls.

## SaaS AI conversation fixed UI (Phase 4.7a)

Implemented 2026-11-05. The Research detail page passes its existing resolved
AppShell locale to ResearchAiDesktopLayout and ResearchAiMobileDialog, then to
ResearchAiPanel, ResearchAiConversationsDialog and ResearchAiSupportingSources.
Optional locale props use `resolveLocale` for missing/invalid English fallback.
New `saasAi.*` dictionary entries cover fixed headings, descriptions, buttons,
placeholder, empty/loading/restoring states, role labels, message/input accessible
names, the panel's hidden Research ID prefix and Supporting sources heading.
English copy and existing rendering conditions are preserved. Both mobile and
History portaled Popups reuse `DialogContent locale={locale}` for language and
the shared Close control. No shared Dialog or Markdown renderer change is needed.

The five existing status keys and transitions are retained. `streaming` describes
temporary output with saving unconfirmed; `checking` describes the saved-history
read; `refreshed` displays server history while explicitly saying this individual
send's result could not be confirmed; `unconfirmed` directs the user to History;
`saved` describes displayed server history. Neither locale treats stream EOF or
the refresh GET as an acknowledgement that a particular send was saved.

Locale is a display prop only. No new effects, locale-based keys, remounts,
state resets, Provider, cookie read or locale request field are introduced.
Drafts, selected Conversation, saved/provisional messages, message IDs, pending
locks, generation ownership, stream consumption and late-result suppression keep
their existing behavior. The existing active/inactive History-picker key remains
unchanged. Desktop hiding retains its panel; mobile remains an independent
instance with its existing Dialog lifecycle. Existing input trimming/clearing,
New/History navigation, history replacement and manual resend behavior are retained.
No Stop/cancellation, retry, draft recovery or persistence acknowledgement is added.

Prompts, AI prose, history previews, Source metadata/IDs/URLs and citations remain
original. Existing citation parsing/validation, Markdown safety and render-only
Source URL safety rules are unchanged. The three Research-scoped chat Route
Handlers, request payloads, API errors, authentication, authorization, rate limits,
persistence, schema, indexing and Public Demo behavior are unchanged. SaaS Language
Select remains enabled only at exact Home `/`.

Existing client errors remain verbatim English with `lang="en"`; error state,
assignment/clearing and 503 handling are unchanged. History still calls
`toLocaleString()` without locale/options. Those display changes remain Phase
4.7b. The list API's `New conversation` preview fallback is also retained: its
string cannot safely be distinguished from an identical user-authored prompt.
Localizing that fallback needs a separately scoped structured API distinction,
not English-string matching. Typed error state, shared desktop/mobile state,
streaming/abort/retry changes and broader language switching remain deferred.

### Recorded AI architecture conflicts

Two pre-existing conflicts were confirmed against baseline `86128f4`; this phase
does not silently rewrite [AI architecture](ai-architecture.md):

- Section 8 says the post-stream detail GET refreshes Sources without replacing
  live messages. Current `refreshHistory()` replaces messages with server history
  and saved IDs, as the panel's synthetic tests demonstrate.
- Section 5 describes only the non-empty raw-text/`stop` save condition. Current
  `onFinish` additionally rejects empty validated text and empty parsed display
  text before creating an AI Message, covered by mocked Route Handler tests.

These documentation corrections need their own explicit architecture alignment;
neither discrepancy is authorization to change streaming or persistence here.

### Verification and limits

Focused DB-free Vitest **11 files / 298 tests**, changed-file ESLint, TypeScript
(`--noEmit --incremental false`) and diff whitespace checks passed. Tests cover English,
Japanese, missing/invalid locale and missing-entry fallback; page-to-layout/panel
locale delivery and original Source projection; real shared Popup language/Close;
all five status meanings and transitions; original drafts/messages/IDs/citations;
exact request payloads and existing pending/history/stream behavior. Existing
Markdown, citation, API authorization/persistence, Home-only switching and Demo
client regressions are included. Baseline comparison also confirms the panel,
desktop layout and History picker's state/effect/handler blocks are unchanged.
Initial sandbox Vitest startup hit `spawn EPERM`; subprocess permission allowed
the tests to run. That run also collected an existing archived Review package in
`test-results/`, which failed on a missing archived import while all 298 source
tests passed. The final run excluded `test-results/**` at the command line and
passed all 11 intended files; no artifact, Vitest config or dependency was changed.
Hook doubles/stream fixtures do not verify real
React scheduling, focus, browser Portal placement, live RSC merging or provider
completion. Real Review layout at 1280/768/375px, keyboard/focus, hydration and
Production font widths remain unverified. No browser, server startup, session
creation, database/fixture operation, live AI, full suite, E2E or Production Build.

## SaaS comments, tags and conclusions UI (Phase 4.6c)

Implemented 2026-11-03. The Research detail page passes its resolved AppShell
locale to AddCommentDialog, EditCommentDialog, DeleteCommentDialog, AddTagDialog,
DetachTagDialog and EditConclusionDialog. Optional locale props resolve missing
or invalid values to English. New `saasComment.*`, `saasTag.*` and
`saasConclusion.*` dictionary entries cover fixed triggers, titles, descriptions,
confirmation text, labels, the existing comment placeholder, submit/pending labels
and the tag-detachment icon's accessible name. Existing English copy is retained,
including the distinct Add tag/Add Tag casing and Detach... pending label.

Comment/Conclusion section headings, descriptions, counts, dates and empty states
already use Phase 4.5a's `saasResearch` entries. The fixed Unknown user fallback is
now localized only when both name and username are nullish; original names,
usernames and empty-string precedence remain unchanged. Comment bodies, tag names,
conclusion text and all Research relationships stay original. Tags use the existing
name input/create-or-attach workflow; no tag selection widget, tag-name translation,
new empty state or tag deletion behavior is added.

Each portaled Popup reuses `DialogContent locale={locale}` for its language and
Close control. No Select is present in this scope. Existing uncontrolled Dialog
open/close behavior, controlled input state, IDs/names, required/maxLength attributes,
length counters/limits, blank-tag disablement and pending behavior are retained.
The conclusion trigger still distinguishes a truthy initial conclusion from a
missing/empty one; null defaults to an empty input and clearing remains allowed.
No locale-driven input reset, FormData, Action binding, validation, authorization,
database, indexing, schema or stored-value change is made. In particular, tag
detachment still binds both Research ID and tag ID and only removes their existing
relationship. Existing Action-derived error text is rendered verbatim with
`lang="en"`; no message matching or structured-error adoption is introduced.
Research/Source/Finding behavior, Public Demo overlays, Home-only language switching
and AI conversation UI are unchanged.

Validation: focused DB-free Vitest **11 files / 614 tests**, changed-file ESLint,
TypeScript (`--noEmit --incremental false`) and diff whitespace checks passed.
The new Dialog suite covers English/Japanese/default/invalid/missing-key fallback,
real shared Popup language/Close, tag icon accessibility, original input values,
exact field attributes, bound mock Action IDs and FormData, length/blank/pending
states, verbatim errors and conclusion empty/default/clear behavior. Page tests
verify all six locale/ID/content deliveries and author fallback precedence. Shared
display tests verify original multiline comments/conclusions, tag names/IDs and
translated populated/empty UI without object mutation. Existing mocked-I/O
Action/schema tests and Source/Finding/Demo regressions pass. Initial sandbox
Vitest startup failed with `spawn EPERM`; the same tests passed with subprocess
permission. Hook doubles do not establish real browser scheduling or submission.

The existing Review server returned 307 from `/research` to `/api/auth/signin`.
No session was created, writes submitted, fixtures modified or server restarted.
Real-browser layout at 1280/768/375px, focus/keyboard, live input retention,
portal placement, hydration and Production font widths remain unverified. No
full suite, full E2E or Production Build was run. No scoped component was deferred;
AI UI and Action error localization remain outside this phase.

## SaaS Finding and relationship UI (Phase 4.6b)

Implemented 2026-11-03. The Research detail page passes its existing resolved
AppShell locale to AddFindingDialog, EditFindingDialog, DeleteFindingDialog and
ManageFindingSourcesDialog. Optional locale props use `resolveLocale` for English
default/invalid fallback. New `saasFinding.*` keys translate fixed triggers,
headings, descriptions, confirmation text, Finding label, existing placeholder,
submit/pending labels, supporting Source selection and relationship removal.
Japanese retains Finding/Source/Research terminology. Finding list headings,
counts, empty states, supporting labels, known TEXT display and dates already use
the Phase 4.5a `saasResearch` dictionary. There is no standalone Finding detail
route or separate source-excerpt field in this UI.

Each Dialog reuses `DialogContent locale={locale}` for Popup language and Close.
The association Select's separate Popup uses `SelectContent lang={locale}`;
shared wrappers remain unchanged. Existing Action errors stay verbatim with
`lang="en"`; the association error retains its plain paragraph rather than
acquiring new alert behavior. Finding content, excerpts/citations embedded in
content, original Source titles/URLs and relationships remain unchanged. TEXT and
unknown display-style values retain their existing display rules and stored
values. Source choices still exclude attached Sources; the association trigger
is still omitted when no unattached Sources exist.

Controlled content/selection/open state, null/empty-selection handling, pending
disablement, length limits/counters, field names/IDs/required/rows attributes,
FormData, bound IDs and all Actions remain unchanged. Closing/reopening the
association Dialog does not add a selection reset. Removal keeps its existing
direct bound `detachFindingSource` form with no new confirmation or pending state.
No validation, authorization, database, schema, indexing, locale persistence,
Public Demo overlay or Home-only language-switching changes are introduced.
Comment, tag, conclusion and AI editing controls are outside this phase.

Validation: focused DB-free Vitest passed **10 files / 488 distinct tests across
focused runs** (10 files / 486 tests, then the expanded display file / 24 tests
replacing its earlier 22). Changed-file ESLint, TypeScript
(`--noEmit --incremental false`) and diff whitespace checks passed. New hook-double
tests cover English/Japanese/default/invalid/missing-key fallback, real shared
Dialog/Select Popup language and Close, original content/Source choices, exact
FormData and mock Action binding, length/pending/error behavior, and selection
retention through locale rerenders and close/reopen. Page tests verify locale and
original-ID/content propagation, available Source filtering and bound removal
arguments. Display tests verify translated labels/empty states, original content,
links, relationships and known/unknown display styles. Existing mocked-I/O
Action/schema and Source/Demo regressions also pass. Initial sandbox Vitest startup
failed with `spawn EPERM`; the same tests passed with subprocess permission.

The existing Review server returned 307 from `/research` to `/api/auth/signin`.
No session was created or writes submitted. Real-browser layout at 1280/768/375px,
keyboard/focus, live state retention, portal placement, hydration and Production
font widths remain unverified; hook doubles do not establish these behaviors.
No Review restart, DB/fixture changes, full suite, full E2E or Production Build.
Action error localization remains deferred.

## SaaS Source UI (Phase 4.6a)

Implemented 2026-11-03. The Research detail page passes its existing resolved
AppShell locale to AddSourceDialog, EditSourceDialog and DeleteSourceDialog.
Their optional locale defaults/falls back to English through `resolveLocale`.
The `saasSource.*` dictionary entries cover triggers, headings, descriptions,
Title/URL labels, existing placeholders, submit buttons and existing pending
labels. Source terminology stays Source in Japanese. The Source list heading,
description, count, empty state and updated date already use the Phase 4.5a
`saasResearch` entries; no second list implementation is added. There is no
Source type/status display in the current UI.

`DialogContent locale={locale}` translates Close and marks each portaled Popup's
language. Existing Action errors remain verbatim with `lang="en"`. Dialog
open/close behavior, controlled title/URL state, length counters/limits, pending
disablement, input IDs/names/types/required attributes, bound Research/Source IDs
and FormData remain unchanged. No Action, validation, authorization, persistence,
schema or relationship behavior changes. Original Source titles (including
publication/citation metadata), URLs and other user content are not translated.
Existing render-only HTTP(S) link validation/normalization is retained; displayed
and editable URLs preserve their original spelling. No Public Demo overlays,
Finding/comment/tag/AI UI changes or broader language switching are introduced.

Validation: focused DB-free Vitest **10 files / 424 tests**, changed-file ESLint,
TypeScript (`--noEmit --incremental false`) and diff whitespace checks passed.
New tests cover English/Japanese/default/invalid/missing-key fallback, real shared
Dialog Popup language and Close label, input contracts/original values, bound
mock Action IDs and unchanged FormData, existing length/pending behavior and
verbatim errors. Detail tests verify cookie-locale propagation and original Source
data/links. Existing mocked-I/O Action/schema tests and Demo/status regressions
also pass. Hook doubles do not verify browser scheduling, live portal/focus or
native submission. Initial Vitest startup hit sandbox `spawn EPERM`; rerunning
with subprocess permission succeeded. Four initial new test failures assumed
unnormalized href casing; expectations were corrected to the existing safety
helper's behavior without changing implementation.

The existing Review server responded to a read-only request, but unauthenticated
`/research` redirected to sign-in. No session was created or writes submitted.
Review UI at 1280/768/375px, keyboard/focus, live state retention, hydration and
Production font widths remain unverified. No Review restart, DB/fixture changes,
full test suite, full E2E or Production Build was performed. Action error
localization and Finding/comment/tag/AI controls remain deferred.

## SaaS Research status Dialog (Phase 4.5b-3)

Implemented 2026-11-03. The detail page passes its existing resolved AppShell
locale to `EditResearchStatusDialog`. Its optional locale defaults/falls back to
English through `resolveLocale`. Five new `saasResearch.*` keys translate the
trigger, title, description, Status label and Saving state; Save Changes and the
three status display labels reuse existing keys. Japanese selected-value copy is
explicit, following the member-role forms, while English keeps Base UI's existing
value rendering. Internal enum values and the `status` field name are unchanged.

`DialogContent locale={locale}` reuses shared Close localization and sets `lang`
on the Dialog Popup. `SelectContent lang={locale}` marks its separate portaled
Popup locally; no shared Dialog/Select changes or global portal solution are
introduced. Existing Action errors render verbatim with `lang="en"` inside the
localized Dialog. `useState`, `useActionState`, bound Research ID, FormData,
pending disabled/save labels and Base UI open/close behavior are retained. No
selection reset, Action/validation/access/DB change or error translation is added.
Home-only language switching and Public Demo remain unchanged.

Validation: focused DB-free Vitest **8 files / 193 tests**, changed-file ESLint
and TypeScript (`--noEmit --incremental false`) passed. Hook-double tests inspect
English/Japanese/default/invalid/missing-key fallback, status values/selection,
pending state, unchanged Action errors and mocked Action binding/FormData. Real
shared wrapper trees verify both Popup language props and the Close label; detail
tests verify locale/ID/status propagation. Existing mocked-I/O Action tests cover
validation, authorization, persistence and redirect boundaries. These are not
browser scheduling, portal-placement or focus tests. Review HTTP responded, but
unauthenticated `/research` redirected to sign-in; no session was created or data
modified. Browser checks at 1280/768/375px (layout/overflow, keyboard/focus, live
open/close and selection retention) and Production font widths remain unverified.
No status submission, fixtures/DB changes, Review restart, full suite, full E2E
or Production Build was performed.

## SaaS Research editing UI (Phase 4.5b-2)

Implemented 2026-11-03. `/research/[id]/edit` receives the resolved locale from
AppShell's existing server body slot and sets `lang` on its main content. Shared
`saasResearch.title`/`description` keys and six new `saasResearch.*` entries cover
the back link, heading, introductory copy, Cancel, Save Changes and the detail
page's Edit link. English copy and CSS are unchanged. The edit back link has a
separate key from the list-return link because its destination is the Research
detail. No new cookie read, context, URL scheme or locale persistence is added.

The Server Component's uncontrolled form, original title/description defaults,
null-description fallback, HTML attributes and label associations are unchanged.
`updateResearch.bind(null, research.id)`, FormData, access/existence checks,
validation, DB update, indexing, Cancel destination and success redirect are
retained. Action validation exceptions and `Research not found.` remain English;
structured errors, pending/disabled state and dirty/leave confirmation are deferred.
Home-only Language Select restrictions and Public Demo are unchanged. Status
dialog localization remains Phase 4.5b-3; other Research operations and AI are out
of scope.

Validation: focused DB-free Vitest **10 files / 226 tests**, changed-file ESLint
and TypeScript (`--noEmit --incremental false`) passed. Tests cover real Shell
locale delivery, English/default/invalid-cookie fallback, Japanese copy, original
mixed-language defaults, null description, form attributes, mocked bound Action
ID/FormData, back/Cancel/Edit links, existing real access guards with mocked I/O,
Action persistence/redirect boundaries and language-switching restrictions.
No actual Save, DB/fixture changes, Review server start/restart, full suite, full
E2E or Production Build. Review browser checks at 1280/768/375px (layout, widths,
wrapping/overflow, keyboard, hydration and live input preservation) and Production
IBM Plex Sans verification remain open.

## SaaS Research creation UI (Phase 4.5b-1)

Implemented 2026-11-03. `/research/new` uses AppShell's existing server body slot
and marks its main content with `lang`. New `saasResearch.*` entries translate
the heading, introductory copy, Title/Description labels, both placeholders and
submit button. The Research list reuses its existing locale to translate only
the New Research link. English copy and CSS remain unchanged; Japanese retains
the product term Research. Missing/invalid cookies still resolve to English,
without another cookie reader, client context, URL or DB persistence.

The form remains an uncontrolled Server Component form connected directly to
`createResearch`. Input names, required/type/rows attributes, label associations,
FormData shape, validation/trim/null handling, authentication, Workspace checks,
DB payload, indexing and success redirect remain unchanged. Input content is
not translated. Home-only Language Select restrictions and Public Demo behavior
are retained. Action validation errors remain English exceptions; structured
errors, pending/disabled submit state and other form enhancements are deferred.

Validation: focused DB-free Vitest **9 files / 178 tests**, changed-file ESLint
and TypeScript (`--noEmit --incremental false`) passed. Coverage includes the real
AppShell's locale/cookie flow into the creation page, English/default/invalid
fallback, Japanese copy, disabled language switching, native form attributes,
Action identity, list link, and existing mocked-I/O auth/validation/persistence/
redirect boundaries. The authorization page suite uses a synchronous Shell double;
creation and Shell tests separately exercise the real Shell. No actual submission,
DB/fixture changes, Review server start/restart, full suite, full E2E or Production
Build. Review browser checks (1280/768/375px wrapping, widths, overflow, keyboard,
hydration and live input preservation) and Production IBM Plex Sans verification
remain open. Research edit/status dialogs and later operations remain deferred.

## SaaS Research read-only UI (Phase 4.5a)

Implemented 2026-11-03. `/research` and `/research/[id]` receive `getSaasLocale()`'s
resolved locale through AppShell's existing server body slot; the list header
slot still supplies the same locale to WorkspaceSelector. No additional cookie
read, URL locale, client context or locale persistence is introduced. The main
content has `lang`; interactive children receive no new locale/state.

The list translates search labels/placeholder, status-filter and sort labels,
Apply, accessible list label, empty Workspace and no-results messages. GET names,
values, filtering/sorting, links and original input remain unchanged. Card dates
use the existing `formatDate` locale parameter; cards continue to omit status
badges as before. Detail translates the back link, Research label, status display,
created/updated dates, common Source/Finding/Discussion/Conclusion section copy,
counts, read-only empty states and existing read-only metadata. Counts retain
their array lengths. Date meaning and implicit timezone remain unchanged.

Shared detail components opt into `messageScope="saasResearch"` for SaaS copy.
The existing `research` scope remains the default for Public Demo: its Japanese
terminology differs from the SaaS requirement to retain Research/Source/Finding/
Evidence. Separate dictionary entries resolve this copy conflict without changing
Demo behavior or translating user content. Titles, descriptions, conclusions,
Source titles/URLs, Findings, comments, author names and tag names stay verbatim.

At the Phase 4.5a checkpoint, write-entry labels (New Research, Edit and dialog triggers), forms, status changes,
Source/Finding/comment/tag operations and AI UI remain English pending Phases
4.5b/4.6/4.7. Actions, access boundaries, DB queries, Prisma, dependency versions
and Home-only Language Select restriction are unchanged. Status values and
unknown-status fallback remain intact; only known display labels translate.

Validation: focused DB-free Vitest **9 files / 147 tests**, changed-file ESLint
and TypeScript (`--noEmit --incremental false`) passed. Tests cover English/default/
invalid-cookie fallback, Japanese populated/empty display, original data and links,
GET values, status labels, real mocked-I/O access guards, shared locale propagation,
language switching restrictions and Demo regressions. The detail access test uses
a synchronous locale-aware shell double; actual shell rendering has separate
coverage. No DB writes, fixture changes, full suite, full E2E or Production Build.
Review browser hydration, 1280/768/375px wrapping/overflow, keyboard/focus and
Production IBM Plex Sans text widths remain unverified; no Review server was
started or restarted. Phase 4.5b and later plans remain unchanged.

## Routes and shared rendering

- `/demo` and `/demo/research/[researchId]` retain default English behavior with no redirects.
- `/en/demo`, `/ja/demo`, and `/{en|ja}/demo/research/[researchId]` use the same
  `DemoWorkspaceView`, `DemoResearchView`, and `DemoShell` as the legacy routes.
- `[locale]/demo` entrypoints and layout reject unsupported locale codes with
  `notFound()` before reading data. No middleware is introduced. Research and
  Source IDs and the existing fixed-Workspace public read boundary are unchanged.

`components/demo/demo-pages.tsx` contains shared display logic; route entrypoints
only validate parameters, read the existing projection and determine Chat
eligibility. Shared Research and Appearance components accept an optional locale
that defaults to English, retaining authenticated application behavior.

## Conventions and dictionary API

`src/lib/i18n/locales.ts` defines `Locale`, `supportedLocales` (`en`, `ja`),
`defaultLocale` (`en`), `isLocale`, and `resolveLocale`. Codes are exact and case
sensitive. Unsupported inputs, including regional codes, resolve to English;
browser preference negotiation is deliberately outside this helper.

`dictionaries/en.ts` is the complete dictionary and defines `TranslationKey` from
its keys. Keys describe UI purpose (for example `demo.researchList`), rather than
English sentences. `Dictionary` gives each key a string value; `ja.ts` uses
`satisfies Partial<Dictionary>` to permit missing entries while rejecting unknown
keys. Phase 2 extends the five original keys to cover Demo navigation, Research
section descriptions/counts/status/dates and empty states, Appearance, Chat
instructions/controls/placeholder/status/errors, and accessible labels. Research
text, Tags and curated Comments use the separate Phase 3 presentation catalog
described below. Workspace names/descriptions, original source titles and AI prose
remain unchanged. All canonical database content remains unchanged.

`translate(key, locale)` accepts only typed keys, selects a supported locale, and
falls back per missing entry to English. Omitting the locale also selects English.
Japanese entries currently cover the extracted UI keys; dictionaries may remain
partial. A scoped test temporarily omits an entry to verify English fallback.
`translate(key, locale, values)` also replaces named `{count}` placeholders with
plain text; React escapes the output. This is not an ICU/plural-message engine.
Example: `translate("demo.mode", "ja")` returns `リサーチ閲覧・AIチャット`.
Do not pass arbitrary external strings as translation keys. Dates use `ja-JP`
for Japanese and the existing `en-US` formatting for English.

The dictionary helpers have no dependencies, request state or side effects and
work in server or client modules. Demo route parameters select its UI language, with
no cookie/header/browser negotiation. Existing English wording is retained,
apart from additive language controls, metadata and a bilingual input hint.
The root layout, global theme initialization and hydration suppression are unchanged.

A lightweight dictionary is sufficient for these static labels. A library could
later help with plural rules, formatted messages, locale negotiation, and route/SEO
integration, at the cost of dependencies and routing/provider configuration.
Reassess when those requirements exist; no i18n library is installed.

## SaaS locale-cookie reader (Phase 4.1a)

`src/lib/i18n/saas-locale.ts` is a server-only module. Its asynchronous
`getSaasLocale(): Promise<Locale>` reads `evidence_atlas_locale` through Next.js
`cookies()` and reuses `resolveLocale()`. Only exact `en` and `ja` values are valid;
missing, empty or unsupported values (including `ja-JP` and `JA`) fall back to
English. It does not write, delete or clear cookies and has no authentication,
Workspace or database dependency.

The saving Action and Header control are described below. Phase 4.3 adds locale
delivery to the Home Dashboard body only. URL-based Public Demo
language selection remains unchanged. Scoped unit tests mock `next/headers`
without a database or running server and verify resolution and absence of cookie
mutations.

## SaaS locale-cookie saving Action (Phase 4.1b-1)

`src/lib/i18n/set-saas-locale.ts` uses `"use server"` and exports
`setSaasLocale(locale: unknown): Promise<void>`. It validates client input with
the existing `isLocale()` before accessing cookies. Only exact `en` and `ja`
are accepted; all other inputs throw without changing cookies, rather than
saving an English fallback. The Action shares `SAAS_LOCALE_COOKIE` with the
reader and uses Next.js `cookies().set()` in the Server Action context.

The cookie has `Path=/`, `SameSite=Lax`, `HttpOnly`, a 180-day `maxAge`
(15,552,000 seconds), and `Secure` only when `NODE_ENV` is `production`.
No authentication, Workspace or database dependency, redirect or explicit cache
revalidation/refresh is introduced. Workspace and Auth.js cookies are untouched;
locale is never an authorization or Workspace-selection input.

Cookie saving is implemented; no Provider is introduced. Phase 4.3 connects the
Home body; other SaaS page bodies still default to English. Public Demo selects its locale through URLs.
Scoped mocked-cookie
tests cover validation, attributes, environment-dependent `Secure`, preservation
of other cookies and round trips through the existing reader.

## SaaS Header language control (Phase 4.1b-2)

The existing Server Component `AppShell` now awaits `getSaasLocale()` and passes
the typed locale through `AppHeader` to the client `SaasLanguageSelect`. The same
cookie-derived prop determines the initial server markup and client selection;
missing/invalid cookies still select English. No new Provider, locale-based key,
root-layout change or page-content translation is introduced. At Phase 4.1b-2,
only the control's language label used the dictionary; Phase 4.2a below extends
translation to shared navigation. The Header wraps its controls at narrow widths alongside the existing
Workspace slot and Sign out. Appearance remains in navigation.

The labeled native select offers English / 日本語 and calls `setSaasLocale()`
inside a transition. It disables while pending, guards immediate duplicate events,
and restores the server-provided selection with an accessible generic error on
failure. Cookie mutation in a Server Action causes a server rerender according to
the [Next.js mutation documentation](https://nextjs.org/docs/app/getting-started/mutating-data).
The updated Shell reads the new cookie again; no extra `router.refresh()`, URL
change, document reload, redirect or navigation is added. Authentication and
Workspace code and cookies are unchanged.

**Input-protection restriction:** switching is enabled only at the exact Home
pathname `/`, which currently has no research drafts, dialogs or AI panel. Every
other pathname (including unknown/unavailable pathnames) disables the control and
explains the Home-only restriction. Research list filters, create/edit forms,
Source/Finding/Comment dialogs, settings forms and Research AI input, sending and
streaming therefore cannot initiate a locale mutation/rerender from the Header.
No distributed dirty-state or AI-activity tracking is added. Ordinary navigation
and Workspace switching retain their existing behavior; this is not a general
unsaved-input guard.

Scoped tests cover actual cookie resolution through Shell/Header markup, changed
server props, native labels, production handler closures with mocked hooks/Action,
pending/duplicate/failure behavior, restricted routes, unchanged links and separate
Demo rendering. Hook doubles do not verify React scheduling or RSC merging.
**Phase 4.1b-3 remains open:** verify the real Next.js/Review DB round trip, initial
hydration, URL/query/fragment and auth/Workspace preservation, keyboard/focus,
narrow Header layouts and Appearance/Sign out interactions. Actual form, Dialog
and AI input/conversation/stream state preservation is unverified; keep switching
disabled there until it is demonstrated safe. No Review DB, live AI, Production
Build or full E2E was used for Phase 4.1b-2.

## SaaS shared navigation (Phase 4.2a)

Implemented 2026-11-03: `AppShell` reads `getSaasLocale()` once and passes the
same typed value to `AppHeader` and `AppSidebar`. Header passes it to
`AppNavigationMenu` and `SaasLanguageSelect`; desktop/mobile `NavigationLinks`
pass it to the existing `AppearanceSelect`. Optional navigation locale props
default to English. No Provider, Context, client cookie read or locale state is
added. Missing/invalid cookies and missing Japanese keys retain English fallback
through the existing resolver and `translate()`.

Fourteen `nav.*` dictionary keys cover the actual fixed navigation text: Primary
navigation, Home, Research, Settings, Organization, Workspace, Application landmark,
Menu, Navigation title, Close navigation, Sign out, Home only, language restriction
explanation and language-save failure. Japanese preserves Research, Organization,
Workspace and the Evidence Atlas brand; Home becomes ホーム, Settings 設定 and
Sign out ログアウト. Appearance/options and the language label reuse existing
dictionary keys. Organization/Workspace are the actual link labels; no new
"Organization settings" or "Workspace settings" labels are introduced.

All hrefs, active-route checks, IDs, permissions, sign-out Action and Workspace
selector slot remain unchanged. Organization/Workspace names, user names/email,
Research titles and supplied page content are not translated. A Japanese cookie
therefore keeps navigation Japanese after leaving Home, with the language select
disabled everywhere except exact `/`, as before. The Phase 4.1c error contract is
unchanged; only the language control's own fixed notice is translated here.

Header, Sidebar and mobile overlay use the same locale and retain their original
CSS, widths, spacing, responsive breakpoints, focus styles, Base UI modal behavior
and close-on-navigation handlers. Scoped Vitest tests verify English/Japanese
markup, cookie/default/fallback propagation, matching desktop/mobile links and
active states, accessible labels, navigation handlers, preserved caller text and
the Home-only guard. Mobile portal contents are exposed by a test double; these
are DB-free markup/handler checks, not browser layout, real keyboard/focus,
Next.js hydration or RSC verification. Actual narrow-screen wrapping and visual
balance remain unverified in a browser.

Only shared navigation is localized. Dashboard/Research/settings page bodies,
Source/Finding forms, business dialogs, AI Panel and existing Action errors remain
outside this phase. Public Demo, root `<html lang>`, authentication, DB/Prisma,
locale saving behavior and the language-switching scope are unchanged.

## SaaS common UI (Phase 4.2b)

Implemented 2026-11-03: Appearance already receives the same cookie-derived
locale as the navigation through `AppShell` → Header/mobile menu and Sidebar →
`NavigationLinks` → `AppearanceSelect`. Its existing `appearance.*` keys cover
Appearance/Theme/Light/Dark/System (外観/テーマ/ライト/ダーク/システム).
No Appearance implementation, theme values (`light`, `dark`, `system`), persistence,
English/日本語 language options or switching behavior changes in this phase.

`components/ui/dialog.tsx` owns two fixed Close labels: an `sr-only` span in
the top-right icon button and an optional visible Footer button. Both reuse the
single new `dialog.close` key (English `Close`, Japanese `閉じる`).
`DialogContent` and `DialogFooter` each accept an optional `locale?: Locale`;
omission retains English. No Context/Provider or cookie read is added. Existing
business callers pass no locale and remain English, including their titles,
descriptions, form controls and Close labels. Adoption is deferred.

For opt-in use, pass the same locale to both `DialogContent` and any
`DialogFooter showCloseButton`; the Footer does not infer it from Content.
For example, use `<DialogContent locale={locale}>` and
`<DialogFooter locale={locale} showCloseButton>`. Content sets `lang` on the
actual Base UI Popup inside its Portal, so language does not rely on DOM ancestry
under AppShell. An explicit locale takes precedence over a caller's `lang` on
Content; without locale, an existing caller-provided `lang` is preserved and no
Popup language is added by default. Each generated Close label has its own
language attribute so its pronunciation does not depend on caller content.
Popup language applies to its supplied content: callers are responsible for using
matching language or explicit overrides on mixed-language children.

Portal/Backdrop/Popup structure, button variants/positions/sizes, CSS, focus props,
refs, Root event callbacks and Base UI Close primitives remain unchanged. Escape,
focus trapping and close behavior remain delegated to Base UI. The generic
`DialogClose` wrapper does not own text and is unchanged.

Scoped DB-free Vitest checks cover default/English/Japanese Close markup using
the real Base UI Close, missing Japanese fallback, Popup/Portal structure and
language props, legacy props/children/visibility, unchanged styles and forwarding
of Escape/Close dismissal reports. For static button rendering only, the test
substitutes a plain container for Popup: actual Popup requires a browser Portal.
Appearance tests cover translated options and unchanged theme values/handlers;
existing Shell tests retain cookie-to-display coverage. These checks do not
dispatch real browser keys or verify focus trapping, portal placement, hydration
or visual layout. Browser interaction verification remains open.

Root `<html lang="en">` is unchanged. Existing business Dialogs, the separately
implemented mobile-navigation Popup and Appearance Select's portal are not given
new language attributes here; their Japanese text can still inherit root English
in portal DOM. No global portal-language solution is introduced. Business Dialog
localization, SaaS page bodies/AI Panel, Action errors, auth, DB/Prisma and Public
Demo are unchanged. Home-only language switching remains in force.

## SaaS Home Dashboard (Phase 4.3)

Implemented 2026-11-03: the `/` Server Component calls `getSaasLocale()` after
the existing public-deployment redirect and authentication guard. `translate()`
renders its fixed copy; `formatDate(updatedAt, locale)` reuses the existing
English/Japanese date formatting. `<main lang={locale}>` identifies the body
language without changing root layout. AppShell independently uses the same
request cookie for shared navigation. No Provider/Context or client cookie read
is introduced. The existing language-select Server Action updates the cookie and
Next.js rerenders Home with the new locale, without additional refresh/navigation.

Ten `dashboard.*` keys cover the description, Recent Research, View all, empty
state, Workspace Summary, Tags, Source/Finding labels and interpolated counts.
Japanese uses 最近のResearch, すべて表示, Researchはまだありません。,
Workspaceの概要, タグ, Source/Finding and `{count} 件`. The description is
Researchを探索・整理し、繰り返し活用できる知識を蓄積しましょう。
Workspace/Research labels and Updated reuse existing navigation/date dictionary
keys. Separate Dashboard Source/Finding keys preserve SaaS product terminology;
the existing Demo keys deliberately use different Japanese wording and are unchanged.

Workspace names and Research titles/descriptions remain verbatim. No content
catalog overlay is used. Query conditions, recent ordering/three-item limit,
aggregate calculations, hrefs, CSS/classes, card layout and English copy are
unchanged. Dates remain date-only, as before. Missing/invalid locale falls back
to English. Home-only switching, cookie attributes, auth, Prisma/DB, Public Demo,
root layout and common error contracts are unchanged. Research list/detail/create/
edit, Source/Finding, Organization/Workspace settings, onboarding, business
dialogs and AI Panel are outside this translation scope.

Validation: DB-free focused Vitest **8 files / 132 tests** passed, including
13 new Home tests for locale/default/fallback, original data, counts/dates,
aggregates, empty state, query scopes, links/order, cookie-save rerender and Demo
redirect. Existing Home authorization tests: **4 passed / 16 unrelated skipped**.
Changed TS/TSX ESLint and `git diff --check` passed. The broader authorization
file also exposed four existing settings-page static-render failures involving
async AppShell; all four reproduced with the pre-change Home in an ignored test
copy. Those settings and their test are unchanged in this phase.

Read-only `pnpm review:check` passed against `evidence_atlas_review`; the existing
`pnpm dev:review` server was reused after verifying its process ancestry. Review
login used the existing dedicated helper. Real installed Chrome checked **12
Home states**: populated/empty Workspace × English/Japanese × 1280/768/375px.
No horizontal overflow; summary cards keep equal heights and four/four/two columns.
Screenshots were inspected for Japanese wrapping and spacing. Counts stayed
2/1/1/0 in the populated fixture and all-zero in the empty fixture. The actual
language-select Action updated Home in both directions without URL change or
auth/Workspace-cookie change; Japanese survived reload. Research retained the
disabled language control and `/ja/demo` retained independent URL-based language.
No browser page errors were observed. Business data was not created/edited/deleted,
and no fixtures were reinserted. Screenshots/measurements are local ignored
artifacts in `test-results/phase43/`. Review uses system Sans; Production IBM Plex
Sans and physical mobile devices remain unverified. No Production Build, full
suite, full E2E or live AI/provider checks were run.

## SaaS Workspace Selector (Phase 4.4a-1)

Implemented 2026-11-03: `WorkspaceSelector` owns only one fixed string, the
`SelectValue` placeholder. `workspaceSelector.placeholder` retains English
`Select workspace` and supplies Japanese `Workspaceを選択` through `translate()`.
The optional `locale?: Locale` defaults to English. Names and item values remain
verbatim. No labels, explanations, loading/error notices or empty-state UI are
added. With a valid selected Workspace, its original name remains visible;
the placeholder normally does not appear. Existing Base UI value fallback behavior
is unchanged, including its handling of an unmatched non-null ID.

Home passes its already-read locale. The Research list uses AppShell's optional
server-only `header(locale) => ReactNode` slot, which AppShell resolves using its
existing single `getSaasLocale()` call before passing the result to AppHeader.
Existing ReactNode header slots remain supported. The callback is evaluated on
the server and is not passed to client components. No additional cookie read,
Provider/Context or client locale state is added. Research list body/filter copy
and Organization/Workspace settings bodies remain untranslated.

The switch Action, auth/membership checks, Workspace cookie and refresh, original
IDs, selected value, pending disablement and error propagation are unchanged.
There are no CSS, dimensions, dropdown-placement, focus or keyboard-handler
changes. Locale is a display prop only; Home-only language switching remains.
Public Demo, Prisma/DB and canonical data are unchanged.

Focused DB-free Vitest **7 files / 94 tests** passed: Selector placeholder/default,
original names/IDs/items/selection, Action input and error behavior; Home/Research
locale wiring and no additional locale read; Shell slot/fallback; existing
switch/membership/current-Workspace and Home-only language restrictions. Existing
assertions were retained. The previously recorded four settings authorization
static-render failures were repaired separately in `4840a2e`; the authorization
file now passes all 22 tests, including two added Selector wiring cases.
Changed-file ESLint and `git diff --check` passed.

Read-only Review diagnostics passed; the verified existing Review server was
reused. Real Chrome checked both languages at 1280/768/375px, dropdown names and
selected state, unchanged 224px desktop/tablet and 351px mobile widths and 32px
height, Enter/Escape and focus return. End/Home + Enter switched only the two
existing fixture Workspaces on Home and Research, retaining locale and auth
session; Research's language select remained disabled. No horizontal overflow or
page errors occurred. Normal Review fixtures always select a valid Workspace,
so translated placeholder rendering is covered by the DB-free primitive test,
not the authenticated screen. Local screenshots/measurements are ignored under
`test-results/phase44a1/`. No business data writes, fixture reinsertion, DB setup,
Production Build, full suite, full E2E or live AI calls were performed. Review
system Sans, installed desktop Chrome and emulated widths do not verify the
Production font or physical mobile devices.

## SaaS Organization settings (Phase 4.4a-2)

Implemented 2026-11-03: `/settings/organization` and its member-role form use
eight `organization.*` dictionary keys. Members becomes メンバー; the description
is このOrganizationに所属するメンバーです。; ADMIN/Admin becomes 管理者,
MEMBER/Member becomes メンバー, Save becomes `保存` and Saving... becomes `保存中...`.
The Organization label reuses `nav.organization` and remains English. No new Role
label, success notice, permission explanation or other UI is added.

AppShell's optional server-only `children(locale) => ReactNode` slot extends the
existing header-slot pattern. Its existing single `getSaasLocale()` call resolves
the cookie, then supplies the same typed locale to navigation and the Organization
body. The page completes its existing auth/membership/data checks before creating
the slot. It passes locale to the client form; omitted form locale stays English.
There is no extra locale-cookie read, Provider/Context or root-layout change.
The body uses `lang={locale}`, and the form's portaled SelectContent receives the
same language. English SelectValue keeps the primitive's existing value rendering;
Japanese supplies the translated selected label explicitly.

Organization names, member names/emails, IDs, stored data and role submission
values remain verbatim. Display-only Badge/option labels do not change ADMIN/MEMBER
comparisons, membership/admin guards, last-ADMIN protection, Action binding,
FormData `role`, pending/unchanged disablement or revalidation. CSS is unchanged.
The Action still returns `error: string | null`; all four existing English error
notices remain unchanged. `getErrorMessage()` cannot safely consume that contract
without structured codes; no English-string matching or diagnostic exposure is
introduced. Error-contract adoption is deferred. Workspace settings, onboarding,
Research bodies and AI Panel remain untranslated; Home-only switching is retained.

Focused DB-free Vitest **5 files / 114 tests** passed, including every existing
authorization case (the file now has 27 tests), real member-role guard/last-ADMIN
tests, both role displays/control visibility, original personal data, default and
invalid-locale fallback, unchanged form Action arguments/values/errors, Shell
single-read propagation and language-switching restrictions. Changed-file ESLint
and `git diff --check` passed. No auth/Action, Prisma/DB or Public Demo code changed.

Review read-only diagnostics passed and the existing verified Review server was
reused. Real Chrome checked English/Japanese at 1280/768/375px: original fixture
Organization/member data, ADMIN controls, selected labels/options, Enter/Escape,
focus return and local selection/restoration without submission. Selector size
remained 128×32px; no horizontal overflow or page errors occurred. Mobile email
truncation follows the unchanged existing CSS. Auth/Workspace cookies and locale
were retained, and language switching stayed disabled here. Organization POSTs
were blocked by the runner and none were attempted; no role change, fixture
reinsertion or business-data write occurred. MEMBER-only viewing is covered by
DB-free tests because the existing Reviewer is ADMIN. Local screenshots/metrics
are ignored under `test-results/phase44a2/`. Production fonts, physical mobile
devices, actual saving/error states and independent native-language editorial
review remain unverified. No Production Build, full suite or full E2E was run.

## SaaS Workspace settings (Phase 4.4a-3)

Implemented 2026-11-03: `/settings/workspace` reuses AppShell's existing server
body slot and passes its resolved locale to `WorkspaceMemberRoleForm`, defaulting
to English when omitted. No AppShell change or additional locale-cookie read is
needed. Body and portaled SelectContent language follow the same Organization
pattern; English SelectValue rendering and all CSS remain unchanged.

The only new dictionary key is `workspace.membersDescription`: English retains
`People who have access to this workspace.`, Japanese uses
`このWorkspaceにアクセスできるメンバーです。`. Members, Badge/option role labels,
Save and Saving... reuse the existing `organization.*` entries (メンバー,
管理者/メンバー, 保存, 保存中...). `nav.workspace` retains the product term Workspace.
There are no new Role labels or features. Names, emails, IDs and stored data stay
verbatim. ADMIN/MEMBER values/comparisons, form Action arguments, membership and
Organization/Workspace permission boundaries, last-ADMIN protection, cookies,
revalidation and `error: string | null` behavior are unchanged. Existing English
Action errors remain English; no string matching or error-contract changes occur.

DB-free focused Vitest **6 files / 128 tests** passed, including all original
authorization cases (the file now has 32), actual member-role guards/last-ADMIN
checks, default/invalid locale, original data, role-based controls with opposite
Organization authority, both role transition arguments/values and error display.
Organization form, Shell locale flow and Home-only switching tests also passed.
Changed-file ESLint and `git diff --check` passed.

Read-only Review diagnostics confirmed `evidence_atlas_review`; the existing
verified server was reused. Chrome checked English/Japanese at 1280/768/375px,
original member data, ADMIN UI, translated options, keyboard selection/cancel,
focus return and local selection/restoration. No horizontal overflow/page errors;
Selector stayed 128×32px and Save height 28px. Existing mobile email truncation
remains. Auth/Workspace cookies and locale were preserved; language switching was
disabled on this route. No Workspace POST was attempted and no role was saved.
MEMBER viewing is covered by DB-free tests. Local screenshots/metrics are ignored
under `test-results/phase44a3/`. No auth/Action, Prisma/DB, Public Demo or fixture
changes; no Production Build, full suite or full E2E. Production fonts, physical
mobile devices and actual save/error browser states remain unverified. Onboarding,
Research bodies, AI Panel and structured-error adoption remain outside this scope.

## SaaS Onboarding (Phase 4.4b)

Implemented 2026-11-03: the standalone `/onboarding` Server Component calls
`getSaasLocale()` only after authentication and the existing accessible-Workspace
check. Already provisioned users still redirect to `/` before the locale read.
The page sets `<main lang={locale}>` and passes locale to `OnboardingForm`, whose
optional prop defaults to English. Onboarding does not use AppShell and gains no
Header/language control; no additional Provider, state or cookie mechanism exists.

Eight `onboarding.*` keys cover the existing title, description, two labels/two
placeholders and idle/pending button text. Japanese uses Workspaceの初期設定,
Organization名, Workspace名, Workspaceを作成 and 作成中..., retaining Organization,
Workspace and Research product terms. Example placeholders remain Acme Research
and Research in both languages. English wording, CSS, uncontrolled inputs,
required attributes, field IDs/names and all three pending-disabled controls are
unchanged. No client length limit is added; the Action retains its existing
trim + 1–100-character validation and all creation/membership/Cookie/redirect logic.
User-entered values are passed verbatim by the form, with no new normalization.

There are no independent fixed UI error strings. The Action's validation and
creation-failure notices remain English through the unchanged `error: string | null`
contract. `getErrorMessage()` requires structured codes, so it is not connected;
no string matching, error-contract change or new diagnostic display occurs.
Browser-native required-field messages remain browser-controlled. Existing error
paragraph semantics are retained. Home-only language switching is unchanged.

DB-free Vitest **7 files / 114 tests**, changed-file ESLint and whitespace checks
passed, including cookie fallback/guard order, form constraints/raw values/pending/
errors, existing creation validation/initial selection/redirect and authorization.
Read-only Review diagnostics passed; no fixtures or users were created. Since the
existing Reviewer is provisioned, live initial Onboarding was not exercised.
An additional isolated capture check used real components with mocked I/O/Action
states; Chrome checked 18 static cases (en/ja × idle/pending/error × 1280/768/375px)
using CSS read from the verified Review server. No overflow/page errors or
submissions; labels, Tab focus and raw input FormData were checked. These are
synthetic markup/native-input checks, not Next.js hydration, real React submission
scheduling, live success/error handling or actual provisioning. Production fonts
and physical devices remain unverified. Local artifacts are ignored under
`test-results/phase44b/`. No auth/Action/Prisma/DB/Public Demo changes, full suite,
full E2E or Production Build occurred. Research bodies and AI Panel remain deferred.

## SaaS error display contract (Phase 4.1c)

Implemented 2026-11-03: `src/lib/i18n/errors.ts` provides a display-only
`DisplayError` union, its `ErrorCode` type and `getErrorMessage(error, locale?)`.
The original phase left Actions, forms and their error return types unchanged.
Phase 4.8c-1 adopts it for Onboarding and adds two specific codes; Phase 4.8c-2
adds the two member-role Actions and six codes. Phase 4.8c-3 adds the Research
status Action and three codes; other Research Action adoption remains deferred.
Home-only language switching remains in force.

Repository investigation found five failure categories:

- Input validation: Research create/edit throws the first Zod issue; Source and
  Finding Actions usually return it as `{ error: string | null }`. Schemas contain
  English required/length/URL messages. Onboarding and member-role validation now
  use the structured notices described in Phases 4.8c-1/4.8c-2. There is still no
  shared structured field-error contract.
- Authentication/authorization: `requireUser()` redirects to sign-in; admin
  guards throw `Forbidden`. Research access combines missing/inaccessible records
  into `ResearchAccessError`, which many Actions expose as `Research not found.`.
  Future adoption must preserve this information boundary and navigation behavior.
- Missing data: Source, Finding and membership Actions return fixed not-found
  messages; Research edit can throw instead.
- Business restrictions/conflicts: role changes preserve at least one admin;
  evidence attachment checks Research ownership; duplicate Tags are rejected.
- Unexpected failures: many write catches return operation-specific generic
  notices, while unexpected access/read/indexing failures can propagate.

Other Research dialogs use `useActionState` and render `state.error` directly,
often in an alert. Onboarding, member-role forms and the Research status dialog
display their structured state through this helper. The helper does not parse legacy strings,
Zod messages, exceptions or DB error codes.

| Stable code | Dictionary key | Parameters |
| --- | --- | --- |
| `INVALID_INPUT` | `errors.invalidInput` | None |
| `INPUT_TOO_LONG` | `errors.inputTooLong` | `params.maxLength`: positive safe integer |
| `UNAUTHENTICATED` | `errors.unauthenticated` | None |
| `FORBIDDEN` | `errors.forbidden` | None |
| `NOT_FOUND` | `errors.notFound` | None |
| `CONFLICT` | `errors.conflict` | None |
| `INTERNAL_ERROR` | `errors.internal` | None |
| `ONBOARDING_INVALID_INPUT` | `errors.onboardingInvalidInput` | None; added in Phase 4.8c-1 |
| `ONBOARDING_CREATE_FAILED` | `errors.onboardingCreateFailed` | None; added in Phase 4.8c-1 |
| `ORGANIZATION_INVALID_ROLE` | `errors.organizationInvalidRole` | None; added in Phase 4.8c-2 |
| `WORKSPACE_INVALID_ROLE` | `errors.workspaceInvalidRole` | None; added in Phase 4.8c-2 |
| `MEMBER_NOT_FOUND` | `errors.memberNotFound` | None; added in Phase 4.8c-2 |
| `ORGANIZATION_LAST_ADMIN` | `errors.organizationLastAdmin` | None; added in Phase 4.8c-2 |
| `WORKSPACE_LAST_ADMIN` | `errors.workspaceLastAdmin` | None; added in Phase 4.8c-2 |
| `MEMBER_ROLE_UPDATE_FAILED` | `errors.memberRoleUpdateFailed` | None; added in Phase 4.8c-2 |
| `RESEARCH_INVALID_STATUS` | `errors.researchInvalidStatus` | None; added in Phase 4.8c-3 |
| `RESEARCH_NOT_FOUND` | `errors.researchNotFound` | None; added in Phase 4.8c-3 |
| `RESEARCH_STATUS_UPDATE_FAILED` | `errors.researchStatusUpdateFailed` | None; added in Phase 4.8c-3 |

Callers will choose codes from structured failure conditions, never by matching
existing English wording. Example:
`getErrorMessage({ code: "INPUT_TOO_LONG", params: { maxLength: 200 } }, "ja")`
returns `200文字以内で入力してください。`. No arbitrary field names, entity names,
operation text or diagnostic strings are interpolated. All eighteen keys have English
and Japanese entries; no existing Demo wording changes.

The function accepts unknown boundary input and maps only allowlisted codes to
typed keys. Unknown codes (including prototype property names), missing/invalid
length parameters and raw exceptions produce the generic internal-error notice.
`message`, `stack`, `cause` and extra parameters are ignored, never displayed.
It reuses `translate()` for English default/unsupported-locale resolution,
per-key English fallback when Japanese is absent, and named interpolation.

This synchronous pure helper and its dictionary-only dependency graph have no
Prisma/DB, Next.js, cookie, auth, request state, server-only or client-only dependency;
they can be imported on either side. Scoped Node tests cover both languages,
temporarily missing Japanese entries, interpolation, malformed/unknown input,
diagnostic non-disclosure and repeated calls with frozen inputs. Browser/RSC
integration remains unverified for this helper's Action adoption; Onboarding,
member-role and Research status Action/form adoption is implemented in Phases
4.8c-1/4.8c-2/4.8c-3 above.

## Demo language switching and Chat

The header adds a native labeled select with English/日本語 options and the current
locale selected. It supports keyboard use and wraps with the existing header at
mobile widths. `DemoLanguageBoundary` shares only local Chat activity state;
the switcher is disabled during verification/session preparation and generation.
`DemoLanguageSelect` navigates to the matching localized Demo path, preserving
the Research segment and the browser's query string (including repeated keys)
and fragment. It uses ordinary full-document navigation, creating browser history
entries without a router/middleware dependency. The header and back links remain
within their legacy/localized route family. Focus scroll margins reserve space
for the header with language and Appearance controls.

Switching after processing finishes resets the in-memory draft/session/answer;
these are not persisted or transferred across languages. Back/Forward restores
the URL, not a saved Chat session. A switch never verifies a session, submits a
question, or generates an answer. Existing browser navigation can still leave a
page; this is not an unsaved-draft confirmation feature.

`getDemoQuestions(canonicalResearchTitle, locale)` selects English/Japanese
topic-specific prompts from saved-evidence question lists. The four canonical
English titles remain the topic keys: the display overlay never replaces the
canonical title passed to Chat.
Unknown titles use language-specific general questions. Existing no-consecutive-
repeat selection, input focus, editable insertion, draft protection and manual
submission remain. The Japanese display title is never used for topic selection. Editable canonical
titles would require a separate topic-selection design.

Only client-facing Chat notices are localized. Request bodies still carry the
user's exact English/Japanese question and the same Research ID, with no locale
field or language prefix. AI prose is never translated or forced to the UI
language; the existing model receives the question as before. Actual model
language compliance has not been verified with a live service. Known fixed
evidence notices are translated for display; unknown notices remain verbatim.
Source IDs and original titles/URLs retain all existing validation. Groq model,
token limits, timeout/retry policy, Turnstile verification, Redis quotas/leases,
evidence retrieval, allowlists and all server security boundaries are unchanged.

## Metadata and document language

`demoMetadata` supplies English/Japanese titles/descriptions and relative
same-origin canonical/alternate links without hardcoding a deployment origin.
Localized pages have a canonical in their own language. Legacy English pages
canonicalize to `/en/demo`; `en`, `ja`, and `x-default` alternates point to the
matching Research ID, with `x-default` using the legacy route. Query strings are
not canonical identity. Research pages reuse the localized Demo metadata without
fetching or translating evidence for SEO. Root title templates are retained.

**Known limitation:** root `<html lang="en">` remains fixed. `DemoShell` wraps
all Demo UI in `lang="en"` or `lang="ja"`, giving Japanese content a correct
subtree language without mutating the document in an effect. Accurate per-locale
HTML language requires a future root-layout/route-group design. Do not claim the
document-wide language or Next.js hydration was verified by the browser harness.
The original Demo phase left generic not-found/fatal surfaces as framework
defaults; Phase 4.8b-2 above now supplies application-owned 404 presentation and
a context-free bilingual global failure fallback.

## Text boundaries observed in the repository

| Text category | Current location / behavior | Localization approach |
| --- | --- | --- |
| Static interface | Demo shell/pages, shared `components/research`, Appearance and Chat; SaaS navigation, Home, settings, onboarding, Research pages/business dialogs, AI controls and authentication pages | Typed UI dictionaries and accessible labels; SaaS fixed UI follows the resolved cookie locale, with explicit subtree/portal language boundaries; switching stays Home-only |
| Saved research | `Research.title`, nullable `description` and `conclusion`; `Finding.content`, optional `data`; Workspace description, Tags, Comments | Separate presentation translations, with canonical evidence retained |
| Source titles and citations | `Source.title`, `url`; `FindingSource` links; source IDs validated in Demo chat | Preserve original title, URL, IDs, and citation links; optional translated title is a clearly labeled display aid |
| AI output and question suggestions | `lib/demo/chat-generation`, `chat-client`; `chat-questions.ts` selects prompts by canonical English Research title and locale; SaaS AI panel/history | Keep UI locale independent of AI answer language; predefined Demo suggestions, fixed UI and local client notices are translated; SaaS history dates follow the locale, while previews/prose and the ambiguous API preview fallback remain original |
| Validation and errors | `types/research.ts`; `types/research/{source,finding,comment,tag,conclusion,status}.ts`; onboarding/member-role/status Actions; `lib/demo/chat-client.ts` and SaaS AI local failure branches | Onboarding/member-role/Research status Actions use structured localized codes with English fallback for unknown data; creation/editing exceptions and other Research Action errors remain English. Demo typed notices and SaaS local AI errors use dictionaries. `types/research/validation.ts` is empty and defines no schemas |

The Demo has its own header with Appearance and repository link; authenticated
pages use `AppShell`, `AppHeader`, and `AppNavigation`. There is no shared footer
component to localize. Root metadata provides an English description and title
template; Demo routes override their own title and description as described above.
Groq configuration, token limits, Turnstile, Redis rate limits/leases, random
question behavior, evidence validation, and authentication are untouched.

## Prisma and research presentation assessment

Repository sources reviewed: `src/prisma/contract.prisma`,
`src/prisma/seeds/public-demo.ts`, `src/lib/demo/read.ts`, and
[Data Model](data-model.md). This is a repository assessment, with no database or
external service connection.

The current contract stores one canonical value per text field, with no locale
or translation relations. Research and Source IDs are language independent;
Findings retain their `FindingSource` relationships. Source metadata consists of
title, URL, and timestamps, without a separate publication-language/title field.
The seed profile contains English research descriptions, findings, conclusions,
source titles, comments, and sample conversations. Its content is now extracted to
`lib/demo/curated-content.ts`; persisted values and seeding relationships are unchanged.

**Database schema changes are unnecessary for this curated Japanese Demo.**
The Phase 3 presentation overlay is implemented after the existing public read
boundary. Code-only semantic keys in the seed catalog identify curated Research
and Findings without persisting new columns or reusing generated database IDs.
The matching and fallback rules below supersede the earlier proposed ID overlay.
Workspace names/descriptions remain canonical; known Research Tag names are
translated only within a matched Demo presentation. `Finding.data` is unused.

If editable multilingual research is later required, consider separate translation
records keyed uniquely by entity ID and locale, with original revision/fingerprint,
translation provenance, and review status to detect stale translations. That is a
future design decision, not a schema change approved here. Translations are
presentation derivatives, never independently verified Sources or Findings. Do
not duplicate evidence records, rewrite seed data, or feed translated overlays into
retrieval/AI context implicitly. Original publication titles and citation identity
must remain available even when a translated display title exists.

## Scoped verification and remaining candidates

Vitest exercises actual legacy/localized route entrypoints with mocked public
reads, locale validation, metadata, dictionaries/fallback, English compatibility,
question selection, and nearby Chat/Research/Appearance behavior. The dedicated
`playwright.demo-i18n-isolated.config.ts` runs shared production display components
at synthetic Demo URLs with local data/Turnstile/API doubles at 375/768/1280px.
Every HTTP request is fulfilled or aborted, WebSockets are closed, and a dead
proxy/DNS mapping adds isolation. `DEMO_I18N_BROWSER_CHANNEL=msedge` can use installed
Edge when the Playwright Chromium executable is unavailable. The default public
Playwright configuration excludes both isolated suites.

Browser checks cover keyboard switching, current locale, repeated query keys and
fragments, Back/Forward, Research identity, focus visibility, Japanese wrapping,
overflow, random prompt insertion, draft protection, busy guards, source links,
unchanged user question text, and localized errors without automatic retries.
These are synthetic component/browser checks plus route unit tests, **not a
running Next.js HTTP/RSC/hydration or deployed SEO verification**. No real database
or AI service is contacted. Full suites and production builds are outside scope.

Remaining candidates: accurate root HTML language, Next.js/runtime and deployed SEO
verification in an authorized isolated environment, native-language copy review,
broader structured error localization, richer plural/message formatting if needed, and
localization beyond the curated Demo catalog. Editable
multilingual content storage remains a future design decision. Never duplicate
canonical Research, Source or Finding records for language variants.


## Phase 3 Research translation catalog

The four topics are Developer Productivity, Code Quality & Reliability,
Developer Experience, and Adoption & Organizational Impact. Japanese presentation
covers four titles/descriptions/conclusions, 17 Findings, four curated discussion
comments and known Research Tag labels. Workspace copy, user names, sample saved
conversations, original publication titles/URLs and AI prose are not translated.
The Japanese wording is a presentation derivative, never a newly verified source.
No external research or factual additions were made as part of translation.

### Catalog and matching

- `src/lib/demo/curated-content.ts` owns the original English seed data and adds
  code-only semantic Research/Finding keys. `public-demo.ts` imports it; no schema,
  generated contract, database row, ID generation or seed write behavior changes.
- `research-translation-baseline.json` is an independent, version-controlled
  snapshot of the reviewed English content and source attribution, with those
  semantic keys. It is deliberately not computed from live seed content at runtime.
- `research-ja.ts` stores Japanese fields under Research semantic keys, with
  Findings under their own semantic keys. Missing entries/fields are allowed by
  the resolver and fall back to canonical text.
- `research-presentation.ts` resolves display copies only in `DemoWorkspaceView`
  and `DemoResearchView`, after the existing fixed-Workspace public read boundary.
  Reads, evidence selection and Chat context never import the presentation overlay.

A Research matches exactly one baseline title + description pair. Exact comparison
includes case, whitespace and punctuation. These two fields jointly form the
canonical identity guard; a change to either conservatively falls back for the
whole Research. List rows with duplicate identity pairs remain English. Detail
matching also requires the complete original Source title/URL multiset. Source
order and generated IDs do not affect the match; added/removed/edited Sources
conservatively fall back for the whole detail. Duplicate baseline identities are
rejected rather than selected by array order.

Within a matched Research, the conclusion must equal its independent English
baseline. Each Finding matches exactly one baseline content string and must be
unique among the displayed Findings, with the same supporting Source title/URL
multiset. Missing, changed, duplicated or differently attributed Findings retain
English. A curated comment matches the exact expected text within that Research
and must be unique among its comments; other or edited comments remain English.
No matching uses array position or generated database IDs. No fuzzy, normalized,
or cross-Research search is performed. Missing Japanese fields retain English.

Exact duplicate canonical Research records cannot be distinguished on a detail
page without persisted semantic identity. Such a detail can display the same
translation only when its identity and complete source attribution match; it
cannot pick a different catalog entry. Lists reject duplicate identity pairs.
Comments are matched by scoped content, not author identity. This is appropriate
for the curated read-only Demo, not general editable multilingual data.

### Evidence, identity and dates

All Research/Finding/Source/Comment/Tag IDs, source links and FindingSource
relationships are retained. Only text-bearing display copies change. Canonical
objects and timestamps are not mutated. Original source publication titles and
URLs remain visible in Sources, supporting references and Chat citations.
Tag names are translated only through an exact known-label map; unknown names
remain English and no new tag records are created. Existing optional locale date
formatting uses `ja-JP` for Japanese and `en-US` for English, including Research,
Source, Finding and Comment timestamps. Global/authenticated behavior is unchanged.

Developer Productivity preserves the GitHub 2022 experiment's 95 professional
developers, JavaScript HTTP-server task, reported 55% faster completion, and
1h11m/2h41m averages. METR retains July 2025, 16 experienced developers, 246 real
issues in familiar repositories, early-2025 tools, and 19% increased completion
time. Proposed explanations remain hypotheses; neither result is presented as a
universal productivity effect. The translations add no metrics or citations.

Chat still receives canonical English Research titles for suggestions, original
Research IDs and original Sources. The question is sent unchanged; UI locale does
not force answer language. Backend model/security/quotas/validation/retention and
evidence retrieval are unchanged. Translated Findings never become AI evidence.

### Maintenance and limits

When canonical curated English changes, review the Japanese against that exact
revision and its original attribution. Update the affected baseline and Japanese
fields together only after reviewing facts, scope and uncertainty. Do not blindly
regenerate the baseline to make tests pass. The baseline/seed alignment test
flags repository drift; runtime guards protect against deployed database drift.
A deployed database still containing the old reviewed English can use its matching
old translation safely. Reseeding with new IDs does not change matching.

Focused tests exercise all four topics, all translated fields, baseline coverage,
reordered Findings/reseeded IDs, duplicate/missing/stale/misattributed content,
English routes, original links, tags/dates and unchanged canonical Chat context.
The isolated browser fixture now uses the curated English seed content, with all
HTTP fulfilled/aborted locally and no live AI/database connections. It verifies
Japanese study figures/conditions/uncertainty/comments, original Source links,
Chat question passthrough and language navigation at three viewport widths.
These checks remain synthetic browser/component plus route unit tests, not live
Next.js RSC/hydration, deployed SEO, Production data or live model verification.
Independent native-language editorial review remains desirable. Full SaaS data
localization, translated Sources and root HTML language remain
outside scope.
