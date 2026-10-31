# Prisma 8 RC partial upgrade review — 2026-10-31

The requested safe baseline is implemented as a partial upgrade. Offline validation passed. No local or production database connection, migration execution, database signing, server, production build, full Vitest suite, Playwright, commit, push, branch, or stash operation was performed.

## Versions and selection

| Package | Previous | Updated | Registry latest checked |
| --- | --- | --- | --- |
| `prisma` | `8.0.0-rc.17` | `8.0.0-rc.20` | `8.0.0-rc.29` |
| `@prisma/orm-postgres` | `8.0.0-rc.12` | `8.0.0-rc.14` | `8.0.0-rc.22` |
| `@prisma/orm-extension-pgvector` | `8.0.0-rc.12` | `8.0.0-rc.14` | `8.0.0-rc.22` |

Pins are exact. Registry metadata confirms CLI rc.20 depends on toolchain rc.14, and pgvector rc.14 pins its ORM dependencies/target peer to rc.14. `pnpm why @prisma/orm-framework` finds one version, rc.14. CLI rc.29 instead declares toolchain rc.21; matching CLI and ORM numbers would be incorrect.

The repository was clean on `main` at `f89ee03`. Actual tools: Node `v24.16.0` (request stated `v24.19.0`), pnpm `12.9.1`, TypeScript `6.0.3`, Vitest `3.2.7`. Node meets the selected CLI's `>=22.18.0` engine requirement. The package-manager declaration is unchanged.

## Why the newest releases are deferred

The official cumulative app recipes in the published rc.22 package were inspected for every transition from rc.12 through rc.22 before selecting the target. The first substantial migration boundary is rc.14 → rc.15: `contract-stores-data-type` replaces native type spellings with data type identifiers and rehashes historical contracts, snapshots, refs, and migrations. `sign-databases-after-upgrade` then requires signing each database; TypeScript cannot establish that compatibility. That work is deferred under the request's database and applied-history restrictions.

At rc.22, pgvector's contract declares the PostgreSQL extension, and offline emission pins a new head, snapshot, and two extension migrations. Existing databases need their extension marker advanced by migration; newly created databases take the new install path. rc.22 also changes PostgreSQL `DateTime` defaults and removes earlier temporal field presets. Keeping existing Temporal values would require explicit compatible schema syntax. None of these rc.15+ transformations or migrations were generated or applied here. The newest upgrade is not deployment-ready within this task; the selected rc.14 partial upgrade has no identified database-change requirement.

Primary sources checked on 2026-10-31:

