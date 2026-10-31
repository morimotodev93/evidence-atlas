# Prisma RC14 C2 read-only database compatibility — 2026-10-31

Result: **11 checks passed, 0 failed, 3 skipped** against the existing isolated local C2 database. This is partial real-database compatibility evidence, not complete integration acceptance or production compatibility verification.

The developer explicitly directed: **“Preserve existing C2 data; allow read-only checks only.”** This narrows the original disposable-database request. No schema initialization, migration, signing, insert, update, delete, seed, fixture creation, container startup/stop, or volume removal was performed. Production, Preview and shared development databases were not accessed.

## Baseline and environment

- Clean working tree on `main`, commit `49786e9` (`chore: upgrade Prisma 8 RC dependencies and contracts`); predecessor `f89ee03`. Existing upgrade files preserved. No commit, push, branch, merge, or stash operation.
- CLI `8.0.0-rc.20`; ORM/pgvector `8.0.0-rc.14`; pnpm `12.9.1`.
- Actual Node `v24.16.0`, rather than the request's stated `v24.19.0`.
- Existing Docker Desktop Linux engine, client/server `29.8.0`; Compose `v5.5.1`; local context `desktop-linux` with named-pipe endpoint `npipe:////./pipe/dockerDesktopLinuxEngine`.
- Existing container `evidence-atlas-c2-postgres`, healthy, image `pgvector/pgvector:pg18-trixie`, image label digest `sha256:ff8da7b0714e5efa413d77f43e24d93064dd66469d418d12608c1bbc91fcf045`.
- Container Compose labels identify this checkout, `compose.c2.yml`, project `evidence-atlas-c2`, service `postgres-c2`, and dedicated `.env.c2.local`.
- Only published binding: `127.0.0.1:5433` → container `5432`. Only mount: named local volume `evidence-atlas-c2-postgres-data` at `/var/lib/postgresql`, with C2 ownership labels. Only network: `evidence-atlas-c2_default`.
- The persistent volume dates from 2026-10-12; it was neither treated as empty/disposable nor reset.

## Isolation before connecting

Existing C2 documents, Compose, target validator, Prisma wrapper and fixture manifest were inspected first. Resource identity was established through narrow Docker inspect fields; no full inspect/environment output was printed. The test rechecks labels, context endpoint, image, exact port binding, volume ownership and network before dynamically loading database libraries.

The test parses only `.env.c2.local` using `parseDedicated` and `validateC2Target`. It never loads standard dotenv files or imports the application's DB singleton, Auth, seed, AI, or external service modules. The driver receives explicit host `127.0.0.1`, port `5433`, database `evidence_atlas_c2`, role `c2_local`, dedicated password in memory, TLS disabled for this local endpoint, bounded timeouts and an explicit application name. Inherited database URLs/libpq configuration are not used to choose its target. No credential or row content is logged.

The PostgreSQL session starts with `default_transaction_read_only=on`, enters `REPEATABLE READ READ ONLY`, and verifies `transaction_read_only=on`. Server identity confirms database `evidence_atlas_c2`, role `c2_local`, and internal port `5432`. The schema-verification child uses existing `prepareC2Prisma("verify", ...)` with an OS-only inherited environment and `PGOPTIONS=-c default_transaction_read_only=on`; it captures raw Prisma output in memory and emits only pass/fail. It has no migration/write mode.

## Real database results

| Check | Result |
| --- | --- |
| Configuration and container isolation | passed |
| PostgreSQL connection, server identity and read-only transaction | passed |
| Installed `vector` extension and actual `retrievalChunk.embedding` type `vector(768)` | passed |
| RC14 ORM initialization using the existing contract and pgvector runtime registration | passed |
| Reserved C2 Research lookup, Workspace linkage and Source/Finding relation includes | passed |
| Reserved C2 Source retrieval and expected synthetic URL | passed |
| Reserved C2 Finding retrieval and FindingSource → Source include | passed |
| Existing protected eight-row fixture graph equals its checked-in manifest | passed |
| PostgreSQL `vector_dims` and cosine `<=>` on a 768-element vector compared with itself | passed; dimensions 768, distance 0 |
| Persisted-vector codec and similarity retrieval | skipped; no existing RetrievalChunk in the reserved C2 Workspace |
| Prisma `db verify` against the current live schema/contract spaces | passed, child exit 0 |
| Fresh migration replay | skipped; existing persistent data must be preserved, writes not authorized |
| Representative insert/update | skipped; read-only authorization |
| Prisma/driver connection cleanup | passed; client closed, transaction rolled back, borrowed connection ended, process exited normally |

