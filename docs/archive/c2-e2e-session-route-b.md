# C2 E2E Route B — isolated Auth.js database session (offline implementation proposal)

> **Historical status note (2026-10-17 JST):** This document preserves the
> investigation-stage status and stop conditions stated below. References to
> PR #1 as Draft/unmerged or authenticated C2 E2E as pending are historical:
> [PR #1](https://github.com/morimotodev93/evidence-atlas/pull/1) merged
> into `main` at `969af82`. Bounded C2 Smoke 4/4 and Chat mock-only 6/6 were
> developer-reported passes, not Google OAuth or real Chat/AI E2E verification.
> This update grants no authorization for new live operations. See the
> [current roadmap](roadmap.md#phase-10--testing--quality).

Source branch baseline: `fix/c2-probe-rejection-diagnostics` at `e019972`, 2026-10-16. This patch is **code-only**. It must not be treated as permission to write C2 Session rows; a subsequent explicit opt-in is required for that operation.

## Scope and rationale

Google OAuth UI can reject Playwright-controlled browsers. Separate the two concerns:

- Google OAuth itself: independently/manual, no further automated login attempts in this step.
- Authenticated C2 application behavior: keep `src/auth.ts` intact, `session.strategy = "database"`, Kysely adapter and Google account association intact, but create one session row locally under the dedicated C2 database role and use the existing `authjs.session-token` cookie with the existing Playwright `preflight`, Smoke 4 and Chat mock 6 suites.

The new CLI and core live under `scripts/`; there is **no web endpoint, provider, credentials backdoor, environment override, production auth change, browser profile/cookie import or OAuth call**. `.gitignore` already excludes `playwright/.auth/`.

## Preconditions and mutation boundaries

1. `git` state matches `e019972`, and this patch applies as four **new** files. Do not apply the unrelated failed previous D13 patch.
2. Explicit local operator sets the two existing `C2_FIXTURE_USER_ID`/`C2_FIXTURE_USER_EMAIL` variables privately and uses `.env.c2.local`. Dedicated DB target validation enforces localhost port 5433, database `evidence_atlas_c2`, role `c2_local`, exact URL and password. Actual DB identity is rechecked using `current_database()`/`current_user`.
3. `node scripts/c2-fixture.ts verify` must show 8/8 before and after. This is read-only and checks a consistent user, one linked Google Account and at least one active Session before creation; no protected fixture rows are changed by Route B.
4. Create CLI requires exact `--allow-c2-e2e-session-create` and a missing auth file, and rejects unsupported harness environmental overrides/preload flags. Within a serializable transaction it verifies one expected User, one linked Google OIDC Account, and a fixture Workspace ADMIN membership; then inserts **exactly one** row into `public."session"` using a cryptographically random token with `c2e2e_` prefix and a 60-minute initial expiry. If the post-commit state-file save fails, it attempts to revoke that exact row. If rollback/revocation fails, an orphan Session may remain; stop and investigate privately before retrying.
5. It writes only the application cookie into the existing validated `playwright/.auth/c2-user.json` using `saveC2State`; no token, user identity, URL, SQL parameters, or raw errors are printed.
6. Run `node scripts/c2-playwright.ts preflight --allow-c2-readonly`, then `run --allow-c2-readonly` and `chat --allow-c2-chat-mock` with the C2 app running on port 3001. The app remains responsible for validating sessions and Workspace authorization. The Playwright network allowlist and disabled real Chat API are unchanged.
7. Revoke promptly after tests with `node scripts/c2-e2e-session.ts --allow-c2-e2e-session-revoke`. It validates a C2-owned state file even if its short cookie has expired and deletes only the matching exact token+user row under the same checked C2 DB role, then removes the local state file. It does not delete the eight application fixtures or other sessions.

**Session lifetime caveat:** Auth.js may refresh a database session expiry on authenticated requests. Even when the saved browser cookie expires at 60 minutes, the DB row can remain valid longer; **explicit revoke is required after testing**. Do not paste or upload the state file or any credentials. If cleanup fails, treat the local token as active and resolve before further testing. Existing OAuth logins are still checked separately.

## Verification gate

Offline tests: `pnpm exec vitest run scripts/c2-e2e-session.test.ts` (7 synthetic cases); `pnpm exec tsc --noEmit`; `pnpm exec eslint scripts/c2-e2e-session-core.ts scripts/c2-e2e-session.ts scripts/c2-e2e-session.test.ts`; `git diff --check`; inspect staged files. All four files are added, existing files unchanged. Tests prove the isolated SQL/memory decisions, not a successful real C2 login. Runtime proof is `preflight` and existing ten E2E tests; retain honest blocked/passed status on the roadmap.

Do not change the unrelated untracked `docs/planning/c2-edge-normal-oauth-revalidation-plan.md`. Keep PR #1 Draft until verification is recorded.
