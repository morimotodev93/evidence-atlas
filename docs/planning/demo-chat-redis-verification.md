# Demo Chat Redis verification and ingress hardening

Date: 2026-10-27 JST. Baseline: clean `main`, `519e278` (PR #42 merged).
Implementation stays uncommitted on `main`; no staging, commit, push, merge or PR.
The [PR #42 record](../archive/demo-chat-api-security-pr42.md) remains historical evidence,
including its failed/incomplete build and pending real-service verification.
No roadmap phase completes in this task.

## Review and changes

The previous handler queried public Research before Turnstile or anonymous-session
authentication. Invalid requests could therefore cause unnecessary DB work and
receive different statuses depending on publication/existence. Session requests
now verify Turnstile first, then use the unchanged public Workspace-scoped reader,
then atomically issue Redis state. Questions parse the cookie before constructing
the store, check live Redis session/thread ownership and Research binding, then
recheck publication. Invalid authentication never queries Research. A valid owner
whose Research has since left publication receives 404, never an answer.

Public scope checks remain mandatory before session issuance or any future AI
generation. A replay incorrectly accepted by Siteverify, or a start-rate rejection,
can still reach the DB before the atomic start check; these Redis checks remain
after publication validation to avoid issuing state for private Research.

`DemoChatStore` accepts an optional namespace, defaulting to the unchanged
production prefix. Alternate prefixes must match
`evidence-atlas:demo-chat:test:[A-Za-z0-9_-]{1,80}`. The production factory still
uses its original default and application credentials. No flag/configuration file
is enabled; `.env.example` and local `.env.local` retain `DEMO_CHAT_ENABLED=false`.
Generation, streaming, Chat UI, billing, DB models and read-only boundaries are
unchanged.

## Coverage and limits of evidence

| Boundary | Existing evidence reviewed and additional evidence | Still unproven |
| --- | --- | --- |
| Session/thread ownership and Research binding | API/Lua tests for another owner, another Research, forged/duplicate/missing cookies; DB omission and withdrawn-publication tests added | Deployed cookies/proxy behavior |
| Turnstile replay, Origin and hostname | Exact configured HTTPS Origin, forged Host ignored, strict success/hostname/action, timeout and duplicate-token competition; DB omission assertions added | Real Siteverify and token expiry behavior |
| Fixed 24 hours | Offline exact expiry, new-thread remaining TTL, no renewal; manual Redis test shortens TTL and checks inheritance/expiry | 24-hour wall-clock soak |
| 10/thread, 20/session, 3/shared source/minute, 50/UTC day | Actual production Lua via Fengari, exact rolling/UTC boundaries and final-allowance competition; cross-session shared-source case added | Real calendar transition and distributed load |
| Two outstanding leases | Concurrent admission, double release, successful renewal, expired renewal denial, quarantine, failure on Redis uncertainty | Actual upstream termination/cancellation |
| Redis failure and retry policy | Installed SDK mocked-fetch network/timeout/HTTP/Lua-error tests assert one attempt; actual Lua runtime-error case added | Live partitions, uncertain committed responses, failover/durability/eviction |
| Lua atomicity | One EVAL checks and mutates production budgets; offline parallel callers; manual runner adds actual concurrent HTTP EVALs | Production topology/cluster characteristics |
| SaaS/C2 and read-only Demo | Existing eligibility, service-isolation, public read/write, Chat authorization and route tests pass | Browser/deployed E2E was not run |
| Verification isolation | Prefix rejection, target/opt-in rejection and same-EVAL TTL-on-error tests added | Dedicated database identity requires operator verification |

The source allowance is **one shared bucket for every connection/session/thread**,
not per IP. Session starts have a separate shared three-starts/minute bucket.
No forwarding-header/IP adapter is added. Fengari runs Lua with mocked Redis
commands; neither the mock nor Promise concurrency alone establishes real Redis
compatibility. Redis script atomicity does not mean rollback after a runtime
error: a failed EVAL can have earlier writes committed. Fail closed and no retries
remain essential; no generation starts after such a failure.

## Manual real Upstash procedure — not executed

**On hold following the 2026-10-27 review and user decision below.** These
instructions describe prerequisites for a future separately approved run; they
are not a request to create a database or run against the existing Demo database.

Provision a **dedicated disposable test database**, independent of production,
preview and SaaS Redis. Confirm its identity in Upstash before using credentials.
Do not copy production credentials. The runner cannot infer a database's business
role from its URL: operator confirmation remains required. It rejects a URL or
token matching any application Redis credentials present in its process.

Set these environment variables in a temporary shell using your secret-management
workflow (never paste actual tokens into documentation or shared logs):

| Variable | Value |
| --- | --- |
| `DEMO_CHAT_REDIS_VERIFY` | `dedicated-test-database` (explicit operator attestation) |
| `DEMO_CHAT_TEST_REDIS_REST_URL` | Dedicated test database HTTPS REST root under `.upstash.io` |
| `DEMO_CHAT_TEST_REDIS_REST_TOKEN` | Dedicated test database write token |

Run manually from the repository root:

```powershell
pnpm exec vitest run --config vitest.redis.config.ts --maxWorkers=1
```

Do not set `DEMO_CHAT_ENABLED=true` in any dotenv or deployment. The test stubs
eligibility only inside its isolated process and restores it afterward. Remove
the three test variables from your shell when finished. No dotenv is loaded by
the runner. Normal `pnpm test` does not discover `*.redis-check.ts`, regardless of
whether test credentials or opt-in happen to be present.

Safety measures:

- Each run uses random UUID namespaces below `evidence-atlas:demo-chat:test:`;
  each scenario has independent keys. The guard checks that every key supplied
  through EVAL `KEYS` belongs to that namespace. The current scripts are intended
  to access only test keys; this is not a sandbox for arbitrary Lua (see below).
- The runner is intended to write only Redis test keys. No handler, DB, model, Groq or Siteverify is
  invoked. Fetch permits only the chosen test Redis root, with redirects refused.
- SDK uses a three-second timeout, zero retries and no automatic pipelining.
  Raw SDK errors, URLs, credentials and Redis error responses are not logged.
- An EVAL wrapper runs the production Lua inside `pcall`, then attempts to bound
  the TTL of every supplied existing test key to at most **15 minutes**, before
  returning or reporting a captured error. Earlier/shorter TTLs are preserved.
  This same-EVAL design avoids relying on client `finally` cleanup, subject to
  the execution and TTL-command limitations below.
- No FLUSHDB, FLUSHALL, KEYS, SCAN, bulk delete or production-key cleanup exists.
  Keys are intended to disappear by TTL when expiry is successfully installed
  and processed. Quarantined synthetic leases expire only in this runner;
  production concurrency keys gain no TTL and expired leases stay counted.

The manual test checks actual Lua/REST compatibility, competing token use and
reservations, two leases, shared-source refusal, 10/20/50 final allowances,
prior-day global rollover, ownership, remaining session TTL, expired sessions,
renewal, expired renewal, double release, and TTL after partial-write errors.
It seeds boundary counters/deadlines in its own test keys rather than generating
50 requests, waiting 24 hours or changing Redis TIME. Exact minute/UTC millisecond
boundaries remain deterministic offline tests; the runner uses real Redis TIME
and a seeded prior-day value. A manual pass would not prove durability, a full
24-hour session soak, real midnight crossing, provider cancellation or readiness
to publish Chat.

## Review clarification: guard and TTL guarantee boundaries

Review date: 2026-10-27 JST. This clarification follows inspection of
`scripts/demo-chat-redis-safety.ts` and the manual runner; no code was changed
and no Redis connection or test execution was performed for this update.

`boundedVerificationScript()` validates the requested prefix and the explicit
key list supplied as EVAL `KEYS`. It does not parse or fully inspect Lua script
contents: literal key names embedded in the script, or keys constructed
dynamically inside Lua, are outside that validation. The TTL loop likewise visits
only `KEYS`, not every key a script could access. Prefix isolation alone therefore
does **not** completely guarantee protection of production database contents.
Keep the connection database itself separate from production use for real Redis
verification; a dedicated disposable database remains the prerequisite for this
Upstash runner. Checks against application URLs/tokens cover only settings present
in the process and cannot determine the target database's actual operational role.

The wrapper uses `pcall` around the supplied Lua body. For a catchable body error,
control can proceed to the TTL loop before returning a generic Redis error.
For each supplied existing key, `PTTL == -1` or `PTTL > 900000` causes an attempt
to set `PEXPIRE 900000`; shorter existing TTLs are left unchanged. The design
intent is to bound synthetic test state to at most 15 minutes when these commands
complete successfully, including after partial writes in the script body.
Production lease quarantine is unaffected.

This is not a guarantee for every failure. The TTL loop is outside that `pcall`;
an error in its own commands can interrupt it, and the wrapper does not check
each `PEXPIRE` result. Redis process failure, communication loss, timeouts or
other interruptions do not establish that expiry installation or eventual deletion
has succeeded. A lost response may leave the client uncertain even if the server
completed the EVAL. If TTL installation fails after a write, residual keys cannot
be completely ruled out. Atomic EVAL execution is not rollback or a universal
crash/durability/cleanup guarantee. The existing offline TTL-on-error test covers
a catchable script-body error, not all such infrastructure failures.

## User operational decision and next verification work

Decision recorded 2026-10-27 JST, based on the user's own account/UI check:
the Public Demo Chat Upstash Redis remains on the **Tokyo-region Free Tier**.
The user confirmed that adding a separate verification Upstash database under
their current creation conditions would require changing to a paid plan. For
this personal portfolio project, they will not upgrade at present and will not
create a dedicated verification Upstash database. This records this user's
observed creation conditions, not a general assertion about Upstash pricing or
all Free Tier accounts; no independent pricing verification was performed here.

Real Upstash integration verification remains **NOT RUN / Pending (on hold)**.
Do not casually substitute the existing Public Demo Chat Redis as the target of
the current runner. The prefix and TTL mechanisms above do not remove the need
for database separation or override this decision.

1. Consider real-Lua verification with a local Redis in a separate future task.
   No local Redis setup, runner modification or test execution is included here.
2. Distinguish existing Vitest/Fengari execution with mocked Redis commands from
   execution on an actual local Redis server; the latter has not been performed.
3. A local Redis pass would provide local Redis/Lua evidence, not proof of complete
   compatibility with the Upstash REST API.
4. Keep real Upstash connection, authentication, timeout and failure behavior
   verification Pending; local success must not mark these checks complete.
5. Reassess outstanding safety and real-environment verification before publishing
   Demo Chat, including upstream termination/cancellation and lease recovery.

`DEMO_CHAT_ENABLED=false` remains the required safety state; Groq public AI
generation stays unenabled. Normal SaaS, C2 and Public Demo read-only boundaries
are unchanged. No Phase 9, 10 or 11 completion decision or checkbox changes.

## Validation and follow-up

Real Redis verification remains **NOT RUN**; real Upstash work is on hold under
the decision above. No real Groq, Turnstile or Prisma request was made.

The results below are the previously recorded implementation verification, not
new runs for this documentation-only review update. Vitest, TypeScript, Lint and
Production Build were not rerun for the update; historical failures and pending
items remain recorded.

- Related offline suites initially passed 85 tests; added Lua/shared-source/TTL
  cases are included in the full run below. The final handler-only rerun passed
  all 61 cases after adding rejection-path DB assertions.
- `pnpm test --run --maxWorkers=2`: **79 files / 1,723 tests passed**, exit 0.
  The manual real-Redis file was not collected or executed. SaaS/C2 isolation,
  public reads, write guards and authenticated Chat regressions passed.
- `pnpm exec tsc --noEmit`: passed, exit 0, including the manual runner.
  An initial type check failed because Next augments `ProcessEnv` with required
  `NODE_ENV`; the pure guard now accepts a string/undefined environment map.
- `pnpm lint`: passed, exit 0.
- `git diff --check`: passed, exit 0.
- Initial sandboxed Vitest could not launch esbuild (`spawn EPERM`). Subsequent
  subprocess-capable offline runs completed successfully.
- **Production Build incomplete, not successful:** `pnpm build --webpack` ran in
  ignored `build/redis-hardening-verification/source`, using the current runtime
  source, an isolated copy without dotenv/service credentials, synthetic local
  DB settings, disabled Chat/telemetry, mocked Google Fonts and a network guard.
  Next.js 16.3.8 stayed at `buildStage: compile`; its identified build process
  was stopped to bound resource use (observed working set about 3.8 GB), exit 1.
  There is no completed production artifact. This is not evidence of OOM, a
  naturally failing build, or a diagnosed compiler/app defect. Ordinary production
  configuration, real font delivery and deployment remain unverified. No build
  workaround or configuration change was added to the application.

Final state: `main` at `519e278`, changes unstaged/uncommitted, no new branch,
Git add, commit, push, merge, PR creation or deployment. Dependencies and lockfile
are unchanged; pnpm 12.9.1 was used. Roadmap phase status is unchanged.

Next PR must retain disabled-by-default behavior until bounded context/history,
generation and cancellation are reviewed. Renewal failure/expiry must stop upstream
work; release requires confirmed termination. Do not add automatic lease cleanup.
Crash recovery, Redis operations policy and deployed security validation remain
open. Request limits alone do not establish a total token or monetary cap.
