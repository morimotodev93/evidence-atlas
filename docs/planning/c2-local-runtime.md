# C2 runtime isolation — Steps 2-B through 4-B1

Status: launcher, environment isolation, database initialization and B2 service/build
guards implemented and tested offline. Separately authorized Step 2-C checks
verified the C2 listener, endpoints, real Google OAuth and matching database-backed
session identity (record below). Step 3-A fixture implementation is offline-tested;
Steps 3-B/3-C fixture insertion and manual browser checks are developer-reported
below. Step 4-A adds the offline-tested Playwright foundation.
The first Step 4-B1 bootstrap reached the sign-in page but was aborted without
saved state, according to the developer report; offline triage is recorded below.
**Cleanup and live authenticated Playwright remain unexecuted.** Full client/font
compiler resolution and exhaustive outbound-traffic isolation remain unverified.
No application startup, OAuth login, database operation or external service call
was performed for B1. Previously completed C2 schema initialization is a separately
reported operation, not re-verified by these offline checks.

## Configuration and future command

The dedicated command is `pnpm dev:c2` (`node scripts/c2-app.ts`, Node.js 24).
It accepts no additional arguments. **Do not run without separate approval beyond
the recorded bounded Step 2-C check.** It invokes the installed Next binary without a shell:
`dev --hostname 127.0.0.1 --port 3001`. The fixed browser/OAuth origin is
`http://localhost:3001`; callback is `/api/auth/callback/google`. There is no
automatic alternative host, port, credential source, or normal-dev fallback.

The launcher explicitly parses two Git-ignored files:

- `.env.c2.local`: only `C2_MODE`, `C2_POSTGRES_PASSWORD`, `C2_DATABASE_URL`.
  The existing `.env.c2.example` remains the template.
- `.env.c2.auth.local`: only `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.
  `.env.c2.auth.example` contains empty values. Use a separately generated C2
  secret of at least 32 characters and separately reviewed Google Web OAuth
  credentials. No actual secrets are generated or copied by this task.

Missing files, duplicate/malformed assignments, unknown keys, incomplete credentials
or an unsafe DB target refuse before child creation. `AUTH_URL` is set by the
launcher; it is not a permitted file key. Client ID must have Google's Web OAuth
client suffix; validation does not establish Google-side validity or callback
registration. Dedicated files use single-line assignments without variable expansion.

## Environment isolation

The launcher starts with an OS environment allowlist, not a copy of process.env.
Inherited database/libpq/dotenv/provider credentials are discarded. Conflicting
Auth host/proxy/legacy/rotating-secret settings, origin/port/host, Public Demo mode,
and Node preload settings refuse. The launcher also checks execArgv preloads.
These checks cannot undo a preload that already ran before the launcher; start
from a trusted Node environment without NODE_OPTIONS/NODE_PATH/preload hooks.

Next.js reads `.env.development.local`, `.env.local`, `.env.development`, `.env`
independently of `DOTENV_CONFIG_PATH`. The launcher reads these files solely to
discover keys, shadows each with an empty child value, then sets approved OS/C2
values. It never copies their secret values to the child. Unknown `NEXT_PUBLIC_*`
keys are shadowed too. Ambiguous Windows case variants are rejected.

The installed `@next/env` only fills keys absent from its initial process env;
empty shadow values are therefore intentional. Tests execute actual `@next/env`
and `dotenv/config` against synthetic temporary files in an isolated Node child,
not against the project's real secrets. Do not change standard env files while
C2 runs: the shadow set is captured at startup, not a hot-reload security boundary.
Restart/revalidate after configuration changes. Internal Next dotenv-skip flags
are not used.

The child gets the validated `DATABASE_URL`, DB C2 fields, dedicated OAuth fields,
`C2_RUNTIME_MODE=local`, `AUTH_URL=http://localhost:3001`,
`PUBLIC_DEMO_MODE=false`, `NEXT_TELEMETRY_DISABLED=1` and `NODE_ENV=development`.
`dotenv/config` receives the dedicated DB file path and quiet setting. Overrides
are absent in the Prisma wrapper and empty shadow values in the app launcher.
Never use the string `"false"` for dotenv override: installed dotenv treats it
as truthy. Dedicated DB files reject any extra `DATABASE_URL` or override key.

## Database initialization

The pure validator lives at `src/lib/c2/database-target.ts`; the original script
export remains compatible. No DB runtime is imported for validation.

Before constructing either Prisma's runtime or Auth's PostgreSQL Pool, both call
`resolveRuntimeDatabaseUrl()`. With `C2_RUNTIME_MODE=local`, it requires the same
validated C2 URL in actual `DATABASE_URL`, valid DB C2 fields, normal SaaS deployment
mode, and no active libpq/dotenv override. An unexpected nonempty runtime mode fails
closed. Missing/empty runtime mode preserves ordinary SaaS/Public Demo targeting.
`C2_MODE` alone remains the DB-file/CLI intent and does not activate app guards.

