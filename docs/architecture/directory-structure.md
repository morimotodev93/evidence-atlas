# Directory Structure

> **Status:** Current implementation; future areas remain provisional
> **Last Updated:** 2026-10-05

This document describes the implemented architecture of **Evidence Atlas**.
The tree below highlights the application-relevant structure.
Empty placeholder directories and ancillary tooling/configuration files may be omitted.

## Project Structure

```text
evidence-atlas/
├── docs/
│   ├── architecture/       # Data model, AI/RAG, and application structure
│   ├── design/             # Design direction and design system
│   └── planning/           # Product definition and roadmap
├── migrations/
│   ├── app/                # Migration packages and database refs
│   ├── pgvector/           # Vector extension migration
│   └── snapshots/          # Contract snapshots used by migrations
├── public/
├── scripts/               # Explicit Research indexing and manual AI evaluation
├── src/
│   ├── app/
│   │   ├── api/auth/[...nextauth]/ # Auth.js GET/POST Route Handler
│   │   ├── onboarding/         # Initial Organization/Workspace setup
│   │   │   ├── _actions/
│   │   │   └── _components/
│   │   ├── settings/
│   │   │   ├── organization/   # Organization member roles
│   │   │   │   ├── _actions/
│   │   │   │   └── _components/
│   │   │   └── workspace/      # Workspace member roles
│   │   │       ├── _actions/
│   │   │       └── _components/
│   │   ├── research/
│   │   │   ├── _actions/
│   │   │   ├── new/
│   │   │   └── [id]/
│   │   │       ├── _actions/
│   │   │       ├── _components/
│   │   │       ├── chat/        # Streaming and conversation Route Handlers
│   │   │       └── edit/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── auth.ts             # Auth.js configuration and session helpers
│   ├── auth/               # Auth database adapter, access guards, and tests
│   ├── components/
│   │   ├── icons/
│   │   ├── layout/         # Shared application header
│   │   ├── ui/
│   │   └── workspace/      # Workspace selector
│   │── lib/                # Shared utilities and AI infrastructure
│   └── ai/                 # Models, indexing/retrieval, context, and citations
│   ├── prisma/             # Contract, generated artifacts, runtime, and seed
│   ├── types/              # Shared types, validation, and session augmentation
│   └── workspace/          # Current Workspace resolution and switching
├── .env.example
├── compose.yml
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── prisma.config.ts
├── vitest.config.ts
└── README.md
```

## Directory Responsibilities

### `docs/`

- `architecture/` defines the data model, AI/RAG boundaries, and application structure.
- `design/` defines the intended UX and reusable UI conventions.
- `planning/` defines the product scope and implementation roadmap.
- `reference/` and `usage/` are reserved for future technical and operational documentation and are not currently checked in.

### `src/app/`

Next.js App Router pages and route-local application behavior.

| Route                                                | Current responsibility                                                                                                             |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                                  | Database-backed Workspace overview, three recently updated Research items, and Research/Source/Finding/Tag counts                  |
| `/research`                                          | Workspace-scoped Research list with Tags, title/description search, status filtering, and sorting                                  |
| `/research/new`                                      | Create Research                                                                                                                    |
| `/api/auth/[...nextauth]`                            | Auth.js GET/POST handlers for Google sign-in, callbacks, sessions, and sign-out                                                    |
| `/onboarding`                                        | Create an initial Organization, Workspace, and ADMIN memberships for a User without an accessible Workspace                        |
| `/settings/organization`                             | Display the current Workspace's Organization and members; Organization ADMIN users can change member roles                         |
| `/settings/workspace`                                | Display the current Workspace and members; Workspace ADMIN users can change member roles                                           |
| `/research/[id]`                                     | Research detail, status/Conclusion editing, Source/Finding/Comment management, Finding–Source links, and Tag attachment/detachment |
| `/research/[id]/edit`                                | Edit Research title and description                                                                                                |
| `/research/[id]/chat`                                | POST: retrieve same-Workspace knowledge and stream an AI response for an existing Research conversation                            |
| `/research/[id]/chat/conversations`                  | GET: list conversation previews; POST: create a conversation                                                                       |
| `/research/[id]/chat/conversations/[conversationId]` | GET: restore messages and cited Sources resolved within the Research's Workspace                                                   |

