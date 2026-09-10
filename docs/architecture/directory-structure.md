# Directory Structure

> **Status:** Draft
> **Last Updated:** 2026-09-08

This document describes the tentative directory structure of **evidence-atlas**.

The structure is intentionally kept simple at the current stage.
It will be expanded and revised as the application architecture becomes more defined.

## Project Structure

```text
evidence-atlas/
├── .github/
│   └── workflows/
│
├── .vscode/
│
├── docs/
│   ├── architecture/
│   │   └── directory-structure.md
│   ├── planning/
│   │   └── roadmap.md
│   ├── reference/
│   └── usage/
│
├── public/
│
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   ├── (dashboard)/
│   │   ├── api/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── common/
│   │   └── features/
│   │
│   ├── lib/
│   │   ├── ai/
│   │   └── utils/
│   │
│   ├── prisma/
│   │   ├── contract.prisma
│   │   ├── contract.json
│   │   ├── contract.d.ts
│   │   └── db.ts
│   │
│   ├── types/
│   │
│   └── styles/
│       └── globals.css
│
├── .env.example
├── .gitignore
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── prisma.config.ts
├── tsconfig.json
└── README.md
```

## Directory Responsibilities

### `docs/`

Project documentation.

```text
docs/
├── architecture/
├── planning/
├── reference/
└── usage/
```

- `architecture/` — Application architecture and directory structure
- `planning/` — Development plans and roadmap
- `reference/` — Technical specifications and reference information
- `usage/` — Usage and operational documentation

---

### `.github/workflows/`

GitHub Actions workflow definitions.

.github/
└── workflows/

Workflow files will be added here as CI/CD requirements become defined.

Potential responsibilities include:

- Running linting, type checks, and tests
- Validating pull requests
- Building the application
- Automating deployment-related tasks

The workflow structure will be expanded as the project's testing and deployment processes become established.

---

### `src/prisma/`

Prisma 8 data contract and database runtime.

```text
src/prisma/
├── contract.prisma
├── contract.json
├── contract.d.ts
└── db.ts
```

---

### `src/app/`

Next.js App Router application layer.

```text
src/app/
├── (public)/
├── (dashboard)/
├── api/
├── layout.tsx
└── page.tsx
```

- `(public)/` — Public-facing pages and the portfolio Demo
- `(dashboard)/` — Authenticated application pages
- `api/` — API routes and server endpoints

Route groups are tentative and may change as the application's navigation and authentication architecture are defined.

---

### `src/components/`

Reusable React components.

```text
src/components/
├── ui/
├── common/
└── features/
```

- `ui/` — Basic UI components, including components managed with shadcn/ui
- `common/` — Reusable application-level components
- `features/` — Components closely related to specific application features

The exact boundary between `common/` and `features/` will be refined during implementation.

---

### `src/lib/`

Application-level libraries and infrastructure.

```text
src/lib/
├── db/
├── ai/
└── utils/
```

- `db/` — Prisma and database-related functionality
- `ai/` — AI SDK, model providers, prompts, and AI-related logic
- `utils/` — Shared utility functions

Additional directories may be introduced for authentication, billing, rate limiting, email, or other infrastructure.

---

### `src/types/`

Shared TypeScript types and application-level type definitions.

Types should be placed here when they are shared across multiple application areas and do not naturally belong to a specific feature.

---

### `src/styles/`

Global styling and application-level CSS.

Tailwind CSS is the primary styling approach.

Additional style organization may be introduced if the design system becomes sufficiently large.

---

## Tentative Architecture

The initial application architecture can be viewed as:

```text
┌─────────────────────────────┐
│          Next.js            │
│         App Router          │
├─────────────────────────────┤
│        React Components     │
│  components/ + app/         │
├─────────────────────────────┤
│       Application Logic     │
│        lib/ + types/        │
├─────────────────────────────┤
│        AI / Services        │
│   AI SDK / Auth / Stripe    │
├─────────────────────────────┤
│          Prisma             │
├─────────────────────────────┤
│        PostgreSQL           │
│          + pgvector         │
└─────────────────────────────┘
```

This diagram represents the intended direction rather than a finalized architecture.

## Architecture Principles

The directory structure should follow these principles:

1. Keep the Next.js App Router structure recognizable.
2. Separate UI components from application infrastructure.
3. Keep database access behind a dedicated layer.
4. Keep AI-related functionality isolated from general application logic.
5. Avoid creating directories before their responsibilities are clear.
6. Prefer simple structures initially and expand them when complexity requires it.
7. Keep the public Demo separated conceptually from authenticated application functionality.

## Status

This is a **provisional structure**.

The directory structure will be revised as the following areas are designed:

- Data model
- Authentication
- Authorization
- Research workflow
- AI integration
- Retrieval / RAG
- Multi-user architecture
- Billing
- Public Demo
- Testing
