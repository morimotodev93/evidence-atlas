# PR #42 Demo Chat API security foundation

Date: 2026-10-27 JST. Baseline: `c30a756`, PR #41 merged. Started clean on
`feat/demo-chat-api-security-pr42`. No branch creation, staging, commit, push,
merge or deployment. Changes remain uncommitted.

The [architecture contract](../architecture/ai-architecture.md#41-public-demo-chat-configuration-contract)
defines the exact API, input, Turnstile, session, time-window and lease behavior.
This record adds verification evidence without changing historical records or
Phase 9/10 checkboxes.

## Delivered boundary

- Dedicated Node.js `POST /api/demo/chat`; no route collision. Disabled by default
  and unavailable in SaaS/C2. It never imports the Groq model or authenticated Chat.
- Explicit server-configured HTTPS Origin/hostname allowlist, independent of Host
  and forwarding headers. Missing/malformed settings deny. New server setting:
  `DEMO_CHAT_ALLOWED_ORIGINS` (empty in `.env.example`).
- Session operation verifies Siteverify success, hostname and fixed action, with
  token format/size checks, timeout, no redirect/retry, and an atomic Redis replay
  marker. Session/thread IDs each contain 256 random bits. A 24-hour non-renewing
  HttpOnly/Secure/SameSite=Strict `__Host-` cookie is checked against Redis on every
  question; thread ownership and Research binding are verified server-side.
- Questions always return 503 after validation. They do not consume generation
  budgets. Only session establishment can return 201 under explicit complete opt-in
  configuration; no answer or mock generation is exposed.
- Internal Lua reservations enforce 10 questions/thread, 20/session lifetime,
  three/shared source in rolling 60 seconds, 50/UTC calendar day and two outstanding
  generation leases. Fixed 24-hour session lifetime clarifies PR #41's provisional
  rolling-window language: all a session's admissions fit within that window.
  Client counts and IP headers cannot reset these counters.
- Redis TIME defines boundaries. One EVAL checks and updates budgets and lease;
  failure is closed, no memory fallback or question refund. REST timeout is three
  seconds. Installed Upstash 1.39.0 unexpectedly sends two attempts for
  `retry: false`; source inspection and mocked-SDK tests established this, and
  explicit `retry: { retries: 0 }` prevents resubmitting uncertain writes.
- Lease deadlines are 60 seconds, atomically renewable before expiry. Expired
  leases remain counted, with idempotent owner-specific release only after
  upstream termination. A crash needs confirmed-stop reconciliation; automatic
  cleanup is deliberately absent to prevent oversubscription.
- Existing `getDemoResearch()` selects only the configured public Workspace.
  No context is built, no Source URL is fetched, no embedding is invoked, and no
  user question/answer or Conversation/Message/Research is written to the SaaS DB.

## Offline verification

Node.js 24.16.0, pnpm 12.9.1, Next.js 16.3.8, Vitest 3.2.7, Upstash Redis 1.39.0.
Fengari 0.1.5 is a new **development-only** dependency for executing production
Lua with a mocked Redis command implementation and deterministic clock. Redis
itself and all external service endpoints remain unused.

- Initial sandboxed Vitest failed at esbuild startup with `spawn EPERM`, before
  running tests. Subprocess-capable execution subsequently ran the offline suites.
- Initial Lua tests exposed Fengari's 32-bit integer arithmetic difference from
  Redis Lua 5.1 numbers; explicit floating-point millisecond arithmetic corrected
  the adapter/runtime difference. Sequential and parallel limit tests then passed.
- Final `pnpm test --run --maxWorkers=2`: **78 files / 1,706 tests passed**, exit 0.
  New suites comprise 57 API/input/Turnstile/session cases, 11 actual-Lua limit/
  parallelism/lease cases and five installed-SDK adapter cases (73 new cases).
  Existing public read, normal SaaS Chat, deployment guards and C2 isolation suites
  passed. New tests intercept all fetches; test execution cannot contact Groq,
  Cloudflare Siteverify or Redis. SDK adapter cases use synthetic fetch responses.
- `pnpm exec tsc --noEmit`: passed, exit 0.
- `pnpm lint`: passed, exit 0.
- `git diff --check`: passed, exit 0, with a Git LF-to-CRLF notice for the lockfile.
- `pnpm install --offline --frozen-lockfile`: passed, exit 0; lockfile current.
- **Build incomplete, not successful:** verification used an ignored source copy
  under `build/pr42-verification/`, excluding dotenv files, clearing service
  credentials, disabling telemetry, supplying only synthetic configuration,
  mocking Google Fonts and rejecting outbound networking. The initial launcher
  needed a Windows preload-path quoting correction; the copied pnpm invocation
  also emitted an install-lock permission warning before starting Next. Default
  `pnpm build` (Turbopack) then remained at `buildStage: compile` for over five
  minutes. Its verified process tree was stopped to bound resource use, exit 1.
  `pnpm build --webpack` initially failed with `spawn EPERM`; a subprocess-capable
  retry reached compilation but still had no stage completion after 194 seconds,
  with observed working set approximately 4.2 GB. That specific process was also
  stopped, exit 1. The Webpack retry included the final source implementation.
  These interruptions do not establish a naturally reproducing app/compiler
  defect, OOM, or the root cause of slow compilation. `BUILD_ID` is absent and
  there is no complete production artifact. Ordinary production build,
  credentials, deployed behavior and real font delivery remain unverified.
  No application/configuration workaround or heap-limit change was committed.

No browser E2E, real deployed POST, load test, real AI/Turnstile/Redis call, OAuth,
production DB connection/write, migration or seed was performed. Public Demo E2E
was not changed; its non-GET prohibition remains intact. Package installation
uses pnpm and is separate from runtime-service verification. No environment
secret value is recorded.

## Remaining integration and risk

Groq invocation, bounded public Sources/Findings/Conclusion context, client history
integrity/length, safe response/streaming, cancellation/lease integration, confirmed
crash recovery and Chat UI remain follow-up work. Request counts and the configured
output-token target do not guarantee a total token-consumption or monetary cap.
Anonymous sessions can be rotated; source/global limits remain the cross-session
boundaries. Shared source limits are intentionally stricter than per-IP limits.
Redis availability/durability/non-eviction, real network timeouts, deployment proxy
behavior and actual provider termination are not proven by mocks. Expired leases
can deny service until reconciled. No production-ready generation is claimed.

SaaS Gemini/Auth.js/read paths and existing Demo UI/read-only behavior are unchanged.
The new API fails before service access in C2 and when disabled. Phase 9 and Phase
10 completion decisions remain unchanged.

Post-merge follow-up on `main` baseline `519e278`: see
[Redis verification and ingress hardening](../planning/demo-chat-redis-verification.md) for the
authentication-before-DB change, coverage gaps and manual-only dedicated Redis
runner. This does not replace the historical results above.
