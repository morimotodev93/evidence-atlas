# Local review database

The review workflow runs the real Next.js Demo and authenticated SaaS against
`evidence_atlas_review`, independently of `evidence_atlas` and C2. It is local UI
tooling, not a production authentication feature or a migration-history upgrade.

These helper scripts require **Windows with Docker Desktop**, the `desktop-linux`
context and its Linux-engine named pipe. They do not support ordinary Linux Docker
Engine or a standalone PostgreSQL installation. For ordinary installation on a
separately provisioned database, see [Installation](installation.md). Do not adapt
Review by pointing it at an existing development or production database.

## Setup and daily use

Use Node 24, pnpm **12.9.1**, installed dependencies (`pnpm install` if needed),
and the existing Docker Desktop Linux container `evidence-atlas-postgres` from
this checkout's `compose.yml`. The commands require access to the Docker named
pipe. The container must already be running; the workflow never starts/stops it.

```powershell
pnpm review:setup
pnpm review:check
pnpm dev:review
```

Open `http://127.0.0.1:3100/demo`, `/en/demo`, or `/ja/demo`. Research links use
the actual persisted IDs. Daily startup only needs `pnpm dev:review`; it verifies
readiness and never seeds. Use **Ctrl+C** in its terminal to stop Next.js.

For SaaS, leave that server running and use another terminal:

```powershell
pnpm review:login
```

Open the printed one-use loopback link within two minutes. It sets an eight-hour
normal Auth.js database-session cookie for the fictional Local Reviewer, selects
the resolved Local Review Workspace, and redirects to `/research`. The temporary
bridge binds only `127.0.0.1:3101`, rejects cross-origin requests, closes after use
or expiry, and never prints the session token. Keep the temporary link private.
Use the app's normal sign-out to revoke a session. Cookies are host-scoped, not
port-scoped: use this exact `127.0.0.1` origin, preferably in a separate browser
profile. A different local app on that host can receive the same cookies.

No OAuth credentials or provider login is required for this fixture session.
No application auth provider, callback, guard or HTTP route is bypassed/changed;
the ordinary Auth.js adapter reads the review session and membership guards still
apply. Without this session, `/research` redirects to normal sign-in. This helper
only accepts the verified dedicated local review database, never production.

## Local-only creation and schema bootstrap

`review:setup` verifies Docker context `desktop-linux` uses the local Linux-engine
named pipe, container image `pgvector/pgvector:pg18-trixie`, Compose project/service
and this checkout's configuration path, and published port 5432. It checks whether
the review database and role exist **before** creation. With no review config and
neither resource present, it:

1. Generates two independent random secrets into ignored `.env.review.local`
   using exclusive creation; it never overwrites `.env.local` or an existing config.
2. Uses `docker exec ... psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres`
   with SQL on stdin to create a non-superuser/non-CREATEDB/non-CREATEROLE login
   `evidence_atlas_review` and database of that name, owned by the dedicated role.
3. Prepends four role-specific rules to `$PGDATA/pg_hba.conf`: allow that role only
   to the review DB with SCRAM, reject it for all other DBs, for both local and
   host connections. It preserves the original in `pg_hba.conf.review-backup` and
   reloads PostgreSQL configuration. Existing roles' rules are unchanged.
4. Confirms TCP instance identity matches Docker (server start time and database
   OID), database/role/owner and nonprivileged attributes, valid HBA rules, and an
   actual HBA rejection when the review login attempts the ordinary database.
5. On a completely empty schema only, runs installed Prisma **`db migrate --show`**
   in read-only mode, then **`db migrate`** against the review DB. The extension
   migration requires the local Compose administrator: only `.env`'s explicitly
   validated `postgres@localhost:5432/evidence_atlas` configuration supplies its
   password, and the child URL is rebuilt to target **review**, never that DB.
   Application-table DML and Prisma marker SELECT permissions are granted to the
   review role. Raw driver/CLI output and credentials are suppressed.