URL validation is not proof of the service owning port 5433. Prior runtime identity
verification remains required before later authorized startup and OAuth writes.

## Output and browser state

The launcher reports generic validation refusal, fixed origin/binding/artifact path,
spawn errors and numeric exit code/signal only. Child stdout,
stderr and stdin are ignored because driver/Auth errors can contain credentials.
It forwards SIGINT/SIGTERM to its child; errors and termination are not readiness
proof. Detailed safe diagnostics remain follow-up work.

`.gitignore` excludes `.env.c2.auth.local`, `.next-c2/`, `playwright/.auth/`,
`.c2-browser/`, `test-results-c2/` and `playwright-report-c2/`. Sensitive future OAuth
profiles/state/recordings must use these excluded locations; no recording is created
by B1. Do not capture OAuth traces/HAR/video by default. Example files stay tracked.

## B2 server and build boundaries

`service-policy.ts` recognizes only server/build `C2_RUNTIME_MODE`, validates the
existing DB policy first, and rejects invalid nonempty modes/configuration. No HTTP
header, cookie, query/body value or public mode flag controls these protections.

- All Research Chat endpoints (send, create/list/detail conversation) return stable
  503/no-store before auth, body parsing, DB operations or providers. Future browser
  tests must mock the whole Chat contract.
- Embedding, retrieval, rate limiting and indexing reject at entry before SDK calls,
  Redis construction, spans or data reads/writes. Google model exports and the
  Inngest client use rejecting inert proxies in C2 rather than constructing clients.
- Index enqueue is an explicit C2 no-op before its catch/Sentry path. Inngest
  GET/POST/PUT return 503 before dynamic handler initialization. Worker construction
  and invocation are guarded too. Normal SaaS behavior is retained.
- Server/edge Sentry initialization and server instrumentation hooks are gated.
  The C2 build skips `withSentryConfig` completely, so no Sentry build plugins/source
  map upload integration are installed. The launcher explicitly supplies empty DSN,
  upload destination/token and zero tracing, with Next telemetry disabled.
- Both Turbopack `resolveAlias` and exact Webpack aliases replace `@sentry/nextjs`
  and the tracing helper with `sentry-disabled.ts`. This adapter has no SDK/network
  imports and covers client instrumentation, global errors and spans. It remains
  inert even if a DSN is accidentally supplied. No client-controlled flag is used.
- Root layout imports a font module. Normal builds retain IBM Plex Sans and its
  existing options. C2 aliases select an import-free system-font module; the Google
  loader is excluded by module resolution, not a runtime conditional. No font files
  were downloaded. Installed Next 16 types support the chosen alias configuration.

C2 uses `distDir=.next-c2` and `typescript.tsconfigPath=tsconfig.c2.json`. Its type
config includes C2 generated route/dev paths, excludes ordinary `.next` and puts
incremental metadata under `.next-c2`. Cache/locks are therefore in the dedicated
distDir, and Next's tsconfig writes target the C2 configuration. **`next-env.d.ts`
still lives at the shared project root.** Do not run normal dev and C2 concurrently
in this checkout. Strict simultaneous isolation needs a separately reviewed
worktree/checkout; none was created here.

Offline evidence: the complete suite passes 431 tests across 31 files; TypeScript,
lint and diff checks pass. Provider/DB/SDK mocks verify rejection ordering, real
`@next/env` plus dotenv synthetic-file tests verify secret isolation, and tests
check both bundler alias maps, inert client telemetry and normal/Demo configuration.
This does not execute the Next compiler or prove an emitted bundle has no Google
Fonts/Sentry path. **Before OAuth**, separately approved runtime verification must
check the actual compiler's alias resolution, font fallback, generated files and
absence of unintended outgoing requests. No Next dev/build was run for B2.

Step 2-C subsequently established bind/origin, true Google login and C2 DB session
identity as recorded below. Exhaustive outbound-traffic verification, persistent
browser profile/cookie isolation and Playwright configuration remain later stages.
No runtime-readiness claim is made by offline B1/B2 tests.

## Step 2-C startup failure and controlled verification (2026-10-12, JST)

The Ready → exit 1 failure came from a top-level dynamic-import `await` in
`next.config.ts`. Installed Next 16's default TS config loader transforms the
module to CommonJS and evaluates it with `requireFromString`; top-level await is
invalid in that path, even though a direct native ESM import probe succeeds.
Next's start-server implementation deliberately prints Ready before configuration
and request-handler initialization, so that message was not startup confirmation.

The import is now inside the supported exported async config function. C2 returns
its configuration before importing Sentry; normal SaaS/Demo still wrap the config.
The temporary Webpack CLI switch was removed: it did not address configuration
loading and was not retained as a workaround. Other pre-existing formatting edits
were preserved. The launcher retains private stdout/stderr pipes and ignored stdin;
these stdio settings worked with the fixed configuration and were not changed.
Safe diagnostic categories now include config/async-loader, filesystem and module
resolution errors; exit after Ready explicitly refuses a startup-success claim.
Exit and stream-close events are distinguished without emitting raw output.