Route-local Server Actions live in `_actions/`. Research-detail dialogs and onboarding/settings forms live in `_components/`. These private folders do not create routes. Workspace switching is a shared Server Action in `src/workspace/`.

Research detail also hosts the AI Assistant: a sticky side panel at `lg` and above, and a fixed Ask AI action opening a dialog below `lg`. Both reuse the same panel component. Each panel instance owns its client state; switching viewport layouts does not synchronize the selected conversation or draft. Persisted conversations can be reopened through History.

The root layout defines document metadata and typography. Global styles, semantic tokens, and light/dark palettes live in `src/app/globals.css`.

### `src/components/`

`ui/` contains reusable shadcn/ui primitives. Route-specific components remain next to their routes.
Additional shared areas such as `common/` or `features/` may be introduced later when repeated use justifies them.

`icons/` provides the application icon entry point, currently exporting the Lucide X icon used by the Tag detachment control.

`layout/` contains the shared application header with Organization/Workspace settings links and sign-out. `workspace/` contains the client Workspace selector used by the overview and Research list.

### `src/auth.ts`, `src/auth/`, and `src/workspace/`

`auth.ts` configures Auth.js with Google OAuth, database-backed sessions, and the authenticated User ID on the session. `auth/` contains the Kysely adapter database connection and table-name mapping for the existing PostgreSQL auth tables, plus server-side User, Organization, Workspace, and Research access guards. Authentication storage uses Kysely against the same database as the Prisma application runtime.

Application pages require an authenticated User. Organization and Workspace memberships are independent authorization scopes. ADMIN guards protect member role changes; both role-update actions reject demotion of the final ADMIN. Research reads and mutations require membership in the Research's Workspace. Missing and inaccessible Research share an access-error boundary. Chat handlers return `401` for unauthenticated requests and `404` for missing or inaccessible Research/Conversation resources.

`workspace/` lists accessible Workspaces, resolves the current Workspace, and switches it through a Server Action. The selected ID is stored in an HTTP-only cookie and revalidated against WorkspaceMembership. An absent, stale, or unauthorized selection falls back to an accessible Workspace; Users with none are redirected to onboarding.

Access-control Vitest tests are colocated in `auth/`. They cover Research mutations and creation-related actions, chat routes, onboarding provisioning, and Organization/Workspace role management. `vitest.config.ts` supplies the `@` source alias. Playwright is available through the package script, but no E2E test suite is currently checked in.

### `src/lib/` and `src/types/`

`lib/` contains shared date and class-name utilities and a Prisma query-result compatibility helper. Database runtime configuration lives in `src/prisma/db.ts`.

`lib/ai/` owns generation and embedding model configuration, text chunking, Research indexing, Workspace vector retrieval, current Research context, and citation validation/resolution. The chat Route Handler combines current Research knowledge, retrieved Workspace context, and persisted messages before streaming plain text. Completed responses are checked against a request-specific Source allowlist before persistence. Conversation detail resolves citations within the Workspace. See [AI Architecture](ai-architecture.md) for the full flow and live-versus-restored citation boundaries.

`types/` contains shared application types and Zod validation schemas for Research, Sources, Findings, Comments, and Tags.

`next-auth.d.ts` augments the session type with the authenticated User ID. Onboarding and member-role validation schemas remain local to their Server Actions.

### `src/prisma/` and `migrations/`

`contract.prisma` defines the Prisma 8 data contract. `contract.json` and `contract.d.ts` are generated artifacts. `db.ts` creates the PostgreSQL runtime, and `seed.ts` provides development sample data.

