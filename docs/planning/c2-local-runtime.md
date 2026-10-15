# C2 runtime isolation — Steps 2-B through 4-B3

Status: launcher, environment isolation, database initialization and B2 service/build
guards implemented and tested offline. Separately authorized Step 2-C checks
verified the C2 listener, endpoints, real Google OAuth and matching database-backed
session identity (record below). Step 3-A fixture implementation is offline-tested;
Steps 3-B/3-C fixture insertion and manual browser checks are developer-reported
below. Step 4-A adds the offline-tested Playwright foundation.
The first two bootstraps reached the sign-in page; the third and fourth reached a
Google main-frame request but stalled without an observed response/commit. All were
stopped without saved state according to developer reports. Step 4-B3 adds a
standalone, offline-tested native Chromium HTTPS probe; it has not been executed.
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

## Bootstrap OAuth navigation follow-up — second attempt (2026-10-13, JST)

The developer reported `SIGNIN_READY`, `COSMETIC_ICON_LOCAL`, `AUTH_SUBMIT`,
`AUTH_REDIRECT`, then `MANUAL_WAIT_FAILED` after stopping the unsuccessful attempt.
Chromium remained on the Evidence Atlas sign-in page; no successful Google
navigation was observed. The reported state-file existence check returned False.
No real auth state was inspected in this follow-up. The current checkout at task
start was clean on `971f342`, containing the earlier diagnostics, rather than
uncommitted changes over `2ba7620`. This task made no commit or push.

### What the reported codes establish

`AUTH_REDIRECT` was emitted **before** `await route.fulfill({ response })`. It
establishes only that the API client received a redirect status and a Location
allowed by the bootstrap policy. It does not establish fulfillment completion,
browser receipt, a Google request, navigation commit, or authentication.
`MANUAL_WAIT_FAILED` identifies the ended manual wait, not the OAuth root cause.

The previous `GOOGLE_NAVIGATION` listener used `framenavigated`, which fires on
commit rather than initial navigation attempt. Failed/blocked/pending requests
can therefore occur without that code. It also examined all frames, so an allowed
Google subframe could previously produce a misleading navigation-stage code.
Listeners were registered only for future context pages; existing pages were
not observed. The fresh bootstrap registers its boundary before newPage, but
request observation at context level is still needed for pre-commit requests.

Installed Auth.js `0.41.3` / NextAuth `5.0.0-beta.32` continue to render the native
CSRF POST and produce 302 Location/Set-Cookie responses. Installed Playwright
`1.63.0` copies status, headers and body from APIResponse, and Chromium delegates
fulfillment through `Fetch.fulfillRequest` with split Set-Cookie headers. This
establishes the intended data path, not actual browser acceptance in the attempt.
Its `catchDisallowedErrors` helper suppresses some command failures, so even a
resolved fulfill Promise is not conclusive evidence that Chromium received or
honored the redirect. The installed helper's suppression was reproduced offline
with a mocked protocol predicate; no CDP session/browser was constructed.

Chromium's installed `_onRequest` auto-continues redirected requests rather than
creating another user Route, while BrowserContext request/response/requestfailed
events remain available. A missing route diagnostic does not prove Google was
never requested or was blocked by our route policy. Context request observation
does not itself prevent a native hop from being sent. Repository source inspection
found no configured CSP form-action restriction; actual browser response policy
was not read and cannot be ruled out. No redirect/cookie/security-header bypass
or change to production authentication was justified.

**The direct cause of this second attempt's navigation stop is still unresolved.**
Only the diagnostic ordering/coverage gaps are established and corrected offline.
No successful Google redirect/navigation fix is claimed.

### Narrow diagnostic additions

Response forwarding remains `route.fetch({ maxRedirects: 0, timeout: 15_000 })`
plus `route.fulfill({ response })`; original redirect status, Location, cookie and
body handling remain intact. No automatic page.goto to Google, manual redirect
rewrite, extra destination/method permission or credential automation was added.

The diagnostic stages now distinguish:

| Fixed code                                  | Evidence, and its limit                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| AUTH_REDIRECT                               | Policy-approved API redirect response, before fulfillment                                  |
| AUTH_FULFILL_STARTED                        | Driver fulfillment call started                                                            |
| AUTH_FULFILL_COMPLETED                      | Fulfill Promise returned; not proof of browser receipt                                     |
| AUTH_FULFILL_PENDING                        | At manual-wait end, call started but had not returned/failed                               |
| AUTH_BROWSER_POST                           | Browser-context POST event observed                                                        |
| AUTH_BROWSER_REDIRECT                       | Browser-context response event has a redirect status                                       |
| GOOGLE_NAV_REQUEST                          | Allowed main-frame provider navigation request observed, even without a Route              |
| GOOGLE_NAV_ROUTE                            | Such a request additionally reached the route handler                                      |
| GOOGLE_NAV_RESPONSE / GOOGLE_NAV_HTTP_ERROR | Browser-context provider response class observed                                           |
| GOOGLE_NAVIGATION                           | Allowed provider URL committed to the main frame; not auth success                         |
| GOOGLE_SUBFRAME_NAV_REQUEST                 | Provider subframe request, distinct from main-frame navigation                             |
| GOOGLE_NAV_NOT_OBSERVED                     | Fulfill returned but no main-frame provider request/commit was observed by manual-wait end |
| GOOGLE_NAV_UNCOMMITTED                      | Main-frame provider request observed, without commit by manual-wait end                    |

Browser failed requests use only fixed BLOCKED/CANCELED/NETWORK/OTHER categories
under `AUTH_BROWSER_FAILED_*` or `GOOGLE_NAV_FAILED_*`. The classifier compares
against exact known Chromium error strings and never prints failure text.
Cancellation during developer stop/browser closure is not evidence of the
original failure. `AUTH_BROWSER_RESPONSE_OTHER` identifies a non-redirect browser
response; `SIGNIN_CSP_FORM_ACTION` reports directive presence only, without
logging its value or asserting it caused a block. `OBSERVATION_UNAVAILABLE`
reports missing/closed frame data without exposing exceptions.