- npm registry metadata: `pnpm view <package> dist-tags --json`, and selected versions' dependencies, peer dependencies, and engines.
- [Prisma rc.13 release notes](https://github.com/prisma/orm/releases/tag/v8.0.0-rc.13), [rc.14 release notes](https://github.com/prisma/orm/releases/tag/v8.0.0-rc.14), and [CLI rc.20 release notes](https://github.com/prisma/prisma-cli/releases/tag/v8.0.0-rc.20).
- [Prisma rc.15 release notes](https://github.com/prisma/orm/releases/tag/v8.0.0-rc.15) and its published `skills/prisma-8/upgrading/app/upgrades/8.0.0-rc.14-to-8.0.0-rc.15/instructions.md` recipe.
- [Prisma rc.22 release notes](https://github.com/prisma/orm/releases/tag/v8.0.0-rc.22) and [extension upgrade documentation](https://www.prisma.io/docs/orm/extensions/using-extensions).
- [Release status and separate CLI/library versioning](https://www.prisma.io/docs/orm/release-status).

## Compatibility and contract impact

No application query, database initialization, connection boundary, authentication, AI setting, or contract source needed changes. The new offline test constructs an unbound real PostgreSQL client and uses the real pgvector SQL builder for the actual workspace-scoped search function, replacing query execution only. Existing mocked tests cover Research/Source/Finding reads and writes, source allowlisting, retrieval/indexing, public demo evidence, and authorization.

`prisma contract emit --help` explicitly confirms emission is offline. Emission regenerated `src/prisma/contract.json` and `contract.d.ts`. Its only semantic change is execution-default reference keys: `{ namespace, table, column }` becomes `{ namespace, entry, field }`; a structural audit against HEAD confirms all remaining JSON content is identical except the recomputed execution hash.

| Hash | Result |
| --- | --- |
| Storage | unchanged: `2538aaf38e932fcf310c5d7b7f13f53e9aae06467492d64c8c30d0724df783f5` |
| Profile | unchanged: `3916f444a8a17ad749191acf9e08dad97d1a327b88c2f1d45d12f240296aa8b2` |
| Execution, before | `7eeb9d19a5a3abce6c8e2ab971d9f61aeba6073edbf7ff4a812155f396855c3e` |
| Execution, after | `b4ab5f58c64d4b9bcefa505214f92ce0d84f8c62be628b1006fecbbaff86710a` |

The rc.13 recipe requires the same reference-key rename in historical application snapshots because the new loader rejects the old keys. Its official script was copied into ignored `build/prisma-upgrade/`; only `build` was added to the skipped directories, to preserve unrelated existing review artifacts. It changed eight JSON snapshots and their eight declaration files. Audit of all nine historical JSON snapshots confirms that only these reference keys changed; storage/profile and stored historical execution hashes remain unchanged. The recipe explicitly retains historical execution hashes because the snapshot loader checks storage hashes, not execution hashes. Eight application snapshots load with the real static runtime; the separate pgvector pack snapshot is a control-plane contract, not an application runtime contract.

No `migration.ts`, `migration.json`, `ops.json`, snapshot directory name, app/pgvector ref, or pgvector pack snapshot changed. The latest migration compared with itself, and then with the freshly emitted contract, yields no operations and no emitted extension directories. This is offline migration-format evidence, not successful database replay.

`prisma skills sync` refreshed the four existing agent copies (`.agents`, `.claude`, `.cursor`, `.devin`) of shipped Prisma guidance, including the CLI's required Composer/Platform guidance and new rc.13/rc.14 recipes. These are vendor-generated changes; no agent-specific configuration was added. Required transitive changes are confined to Prisma packages (including CLI engine, Composer and management SDK). No unrelated direct dependency or lockfile package entry changed.

## Validation commands and results

| Command | Final result |
| --- | --- |
| `pnpm install` | passed; 12 packages added/12 removed; unrelated dependency versions preserved |
| `pnpm exec prisma --version` | passed, `8.0.0-rc.20` (baseline also checked: rc.17) |
| `pnpm exec prisma skills sync` | passed; installed versions synchronized |
| `pnpm exec prisma contract emit` | passed offline; hashes above |
| `node build/prisma-upgrade/rename-execution-ref-keys.ts` | passed, 16 snapshot files changed |
| `node build/prisma-upgrade/rename-execution-ref-keys.ts --check` | passed, 38 migration files scanned, zero remaining renames |
| `pnpm exec prisma migration plan --from 20261005T0212_add_ai_usage_event --to 20261005T0212_add_ai_usage_event` | passed offline, no operations or new files |
| `pnpm exec prisma migration plan --from 20261005T0212_add_ai_usage_event` | passed offline, emitted contract unchanged from latest migration; no operations or new files |
| `pnpm exec tsc --noEmit` | passed, zero diagnostics after correcting the new test |
| `pnpm exec eslint src/prisma/compatibility.test.ts` | passed, zero errors/warnings |
| `pnpm exec vitest run src/prisma/compatibility.test.ts --reporter=verbose` | passed, 10/10 tests |
| Scoped Vitest command below | passed, 12 files, 163/163 tests; zero failed/skipped |
| `node build/prisma-upgrade/audit.cjs` | passed; nine snapshots audited, unchanged storage/profile, no migration definition or unrelated package changes |
| `pnpm why @prisma/orm-framework` | one version: rc.14 |
| `pnpm peers check` | reports existing non-Prisma peer issues; command exits 0 |
| `git diff --check` | passed |

```powershell
pnpm exec vitest run src/prisma/compatibility.test.ts src/lib/ai/index-research.test.ts src/lib/ai/retrieve-workspace-context.test.ts src/lib/ai/retrieve-workspace-context.selection.test.ts src/lib/ai/resolve-workspace-sources.test.ts src/lib/ai/research-context.test.ts src/lib/demo/read.test.ts src/lib/demo/seed-evidence.test.ts src/lib/c2/runtime-database.test.ts src/auth/researchActions.test.ts src/auth/researchCreateActions.test.ts src/auth/childAuthorizationAcceptance.test.ts --reporter=json --outputFile=build/prisma-upgrade/scoped-vitest-final.json
```

The initial scoped run had 154 passed/10 failed (164 total): the newly written test used the wrong hash/AST property names and attempted to treat the extension's type-definition contract as an application runtime contract. The application regression tests passed. The corrected test now covers eight application snapshots, unbound initialization and actual search planning (10 tests); both its isolated rerun and the final 163-test selection pass. The first post-test typecheck identified five errors in that new test; the final typecheck passes. A `tsx` codemod preflight and a Node Git audit initially hit sandbox worker-process restrictions; Node's native TypeScript support and approved local worker execution resolved these. These failures did not indicate an application compatibility regression.

Peer warnings concern OpenTelemetry API ranges, Effect, Vite and Vitest. The package-entry audit confirms no non-Prisma package version/metadata changes in the lockfile, so these existing warnings were left outside scope. Full tests, browser tests and a production build were unnecessary for this dependency-only compatibility scope.

## Commit, deployment, and remaining verification

- Safe to commit for review: yes, as an explicitly partial rc.14 baseline with the recorded offline results. No commit was made.
- Database changes required by this partial upgrade: none identified; contract storage/profile equality, unchanged migration definitions, and offline no-op planning support this conclusion.
- Deployment approval: not established. Local DB validation was not performed; production compatibility was not verified. Successful TypeScript/mocked tests do not prove live migration replay, driver behavior, or vector results.
- Remaining manual verification: with separately authorized isolated PostgreSQL/pgvector, verify existing database reads/writes, seed-independent evidence retrieval, vector distance results, authorization/demo boundaries and fresh migration replay. Do not use production for that check. A future rc.15+ upgrade needs a reviewed historical-contract conversion and database-marker/signing plan; rc.22 also needs extension-marker migration review.
- Modified files: package manifest/lockfile, two generated contract artifacts, 16 application snapshot files, the new offline test, this report, one architecture paragraph, and synchronized vendor skills. The review ZIP's `changed-files.txt` and SHA-256 manifest list every individual path, including untracked additions and any staged changes.
- Review ZIP: `C:\Users\owner\Desktop\sm-dev\review-zips\evidence-atlas-prisma-rc14-20261031.zip`. It contains changed files, a complete unified diff from HEAD, validation evidence and this report; excludes environment files, secrets, database dumps and ignored unrelated artifacts.
