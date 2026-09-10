# Evidence Atlas

> A collaborative research workspace for collecting evidence, organizing findings, and deepening knowledge with AI.

Evidence Atlas is an AI-assisted research workspace designed for small development and product teams.

It helps teams collect sources, organize findings, discuss evidence, and build structured conclusions in one place. AI is used to help search, connect, and synthesize the knowledge accumulated within a workspace.

## Project Status

**Status:** Early development

Evidence Atlas is currently being developed as a portfolio project.

The initial focus is establishing the application foundation, data architecture, research workflow, and AI-assisted knowledge exploration.

The project is intentionally being developed incrementally, with the architecture evolving as the product requirements become clearer.

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

The planned public deployment will provide a curated, read-only Demo Workspace.

The Demo is intended to allow visitors to explore the application's concepts and user experience without providing unrestricted access to the underlying SaaS functionality.

Full application usage will be available through self-hosted development with the required database and API credentials.

## Technology Stack

### Application

- Next.js
- React
- TypeScript
- Tailwind CSS

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
- Vector search
- Retrieval-Augmented Generation (RAG)

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

The architecture is currently provisional and will evolve as authentication, authorization, research workflows, AI integration, retrieval, and multi-user features are implemented.

See [Directory Structure](docs/architecture/directory-structure.md) for the current project structure.

## License

License information will be added as the project approaches its public release.
