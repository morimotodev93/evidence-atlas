# C2 runtime isolation — Steps 2-B through 3-A

Status: launcher, environment isolation, database initialization and B2 service/build
guards implemented and tested offline. Separately authorized Step 2-C checks
verified the C2 listener, endpoints, real Google OAuth and matching database-backed
session identity (record below). Step 3-A fixture implementation is offline-tested;
**fixture insertion/cleanup and authenticated Playwright remain unexecuted.** Full client/font
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
Next approval gate: re-confirm C2 service identity and privately select the existing
User, authorize read-only dry-run, review its counts, then authorize fixture writes.
Cleanup and authenticated Playwright require their own explicit approval.