Bootstrap context observers cover requests, responses and failures before frame
commit, including native redirected requests. They do not enable any request.
An observed request outside the existing policy latches fatal refusal with
`REQUEST_OBSERVED_REFUSED`; this protects final persistence, and is not a claim
that the observer prevented transmission. Existing route checks remain in place.
Main-frame commit codes are emitted only for the main frame, while origin checks
still cover every frame. Both existing and future pages are observed once.
At manual wait completion/failure, observations are summarized before Chromium
closes. Ordinary E2E does not install these bootstrap-only observers or emit codes.
No full URL/query, response body, cookie/header/token, User ID/email, screenshots,
traces, HAR, videos or browser dumps are exposed or persisted.

### Offline verification and next attempt — NOT EXECUTED

Full Vitest passed **662 tests across 38 files**, including 18 new regressions:
pending/rejected/returned fulfillment, browser response versus API validation,
redirect requests observed without route/commit, fixed failure categories,
subframe distinction, existing/future page listeners, unknown-hop refusal, CSP
presence classification, normal-E2E isolation, unavailable frame data, installed
helper suppression and the pre-close stopped-wait summary. TypeScript, full ESLint
and `git diff --check` passed. Mocked event/source tests are not browser navigation
or OAuth integration results. Four C2 and six Demo scenarios, cookie capture,
fixture/DB guards and production configuration are unchanged.

After separate approval, the developer-controlled **third** bootstrap attempt is:

```powershell
# Third real-browser attempt — NOT EXECUTED in this offline follow-up
node .\scripts\c2-playwright.ts bootstrap --allow-c2-auth-bootstrap
```

Privately retain the selected User environment fields and existing C2 identity/
ACL checks. Manually click Google once. If navigation stops, stop the attempt and
report only the fixed codes: whether fulfillment returned, whether a browser
redirect response/provider request/failure appeared, and the pre-close summary.
Do not send OAuth URLs, session data or artifacts. Press Enter only after genuine
return to the fixture Workspace. No third bootstrap, live HTTP/preflight, Chromium,
OAuth, DB/fixture operation or real state-file creation was executed here.

## Step 4-B2 — third attempt's uncommitted Google navigation (2026-10-13, JST)

Baseline `ae2596de51bbb40a90cf40e4b8c5a7aefc7df258`, `main`, clean at task start.
This step inspected source, added minimal bounded diagnostics, ran offline tests
and updated documentation only. No browser, live HTTP, OAuth, database, Docker,
migration, fixture or authentication-state operation was executed. No commit/push
or Windows networking/proxy/certificate/security setting change was performed.

### Developer-reported evidence and its limits

The Windows TCP check for `accounts.google.com:443` returned True. The third
bootstrap reported COSMETIC_ICON_LOCAL, SIGNIN_READY, AUTH_BROWSER_POST,
AUTH_SUBMIT, AUTH_REDIRECT, AUTH_FULFILL_STARTED, AUTH_FULFILL_COMPLETED,
AUTH_BROWSER_REDIRECT and GOOGLE_NAV_REQUEST. Chromium then displayed a blank/
loading page. No GOOGLE_NAV_ROUTE, GOOGLE_NAV_RESPONSE or successful main-frame
GOOGLE_NAVIGATION was observed. After the developer waited and stopped the
attempt, MANUAL_WAIT_FAILED, GOOGLE_NAV_UNCOMMITTED and
GOOGLE_NAV_FAILED_CANCELED appeared. The reported state-file existence check was
False. These are developer observations, not a runtime retest by this task.

The browser response event corroborates receipt of a redirect status, and the
request event establishes that Chromium initiated a provider main-frame request.
Neither demonstrates successful DNS/TCP/TLS negotiation, response headers, commit
or authentication. The final canceled event arrived during stopping/closure and
**is not evidence that Google's request independently failed beforehand**. Live
authenticated E2E remains unexecuted and no saved state is claimed.

### Installed-source conclusions versus unresolved hypotheses

Auth.js `0.41.3` / NextAuth `5.0.0-beta.32` generate native CSRF POST and 302
Location/Set-Cookie. Playwright `1.63.0` forwards original status, headers and body
through Chromium Fetch.fulfillRequest with duplicate-cookie splitting. Fulfill
Promise completion is an API-stage result; its command-error suppression prevents
a universal browser-acceptance guarantee. In this particular reported attempt,
the browser redirect response and next request provide additional evidence.
The task did not demonstrate cookie acceptance or complete OAuth semantics live.

Chromium's `_onRequest` auto-continues redirected requests instead of creating a
new user Route. Consequently GOOGLE_NAV_REQUEST without GOOGLE_NAV_ROUTE is
consistent with installed behavior and does not establish that the policy blocked
it. Context request events precede response/commit; requestfailed comes from
Chromium Network.loadingFailed. Missing response/commit events mean those stages
were not observed, not that no network activity happened. A pending redirect or
navigation transition can coexist with a blank/loading UI. No source evidence
established the reason this particular request remained pending.

The code keeps 301/302 POST-to-GET, 303-to-GET except HEAD, and 307/308 method
preservation checks, with original response forwarding. It does not substitute
unconditional route.continue(), change Location/cookies, bypass headers/security
or automatically navigate to Google. Native later hops can still bypass routing;
observation can latch refusal to persist but cannot prove the hop was never sent.

Windows TCP reachability is narrower than Chromium HTTPS/OAuth reachability.
Windows's check, Node's route.fetch/APIRequestContext and Chromium's native
redirect use distinct execution/network paths. DNS address selection, IPv4/IPv6,
system proxy/PAC behavior, TLS negotiation, certificate validation and internal
redirect/interception behavior remain hypotheses. No host networking settings or
actual socket/TLS data were inspected. Node's successful retrieval of the local
Auth.js redirect does not test the external Chromium request.

Installed Chromium launch construction applies proxy flags only when configured
proxy options are supplied; bootstrap supplies only headed launch and blocked
service workers. This does not prove absence of system proxy behavior. The
installed context defaults include ignoreHTTPSErrors=false and bypassCSP=false;
the API client's TLS rejectUnauthorized bypass is opt-in. No proxy override,
certificate bypass, DNS/IP forcing or Chrome security flag was added. A
security-preserving navigation fix is **not established offline**.

### Bounded observations and shutdown-aware cancellation

`c2-playwright-navigation-watch.ts` is a state-only observer with a fixed
**20,000 ms** deadline for each observed allowed provider main-frame request.
It never sends a request, aborts navigation, retries authentication or writes state.
At the deadline it emits:

- GOOGLE_NAV_PENDING_NO_RESPONSE: no response event observed for this request.
- GOOGLE_NAV_PENDING_AFTER_RESPONSE: response observed, but no main-frame commit.
- GOOGLE_NAV_ROUTE_NOT_OBSERVED: the pending request had no observed user Route;
  this is not a statement that interception caused or prevented the stall.

Each observation timer fires at most once and does not extend on duplicate events.
A native redirect retires the previous hop's timer and watches the next request.
Commit or a failure clears timers; shutdown/disposal clear all timers and schedule
no new work. The pending-only pre-close summary now excludes known failed requests
and late events from retired hops. Frame classification is cached at request time
so cancellation remains observable even if the frame detaches during browser close.

BOOTSTRAP_SHUTDOWN_STARTED marks the harness's deliberate shutdown phase, before
browser.close, including rejection of the manual wait. Failure classification is:

- GOOGLE_NAV_FAILED_BEFORE_SHUTDOWN plus a fixed BLOCKED/TLS/DNS/NETWORK/OTHER
  category for failures observed before the marker.
- GOOGLE_NAV_CANCELED_BEFORE_SHUTDOWN for a canceled event before the marker;
  this does not identify developer intent or independent connectivity failure.
- GOOGLE_NAV_CANCELED_DURING_SHUTDOWN for cancellation observed after the marker.
- GOOGLE_NAV_FAILED_DURING_SHUTDOWN for other errors during the shutdown phase,
  without presenting them as earlier independent failures.

TLS/certificate and DNS categories compare exact known Chromium error strings;
unknown text becomes OTHER. Raw text is never logged. Shutdown classification is
timing relative to the explicit marker, not a claim about what caused cancellation.
If a developer closes a window before the harness marks shutdown, the event may
still be classified BEFORE_SHUTDOWN and cannot be attributed automatically.

Normal read-only E2E installs no bootstrap observers. The origin/host/method
allowlists, service/fixture/database guards, Public Demo independence, minimal
application cookie capture, Git-ignore and Windows ACL protections are unchanged.
No traces, HAR, screenshots, videos, storage dumps, headers, bodies, OAuth URLs/
queries, User ID/email or credentials are emitted or persisted by the diagnostics.

### Optional non-authenticated probe — design only, NOT EXECUTED

A separate fresh Chromium check of the fixed candidate
`https://accounts.google.com/robots.txt` could remove Auth.js, application DB,
OAuth parameters and the Node route.fetch/fulfill path from the experiment. It
could compare same-host Chromium HTTPS response availability against the OAuth
stall, but would not prove OAuth authorization endpoints or challenge handling.
The endpoint's current response/status/redirect behavior was not verified offline.

No probe CLI was implemented or executed. Its safe implementation needs separate
review of pre-hop redirect containment: ordinary context.route alone cannot
guarantee redirect-hop blocking. Any later design must use a fixed exact target,
fresh ephemeral context, no imported state/credential entry/app request, strict
deadline (e.g. 15 seconds), certificate verification, no proxy/security override,
no automatic OAuth fallback, and only fixed response/failure classes. It must
reject redirects before following them, close its ephemeral context and produce
no cookie/profile export or logs/artifacts. The source-reviewed response-stage
containment would be additional implementation scope. A live probe requires
separate explicit approval and is never automatic in bootstrap/E2E.

### Offline verification and next safe action

Full Vitest passed **684 tests across 39 files**, including 22 new cases for fake-
clock deadlines, pending versus failed/committed/redirected requests, disposal,
shutdown timing, detached-frame cancellation and TLS/DNS redaction. TypeScript,
full ESLint and `git diff --check` passed. Tests used synthetic data and mocked
browser/HTTP interfaces; no Chromium, TCP/HTTPS check or OAuth was performed.
The original four C2 and six Demo scenarios remain unchanged.

The next bounded developer-controlled bootstrap, after separate approval and
existing C2 identity/private User/ACL checks, is **NOT EXECUTED**:

```powershell
# Fourth bootstrap attempt — NOT EXECUTED in Step 4-B2
node .\scripts\c2-playwright.ts bootstrap --allow-c2-auth-bootstrap
```

Manually click once, allow the 20-second diagnostic observation, then report only
fixed response/pending/failure/shutdown codes if it stalls. Do not retry or press
Enter while on a blank/provider page; stop the unsuccessful attempt. Press Enter
only after genuine fixture Workspace return. A pending code is not a network
timeout diagnosis and will not initiate an automatic retry. No further app server,
fixture operation or networking/security change is required or authorized here.

## Step 4-B3 — isolated Chromium HTTPS probe (2026-10-13, JST)

Baseline `7b3f84d` on `main`, clean at task start. Implementation/source inspection,
mocked regression and offline verification only. No probe/Chromium/live HTTP,
Google OAuth, DB, Docker, app-server or fixture operation was performed. No real
auth-state file was accessed or created. No commit or push was made.

### Fourth Bootstrap attempt — developer report

The reported sequence was AUTH_BROWSER_POST, AUTH_SUBMIT, AUTH_REDIRECT,
AUTH_FULFILL_STARTED, AUTH_FULFILL_COMPLETED, AUTH_BROWSER_REDIRECT,
GOOGLE_NAV_REQUEST, GOOGLE_NAV_PENDING_NO_RESPONSE and
GOOGLE_NAV_ROUTE_NOT_OBSERVED. Chromium remained blank/loading. After stopping,
MANUAL_WAIT_FAILED, BOOTSTRAP_SHUTDOWN_STARTED, GOOGLE_NAV_UNCOMMITTED and
GOOGLE_NAV_CANCELED_DURING_SHUTDOWN appeared. Saved state was reported absent.
No Google response was observed before the 20-second observation deadline;
shutdown cancellation is not an independent Google network failure diagnosis.
Separately Windows TCP reachability to `accounts.google.com:443` was reported
True. Chromium DNS/TLS/HTTPS reachability and the OAuth stall's root cause remain
unestablished. These observations were not repeated by this task.

### Dedicated command and native transport