Offline tests use locally installed synchronous Next/SWC transforms and an isolated
CommonJS evaluation with mocked service imports. They reproduce the old syntax
failure and verify actual fixed config loading in both C2 and normal modes, without
starting a compiler server or taking an SWC download fallback.

After successful offline target validation, C2 container identity/health/port checks,
empty port 3001 and guard tests, one corrected `pnpm dev:c2` attempt ran with default
Turbopack. It remained running beyond initial Ready, listened only on
`127.0.0.1:3001`, created `.next-c2`, and returned anonymous HTTP 200 from
`GET /api/auth/session` and HTTP 503 from `GET /api/inngest`.
The process was then stopped; port 3001 no longer listened. No OAuth, mutations,
seeds, migrations, Docker changes or AI calls were performed.

Metadata-only snapshots of all 1,081 ordinary `.next` files (paths, sizes and
timestamps, including five event files) were identical before/after this attempt.
No diagnostic contents were printed or saved. Two established-TCP observations
for the C2 Node process chain saw no non-loopback connections; these snapshots
are **not proof of zero transient outbound traffic**. The root page/font/client
bundle was not verified by these two endpoint checks. Runtime check Node version
was v24.16.0, differing from the task's reported v24.19.0; Next was v16.3.8.

First post-start lint exposed a missing `.next-c2` ignore rule and linted generated
code. The dedicated output is now excluded, without deleting artifacts or disabling
source checks. This preserves lint behavior after actual C2 startup.

## Step 2-C Google OAuth verification (2026-10-12, JST)

- Confirmed the dedicated Google OAuth Client ID, callback URL, and test-user configuration.
- Verified C2 PostgreSQL identity: `evidence_atlas_c2`, role `c2_local`, isolated container on `127.0.0.1:5433`.
- Completed real Google OAuth login using a private browser session.
- Authenticated user was redirected to `/onboarding`.
- Browser `/api/auth/session` returned a valid authenticated session.
- C2 database User / Google Account / Session counts changed from 0 / 0 / 0 to 1 / 1 / 1.
- Confirmed the browser session User ID matched the C2 database User ID.
- Inngest GET returned HTTP 503 as expected.
- No workspace creation, fixture seeding, migration, or external AI invocation was performed.

Step 2-C OAuth and database session verification passed. Step 3-A implementation
is recorded below; fixture execution and authenticated Playwright E2E remain
pending. Comprehensive outbound-traffic isolation has not been established.

## Step 3-A safe fixture implementation (2026-10-13, JST)

Implementation and offline verification only. No fixture command, database
connection, insertion, cleanup, migration, app startup, OAuth login or external
service call was performed for this step. The real User, Google Account and
Session from Step 2-C must be preserved. Existing AI/embedding/Redis/indexing,
Inngest and Sentry protections remain intact. Phase 10 is incomplete.

The dedicated Node.js 24 entry point is `scripts/c2-fixture.ts`, separate from
development/public-demo seeds. Its pure plan, runner and SQL adapter live in
`scripts/c2-fixture-{plan,runner,store}.ts`; app/demo code does not import them.
The existing Prisma 8 contract, runtime and development seed were inspected.
The adapter uses the installed `pg` driver directly for explicit read-only
transactions, server identity queries, table locks and parameterized SQL without
loading the normal Prisma singleton, dotenv/config or migration configuration.
No schema/contract change or new ownership table is needed.

### Target and identity gates

- Read only `.env.c2.local` with the existing strict dedicated-file parser; reject
  missing, malformed, duplicate or extra keys. Reuse `validateC2Target` before
  driver import/client construction. No normal dotenv or inherited DB credential
  fallback. Host, port, database, role and decoded password are explicitly passed;
  SSL/options and timeouts are explicit too. Reject Demo/runtime conflicts and
  Node preload settings. A preload already executed before the script cannot be
  undone; use a trusted Node environment.
