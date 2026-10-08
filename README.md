# Evidence Atlas

> A collaborative research workspace for collecting evidence, organizing findings, and deepening knowledge with AI.

Evidence Atlas is an AI-assisted research workspace designed for small development and product teams.

It helps teams collect sources, organize findings, discuss evidence, and build structured conclusions in one place. AI is used to help search, connect, and synthesize the knowledge accumulated within a workspace.

## Project Status

**Status:** Portfolio MVP / Public Demo preparation

Evidence Atlas implements its core research workflow, authentication and Workspace authorization, Research-scoped AI conversations, Workspace-level retrieval with PostgreSQL and pgvector, background indexing, and a curated read-only Public Demo.

The Public Demo application routes and deployment safety boundaries are implemented and locally verified. Production deployment verification is still pending.

The project is developed as a portfolio application with an emphasis on traceable evidence, grounded AI-assisted research, explicit authorization boundaries, and incremental architecture.

## Core Concept

The application is organized around a research workflow:

```text
Organization
    ↓
Workspace
    ↓
Research
    ↓
Source
    ↓
Finding
    ↓
Discussion
    ↓
Conclusion
```

Accumulated research knowledge can later be used by AI-assisted retrieval and synthesis:

```text
Workspace
    ↓
Knowledge
    ↓
Embedding
    ↓
Vector Search
    ↓
AI
    ↓
Answer
```

## Key Goals

- Collect and organize research evidence
- Keep sources and findings traceable
- Support discussion and collaborative understanding
- Build reusable research knowledge
- Use AI to explore and synthesize accumulated evidence
- Provide a practical example of a modern AI-enabled SaaS architecture

## Demo

Evidence Atlas includes a curated, read-only Public Demo at `/demo`.

The Demo presents a prepared Workspace focused on **AI-Assisted Software Development**, containing four completed Research items covering:

- Developer Productivity
- Code Quality & Reliability
- Developer Experience
- Adoption & Organizational Impact

Visitors can inspect Sources, Findings, supporting evidence links, Conclusions, Tags, and Comments without authentication.

The Public Demo is intentionally separated from the authenticated SaaS application. Visitors cannot create, edit, or delete persistent research data, authenticated SaaS routes are disabled in Public Demo deployment mode, and public AI interaction is not enabled.

A live deployment URL will be added after production deployment verification is complete.

## Technology Stack

### Application

- Next.js
- React
- TypeScript
- Tailwind CSS

### Application Infrastructure

- Auth.js
- Inngest
- Upstash Redis
- Sentry

### UI

- shadcn/ui
- Lucide React
- React Hook Form
- Zod

### Database

- PostgreSQL
- Prisma ORM
- pgvector

### AI

- AI SDK
- Google Generative AI
- Gemini
- Retrieval-Augmented Generation (RAG)
- PostgreSQL + pgvector semantic retrieval

### Testing

- Vitest
- Playwright

## Documentation

Project documentation is organized under `docs/`.

- [Architecture](docs/architecture/) — Application architecture and project structure
- [Planning](docs/planning/) — Roadmap and development planning
- [Reference](docs/reference/) — Technical specifications and reference information
- [Usage](docs/usage/) — Usage and operational documentation

## Development

Environment configuration is documented in `.env.example`. Secrets and provider credentials must remain outside the repository.

### Requirements

- Node.js 24
- pnpm

### Getting Started

Clone the repository and install dependencies:

```bash
pnpm install
```

Start the development server:

```bash
pnpm dev
```

The application will be available at the local development URL provided by Next.js.

Additional setup instructions will be documented as the application infrastructure is established.

## Scripts

| Command         | Description                  |
| --------------- | ---------------------------- |
| `pnpm dev`      | Start the development server |
| `pnpm build`    | Build the application        |
| `pnpm start`    | Start the production server  |
| `pnpm lint`     | Run ESLint                   |
| `pnpm test`     | Run unit tests               |
| `pnpm test:e2e` | Run end-to-end tests         |

## Architecture

The application follows a layered approach built around the Next.js App Router.

```text
Next.js App Router
        ↓
React Components
        ↓
Application Logic
        ↓
AI / Services
        ↓
Prisma
        ↓
PostgreSQL + pgvector
```

The architecture is intentionally incremental. The current implementation includes authentication and Workspace authorization, the core Research workflow, Research-scoped AI conversations, Workspace-level retrieval, background indexing, and a separate Public Demo boundary. Additional production and operational hardening remains tracked in the roadmap.

See [Directory Structure](docs/architecture/directory-structure.md) for the current project structure.

## Public Demo Safety Model

The portfolio deployment is designed as a curated read-only experience rather than an unrestricted public SaaS instance.

```text
Portfolio Visitor
       ↓
Public Demo
       ↓
Curated Workspace
       ↓
Read-only Research Data
```

Public Demo mode disables authenticated SaaS entry points, Auth.js endpoints, Research chat endpoints, Server Action write paths, and the Inngest serving endpoint before their protected work is performed.

The Demo database still requires normal infrastructure security and deployment configuration. Production deployment, final credential exposure verification, and database-role hardening are tracked separately in the project roadmap.

## Repository

Source code: https://github.com/morimotodev93/evidence-atlas

## License

License information will be added as the project approaches its public release.