The new entry point is `scripts/c2-browser-https-probe.ts`; its standalone policy,
runtime and offline tests are in `c2-browser-https-probe-{policy,runtime}.ts` and
`c2-browser-https-probe.test.ts`. Bootstrap/E2E do not import or auto-run it.
It requires only the exact `--allow-c2-network-probe` flag and accepts no additional
arguments, URL, profile, proxy or authentication options. It neither requires nor
accesses a User ID/email, Auth.js session, C2 database or running Evidence Atlas app.

The sole target is the literal `https://accounts.google.com/robots.txt`. Measurement
uses native `page.goto`, with no APIRequestContext/Node HTTP/route.fetch substitute.
Headless mode with the explicit `chromium` channel selects the same installed full
Chromium binary as headed Bootstrap (not chromium-headless-shell), per installed
1.63.0 executable selection. Mode differs from Bootstrap; this is a basic native
HTTPS diagnostic, not an exact reproduction of headed OAuth/challenge behavior.

Each invocation creates a fresh non-persistent browser/context. No storageState,
existing profile, cookies, credentials or private browser state are imported.
Service workers, JavaScript and downloads are disabled; TLS errors are not ignored,
no certificate/security flags or proxy overrides are supplied, and cache is disabled.
The Chromium child receives only an OS environment allowlist, excluding database,
OAuth, fixture User and provider credentials. Node preload/debug, Playwright/remote
browser overrides and inherited proxy settings refuse before driver import/launch.
The script does not load standard/C2 dotenv files, seed or app DB/auth modules.

No remote body is fetched through the protocol or rendered. No storage/cookie
export, trace, screenshot, HAR, video, network dump or report is created. Installed
Playwright documents newContext as non-persistent, with no browsing-data disk
persistence; ordinary temporary browser-process directories are owned and cleaned
by Playwright. The probe never prints those paths. This is not an assertion that
Chromium performs no temporary process/filesystem operations internally.

### Redirect containment: installed protocol evidence and enforcement

Installed `playwright-core/types/protocol.d.ts` defines Fetch Request stage before
sending and Response stage after response arrival but before receiving body. It
states that the request remains paused until an explicit continue/fail/fulfill
command, and that redirect responses and subsequent requests are also reported.
`Fetch.failRequest` fails the paused request. The implementation relies on this
Response-stage pause contract, not Playwright's ordinary redirect route callbacks.

Before navigation, the probe obtains the fresh main-frame ID and requires successful
Network/cache/Fetch setup. Fetch captures all Request and Response stages; matching
all traffic enables inspection/refusal, not outbound permission. The Request gate
allows one exact GET Document from that frame, rejects redirected/duplicate
requests, subframes/subresources and alternate destinations, and explicitly sets
interceptResponse=true on its sole continuation. Response events must correlate
to the approved Fetch/network request and retain the exact URL/method/frame.

At Response pause, **every response is failed before continuation**, including all
3xx. No Location is followed/read for navigation, no response/body/headers are
forwarded, and no Fetch.continueResponse, Fetch.disable or CDP detach releases the
paused response. All 300–399 statuses are classified HTTPS_REDIRECT_REFUSED. Any
ordinary 200–299 or 400–599 status can establish response-header receipt, so 200 is
not required. Status outside these ranges or mismatched metadata refuses. HTTP/
proxy authentication challenges receive CancelAuth, never credentials.

The safe terminal classification is produced only after the response-abort command
acknowledges. Setup/abort-command failure refuses and starts browser/context
closure; no insecure continuation fallback exists. CDP .send uses the direct
session command path, not RouteImpl's catchDisallowedErrors helper. Intentional
abort events are suppressed as measurement failures. Offline protocol-source and
mock tests establish this control logic; **actual live Chromium containment has
not been executed or independently packet-audited**. Containment is for the fresh
page's traffic, not proof about all browser-internal background networking.

### Deadlines, cleanup and privacy

A fixed 15-second measurement deadline covers launch/setup/native observation.
Startup/goto also receive bounded remaining time. It performs no authentication
retry or additional navigation. A late-created browser after timeout is immediately
closed and cannot begin a context/navigation. Success, refusal, cancellation and
timeout all call context.close/browser.close. Fetch stays active until the page
is destroyed. Cleanup waiting has a separate 5-second budget; lack of acknowledgement
or a rejected close produces HTTPS_CLEANUP_FAILED and overall refusal, never a claim
that closure completed. A stuck driver/OS cleanup cannot be guaranteed away by the
public browser API; that limitation is reported rather than changing security or
force-killing unrelated processes. The usual total bounded wait is at most about
20 seconds, excluding initial module loading and exceptional process teardown.

Output is runtime-allowlisted fixed codes only. URLs/queries, headers, cookies,
tokens, bodies, identities, profile paths and arbitrary exception text are never
printed. Exact known native/Fetch failure values map to DNS/TLS/NETWORK/CANCELED;
unknown or insufficient error data remains HTTPS_FAILURE_UNCLASSIFIED. A local
deadline is HTTPS_TIMEOUT and does not prove a TLS problem. Generic CDP failures
can lack enough data to distinguish TLS; no such diagnosis is invented.

| Code                                                          | Interpretation of a future live result                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| CHROMIUM_STARTED                                              | Installed browser launch returned; no HTTPS proof yet                                             |
| HTTPS_REQUEST_STARTED                                         | Exact native request was approved; no response proof yet                                          |
| HTTPS_RESPONSE_RECEIVED                                       | Ordinary HTTPS response headers arrived and the response was terminated; no OAuth proof           |
| HTTPS_REDIRECT_REFUSED                                        | 3xx headers arrived and were terminated before following; transport responded but target changed  |
| HTTPS_DNS_FAILURE / HTTPS_TLS_FAILURE / HTTPS_NETWORK_FAILURE | Exact correlated native failure class; underlying cause still needs review                        |
| HTTPS_TIMEOUT                                                 | Measurement deadline elapsed; pending startup/setup/request is not conclusive TLS evidence        |
| HTTPS_FAILURE_UNCLASSIFIED                                    | Available error data does not support a narrower cause                                            |
| HTTPS_AUTH_CHALLENGE_REFUSED                                  | Credentials/challenge handling was refused; proxy challenge may precede origin TLS                |
| HTTPS_CANCELED                                                | Context/browser or correlated navigation was canceled; not independent connectivity failure proof |
| HTTPS_PROBE_REFUSED                                           | Invocation, metadata, containment or overall safety failed; no success claimed                    |
| HTTPS_CLEANUP_FAILED                                          | Closure was not acknowledged; overall exit fails even if earlier headers were received            |