- `validate` is offline and never constructs a DB client. All other modes require
  both `C2_FIXTURE_USER_ID` and `C2_FIXTURE_USER_EMAIL` in the process environment,
  never in command arguments or tracked files. Query User by ID **or** email and
  require exactly one matching pair; never guess the first/only User. Require
  exactly one Account for this User, of provider `google`, type `oidc` (the installed
  Auth.js Google provider's account type for this OAuth login), with a
  nonempty providerAccountId, and at least one unexpired database Session.
  Missing/ambiguous/inconsistent identity refuses all operations, including cleanup.
  This confirms persisted evidence, not a fresh Google/browser identity exchange.
  Google Auth.js does not require a non-null User.emailVerified here.
- Before graph checks, confirm `current_database() = evidence_atlas_c2` and
  `current_user = c2_local`. URL/server identity checks do not independently prove
  which container owns port 5433; re-confirm Step 2-C container/port identity at
  the next approved runtime gate. Do not start the ordinary development app.
- `dry-run` and `verify` use repeatable-read **READ ONLY** transactions. `insert`
  and `cleanup` require the exact separate flag `--allow-c2-write`, use serializable
  transactions, and lock fixture plus dependency tables in SHARE ROW EXCLUSIVE
  mode before graph inspection. This serializes concurrent fixture operations and
  prevents app graph mutations racing with ownership checks. Auth tables are not
  locked or mutated. Lock/statement timeouts fail with rollback; no automatic retry.

### Ownership, idempotence and cleanup

One versioned graph contains exactly eight records: Organization, Membership,
Workspace, WorkspaceMembership, Research, Source, Finding and FindingSource.
Entity IDs are fixed `c2-e2e-v1-*`; titles/names/descriptions/content carry
`[C2 E2E fixture v1]`. Source uses `https://example.invalid/c2-e2e-v1` and is never
fetched. Timestamps and content are deterministic; only references to the selected
existing User vary. No Account, Session, token, embeddings or AI data is created.

All existing scoped rows must exactly match the manifest, including IDs, parent
links, roles, content and timestamps. Prefix matching alone is insufficient.
Junction ownership requires verified parent records since junctions have no
marker fields. This is a reserved-ID/content ownership convention, not
cryptographic provenance: an independently created identical graph is
indistinguishable. Reserve this namespace exclusively for C2.

Insertion creates only missing records, in dependency order; matching records are
left untouched. Repeated execution creates no duplicates. Collisions, modified
records, another selected User, extra memberships/descendants, or references from
Tags, ResearchTags, Comments, Conversations, RetrievalChunks or AiUsageEvents
refuse before mutation. Cleanup deletes only pre-verified exact keys in reverse
dependency order, without relying on cascades; repeated cleanup is a no-op.
User/Account/Session and unrelated graphs are preserved. Errors roll back the
whole operation. UI edits or added children intentionally block cleanup; reviewing
those changes requires a later task, never broad deletion or forced reset.

Output is only mode/counts or generic refusal; raw driver errors, User identifiers,
email, OAuth tokens and session cookies are never printed. Auth reads project only
identity/account metadata and Session.userId, not provider tokens/sessionToken.
No artifact or private identity file is generated and secret-exclusion rules are
unchanged. Failure diagnostics intentionally require private local inspection in
a separately authorized task rather than exposing driver error text.

### Proposed commands — NOT EXECUTED

Run from the repository root only after the next appropriate approval. Supply
the verified existing User ID/email through a private process environment; do not
paste real values into tracked scripts, logs, terminal history or reports. The
commands intentionally contain no identity or credential values.

```powershell
# Offline target validation (no DB client)
node scripts/c2-fixture.ts validate
# Read-only identity/ownership checks and planned insert/delete counts
node scripts/c2-fixture.ts dry-run
# Explicit authorized insert only
node scripts/c2-fixture.ts insert --allow-c2-write
# Read-only verification of the complete exact manifest
node scripts/c2-fixture.ts verify
# Separately authorized cleanup only
node scripts/c2-fixture.ts cleanup --allow-c2-write
```

Dry-run requires a DB connection and active real Session; it is distinct from
offline `validate`. No fixture command above was run in Step 3-A. Offline tests
simulate SQL execution and transactions; they do not establish real PostgreSQL
locking, commit/rollback, runtime schema compatibility or authenticated E2E.
Offline verification passed **502 tests across 34 files**, including 64 dedicated
fixture tests, plus `pnpm exec tsc --noEmit`, `pnpm exec eslint .` and
`git diff --check`. The installed Google provider configuration was inspected and
tested without any OAuth request. Tests cover target/client-construction ordering,
identity ambiguity, ownership/collisions, idempotence, simulated insert/delete
rollback, read-only paths and cleanup/auth boundaries. Vitest's esbuild child
initially hit sandbox EPERM; the offline suite passed after approved escalation.
Gate at the Step 3-A handoff: re-confirm C2 service identity and privately select the existing
User, authorize read-only dry-run, review its counts, then authorize fixture writes.
Cleanup and authenticated Playwright require their own explicit approval.

## Steps 3-B and 3-C — developer-reported runtime observations

These observations were supplied with the Step 4-A request on 2026-10-13 (JST).
They were not re-executed in Step 4-A and are not Playwright automation results.

- The guarded fixture `insert` succeeded for eight records. Real DB `verify`
  returned `{"mode":"verify","present":8,"plannedInserts":0,"plannedDeletes":8}`.
- The authenticated Workspace overview loaded and displayed 1 Research,
  1 Source, 1 Finding and 0 Tags.
- Research detail loaded; the expected Source and Finding were visible.
  No UI mutations were performed.
- The real Google Auth.js User/Account/Session were preserved according to the
  implemented fixture mutation scope. **No separate before/after auth-row
  integrity audit is claimed.**

Fixture runtime insertion/verification and manual read-only UX verification have
therefore been reported as complete. Cleanup and automated authenticated E2E
remain pending. Earlier Step 3-A offline results retain their historical meaning.

## Step 4-A isolated authenticated Playwright foundation (2026-10-13, JST)

Implementation and offline verification only: no browser launch, HTTP request,
server start/stop, Docker operation, Google login, actual cookie acquisition/export,
fixture operation or database connection was performed for this step. Baseline:
`5ae04c7` on `main`. Phase 10 remains incomplete.

### Configuration, preflight and browser network boundary

`playwright.c2.config.ts` selects only `e2e-c2/authenticated-smoke.spec.ts`, Chromium,
one worker, zero retries and maxFailures=1, with bounded action/navigation/test/
suite timeouts. It has no webServer or automatic app startup. C2 origin is fixed
at `http://localhost:3001`; `E2E_BASE_URL` is rejected, including an override that
happens to match. Production/preview/Demo, other host/port, remote browser,
proxy/preload and debug settings are refused. The approved command wrapper
accepts no arbitrary extra CLI flags and starts Playwright's installed CLI directly
through Node with an OS allowlist plus explicit C2 test settings/user selection;
ordinary dotenv files and provider/DB credentials are not loaded or forwarded.

Global setup validates the resolved config, including origin, browser, recordings,
reporter, output, worker/failure limits, storage overrides and absence of webServer.
It requires the separate read-only opt-in before any live preflight. Preflight uses
GET requests with maxRedirects=0, exact response URLs and no Location headers:

1. `/api/inngest`: 503, the existing fixed C2-disabled error and no-store.
2. `/api/auth/providers`: only the configured Google OIDC provider and exact C2
   signin/callback URLs. This reads indicators and never invokes signin.
3. `/api/auth/session`: selected existing User ID/email and future session expiry.
4. `/`: 200, expected fixture Workspace and no Public Demo marker.

Each browser test revalidates session/preflight in a fresh context. HTTP indicators
are independent checks but **do not prove PostgreSQL container identity, server
session strategy or comprehensive outbound isolation**. Database-backed strategy
is established by the existing Auth.js source and previously reported Step 2-C
verification. Container/DB identity verification remains a separate authorized
runtime operation. GET-only client policy is not a proof that server-side code
performs no writes; Auth.js session reads can refresh session lifetime.

The browser boundary permits only GET for root, fixture Research list/detail,
session/provider/Inngest checks, favicon and Next static assets. Only Next's `_rsc`
query parameter is allowed. Signin/callback, onboarding, edits, Chat and all other
paths or methods are blocked. Service workers are blocked. All cross-origin
browser requests fail the scenario. The only websocket exception is C2's local
`ws://localhost:3001/_next/webpack-hmr`; other sockets are blocked and fail.

Playwright does not route later hops of an HTTP redirect. The harness therefore
uses `route.fetch({ maxRedirects: 0 })`, inspects the response and fulfills it;
ordinary tests reject redirects before any hop is sent. Network failures produce
fixed redacted diagnostics, never raw URLs/headers/bodies. Browser interception
does not establish absence of server or browser-background outbound traffic.

### Manual authentication bootstrap and private state

`scripts/c2-playwright.ts bootstrap --allow-c2-auth-bootstrap` is a future manual,
headed operation. It requires an interactive terminal and the privately supplied
existing fixture User ID/email. Before opening Chromium it checks Inngest/Auth
indicators with an empty cookie context and requires anonymous session state.
It then creates a fresh ephemeral browser/context and opens only the fixed C2
origin. It never imports cookies from a private browser or ordinary persistent
profile, enters credentials, bypasses MFA or clicks through Google automatically.
The developer completes Google login and presses Enter after returning to the
fixture Workspace; incomplete login, wrong User, wrong return route, unexpected
origin or network violations refuse persistence. The browser closes afterwards.

Only this bootstrap permits the C2 Auth.js signin/callback paths and required
HTTPS GET/POST to `google.com`, `gstatic.com`, `googleusercontent.com` and their
subdomains. Redirect destinations are checked before following them. Regional or
additional authentication domains are deliberately refused until separately
reviewed; real manual compatibility with Google challenges/redirects remains
unverified. Bootstrap never enables app mutation or AI endpoints.

Capture filters in memory to exactly one `authjs.session-token` cookie for
`localhost`, path `/`, HttpOnly, SameSite=Lax, non-secure (fixed local HTTP) and
future expiration. All Google/unrelated cookies, localStorage and IndexedDB are
discarded. No User ID/email or callback URL is saved. State is a versioned envelope
at the fixed ignored `playwright/.auth/c2-user.json`, containing origin, capture/
session expiry and the minimal storageState. Loading requires a valid envelope,
no extra cookies/origins, future cookie/session expiry and capture age <=12 hours.
Server preflight also validates that the token authenticates the selected User.
Absent/invalid/stale/untrusted state fails; no replacement login/session is created.

The storage layer rejects symlinked parents/files, non-files, hardlinks, oversized
files and files changed between stat/open. Parent creation is sequential after
checking each parent, never recursive through an unchecked symlink. New directories
use mode 0700 and the state file uses exclusive creation with mode 0600; an existing
state file is never silently overwritten. POSIX permissions are checked. Windows
does not enforce these modes as POSIX permissions: **review the local directory's
Windows ACL privately before bootstrap**. Windows ACL/provenance and races caused
by another process with access to the same trusted directory are not independently
verified. Renewal requires private review/removal of the prior state and a new
explicitly approved bootstrap; no automatic cleanup command is supplied.

Cookies are not port-scoped. Fresh Playwright contexts plus exact origin/port
request enforcement isolate this state from `localhost:3000`. These controls do
not repair or authorize ordinary development browser profiles.

### Read-only scenarios and artifact protections

Four scenarios follow the actual accessible UI:

- A: authenticated root and fixture Workspace heading; the existing named
  Workspace Summary region shows Research=1, Sources=1, Findings=1, Tags=0.
- B: the named Research list region contains the fixture Research; its exact
  `/research/c2-e2e-v1-research` link opens the expected detail heading.
- C: Research title, Source heading, Finding article/supporting-source link,
  Conclusion/Sources/Findings/Discussion headings and empty conclusion/discussion
  render; the actual Back to Research link returns to the list. External Source
  links and mutation/AI controls are never clicked.
- D: session remains valid across local navigation; Inngest is still 503 and
  origin/network checks hold. No identity fields are passed to assertion output.

Existing Public Demo config and all six specs remain untouched. Vitest excludes
the separate `e2e-c2/` runtime specs; offline coverage stays under `scripts/`.
No full Chat E2E is implemented. A later Step 4-C can extend the context fixture
with explicit exact-contract browser mocks registered after the boundary, fully
fulfilling requests locally. C2 server Chat 503/service guards must remain intact.
Streaming, citations, restoration, Supporting Sources and mobile coverage remain
future work; current desktop tests only inspect existing evidence.

Trace, screenshot and video are off; HAR is not enabled. The existing ignored
`test-results-c2/` is separate from Demo output; authenticated HTML reports are not
enabled (`playwright-report-c2/` remains reserved/ignored). Raw worker stdout/stderr,
errors and attachments are not forwarded by the custom reporter; the wrapper also
suppresses raw subprocess output. Assertion errors are replaced with fixed messages.
Output preservation is `never`. Installed Playwright 1.63.0 otherwise captures an
ARIA failure snapshot even when recordings are off; `PLAYWRIGHT_NO_COPY_PROMPT=1`
suppresses that snapshot. Offline tests pin this installed implementation so an
upgrade requires review. Generic error-context text may be generated internally
but contains redacted errors and no page snapshot. No OAuth callback URLs, state,
cookies, provider metadata, session headers or private identity are logged.
Any future authenticated debug capture needs separate explicit review.

### Proposed runtime commands — NOT EXECUTED

All commands below require separate authorization. The existing C2 app must be
running and its service/DB identity independently confirmed; these commands never
start/restart servers, Docker, migrations or fixtures. Supply
`C2_FIXTURE_USER_ID` and `C2_FIXTURE_USER_EMAIL` privately via process environment
without placing real values in tracked files, command arguments/history or logs.
Use a trusted environment without proxy/debug/preload/target overrides.

```powershell
# C2-only HTTP/session preflight; requires previously saved valid C2 state
node scripts/c2-playwright.ts preflight --allow-c2-readonly
# Fresh headed browser, manual Google login, minimal private state persistence
node scripts/c2-playwright.ts bootstrap --allow-c2-auth-bootstrap
# Authenticated read-only automation; preflight runs again before tests
node scripts/c2-playwright.ts run --allow-c2-readonly
# Separately authorized post-test fixture verification (no fixture writes)
node scripts/c2-fixture.ts verify
```

For the first run, approve bootstrap first because preflight/run require saved
state. Then authorize standalone preflight and authenticated read-only execution.
The `run` wrapper does not accept reporter/trace/baseURL/startup overrides.
`pnpm exec playwright` on Windows adds NODE_PATH through its shim and is refused;
the supported Node wrapper calls the installed CLI without that shim.
Live bootstrap/preflight/E2E and post-test DB verification have **not** run in
Step 4-A. Cleanup is neither needed nor authorized by these commands.

### Step 4-A offline verification

`pnpm exec vitest run` passed **607 tests across 36 files**, including 105 new
C2 Playwright policy/network/config/reporter/filesystem tests. TypeScript
(`pnpm exec tsc --noEmit`), full ESLint (`pnpm exec eslint .`) and
`git diff --check` passed. Source comparison confirms the Public Demo config,
its six specs, package/credentials and secret-exclusion rules were unchanged.
Offline checks use synthetic identities/cookies and mocked HTTP, Playwright and
filesystem interfaces; they never read/write actual saved browser state.

Node's installed Playwright CLI with `--list` collected four C2 cases without
global setup, browser launch, authentication-state access or HTTP requests.
This is configuration/discovery evidence only, **not an E2E pass**. The C2 pnpm
shim invocation was intentionally refused because it injects NODE_PATH; clean
process environment plus direct installed Node CLI resolved discovery without
relaxing the guard. Live cookie format, Windows ACL, manual Google bootstrap,
redirect interception, HMR compatibility and actual UI locators remain runtime
verification items. The next approval gate is the manual bootstrap (including its
OAuth/session writes and private file creation), then read-only preflight and the
four-scenario run; post-test fixture verification needs separate DB-read approval.

## Step 4-B1 — bootstrap navigation failure, offline triage (2026-10-13, JST)

Baseline `2ba7620` on `main`. This task performed source inspection, minimal
bootstrap correction, offline regression and documentation only. No real browser,
HTTP, OAuth, database, Docker, fixture or authentication-state operation was
performed, and no commit/push was made. Historical Step 4-A results above were
not rewritten as new evidence.

### Developer-reported first attempt

The developer invoked the manually approved bootstrap with both selected User
environment fields. Fresh Chromium launched and rendered the default Auth.js
sign-in page at the fixed C2 origin. The Google button was visible, its icon
appeared broken, and the tab continued showing a loading indicator. One click
produced no visible navigation; Google account selection and a Workspace return
were not observed. The developer aborted without pressing Enter. The reported
`Test-Path` check for `playwright/.auth/c2-user.json` returned `False`; no saved
state was found. The fixture was not intentionally changed. Windows ACLs had
reportedly been limited to owner, SYSTEM and Administrators. These observations
and ACL/state-file claims were not independently rechecked during this task.
No successful Playwright authentication or E2E is claimed.

### Established source behavior and remaining hypotheses

Installed versions inspected: NextAuth `5.0.0-beta.32`, `@auth/core` `0.41.3`,
Playwright `1.63.0`, Next.js `16.3.8`. Evidence comes from local installed source:

- Auth core `lib/utils/providers.js` constructs `/api/auth/signin/google`.
  `lib/pages/signin.js` renders a native POST form with hidden csrfToken and
  callbackUrl fields. Google is OIDC; its default page is Preact SSR with inline
  styling and no Next client/hydration script. The existing local POST allowlist
  is correct; no additional signin POST endpoint is justified.
- Auth core init/CSRF logic prepares the signed double-submit cookie; POST signin
  checks cookie/body token agreement. `lib/actions/signin/authorization-url.js`
  may perform server-side issuer discovery before returning an authorization
  URL and PKCE/check cookies. `lib/utils/web.js` converts the redirect into 302
  with Location and multiple Set-Cookie headers. The task did not call discovery.
- The default Google icon is a lazy image at exactly
  `https://authjs.dev/img/providers/google.svg`. That host is outside the bootstrap
  outbound allowlist. Previously its rejection latched a fatal network violation,
  guaranteeing refusal to persist state if it was requested. **This explains a
  cosmetic failure/persistence blocker, not the observed button navigation stop.**
  The previous boundary did not automatically reject every later allowed request
  merely because its failure flag was set.
- Playwright's installed `Route.fetch` delegates to the browser context's API
  request context and copies the original request body. With maxRedirects=0 it
  returns the redirect response without following it. `Route._innerFulfill`
  inherits status/headers and body; Chromium splits multiple Set-Cookie headers
  before fulfillment. Static inspection found no demonstrated loss of the native
  form body or response status/cookies. Their actual CSRF/cookie/Google behavior
  still requires a real-browser retest.
- The method rule is POST-to-GET for 301/302, GET for 303 except HEAD, and original
  method for 307/308. The method/status classifier now explicitly limits redirects
  to these statuses. Native redirect hops may bypass later Playwright route
  interception; validating one Location is not evidence that every browser/provider
  hop has been inspected. Existing first-response validation and navigation checks
  remain in place; this task does not claim an exhaustive redirect audit.
- Next static assets and local HMR are already permitted. The inspected Google
  default sign-in page requires neither Next hydration nor an extra development
  endpoint to submit its native form. No dev-resource allowlist expansion was
  justified. Failures on other application pages/resources remain distinguishable
  by safe blocked-resource/navigation codes, pending a real observation.

**The exact cause of the no-navigation observation is unresolved offline.**
Possible stages include a stalled/failed server authorization/discovery request,
an Auth.js local error redirect, fetch/fulfillment failure, or a blocked request.
The loading spinner and broken icon do not establish which stage failed. No
navigation fix or successful Google transition is claimed by static/mocked tests.

### Minimal correction and fixed diagnostics

During bootstrap only, the exact known icon GET of resource type `image` is
fulfilled with an inert locally generated SVG and no-store. No request is sent
to authjs.dev; it does not become an allowed outbound host. Script/document/POST,
alternate paths/hosts and query variants receive no exception. Ordinary E2E still
rejects the icon's cross-origin request. All other policy violations remain fatal.
Cookie capture/persistence, selected User/session checks, C2 target, Google domain
allowlist, normal E2E GET rules and fixture/production code are unchanged.

Bootstrap initial navigation waits for DOMContentLoaded, then verifies the visible
Google button, exact native form action/method and presence of a nonempty hidden
CSRF field, without exposing its value. It checks fatal network state before
presenting the manual prompt. It never clicks the button or enters credentials.
Final return route, session and network checks still precede state persistence.

Fixed diagnostic codes are printed without raw URLs/query/body/headers/error
messages, cookies, codes, PKCE/state, User ID/email or session data:

- `SIGNIN_READY` / `SIGNIN_UNAVAILABLE`: form readiness.
- `COSMETIC_ICON_LOCAL`: proven cosmetic image handled without outbound traffic.
- `AUTH_SUBMIT`: permitted native local POST reached interception.
- `AUTH_REDIRECT`: permitted external authorization redirect response;
  `AUTH_LOCAL_REDIRECT`: local Auth.js return/error class (no error query logged).
- `AUTH_RESPONSE_INVALID`, `REDIRECT_REFUSED`, `REDIRECT_STATUS_UNSUPPORTED`:
  missing/unsupported/refused redirect response or target.
- `FETCH_FAILED` / `FULFILL_FAILED`: distinct interception stages. The code does
  not assert whether a fetch failure was timeout, server or provider failure.
- `BLOCKED_C2_RESOURCE`, `BLOCKED_C2_NAVIGATION`, `BLOCKED_EXTERNAL_RESOURCE`,
  `BLOCKED_EXTERNAL_NAVIGATION`: denied request class; all remain fatal.
- `GOOGLE_NAVIGATION` / `LOCAL_RETURN`: navigation class observed, not proof of
  authentication. `RETURN_INVALID`, `SESSION_VERIFICATION_FAILED`,
  `NETWORK_REFUSED`, `MANUAL_WAIT_FAILED`, `STATE_SAVE_FAILED` identify later
  refusal; `STATE_SAVED` follows successful private persistence only.

The formatter runtime-allowlists codes and substitutes UNKNOWN for arbitrary
values. Network codes are deduplicated; phase failures have fixed codes. The CLI's
existing generic final error remains, with these safe codes available beforehand.
No screenshots/traces/HAR/video/browser dumps or persistent diagnostics were added.

### Offline regression and next controlled attempt — NOT EXECUTED

Offline regression uses real installed Auth.js page rendering/toResponse with
synthetic fields and mocked Playwright/browser/HTTP/terminal/persistence objects.
It checks the form/CSRF field/icon, original response forwarding, 301/302/303/307/
308 methods, malicious/unsupported destinations, cosmetic handling versus fatal
violations, fetch/fulfillment diagnostics, form readiness, abort/network/return/
identity failures never saving state, and successful synthetic capture excluding
Google state. Existing normal E2E/Demo restrictions remain covered. These are
source/mocked results, not a Chromium/OAuth integration pass.

Full verification passed **644 tests across 37 files**, including 37 new cases;
TypeScript, full ESLint and `git diff --check` passed. The original four C2 and six
Demo scenarios are unchanged. Cookie/state/credential/secret-exclusion settings and
Windows ACL guidance were preserved.
Browser-free `--list` discovery again collected four C2 and six Demo cases; global
setup, HTTP preflight and browser execution were not run by discovery.

After separate approval and the developer's existing C2 identity/configuration
checks, privately supply the same selected User fields and run only the second
manual bootstrap attempt:

```powershell
# Second real-browser attempt — NOT EXECUTED in Step 4-B1
node .\scripts\c2-playwright.ts bootstrap --allow-c2-auth-bootstrap
```

Observe fixed codes, manually click Google once, and distinguish AUTH_SUBMIT,
AUTH_REDIRECT/AUTH_LOCAL_REDIRECT and GOOGLE_NAVIGATION from cosmetic handling or
an explicit failure. If navigation stops, report only these codes and broad UI
state; do not export URLs, headers, page contents or auth artifacts. Abort on a
failure. Press Enter only after successful return to the fixture Workspace; state
is saved only after the selected session and strict capture contract validate.
Then check file existence privately without reading/printing contents. This task
did not inspect or change the developer's protected authentication directory.
The second live attempt, saved-state creation and authenticated E2E remain
**NOT EXECUTED**. Fixture verify/cleanup and the four-scenario run are not included
in this next bootstrap step.
