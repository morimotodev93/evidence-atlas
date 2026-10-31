# Evidence Atlas

An AI-assisted research workspace for collecting sources, organizing findings, discussing evidence, and preserving conclusions. Developed as a non-commercial portfolio project for small development and product teams.

Research evidence often becomes scattered across links, notes, and conversations. Evidence Atlas keeps findings connected to their sources so that people can review the basis of a conclusion and ask AI questions about the knowledge they have saved.

[Live Demo](https://evidence-atlas-mu.vercel.app/demo) | [Source code](https://github.com/morimotodev93/evidence-atlas)

## Research workflow

Organizations contain Workspaces, and each Workspace contains Research items focused on a topic or question.

- **Research** holds the question, description, status, and conclusion.
- **Source** records a reference, including its title and URL.
- **Finding** records an observation and can link to supporting Sources within the Research.
- **Comment** supports Research-level discussion; **Conclusion** is the Research's optional summary field.

Sources and Findings are separate records, not a mandatory linear pipeline. Findings may exist without linked Sources. AI answers are not automatically saved as Findings or Conclusions.

## Public Demo

Explore four curated Research items about **AI-Assisted Software Development**: Developer Productivity, Code Quality & Reliability, Developer Experience, and Adoption & Organizational Impact. Browse Sources, Findings, Comments, Conclusions, and Tags without signing in.

The Research detail page also offers limited anonymous AI questions after Turnstile verification. Demo Chat uses **Groq Free Plan / `openai/gpt-oss-120b`**, with a **2,000-token output limit**, a **30-second generation deadline**, and **no automatic retry**. It answers from bounded Evidence stored in the selected Research and displays validated Source references. It does not fetch external pages or use Workspace vector retrieval.

Research data is read-only for visitors: asking questions does not grant editing access to Research, Findings, or Sources. Chat uses anonymous Redis sessions and shared usage limits; it does not persist conversation history. Availability depends on provider capacity, quotas, and generation leases. A local timeout does not guarantee remote generation has stopped.

Production browsing, Turnstile, session creation, Japanese questions, Groq answers (including a METR/GitHub Copilot comparison), Source references, and the 2,000-token setting were confirmed in the maintainer's October 31, 2026 report. Production Evidence improvements were also reported applied. This documentation task did not access Production.

## AI and technical design

| Area | Implementation |
| --- | --- |
| Authenticated SaaS Chat | Gemini (`gemini-3.6-flash`), Research-scoped conversations, streamed answers, persisted history |
| SaaS retrieval | Gemini embeddings, PostgreSQL/pgvector search over indexed knowledge in the authorized Workspace |
| Public Demo Chat | Separate Groq model, bounded current-Research context, JSON responses, no embeddings or persisted history |
| Evidence references | Request-specific Source allowlists and citation validation; references do not prove that every claim is supported |
| Authorization | Auth.js sessions and server-side Workspace membership checks before protected data access |
| Indexing | Inngest background refresh after relevant SaaS mutations; best-effort enqueue means the derived index can lag |
| Demo boundary | Fixed published Workspace; authenticated SaaS entry points, write actions, and Inngest serving are disabled in Demo mode |
| Anonymous Chat controls | Origin checks, Turnstile, session ownership, Redis quotas and concurrency leases, fail-closed admission |

AI uses saved Research content and Source metadata, not the full external documents behind Source URLs. Normal SaaS Chat additionally retrieves indexed Findings, Conclusions, and Research metadata from the same Workspace. Retrieval scope supplements server authorization.

## Technology stack

- **Application:** Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui
- **Data and authentication:** PostgreSQL, pgvector, Prisma 8 data contract/runtime, Auth.js, Kysely auth adapter
- **AI:** AI SDK, Google Generative AI/Gemini for SaaS, Groq for Demo
- **Infrastructure:** Vercel, Inngest, Upstash Redis, Cloudflare Turnstile, Sentry
- **Validation and testing:** Zod, Vitest, Playwright

## Code and documentation

- [Directory structure](docs/architecture/directory-structure.md): routes, server boundaries, and source layout
- [Data model](docs/architecture/data-model.md): entities and ownership
- [AI architecture](docs/architecture/ai-architecture.md): SaaS retrieval, Demo Chat configuration, limits, and lease handling
- [Product definition](docs/planning/product-definition.md): workflows and product scope
- [Roadmap](docs/planning/roadmap.md): completed baselines, verification evidence, and remaining work
- [Research policy](docs/planning/source-memo.md): source selection and evidence attribution

Dated planning reports and `docs/archive/` preserve historical verification results. Their earlier model limits and release decisions are not current deployment settings.

## Local development

Use **Node.js 24** for the documented development setup and **pnpm 12.9.1** (the package manager declared in `package.json`). Configure your own database, authentication, and provider services using [.env.example](.env.example); installing dependencies alone does not provision them. Never commit credentials.

```bash
pnpm install
pnpm dev
```

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` / `pnpm start` | Build / serve the production application |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run Vitest |
| `pnpm test:e2e` | Run Public Demo Playwright smoke tests |

For local SaaS Chat without Upstash, the development-only `CHAT_RATE_LIMIT_BACKEND=memory` option is documented in [.env.example](.env.example) and the [AI rate-limit specification](docs/architecture/ai-architecture.md#rate-limiting--usage-tracking). It still requires normal authentication, database, and Google configuration. Demo Chat requires Redis.

The default Playwright smoke suite targets the deployed read-only Demo. It restricts browser traffic to GET and does not exercise AI calls or authentication; see [playwright.config.ts](playwright.config.ts) and the [roadmap evidence](docs/planning/roadmap.md#phase-10--testing--quality).

## Status and limitations

**Portfolio MVP; Public Demo with limited AI is live. Ver 1.00 is in preparation, not formally released.** Its final acceptance scope remains partly undecided; roadmap checkboxes retain their existing scope.

Core research workflows, authentication/Workspace authorization, SaaS Chat/retrieval, and background indexing are implemented. The public portfolio deployment exposes the separate Demo experience; it is not an unrestricted SaaS instance.

Remaining work includes comprehensive normal-SaaS Production verification, AI answer-quality improvements, database-role hardening, Preview separation, and live Inngest Cloud integration verification. Synthetic model evaluations and bounded browser/security checks have specific limits; they do not establish general answer reliability or complete security. Uncertain Demo generation leases can exhaust capacity and leave Chat unavailable pending evidence-based recovery. See the roadmap for implementation, reported Production checks, and deferred work.

## License

License information has not yet been specified for public release.
