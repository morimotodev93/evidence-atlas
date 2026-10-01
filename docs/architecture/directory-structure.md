# Directory Structure

> **Status:** Current implementation; future areas remain provisional
> **Last Updated:** 2026-10-01

This document describes the implemented architecture of **Evidence Atlas**. Empty placeholder directories are omitted from the tree below.

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
│   ├── components/
│   │   ├── icons/
│   │   └── ui/
│   ├── lib/                # Database query helpers and shared utilities
│   │   └── ai/             # Models, indexing/retrieval, context, and citations
│   ├── prisma/             # Contract, generated artifacts, runtime, and seed
│   └── types/              # Shared types and validation schemas
├── .env.example
├── compose.yml
├── package.json
├── pnpm-lock.yaml
├── prisma.config.ts
└── README.md
```

## Directory Responsibilities

### `docs/`

- `architecture/` defines the data model, AI/RAG boundaries, and application structure.
- `design/` defines the intended UX and reusable UI conventions.
- `planning/` defines the product scope and implementation roadmap.
- `reference/` and `usage/` are reserved for future technical and operational documentation; they currently contain no documents.

### `src/app/`

Next.js App Router pages and route-local application behavior.

| Route | Current responsibility |
| --- | --- |
| `/` | Database-backed Workspace overview, three recently updated Research items, and Research/Source/Finding/Tag counts |
| `/research` | Workspace-scoped Research list with Tags, title/description search, status filtering, and sorting |
| `/research/new` | Create Research |
| `/research/[id]` | Research detail, status/Conclusion editing, Source/Finding/Comment management, Finding–Source links, and Tag attachment/detachment |
| `/research/[id]/edit` | Edit Research title and description |
| `/research/[id]/chat` | POST: retrieve same-Workspace knowledge and stream an AI response for an existing Research conversation |
| `/research/[id]/chat/conversations` | GET: list conversation previews; POST: create a conversation |
| `/research/[id]/chat/conversations/[conversationId]` | GET: restore messages and cited Sources resolved within the Research's Workspace |

Server Actions live in `_actions/`. Research-detail dialogs live in `_components/`. These private folders do not create routes.

Research detail also hosts the AI Assistant: a sticky side panel at `lg` and above, and a fixed Ask AI action opening a dialog below `lg`. Both reuse the same panel component. Each panel instance owns its client state; switching viewport layouts does not synchronize the selected conversation or draft. Persisted conversations can be reopened through History.

The root layout defines document metadata and typography. Global styles, semantic tokens, and light/dark palettes live in `src/app/globals.css`.

### `src/components/`

`ui/` contains reusable shadcn/ui primitives. Route-specific components remain next to their routes. The existing `common/` and `features/` directories are placeholders; shared application components can be added when repeated use justifies them.

`icons/` provides the application icon entry point, currently exporting the Lucide X icon used by the Tag detachment control.

### `src/lib/` and `src/types/`

`lib/` contains shared date and class-name utilities and a Prisma query-result compatibility helper. Database runtime configuration lives in `src/prisma/db.ts`.

`lib/ai/` owns generation and embedding model configuration, text chunking, Research indexing, Workspace vector retrieval, current Research context, and citation validation/resolution. The chat Route Handler combines current Research knowledge, retrieved Workspace context, and persisted messages before streaming plain text. Completed responses are checked against a request-specific Source allowlist before persistence. Conversation detail resolves citations within the Workspace. See [AI Architecture](ai-architecture.md) for the full flow and live-versus-restored citation boundaries.

`types/` contains shared application types and Zod validation schemas for Research, Sources, Findings, Comments, and Tags.

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

Forms use shared validation schemas; interactive dialogs are client components. Pages and Server Actions access the database on the server.

The AI path adds document embeddings stored in PostgreSQL and query embeddings generated for each new question. Retrieval filters chunks to the current Research's Workspace, then hydrates current knowledge metadata. Conversation ownership remains Research-scoped; there is no separate Workspace chat route. Derived index content can lag behind edits because indexing is manual.

The overview and Research list load the first returned Workspace and read its Research data. The overview sorts Research by `updatedAt` and displays up to three items; its counts cover all Research in that Workspace and all of its Tags, including unattached Tags.

The Research list uses GET parameters: `query` searches title and description with trimmed, case-insensitive substring matching; `status` accepts `IN_PROGRESS`, `COMPLETED`, or `ARCHIVED`; `sort` accepts `updated` (default), `newest`, or `oldest`. Invalid status values mean no status filter, and invalid sort values fall back to `updated`. Filtering and sorting run in server-side JavaScript after loading the Workspace's Research records. Tag filtering and pagination are not implemented.

## Planned Architecture and Known Gaps

The earlier proposed `(public)` and `(dashboard)` route groups are not implemented. JSON and streaming APIs now exist as Route Handlers under the Research chat routes; there is no separate top-level API directory. Public Demo separation and authenticated navigation remain future work.

Research-scoped AI conversations and same-Workspace retrieval with pgvector are implemented. Authentication, authorization, and billing remain planned. Chat routes check that a conversation belongs to the requested Research but do not enforce user or Workspace membership. Retrieval scope is not an authorization boundary.

Workspace selection is not implemented: the overview and list use the first returned Workspace, and Research creation uses the first stored Workspace and User. Detail routes and mutations look up records by ID without membership checks; new Comments use the Research creator as their author. These development behaviors do not implement the membership and permission boundaries defined in the [data model](data-model.md).

The read-only public Demo requirement in the [product definition](../planning/product-definition.md) is not implemented: the current application exposes write operations.

## Architecture Principles

1. Keep the Next.js App Router structure recognizable.
2. Separate reusable UI primitives from route-specific components.
3. Keep database access and sensitive resources on the server.
4. Isolate AI-related infrastructure when it is introduced.
5. Add architectural layers when their responsibilities are clear.
6. Preserve the conceptual separation between the public Demo and authenticated application.
