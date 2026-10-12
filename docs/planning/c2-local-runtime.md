# C2 runtime isolation — Steps 2-B1 and 2-B2

Status: launcher, environment isolation, database initialization and B2 service/build
guards implemented and tested offline. A separately authorized bounded Step 2-C
startup check verified the C2 listener and two anonymous/read-only endpoints.
**OAuth and fixture creation remain unapproved/unverified.** Full client/font
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

Later separately authorized checks must establish actual bind/origin, localhost
resolution, no unintended outbound traffic, true Google login and C2 DB session
identity. Dedicated browser profile, cookie isolation, guarded fixture creation,
and Playwright configuration remain later stages. No runtime-readiness claim is
made by offline B1/B2 tests.

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