CLI **8.0.0-rc.20**, ORM/pgvector **8.0.0-rc.14**, canonical contracts, snapshots,
migration packages and refs remain unchanged. No `db push`, reset, signing,
history conversion, dependency upgrade or production migration is used. Existing
or partial schemas only receive `db verify`; setup refuses drift rather than
automatically applying new migrations. pgvector and `vector(768)` are checked.
Older C2 setup prose still names rc.17/rc.12; that historical version conflict is
reported here rather than silently changing C2 documents.

## Configuration and diagnostic safety

`.env.review.example` documents the two allowed keys; do not copy the placeholders
over a generated config. The workflow accepts only the exact explicit
`postgresql://evidence_atlas_review:<secret>@127.0.0.1:5432/evidence_atlas_review`
shape, no query options/fragments or fallback URL. Docker identity checks apply
on every command. Secrets are never passed in command arguments or printed.

The Next/Prisma child starts with OS environment necessities and explicit review
values. The launcher reserves keys from all four standard development dotenv
files with empty values unless explicitly configured for review. The installed
Next loader preserves those initial values; ordinary/cloud credentials and C2
flags cannot override the review URL. Both ORM and Auth adapter have a runtime
guard refusing missing/wrong URLs or conflicting review settings. Next's startup
may list `.env.local` and `.env`; that list does not mean their URLs won precedence.

`review:check` uses default read-only connections and a verified
`REPEATABLE READ READ ONLY` transaction; Prisma verification also runs with
`default_transaction_read_only=on`. It checks schema/markers, vector, fixture
relationships, identities and IDs without any fixture/session writes. It reports
missing requirements and never repairs them. It also reads Docker/HBA metadata.

Review Next uses ignored `.next-review/`, its own TS configuration, a system font
and no Sentry config wrapper. External service credentials are blanked; ordinary
UI checks need no AI, Redis, Turnstile or embeddings. Live AI operation is not part
of this workflow. Provider settings, quotas, leases and evidence rules are unchanged.
This is not a network sandbox for arbitrary SaaS mutations/background jobs.

## Fixtures and recovery

One atomic setup transaction, serialized by an advisory lock, creates fixtures
only when the application identity/research tables are empty. It reuses canonical
`demoResearches` content, including Sources, Findings/links, Tags, Comments and
example conversations/citations, without invoking or editing the create-only
`public-demo.ts` Seed. It adds one fictional SaaS user/Organization, normal admin
memberships, a small synthetic Research with linked Source/Finding, an empty
Research and an empty Workspace. The large Demo dataset is not copied to SaaS.

Subsequent setup and startup verify/reuse rows by expected identities and
relationships. Both Demo Organization and Workspace are verified; duplicates or
modified/missing canonical content produce an error, with no replacement.
`DEMO_WORKSPACE_ID` is resolved and injected into Next; SaaS selection uses the
resolved ID in a cookie and the existing authorized Workspace selector.

Missing config with an existing DB/role, interrupted provisioning, partial schema,
missing fixtures or edited canonical rows require manual inspection. Preserve the
config and data, restore only the intended fixture/relationship after reviewing
your edits, then rerun `review:check`. Do not delete the DB, rerun create-only Seeds,
or remove config to force a retry. There is deliberately no automatic repair/reset.
If Prisma replay/verification fails, preserve its reported code and resolve the
current-version blocker separately; do not convert migration history here.

C2 remains its separate container/database on port **5433**, with its own fixture
manifest, OAuth/isolation and test tooling. Review shares the ordinary Docker
instance on **5432**, but uses a different database and a role barred from other
databases; it does not read or modify C2 resources.

## Focused verification (2026-11-02)

Fresh migration replay, vector verification, fixture creation, repeated setup and
read-only diagnostics passed locally. All 22 review table fingerprints matched
before/after diagnostics plus repeated setup. Browser checks passed for the three
Demo list routes, Japanese Research detail, unauthenticated redirect, real fixture
session, SaaS list/detail/empty detail and Workspace switching/empty list. No live
AI call, production build or full test suite was run. See the task's review ZIP
for exact commands, focused results and existing-development-DB preservation proof.