Exit succeeds only for HTTPS_RESPONSE_RECEIVED with acknowledged cleanup; all other
terminal results fail. Intermediate fixed facts can precede a cleanup refusal.
For example, redirect refusal demonstrates headers arrived but still exits failed.

### Offline verification and proposed command — NOT EXECUTED

Full Vitest passed **751 tests across 40 files**, including 67 new probe cases.
TypeScript, full ESLint and `git diff --check` passed. Coverage includes exact opt-in,
fixed target/env gating, fresh context/binary selection, native transport, pre-hop
Response-stage 3xx refusal, command failure, unexpected traffic, auth cancellation,
correlated error classification, timeout/late creation, closure/cleanup budgets,
redaction and Bootstrap/E2E independence. Browser/CDP interfaces were mocked;
source-contract tests inspected the installed package without constructing a
browser/session. Four C2 and six Demo scenarios, existing OAuth/session/fixture/DB
guards, credentials and secret-exclusion rules are unchanged.

After separate developer approval, from a trusted Node environment without
debug/preload/proxy/browser overrides, run the independent probe only:

```powershell
# Native HTTPS probe — NOT EXECUTED in Step 4-B3
node .\scripts\c2-browser-https-probe.ts --allow-c2-network-probe
```

No app-server startup, User selection, auth-state file or DB setup is needed for
this utility. Report only fixed codes. Header receipt would narrow the investigation
toward OAuth/redirect/endpoint/mode-specific behavior, without establishing a
successful login. A probe failure does not by itself identify Windows networking
or Google as its cause. Do not change certificates, security flags or proxy settings
to force success, and do not automatically retry OAuth/fixtures/E2E. No probe or
fifth OAuth attempt was executed in this task; the stall root cause remains unknown.

## Step 4-B4 — developer-reported live HTTPS probe observations (2026-10-13 JST)

This section updates the historical _not executed_ statement in Step 4-B3.
The four native Chromium executions below were performed locally by the
developer, not by this code-review task. All were standalone Probe invocations
against the fixed `https://accounts.google.com/robots.txt` target; the
developer shared only fixed diagnostic codes and exit status, not raw network
logs, IDs, headers, cookies or authenticated state.

| Revision                              | Developer-reported codes                                                     | Exit status |
| ------------------------------------- | ---------------------------------------------------------------------------- | ----------- |
| Baseline `6d2179c`                    | `CHROMIUM_STARTED → HTTPS_REQUEST_STARTED → HTTPS_PROBE_REFUSED`             | Failure     |
| First refusal-classification revision | `CHROMIUM_STARTED → HTTPS_REQUEST_STARTED → HTTPS_REQUEST_MISMATCH`          | `1`         |
| Request/response mismatch split       | `CHROMIUM_STARTED → HTTPS_REQUEST_STARTED → HTTPS_DUPLICATE_REQUEST`         | `1`         |
| Fetch/network identity split          | `CHROMIUM_STARTED → HTTPS_REQUEST_STARTED → HTTPS_SECOND_FETCH_SAME_NETWORK` | `1`         |

The latest fixed code establishes: after a matching Request-stage pause was
approved, a second matching Request-stage pause had a **different Fetch requestId**
but the **same present networkId**. The second pause was **aborted**, not
continued. This does **not** prove two HTTP GETs were transmitted, that a
Google HTTPS response was received, or that DNS/TLS failed. In particular,
CDP Fetch request IDs do not identify individual HTTP requests by themselves;
the network ID correlates to a Network.requestWillBeSent ID. Chrome/Fetch
interception can report distinct Fetch IDs for one Network ID; the underlying
cause in this particular execution remains unknown.

After the first refusal split, the developer ran the focused mocked Vitest
suite (**70/70**), TypeScript, targeted ESLint and git diff check successfully.
After the mismatch split, the same checks passed (**71/71**). After the
Fetch/network identity split, the developer again reported passing offline
checks (**72/72**), then performed the single fourth live probe listed above.
These are developer reports, not an independent CI or live-browser re-test.

**Current stop condition:** Do not grant an additional Fetch.continueRequest
on the strength of a shared networkId, allow a redirect, change browser/TLS
security settings, or diagnose OAuth from these results. Preserve the one-GET
gate and response-stage abort, and keep PR #1 Draft/unmerged while reviewing
whether Chromium internally re-pauses or restarts the same network request.
No further repeat Probe, fifth OAuth Bootstrap, C2 E2E or fixture/DB mutation
is authorized by these observations. C2 fixture 8 rows remain protected.

## Step 4-B5 — minimal CDP interception configuration review (2026-10-13 JST)

### Reason for the change

The latest developer-reported standalone run returned
`CHROMIUM_STARTED → HTTPS_REQUEST_STARTED → HTTPS_SECOND_FETCH_SAME_NETWORK`
and exit 1 after all 72 focused mocked tests and targeted TypeScript, lint
and diff checks had passed. That demonstrates two matching Request-stage
Fetch pauses with distinct Fetch IDs and a shared Network ID. It does **not**
prove that two outbound HTTP GETs were transmitted, or establish DNS/TLS,
Chromium behavior, Google reachability or OAuth root cause.

Review of the Chrome DevTools Protocol `Fetch.pdl` and Chromium's
`DevToolsURLLoaderInterceptor::InnerContinueRequest` establishes that
`Fetch.continueRequest({ interceptResponse: true })` enables the response
stage **for the paused request** even if `Fetch.enable` initially selected
only the Request stage. The old probe specified universal Request _and_
Response patterns and also set the per-request response override.
That is overlapping configuration, not evidence of the observed duplicate
pause's root cause.

Reference implementations:

- https://github.com/ChromeDevTools/devtools-protocol/blob/master/pdl/domains/Fetch.pdl
- https://chromium.googlesource.com/chromium/src/+/lkgr/content/browser/devtools/devtools_url_loader_interceptor.cc
- https://github.com/puppeteer/puppeteer/issues/7475 (historic similar identity pattern, not proof of the same cause)

