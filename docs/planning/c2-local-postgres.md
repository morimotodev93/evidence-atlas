# C2 isolated local PostgreSQL — Step 1

Status: configuration and offline safeguards only. No container, volume, database,
schema, fixture, or authenticated session has been created or verified by this step.
C2 browser tests remain pending. All commands below run from the repository root.

Step 2-B1 adds a [dedicated app launcher and DB initialization guards](c2-local-runtime.md).
Its runtime remains unapproved until B2 external-service and artifact safeguards.
The DB config now strictly allows only its three documented C2 keys. The Prisma
wrapper removes dotenv override settings entirely, including the unsafe string
`"false"`; it retains the explicit dotenv file path and validated child DATABASE_URL.

## Architecture and prerequisites

| | Existing development | C2 |
| --- | --- | --- |
| Compose file | `compose.yml` | `compose.c2.yml` (standalone, never merge with development) |
| Project | Existing Compose project | `evidence-atlas-c2` |
| Service / container | `postgres` / `evidence-atlas-postgres` | `postgres-c2` / `evidence-atlas-c2-postgres` |
| Host port | `5432` | `127.0.0.1:5433` only |
| Database / user | `evidence_atlas` / existing development user | `evidence_atlas_c2` / `c2_local` |
| Volume | Compose-scoped `postgres_data` | Explicit `evidence-atlas-c2-postgres-data` |
| Network | Existing development network | `evidence-atlas-c2_default` |