The scalar vector operation is a basic type/operator smoke check, not a similarity benchmark. It does not establish stored embedding round trips, expected-record retrieval, ranking or the complete application evidence-retrieval flow. No vector row was created merely to fill the missing fixture.

Live schema verification found no schema/marker incompatibility requiring a change on this existing C2 database. It does not prove fresh history replay or the behavior of unapplied migrations. Historical migration files, refs, schema source, generated contracts, dependency pins, public-demo seed, Auth and AI settings are unchanged.

## Exact execution and evidence

Read-only Docker availability/identity checks used:

```powershell
docker version --format '{{.Client.Version}} {{if .Server}}{{.Server.Version}}{{end}}'
docker compose version
docker context show
docker ps -a --filter name=evidence-atlas-c2-postgres --format '{{.Names}}|{{.Status}}|{{.Image}}|{{.Ports}}'
docker volume ls --filter name=evidence-atlas-c2-postgres-data --format '{{.Name}}|{{.Driver}}'
docker inspect evidence-atlas-c2-postgres --format '{{json .Config.Image}}|{{json .Config.Labels}}|{{json .HostConfig.PortBindings}}|{{json .Mounts}}|{{json .NetworkSettings.Networks}}|{{json .State.Health.Status}}'
docker volume inspect evidence-atlas-c2-postgres-data --format '{{json .Name}}|{{json .Labels}}|{{json .Options}}|{{json .CreatedAt}}'
docker context inspect desktop-linux --format '{{json .Endpoints.docker.Host}}'
```

The targeted integration command was executed **once**:

```powershell
node scripts/prisma-rc14-c2-readonly.ts --read-only
```

Its subprocess is the installed Prisma binary invoked as `db verify`, with the validated C2 environment from the existing wrapper helper. The test internally rechecks Docker using `docker --context desktop-linux` and one narrow JSON field per call. Sanitized results are retained in the ZIP as `validation/read-only-run-1.json`.

New-script verification:

```powershell
pnpm exec eslint scripts/prisma-rc14-c2-readonly.ts
pnpm exec tsc --noEmit
git diff --check
```

Scoped ESLint and the final typecheck passed. The first typecheck reported two environment-typing diagnostics in the new script because Next's `ProcessEnv` declarations require `NODE_ENV`. An explicit type assertion for the intentionally restricted environment corrected those diagnostics without changing runtime behavior; no database rerun was needed. No real-database assertion failed. The first sandboxed Docker query could not access its named pipe; an approved local Docker inspection succeeded. No remote substitute was used.

The prior 163 offline tests were not rerun. Full Vitest, Playwright, application/server startup, production build, OAuth, embedding/API generation, Redis and Turnstile were not invoked.

## Remaining deployment decision

- **Offline compatibility:** previously passed in the [upgrade review](prisma-8-rc14-upgrade-review.md); preserved, not repeated here.
- **Isolated real-database compatibility:** existing-schema verification and representative read paths passed; writes, fresh replay and persisted-vector retrieval remain incomplete.
- **Production compatibility:** not tested. These results support review but are insufficient by themselves to approve deployment. A separately authorized disposable environment is still needed for replay, write paths and persisted-vector retrieval.
- Documentation conflict reported: the earlier C2 setup document still names CLI rc.17 / ORM rc.12. The committed upgrade and current architecture/upgrade report name rc.20 / rc.14. Its historical setup prose was not silently rewritten in this test-only task.

Only `scripts/prisma-rc14-c2-readonly.ts` and this report were added. Sanitized logs and packaging material are under ignored `build/prisma-rc14-c2/`. No environment file, credential, dump or unrelated artifact is included in the review ZIP.

Review ZIP: `C:\Users\owner\Desktop\sm-dev\review-zips\evidence-atlas-prisma-rc14-c2-readonly-20261031.zip`.