### Revised minimal configuration and boundaries

The probe now uses **one wildcard Request-stage Fetch pattern** before any
navigation. Every page request is still paused before sending and must pass
the exact fixed GET, Document, main-frame and no-redirect metadata gate.
The sole permitted `Fetch.continueRequest` still supplies
`interceptResponse: true` and no URL/method/headers modifications.
The response is therefore still intercepted before body forwarding and must
be aborted before an HTTP response is reported. All unexpected or repeated
Request-stage pauses remain aborted without a second continuation.
`Fetch.authRequired` still cancels authorization; no credentials are used.

No Playwright route manager, Node HTTP fallback, state or browser-profile reuse,
security/proxy override, redirect follow, response-body read, app access, OAuth
or DB interaction was added. Fixed target and opt-in, 15-second measurement
and 5-second cleanup are unchanged. This change is a smaller CDP policy
configuration, **not a proven fix** for a second Fetch pause.

### Validation and execution gate

The existing mock contract now asserts the single universal Request
pattern and verifies the sole continuation has `interceptResponse: true`.
Older test and live evidence above applies to the previous revision;
the changed files have **not yet** been retested locally. First run focused
Vitest, TypeScript, targeted ESLint and `git diff --check`. Keep the
PR Draft and do not automatically execute another native HTTPS probe,
OAuth Bootstrap, C2 E2E, or the protected eight-row fixture. Any later
single live probe requires separate developer-controlled authorization.

## Step 4-B6 — Request-only live probe reproduction and investigation pause (2026-10-13 JST)

After the Step 4-B5 revision, the developer reported the following **offline**
checks passing on the actual Windows checkout: focused Vitest **72/72**,
`pnpm exec tsc --noEmit`, targeted ESLint and `git diff --check`.
These are user-reported results, not CI verification.

The developer then approved and ran one native standalone probe under the
**Request-only Fetch pattern with per-request `interceptResponse: true`**.
Its complete fixed-code output was:

```text
CHROMIUM_STARTED
HTTPS_REQUEST_STARTED
HTTPS_SECOND_FETCH_SAME_NETWORK
ExitCode=1
```

This reproduces the previous fixed-code result even though the universal
Response-stage pattern was removed. Therefore **the overlapping Request/Response
Fetch.enable configuration is not a sufficient explanation or solution**.
The Request gate still aborts the second matching paused event instead of
continuing it. There is no observed response-header receipt, and the root
cause of the original OAuth blank/loading navigation is still unproven.

CDP Fetch.pdl states that `Fetch.RequestId` does not uniquely identify
individual HTTP requests within a network request. Puppeteer's NetworkManager
source explicitly anticipates multiple `Fetch.requestPaused` events for the
same `Network.requestWillBeSent`; Puppeteer issue #7475 also records an
older similar trace, but neither proves the precise origin of these particular
Chromium events.

Source context:

- https://github.com/ChromeDevTools/devtools-protocol/blob/master/pdl/domains/Fetch.pdl
- https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer-core/src/cdp/NetworkManager.ts
- https://github.com/puppeteer/puppeteer/issues/7475

**Decision:** Pause further retries and diagnostic-code proliferation.
Do not automatically continue a second Fetch pause merely because its
networkId matches: matching IDs do not authorize another wire request.
Do not relax TLS, proxy, response/redirect containment or credential policy
to force a successful response. Preserve this PR as a Draft and the one-GET
gate unchanged. Any alternate probe design would need a **separate safety
review of the redirect/no-second-request guarantee** before a live run.
No OAuth Bootstrap, E2E, app, C2 fixture (8 rows) or database operation
is authorized by this observation.

## Step 4-B7 — out-of-process HTTPS egress isolation design review (2026-10-13 JST)

See [C2 native Chromium HTTPS probe — out-of-process egress isolation design review](./c2-https-egress-isolation-review.md).

No alternate browser probe was implemented or executed. The review distinguishes
**destination-level outbound enforcement** (potentially achievable with a
credential-free disposable VM, verified default-deny network policy and a
fixed-policy CONNECT gateway) from the **strict original exact-URL and
at-most-one-on-wire-GET requirement**. HTTPS CONNECT preserves native
Chromium-to-Google TLS, but cannot inspect the encrypted URL path, method
or number of HTTP requests on one tunnel. A single tunnel is **not** a
single HTTP GET, and a same-host redirect cannot be excluded by the gateway
alone. TLS MITM/certificate overrides are not accepted as a workaround.

**Decision: NO-GO** for a new live probe under unchanged strict requirements.
A narrower destination-isolation/TLS-reachability experiment would be a
different explicitly approved test with an independently reviewed VM and
gateway implementation; no such approval or environment inspection exists.
Keep PR #1 Draft. Preserve the eight-row C2 fixture and OAuth/E2E/DB stop
conditions. This is a documentation-only design/safety review.

## Step 4-B8 — Chromium 153 static source review (2026-10-15 JST)

A read-only investigation confirmed that Playwright 1.63.0
specifies Chromium revision 1243, version 153.0.8010.12.
The installed Windows chrome.exe reports the same version.

Chromium 153 passes ResourceRequest.devtools_request_id
to newly created InterceptionJob instances, while each
InterceptionJob receives its own Fetch interception ID.

NavigationURLLoaderImpl can recreate loaders while preserving
the ResourceRequest and its DevTools request ID.
Potential restart paths include Client Hints handling,
redirect processing, and ThrottlingURLLoader behavior.

This mechanism is consistent with the observed
HTTPS_SECOND_FETCH_SAME_NETWORK result.

However, the actual restart path, the number of HTTP GETs
sent on the wire, and the original OAuth navigation failure
remain unproven.

Decision: Record this as a plausible internal Chromium
restart mechanism, not a confirmed root cause.

Keep the existing one-request safety gate unchanged.
Do not automatically rerun the native probe, OAuth Bootstrap,
or private C2 E2E. Preserve the eight-row C2 fixture and DB.
Keep PR #1 Draft.

## Step 4-C1 — isolated Chat mock E2E foundation (2026-10-15 JST)

Developer-reported implementation was committed and pushed as `ff68a6d`
(`test(c2): add isolated Chat mock E2E suite`) on the existing Draft PR
branch. This is a separate offline-tested feature increment, not a fix for
the Step 4-B OAuth/Chromium navigation failure.

