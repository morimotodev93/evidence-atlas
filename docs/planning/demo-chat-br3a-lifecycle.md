# Demo Chat B-R3a — bounded lease and operation retention

Date: 2026-11-07 JST. Implementation baseline: `main` at `878029f`.

## Current policy and scope

The owner approved practical Public Demo safety: retain all existing question,
session, input/output and normal concurrency limits, but accept Redis reservation
loss and possible overlapping remote generations after automatic recovery.
`DEMO_CHAT_ENABLED=false` remains required until separate public approval.
This supersedes the indefinite-quarantine/no-history-deletion requirements in
the dated lease design and AI architecture checkpoints. It does not establish
Groq termination, exact failure-time concurrency, a monetary cap, or live-service
compatibility. PostgreSQL, Cron, a recovery CLI and an admin UI are not added.

## Runtime behavior

- The existing 60-second lease deadline and 15-second renewal interval remain.
  Renewal only succeeds before that deadline; the grace period cannot revive it.
- A valid new reservation's Lua removes concurrency members whose deadline is
  at or before `Redis TIME - 300000ms`, before the ordinary quota/capacity check.
  Thus an abandoned lease is reclaimable 60 seconds + 5 minutes after its last
  reservation/renewal. No traffic means no sweep; the next eligible reservation
  performs it. A duplicate Operation ID or full history can still deny earlier.
- Recovery, capacity inspection and reservation run in one EVAL. Recovery does
  not decrement any question counter. Lua failure is not rollback: earlier
  cleanup, records or charges may remain, but an uncertain caller never sends AI.
- Before invoking the SDK, generation renews its exact lease and checks client
  cancellation and elapsed local time. The existing 30-second deadline includes
  this wait; a hanging renewal cannot prolong it. A suspended worker also checks
  wall time, rather than relying solely on a timer callback having run.
- This check is not atomic with Groq submission. A pause after the final check,
  upstream work continuing after timeout, or Redis loss can cause overlap with
  replacement requests. Grace/Abort/Function termination is not terminal proof.
- Normal non-submission and trusted `stop`/`length` cleanup still release only
  their exact lease. Late release cannot remove a replacement's different ID.
  Other uncertainty waits for reservation-driven recovery; no late-answer retry.

## Operation history

The existing `${prefix}:operations` HASH and schema-1 JSON are retained.
Creation is the Redis timestamp of the first `attempted` write (`reservedAt`).
Both `attempted` and `reserved` are written with `HSETEX PXAT` using the same
absolute expiry, `reservedAt + 86400000ms`. Updating state never restarts TTL.
No key-wide expiry, expiry index or periodic worker is introduced.

At 24 hours a record becomes logically expired; physical memory reclamation
follows Redis expiry processing. Record expiry does not delete a lease or refund
quota. Normal lease release does not delete its history. The 10,000-record guard
remains for retained records, including partial attempts. Replay rejection lasts
only while the record exists, normally 24 hours, and remains subject to Redis
loss. IDs remain server-issued, not client inputs; no automatic retry is added.

`HSETEX` errors or unexpected acknowledgements fail closed without a TTL-less
fallback. Supported server behavior must still be verified before publication.
The installed Upstash SDK is 1.39.0; its command serializer exists, but that is not
proof of the target service's EVAL/field-expiry behavior.

References checked 2026-11-07 JST:
[Upstash HSETEX](https://upstash.com/docs/redis/sdks/ts/commands/hash/hsetex),
[Upstash HPEXPIREAT](https://upstash.com/docs/redis/sdks/ts/commands/hash/hpexpireat),
[Redis HSETEX, available since 8.0](https://redis.io/docs/latest/commands/hsetex/).

## Existing records: preparation only, migration NOT run

`chat-operation-retention.ts` supplies a pure preparation function and bounded
compare-before-expiry Lua. It creates no client, opens no connection, performs no
import-time work and is not called by requests. There is no migration/recovery
CLI. The following is a future, separately authorized operational procedure:

1. Keep Chat disabled. Identify the intended Demo Redis and stop every old/new
   writer, including old deployment URLs, Local and runners. Groq key revocation
   alone does not stop an old worker writing Redis. Do not point this operation
   at Review, C2, ordinary development or another namespace by assumption.
2. Verify native `HSETEX`/`HPEXPIREAT` and expiry semantics on an authorized isolated
   target first. Preserve the hold on the existing real-Redis verification runner;
   do not substitute Production Redis for that runner.
3. Read legacy HASH entries in bounded HSCAN batches. Prepare at most 100 distinct
   `[operationId, originalJson]` pairs with `prepareDemoOperationRetentionBatch`.
   Invalid JSON/schema/identity/time fails preparation without service calls.
   Preserve malformed records and stop; never infer their creation time.
4. Through an explicitly approved EVAL adapter, use the prepared `script`, `keys`
   and `args` unchanged. The Lua rejects future creation times and key-wide TTL,
   compares every original value before writes, then applies each original
   creation time + 24h using `HPEXPIREAT`. Already-old records expire immediately.
   No lease, session, source or global budget key is modified.
5. Result 1 means the batch completed; 409 means data changed/missing or the key
   state needs inspection; 503 means invalid batch/time. Any exception or unknown
   response is uncertain, not success. No automatic retries. Inspect and rescan
   before any explicit rerun. Partial failures can have applied earlier TTLs;
   preparing the same surviving values again never extends their deadline.
6. Complete a full scan and verify surviving records have their expected field
   expiry, with no remaining legacy fields lacking TTL. A key disappearing solely
   because all records expired is normal. Unexplained state remains a rollout
   blocker. Do not FLUSH, replace the namespace, or reset budgets.

Old lease scores need no rewriting: the new grace rule applies to them, including
already-old unresolved leases. This is risk-accepted reclamation, not proof that
those requests ended. Old code may add TTL-less records, so mixed writers and
rollback to old enabled code are unsupported. Rollback must keep Chat disabled.

## Verification and remaining gates

Targeted offline Vitest covers quota/security regressions, exact grace/24h
boundaries, stale workers, response loss, native-command failure, independent
record expiry and partial migration. Fengari executes the Lua with mocked Redis
commands; it cannot prove real Redis/Upstash compatibility or failure durability.
Final scoped verification: 9 Vitest files / 260 tests passed; changed-code ESLint,
TypeScript (`--noEmit --incremental false`) and diff whitespace checks passed.
The first sandboxed Vitest could not start esbuild (`spawn EPERM`); the authorized
offline run succeeded outside that subprocess restriction. The first executable
run exposed the mock adapter's incorrect `-inf` handling (3 failures); fixing its
score-range semantics made the recovery tests pass. No service was used.
No real Redis/Groq/Turnstile request, Production/Review/C2/Vercel operation,
migration execution, existing Redis runner, full suite or Build is included.

Before public approval: verify target command support, complete the stopped-writer
migration, verify the deployed dedicated Groq project/key and reported
3 RPM / 50 RPD / 8000 TPM / 100000 TPD, and perform separately bounded normal,
refusal and shutdown checks. Provider quotas are layered protection, not a
guarantee of two simultaneous remote generations or an exact cost ceiling.