`prisma.config.ts` connects the CLI to the contract and `DATABASE_URL`. Both CLI configuration and runtime register the pgvector extension. Application migrations, including RetrievalChunk storage, live under `migrations/app/`; extension installation lives under `migrations/pgvector/`, and contract snapshots under `migrations/snapshots/`. Local Compose uses a PostgreSQL 18 image with pgvector.

### `scripts/`

Scripts provide explicit per-Research indexing and manual inspection of vector search, hydrated retrieval context, and citation handling. They are operational/development entry points, not application routes or an automated test suite. Indexing is not wired to knowledge CRUD; changed Research knowledge requires explicit reindexing. Commands and evaluation boundaries are documented in [AI Architecture](ai-architecture.md#13-phase-6-retrieval--rag).

## Current Data Flow

```text
Server-rendered pages / form Server Actions
                    ↓
       Prisma runtime (src/prisma/db.ts)
                    ↓
                PostgreSQL
```

Forms use validation schemas; interactive dialogs are client components. Pages, Server Actions, and Route Handlers enforce authentication and membership checks before accessing application data on the server. Auth.js sessions use a separate Kysely connection to the same PostgreSQL database.

The AI path adds document embeddings stored in PostgreSQL and query embeddings generated for each new question. Retrieval filters chunks to the current Research's Workspace, then hydrates current knowledge metadata. Conversation ownership remains Research-scoped; there is no separate Workspace chat route. Derived index content can lag behind edits because indexing is manual.

The overview and Research list resolve the authenticated User's current accessible Workspace and read its Research data. The overview sorts Research by `updatedAt` and displays up to three items; its counts cover all Research in that Workspace and all of its Tags, including unattached Tags.

The Research list uses GET parameters: `query` searches title and description with trimmed, case-insensitive substring matching; `status` accepts `IN_PROGRESS`, `COMPLETED`, or `ARCHIVED`; `sort` accepts `updated` (default), `newest`, or `oldest`. Invalid status values mean no status filter, and invalid sort values fall back to `updated`. Filtering and sorting run in server-side JavaScript after loading the Workspace's Research records. Tag filtering and pagination are not implemented.

## Planned Architecture and Known Gaps

The earlier proposed `(public)` and `(dashboard)` route groups are not implemented. JSON and streaming APIs exist as Route Handlers under the Research chat routes; Auth.js uses a separate handler under `src/app/api/auth/`. Authenticated application navigation is implemented through the shared header. Public Demo separation remains future work.

Research-scoped AI conversations and same-Workspace retrieval with pgvector are implemented. Authentication and membership-based authorization are implemented for application pages, mutations, and chat routes. Chat routes check both Workspace access and that a conversation belongs to the requested Research. Retrieval scope supplements these access checks; it is not itself an authorization boundary. Billing, rate limiting, usage tracking, and background jobs remain planned.

Workspace selection, initial Organization/Workspace provisioning, and member role management are implemented. Research creation uses the authenticated User and current accessible Workspace; new Comments use the authenticated User as their author. Workspace membership permits Research reads and writes, while Organization and Workspace ADMIN roles control their respective member role changes. Invitation flows, member removal, and advanced administration remain future work. See the [data model](data-model.md) and [Phase 7 roadmap](../planning/roadmap.md#phase-7--authentication--multi-user-architecture).

The read-only public Demo requirement in the [product definition](../planning/product-definition.md) is not implemented: the current authenticated application allows members to write Workspace knowledge and has no separate read-only Demo mode.

## Architecture Principles

1. Keep the Next.js App Router structure recognizable.
2. Separate reusable UI primitives from route-specific components.
3. Keep database access and sensitive resources on the server.
4. Keep AI-related infrastructure isolated in its shared module.
5. Add architectural layers when their responsibilities are clear.
6. Preserve the conceptual separation between the public Demo and authenticated application.