- `e2e-c2/fixtures.ts` exports an opt-in `chatTest` fixture. The original
  authenticated smoke tests continue to use `test` unchanged.
- `e2e-c2/conversation-mocks.ts` intercepts only the exact C2 fixture
  conversation collection endpoint, fulfilling local `GET` lists and
  in-memory `POST` creation. No Chat API/DB/model call or `route.fetch`
  is needed; unexpected requests fail closed.
- `e2e-c2/chat.spec.ts` defines two Chat-only cases: E (create a new
  in-memory conversation) and F (show it in History). Neither sends a
  Chat message or selects a conversation for detail restoration.
- `playwright.c2.chat.config.ts` selects only `chat.spec.ts` under a
  separate `c2-chat-chromium` project. The original C2 config still
  selects only `authenticated-smoke.spec.ts`. The wrapper requires the
  distinct `chat --allow-c2-chat-mock` command and sets a Chat-only
  capability flag; `global-setup.ts` checks suite/config consistency.
  Both suites still require the existing C2 preflight and saved
  authenticated state before any actual browser execution.

Developer-reported Windows offline verification after these changes:
focused Vitest **131/131 across 3 files**, `pnpm exec tsc --noEmit`,
targeted ESLint and `git diff --check` all passed. Subsequent standalone
Playwright `--list` checks collected **4 smoke cases** and **2 Chat cases**,
with status `passed` for discovery only. This is not a browser E2E pass,
CI confirmation, or evidence of a successful authenticated Chat flow.

**Decision:** Treat Step 4-C1 fixture, collection mock, and suite separation
as implemented and offline-checked. The next separate, offline-only task
is a deterministic conversation-detail mock and History restore assertion;
it must not enable a real Chat endpoint or expand the normal smoke suite.
Do not automatically run the authenticated browser suites, OAuth Bootstrap,
native HTTPS Probe, C2 app, or database. Preserve the eight-row C2 fixture,
security/recording restrictions and Draft PR status.

## Step 4-C2 — deterministic Chat History restoration (2026-10-15 JST)

The developer committed and pushed the History restoration increment as
`b0ed398` (`test(c2): add mocked Chat history restoration`). This adds a
locally seeded conversation with fixed synthetic USER and AI messages, an
exact in-memory conversation-detail GET, and Chat-only scenario G that
selects the History entry and checks the restored text. The original
four authenticated smoke cases remain separate. No actual Chat API,
provider or database write is needed for the synthetic response.

Developer-reported Windows offline checks passed: focused Vitest
**142/142 across 3 files**, `pnpm exec tsc --noEmit`, targeted ESLint,
and `git diff --check`. Playwright `--list` collected **4 smoke** and
**3 Chat** cases. These collection checks did not execute browser E2E.

## Step 4-C3 — deterministic local Chat text response (2026-10-15 JST)

After `b0ed398`, the developer applied an additional local-only change
to `e2e-c2/chat.spec.ts`, `e2e-c2/conversation-mocks.ts`, and
`scripts/c2-playwright-conversation-mocks.test.ts`. Scenario H exercises
the UI's Send action using one fixed synthetic prompt. The Chat-only
mock permits a narrowly checked POST to the exact fixture Chat URL only
after explicit per-test enablement; it fulfills a fixed `text/plain`
response locally and records synthetic messages for the mock detail GET.
Unknown IDs, unexpected methods, request metadata or message bodies
are refused. Existing service-policy 503 behavior is unchanged.

The browser UI uses `response.body.getReader()` to consume the text,
but Playwright `route.fulfill` supplies a complete body. This verifies
a stream-compatible text-reading path, **not** timed multi-chunk
delivery, real model inference, or actual streamed browser E2E success.

Developer-reported Windows offline validation after this patch:
- Focused Vitest: **159/159 passed across 3 files** (38 Chat mock,
  5 suite-selection, 116 existing C2 checks).
- `pnpm exec tsc --noEmit`, targeted ESLint and `git diff --check`:
  no errors reported.
- Playwright `--list`: **4 smoke cases** and **4 Chat cases** collected,
  with runner status `passed` for discovery only.

At the time of these checks the three stream-mock files were modified
locally and not yet reported committed. This section records the
reported verification, not a subsequent commit, CI run, or live
authenticated E2E pass.

**Decision:** Proceed with the documentation and a reviewable commit
for this offline-tested increment. Do not automatically run real
browser E2E, OAuth Bootstrap, the native HTTPS Probe, the C2 app,
database or external AI calls. Preserve the protected eight-row C2
fixture, strict recording/network guards and Draft PR status.

## Step 4-C4 — synthetic Chat send-error UI (2026-10-15 JST)

Step 4-C3's deterministic text-response work and verification record were
committed and pushed as `ad24968` (`test(c2): add mocked Chat text response
and validation record`). This Step 4-C4 increment is a subsequent,
separate local change awaiting a commit as of the following checks.

- `e2e-c2/conversation-mocks.ts` provides an explicitly enabled failure
  mode that locally fulfills a **single** strictly validated Chat POST with
  a synthetic HTTP **503** JSON response. The response is not forwarded to
  the actual C2 Chat service, AI provider or database. Unexpected requests
  and repeated failures remain fail-closed; success and failure modes cannot
  be enabled together.
- `e2e-c2/chat.spec.ts` adds Chat-only scenario **I**, covering the send
  error alert (`Failed to send message.`), optimistic-message rollback,
  composer re-enablement, and error clearing when starting a new local
  conversation. Existing Chat scenarios E–H are retained.
- `scripts/c2-playwright-conversation-mocks.test.ts` adds offline coverage
  for the synthetic 503, mode exclusivity, unexpected prompt rejection,
  and duplicate-failure refusal.

Developer-reported Windows **offline** verification after applying the
Step 4-C4 patch:

- Focused Vitest: **163/163 passed across 3 files** (42 Chat mocks,
  5 suite-selection, 116 existing C2 checks).
- `pnpm exec tsc --noEmit`, targeted ESLint, and `git diff --check`:
  no errors reported.
- Playwright `--list`: **4 authenticated smoke cases** and **5 Chat-only
  cases (E–I)** collected, with status `passed` for **discovery only**.
