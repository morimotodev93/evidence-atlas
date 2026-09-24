# Directory Structure

> **Status:** Current implementation; future areas remain provisional
> **Last Updated:** 2026-09-24

This document describes the implemented architecture of **Evidence Atlas**. Empty placeholder directories are omitted from the tree below.

## Project Structure

```text
evidence-atlas/
├── docs/
│   ├── architecture/       # Data model and application structure
│   ├── design/             # Design direction and design system
│   └── planning/           # Product definition and roadmap
├── migrations/
│   ├── app/                # Migration packages and database refs
│   └── snapshots/          # Contract snapshots used by migrations
├── public/
├── src/
│   ├── app/
│   │   ├── research/
│   │   │   ├── _actions/
│   │   │   ├── new/
│   │   │   └── [id]/
│   │   │       ├── _actions/
│   │   │       ├── _components/
│   │   │       └── edit/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── icons/
│   │   └── ui/
│   ├── lib/                # Database query helpers and shared utilities
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

- `architecture/` defines the data model and application structure.
- `design/` defines the intended UX and reusable UI conventions.
- `planning/` defines the product scope and implementation roadmap.
- `reference/` and `usage/` are reserved for future technical and operational documentation; they currently contain no documents.

### `src/app/`

Next.js App Router pages and route-local application behavior.

| Route | Current responsibility |
| --- | --- |
| `/` | Workspace overview with static sample content and counts |
| `/research` | Database-backed Research list with Tags |
| `/research/new` | Create Research |
| `/research/[id]` | Research detail, Source/Finding/Comment management, and Tag attachment/detachment |
| `/research/[id]/edit` | Edit Research title and description |

Server Actions live in `_actions/`. Research-detail dialogs live in `_components/`. These private folders do not create routes.

The root layout defines document metadata and typography. Global styles, semantic tokens, and light/dark palettes live in `src/app/globals.css`.

### `src/components/`

`ui/` contains reusable shadcn/ui primitives. Route-specific components remain next to their routes. The existing `common/` and `features/` directories are placeholders; shared application components can be added when repeated use justifies them.

`icons/` provides the application icon entry point, currently exporting the Lucide X icon used by the Tag detachment control.

### `src/lib/` and `src/types/`

`lib/` contains shared date and class-name utilities and a Prisma query-result compatibility helper. Database runtime configuration lives in `src/prisma/db.ts`.

`types/` contains shared application types and Zod validation schemas for Research, Sources, Findings, Comments, and Tags.

### `src/prisma/` and `migrations/`

`contract.prisma` defines the Prisma 8 data contract. `contract.json` and `contract.d.ts` are generated artifacts. `db.ts` creates the PostgreSQL runtime, and `seed.ts` provides development sample data.

`prisma.config.ts` connects the CLI to the contract and `DATABASE_URL`. Migration packages live under `migrations/app/`; their contract snapshots live under `migrations/snapshots/`.

## Current Data Flow

```text
Server-rendered pages / form Server Actions
                    ↓
       Prisma runtime (src/prisma/db.ts)
                    ↓
                PostgreSQL
```

Forms use shared validation schemas; interactive dialogs are client components. Pages and Server Actions access the database on the server.

## Planned Architecture and Known Gaps

The earlier proposed `(public)` and `(dashboard)` route groups and API layer are not implemented. Public Demo separation and authenticated navigation remain future work, not existing route boundaries.

AI services, retrieval with pgvector, authentication, authorization, and billing remain planned. Empty infrastructure directories do not indicate working integrations.

The current Research list is not scoped to a selected Workspace. Research creation uses the first stored Workspace and User, and new Comments use the Research creator as their author. These development behaviors do not implement the membership and permission boundaries defined in the [data model](data-model.md).

The read-only public Demo requirement in the [product definition](../planning/product-definition.md) is not implemented: the current application exposes write operations.

## Architecture Principles

1. Keep the Next.js App Router structure recognizable.
2. Separate reusable UI primitives from route-specific components.
3. Keep database access and sensitive resources on the server.
4. Isolate AI-related infrastructure when it is introduced.
5. Add architectural layers when their responsibilities are clear.
6. Preserve the conceptual separation between the public Demo and authenticated application.