Both use `pgvector/pgvector:pg18-trixie`. C2 mounts only its named volume at
`/var/lib/postgresql`, the PostgreSQL 18 parent data path; no bind mount or external
volume is used. See the [PostgreSQL image documentation](https://hub.docker.com/_/postgres).
The tag follows development and is mutable; image digest pinning is future work.
The C2 container has no automatic restart policy.

Required: Docker Desktop with a Linux engine and Docker Compose supporting `name`,
Node.js 24, pnpm **12.9.1**, installed project dependencies, and an available local
port 5433. Runtime tool/port availability has not been verified by starting services.
The image's `POSTGRES_USER` creates a cluster superuser: this is an isolated local
migration role, not a production least-privilege role.

## Explicit configuration

Copy `.env.c2.example` to `.env.c2.local` and fill its three C2 variables locally.
Do not overwrite `.env` / `.env.local`, copy their secrets, or reuse their password.
Use a unique long random alphanumeric password and supply the complete connection
URL with that password. There is no variable expansion in the wrapper's dotenv
parser. URL-encode special characters if used; Compose interpolation also requires
care with `$`, which is why an alphanumeric password is recommended.

Database name, user, and ports are intentionally fixed in Compose and validation.
The two password representations must match after URL decoding. Templates contain
no password default. `.env.c2.local` is ignored by Git; only the example is tracked.

Docker Compose receives this file through explicit `--env-file`. Shell variables
take precedence in Compose: clear any inherited `C2_POSTGRES_PASSWORD` before using
the commands below so that Compose and the wrapper read the same credentials.
Do not pass additional Compose files, project names, profiles, or volume overrides.

Next.js does **not** automatically load `.env.c2.local`. Step 2 must explicitly pass
the validated C2 URL as `DATABASE_URL` to the app as well as its Auth adapter, while
configuring OAuth and preventing AI/telemetry side effects. Creating this file alone
does not switch the application to C2.

## Safe offline validation

These commands neither start containers nor connect to a database:

```powershell
pnpm exec tsx scripts/c2-db.ts validate
docker compose --env-file .env.c2.local -f compose.c2.yml -p evidence-atlas-c2 config --quiet
docker compose --env-file .env.c2.local -f compose.c2.yml -p evidence-atlas-c2 config --services
docker compose --env-file .env.c2.local -f compose.c2.yml -p evidence-atlas-c2 config --volumes
pnpm exec vitest run scripts/c2-db-target.test.ts
```

Expected service / volume keys: `postgres-c2` / `c2_postgres_data`. The latter maps
to the explicit Docker volume name in the architecture table. Never print resolved
Compose configuration with real credentials (`config` without `--quiet`, JSON,
or `--environment`), nor print the local env file or complete database URL.
Missing/empty C2 password makes Compose interpolation fail closed using `:?`.
See [Compose interpolation](https://docs.docker.com/reference/compose-file/interpolation/).

The wrapper reads **only the repository's `.env.c2.local`**, never an inherited C2
URL or development `DATABASE_URL`. It requires `C2_MODE=local`, a complete explicit
URL, PostgreSQL scheme, literal `127.0.0.1` or `localhost`, port 5433, database
`evidence_atlas_c2`, user `c2_local`, and a matching nonempty password. Query options,
fragments, altered paths and ambiguous serialized URLs are rejected. Validation
prints no URL or credentials and does not import Prisma or application DB modules.

The Prisma child receives the validated URL in its `DATABASE_URL` environment,
explicit C2 dotenv path, and no inherited libpq or dotenv override variables.
The repository's `prisma.config.ts` therefore sees the validated URL rather than
loading development configuration. The wrapper launches the installed Prisma bin
without a shell, arbitrary arguments, or secrets in command-line arguments.
It permits only `show`, `verify`, and explicitly opted-in `migrate`.

Raw Prisma stdout/stderr are suppressed because driver errors can contain secrets;
the wrapper reports success/failure only. This deliberately sacrifices migration
preview details. Review checked-in migration packages offline before applying;
any future diagnostic-output feature must redact credentials before forwarding.

Offline validation proves configuration consistency, **not** which service owns
port 5433 or whether a volume with the chosen name already exists. Plain Prisma,
seed, and application commands remain capable of targeting development: all future
C2 operations must use this guard, and a future seed must validate before importing
the DB runtime. This is a workflow safeguard, not a global security boundary.

## Prisma 8 schema authority

- Source: `src/prisma/contract.prisma`; emitted runtime artifacts:
  `src/prisma/contract.json` and `contract.d.ts`.
- CLI configuration: `prisma.config.ts`, PostgreSQL ORM and pgvector control
  extension. Current CLI: `8.0.0-rc.17`; ORM/extension: `8.0.0-rc.12`.
- Replayable history: `migrations/app/*/{migration.ts,migration.json,ops.json}`
  and its referenced `migrations/snapshots/` contracts.
- Extension history: `migrations/pgvector/20260601T0000_install_vector_extension/`
  plus pgvector refs. Its operation enables `vector`; the image provides the
  extension binaries, not an assertion that the target DB has enabled it.

Use Prisma 8 **`db migrate`**, not traditional `migrate deploy` / `db push`.
The configured control extension and multi-space migration history handle vector
installation and the dependent application schema; do not manually add extension
SQL, run `db init` to skip history, or generate new migrations for C2.
The online `db migrate --show` resolves the live marker; `db verify` checks the
target against the emitted contract. Neither should run before isolation review.
The existing `migrations/app/refs/db.json` predates the latest usage-event migration;
it is an offline planning pointer, not evidence of any target's live schema.
Do not advance or rewrite development refs for C2. Plain `db migrate` does not
implicitly advance the on-disk `db` ref.

No OAuth, AI, Redis, or Inngest credentials are required to apply/verify this schema.
The sole connection input for the wrapper is the validated C2 file. Migration
permissions are provided by the isolated container's initial local role.

## Future manual initialization — NOT EXECUTED

Step 1 verification: Compose v5.5.1 configuration parsing with a synthetic password
confirmed the project/service/container, volume/network names, loopback port, image,
database/user and healthcheck without creating resources or printing resolved
configuration. Empty-password configuration was rejected. All 28 synthetic guard
tests, TypeScript checking and lint passed. Git ignores the local C2 file but accepts
the template. The actual `.env.c2.local` was not created; direct wrapper validation
correctly failed for the missing explicit file. Migration snapshot references were
checked for presence, but no migration replay or live schema check was performed.

1. Review Compose, local configuration (without logging secrets), and all existing
   migrations, including destructive/data operations. Prisma `db migrate` does not
   request destructive-operation confirmation itself.
2. Obtain explicit developer approval to create/start the C2 resources and apply
   existing migrations. `--allow-c2-write` expresses command intent, not approval.
3. Check that port 5433 and the exact C2 container/volume/network names are unused,
   or positively identify existing resources as C2-owned. Stop on any collision;
   never remove or repurpose an unknown volume.
4. Start the standalone service (**NOT EXECUTED**, creates resources and initializes
   an empty PostgreSQL cluster):

   ```powershell
   docker compose --env-file .env.c2.local -f compose.c2.yml -p evidence-atlas-c2 up -d --wait postgres-c2
   ```

5. Confirm its image, Compose labels/project, loopback published port, health, and
   named-volume mount using narrowly selected inspect fields. Avoid full container
   inspection output, which includes its password. Healthcheck readiness alone
   does not prove isolation or schema readiness. Confirm the actual DB/user identity
   against C2 only after resource identity is established.
6. Preview and apply existing schema (**NOT EXECUTED**; `show` connects read-only,
   `migrate` writes schema/markers; wrapper intentionally suppresses preview output):

   ```powershell
   pnpm exec tsx scripts/c2-db.ts show
   pnpm exec tsx scripts/c2-db.ts migrate --allow-c2-write
   ```

7. Verify schema (**NOT EXECUTED**, connects to the C2 database):

   ```powershell
   pnpm exec tsx scripts/c2-db.ts verify
   ```

   Stop on any failure; do not use development connection settings, `db sign`,
   reset, or unreviewed schema changes as a fallback. Fresh-DB replay and pgvector
   ordering remain runtime verification items for this later stage.
8. Proceed to Google OAuth verification and Step 2 fixture implementation only
   after schema readiness. App startup, OAuth and fixture writes require their
   own separately authorized scope.

## Future fixture strategy — design only

Existing development seed creates fixed Users and is not idempotent. It creates
neither Google Accounts nor valid Auth.js Sessions; do not run it as the C2 fixture.

After a real Google login in the dedicated database, identify the actual User by
its authorized ID and verify its Google Account linkage. Never fabricate provider
tokens, credentials or Sessions. A later guarded fixture should transactionally
create/reconcile a reserved set of deterministic C2 IDs for Organization, Workspace,
Research, Finding and Source, plus Organization Membership, WorkspaceMembership,
and FindingSource composite keys. Reject collisions with records outside that
ownership set. Use read/reconcile or supported upsert operations so repeated runs
do not duplicate records. Do not trigger UI mutation/indexing actions or embeddings.

Keep a fixture ownership manifest and delete only its associated rows in foreign-key
dependency order. Preserve the real authenticated User/Account/Session by default;
fixture cleanup must not log out unrelated tests or delete unrelated records.
No seed implementation or fixture writes are included in Step 1.

## Safe teardown — NOT EXECUTED

Stop only the dedicated service, preserving its container and volume:

```powershell
docker compose --env-file .env.c2.local -f compose.c2.yml -p evidence-atlas-c2 stop postgres-c2
```

This command changes runtime state and was not run. Volume removal is a separate,
destructive operation requiring explicit developer approval and verification of
the exact `evidence-atlas-c2-postgres-data` identity, Compose labels, mount ownership,
and disposable contents. No volume-removal command is provided or executed here.