- `git status --short` showed only the three Chat test/mock files above as
  modified; a Step 4-C4 commit was not yet reported at validation time.

**Decision:** The isolated send-error mock and scenario I are implemented
and offline-checked, but **not** verified by a live browser E2E run or CI.
The observed HTTP 503 is a local synthetic response; it is not evidence
of actual C2 Chat service behavior. Do not automatically run the private
browser suites, OAuth Bootstrap, Chromium HTTPS Probe, app startup,
external AI calls or database operations. Preserve the eight-row C2
fixture, fail-closed network boundary, redacted reporter, and Draft PR.

## Step 4-C5 — synthetic AI citation display (2026-10-15 JST)

The Step 4-C4 send-error UI increment and its validation record were
committed and pushed as `b1a1ba4` (`test(c2): covermocked Chat send error UI`).
The next local-only increment adds an isolated citation-display mode to
`e2e-c2/conversation-mocks.ts`, scenario **J** in `e2e-c2/chat.spec.ts`,
and focused offline regressions in
`scripts/c2-playwright-conversation-mocks.test.ts`.

- The Chat mock returns a fixed synthetic AI answer containing a
  `[source:c2-mock-citation-1]` marker, then serves its matching local
  source metadata through the exact conversation-detail GET. Existing
  collection, History, successful-send and send-failure modes remain
  separate, with no upstream forwarding or database access.
- Scenario J checks the stripped answer text, `Supporting sources` label,
  exactly one link, and its `href`, `target` and `rel` attributes. The URL
  uses a non-resolving `example.invalid` hostname and is **not clicked**.
- Offline regressions use the application's actual citation parser and
  cover matching response/metadata, mode exclusivity, duplicate-send
  refusal and rollback on failed local fulfillment.

Developer-reported Windows **offline** checks after applying the patch:
- Focused Vitest: **167/167 passed across 3 files** (46 Chat mock,
  5 suite-selection, 116 existing C2 tests).
- `pnpm exec tsc --noEmit`, targeted ESLint and `git diff --check`:
  no errors reported.
- Playwright `--list`: **4 authenticated smoke** cases and **6 Chat-only**
  cases (E–J) collected; `passed` means discovery only, not browser execution.
- `git status --short` reported changes to only the three Chat test/mock
  files above. This increment was not yet committed at verification time.

**Decision:** Treat Step 4-C5 as implemented and offline-checked, ready
for a separate documented commit. This does **not** establish live UI
behavior, real source URL reachability, provider inference, streaming
chunk timing, or a successful authenticated browser E2E. Do not start
C2 app, OAuth Bootstrap, browser suites, native Chromium HTTPS Probe,
or DB operations. Preserve the protected eight-row fixture, strict
network/recording guards and Draft PR status.

## Step 4-D1 — manual Edge normal-profile OAuth observation (2026-10-15 JST)

This entry records a **developer-reported manual browser result**, supported
by a screenshot of the resulting Workspace page. It does not report a
Playwright run, a fresh automated bootstrap, or independently verified
database/session state. The Step 4-C5 changes and validation record were
committed and pushed as `1fe1228` before this observation was documented.

- The developer used **Microsoft Edge in an existing ordinary profile**,
  without a newly created C2-specific profile or special browser settings.
  This was not a Playwright-controlled browser session.
- The developer visited `http://localhost:3001/api/auth/signin`, saw the
  Google account chooser, selected the **previously used C2 test Google
  account** (not their ordinary personal Google account), completed the
  interactive login, and reached the Evidence Atlas Workspace at
  `http://localhost:3001/`.
- The supplied screenshot shows a visible **Sign out** control, the selected
  `[C2 E2E fixture v1] Workspace`, a matching recent Research card, and
  summary counts of **Research 1, Sources 1, Findings 1, Tags 0**.
  These are visible UI observations, **not** a verification of all eight
  protected C2 database fixture rows or the underlying session identity.
- No account email address, OAuth code, state parameter, browser cookie,
  access token, browser-profile contents, or screenshot is stored in this
  Git documentation record.

**Interpretation:** A normal, manually operated Edge browser successfully
completed a C2 test-account login flow and rendered the expected Workspace.
The previous Playwright-controlled Chromium OAuth navigation remained
stalled before an observed Google response/commit. This contrast is useful
for investigating differences in automation, browser configuration,
profile state, and network interception, but **does not identify any of
those factors as the root cause**. In particular, it does not prove
that InPrivate/incognito mode caused the earlier failures.

**Still unverified:** whether this manual attempt inserted or updated any
C2 authentication rows; the complete eight-row fixture count; direct
`/api/auth/session` identity validation; the exact browser network exchange;
and creation of `playwright/.auth/c2-user.json`. Prior authenticated
Playwright smoke/Chat suites remain **unexecuted**. An existing normal
profile can contain personal cookies or settings, so it must not be copied
or imported into automated browser tests.

**Decision:** Record the result as **manual Edge OAuth/Workspace success,
reported and visually corroborated; not automated E2E success**. Next,
perform **offline-only** comparison of the Edge manual and Playwright
Chromium paths before authorizing further live tests. Do not rerun OAuth,
start new browsers/probes, modify authentication state, perform DB reads
or writes, reset or re-seed the eight-row fixture, relax TLS/network
guards, or change the status of Draft PR #1 based on this observation.

## Step 4-D2 — offline Edge/Playwright Chromium comparison (2026-10-15 JST)

See [Step 4-D2 offline comparison](./c2-edge-playwright-offline-comparison.md).
Source review at `46ea97f` compared the successful manual Edge login against
the stalled Playwright Chromium Bootstrap. Unlike Edge's existing normal
profile and direct `/api/auth/signin` navigation, Bootstrap uses a fresh
Chromium context, starts at `/`, and intercepts browser traffic with
`route.fetch` and `route.fulfill`. The interception difference is a
**priority hypothesis**, not a proven cause. The lack of Google response or
navigation commit, earlier private-browser success, and separate duplicate
CDP Fetch pause must not be conflated.

**Decision:** D2 analysis complete, root cause unresolved. Next produce a
review-only D3 experiment/approval gate. No browser, OAuth, DB, proxy, probe,
credential/state operation or C2 fixture mutation was performed. Keep PR #1
Draft and the eight protected fixture rows unchanged.
