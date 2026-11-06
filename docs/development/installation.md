# Ordinary local installation

This path uses a separately provisioned local PostgreSQL database. The
[Windows Docker Desktop Review workflow](local-review.md) has different database,
fixture and authentication safeguards; its helper scripts are not Linux setup commands.

## Prerequisites and environment

Use Node.js **24** and pnpm **12.9.1**, as declared in `package.json`. Provision
PostgreSQL **15 or later** with pgvector installed on the server and a new, empty
database dedicated to this checkout. The migration connection needs permission
to create the `vector` extension and application tables. Installing PostgreSQL
alone does not install pgvector. The repository's `compose.yml` describes an
optional local pgvector/PostgreSQL container; Docker is not required for this path.

From the repository root, install the locked dependencies:

```bash
pnpm install
```

Copy `.env.example` to `.env` only if `.env` does not already exist, and configure
`DATABASE_URL` for the dedicated database. Never overwrite existing secrets.
Prisma CLI and seeds load `.env` through `dotenv/config`; Next.js also loads
`.env.local`. Check inherited environment variables and existing env files so
the CLI, seeds and application target the same intended database. Do not use
Production, C2, Review, or an existing shared/development database for a fresh install.

## Existing migrations and seed selection

After verifying the database host, port, name and role, inspect the existing
migration plan, then apply it to the empty database:

```bash
pnpm exec prisma db migrate --show
pnpm exec prisma db migrate
```

These commands use `prisma.config.ts` and the checked-in contracts/migration
packages, including the pgvector extension migration. They are Prisma 8 commands;
do not substitute older `prisma migrate dev`/`deploy` instructions, generate a new
baseline, reset a database, or bypass a marker/drift error. If replay or verification
fails, preserve the error and inspect the target/history before proceeding.
`pnpm exec prisma db verify` is available for diagnosing schema drift; it is not
a repair command.

Choose at most one optional seed profile for the fresh installation:

| Command | Data and intended use |
| --- | --- |
| `pnpm seed:demo` | Four curated Public Demo Research items in the Demo Organization/Workspace |
| `pnpm seed` | Development examples with fictional Alice/Bob users; not a Google login or Public Demo dataset |
| No seed | Empty SaaS installation; sign in and use ordinary onboarding |

Both seeds are **non-idempotent, create-only scripts**, not reset or repair tools.
They do not wrap the whole seed in one transaction: failures can leave partial
data, and reruns can fail on duplicate identities. Do not run both profiles or
rerun a failed seed to repair an installation. Inspect and preserve existing data;
use a separately provisioned empty database for another fresh attempt. Seeds do
not provision provider services or build the derived retrieval index.

## Public Demo or SaaS

For read-only Demo browsing, run `pnpm seed:demo` once, then use a database client
on that same verified database to read the `id` of the `public.workspace` row
named **AI-Assisted Software Development** whose related `public.organization`
is named **Evidence Atlas Demo** (`workspace.organizationId` references
`organization.id`). The seed prints the names, not the Workspace ID. Set the
persisted ID as the server-only `DEMO_WORKSPACE_ID` in `.env`; do not use a Research
ID or guess the ID from a name. If multiple rows match, inspect their ownership
and content before selecting the intended publication scope. The reader validates
both names and publishes only Research within the selected Workspace.

Set exact `PUBLIC_DEMO_MODE=true` and leave `DEMO_CHAT_ENABLED=false` for browsing
without live AI. Start `pnpm dev` and open `/en/demo` or `/ja/demo` on the printed
local origin. Demo browsing does not require Google OAuth; SaaS entry points such
as `/research` are disabled in this mode. Restart after changing server settings;
a deployed Demo requires the mode at both build and runtime. For Chat-enabled
deployment requirements and open acceptance gates, see [README](../../README.md#public-demo)
and the [AI configuration contract](../architecture/ai-architecture.md#41-public-demo-chat-configuration-contract).

For ordinary SaaS, use `PUBLIC_DEMO_MODE=false`, configure `AUTH_SECRET`,
`AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`, and register the Google OAuth callback
for the actual local origin (`/api/auth/callback/google`). Start `pnpm dev`, sign
in and complete onboarding. Seeded fictional users do not authenticate a real
Google account. SaaS Chat/embeddings require `GOOGLE_GENERATIVE_AI_API_KEY`;
Redis rate limits and Inngest indexing need their own configuration described in
[.env.example](../../.env.example) and [AI architecture](../architecture/ai-architecture.md).
Installation and seeded browsing do not establish AI, OAuth or indexing readiness.

## Supporting installation report and limits

An independent Ubuntu VM installation report supplied for this documentation
task records Node **24.22.1**, pnpm **12.9.1**, PostgreSQL **16.2** and pgvector
**0.6.0**; dependency installation, TypeScript checking, nine migrations
and `seed:demo` succeeded. English/Japanese Demo list and selected detail routes
returned 200 with the seeded Workspace ID, without Google OAuth. These are reported
results for that environment, not checks repeated in this documentation task or
a general compatibility guarantee. The local seed and deployed Demo may differ.

The report also observed SaaS sign-in redirects/CSRF refusal and protected pages
using a temporary manually created test session, later removed. That is bounded
page-access evidence, not verification of real Google OAuth, full SaaS workflows,
or a supported installation/login procedure. The Windows Review helper failed its
Docker prerequisite check on that VM. Groq, Turnstile, Redis, Gemini, embeddings
and Inngest operation were not verified; no release gate is passed by this report.
