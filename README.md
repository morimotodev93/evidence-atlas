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

For v1.0.0, the Public Demo is bilingual (English/Japanese) and read-only. AI Chat is disabled (`DEMO_CHAT_ENABLED=false`) and displays **Coming soon**; live anonymous AI questions are excluded from this release. Authoritative admission/lease management will be redesigned after v1.0.0 before Chat activation is reconsidered.

The implemented, disabled Demo Chat uses **Groq Free Plan / `openai/gpt-oss-120b`**, with a **2,000-token output limit**, a **30-second generation deadline**, and **no automatic retry**. It answers from bounded Evidence stored in the selected Research and displays validated Source references. It does not fetch external pages or use Workspace vector retrieval.

Research data is read-only for visitors. The disabled Chat implementation uses anonymous Redis sessions and shared usage limits; it does not persist conversation history. Availability depends on provider capacity, quotas, and generation leases. A local timeout does not guarantee remote generation has stopped.

B-R3a implements a risk-accepted Redis lifecycle: abandoned leases become reclaimable after their 60-second deadline plus five minutes, and Operation records expire 24 hours after creation. Normal limits and security remain; failure-time overlap is possible. Chat stays disabled pending target Upstash compatibility, legacy retention migration and separate publication approval. See the [current lifecycle and migration preparation](docs/planning/demo-chat-br3a-lifecycle.md), which supersedes the earlier indefinite-retention policy.

The safe defaults in [.env.example](.env.example) leave Chat disabled (`DEMO_CHAT_ENABLED=false`); its empty `PUBLIC_DEMO_MODE` selects normal SaaS mode. A Public Demo deployment requires exact `PUBLIC_DEMO_MODE=true` at build and runtime and a valid published `DEMO_WORKSPACE_ID`. Any future Chat activation additionally requires exact `DEMO_CHAT_ENABLED=true`, no non-empty `C2_RUNTIME_MODE`, a dedicated `DEMO_GROQ_API_KEY`, both Turnstile keys (the public site key at build time), HTTPS Redis REST credentials, and exact HTTPS `DEMO_CHAT_ALLOWED_ORIGINS`. See the [configuration contract](docs/architecture/ai-architecture.md#41-public-demo-chat-configuration-contract) for names and requirements. Configuration eligibility does not prove service readiness or pass the [operational Must-have gates](docs/planning/roadmap.md#5-public-demo-strategy); keep Chat disabled unless the applicable gates are met.

The maintainer's October 31, 2026 report recorded Production browsing and Chat happy-path checks, plus applied Evidence improvements; these are historical results, not the current Chat availability. For Phase 5.0h, the owner reports Muse completed Vercel deployment cleanup and Production was redeployed with `DEMO_CHAT_ENABLED=false`, then confirmed Ready and "Coming soon". This documentation task did not access Production.

## AI and technical design

| Area | Implementation |
| --- | --- |
| Authenticated SaaS Chat | Gemini (`gemini-3.6-flash`), Research-scoped conversations, streamed answers, persisted history |
| SaaS retrieval | Gemini embeddings, PostgreSQL/pgvector search over indexed knowledge in the authorized Workspace |
| Public Demo Chat (disabled for v1.0.0) | Separate Groq model, bounded current-Research context, JSON responses, no embeddings or persisted history |
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

For ordinary installation with **Node.js 24**, **pnpm 12.9.1**, and PostgreSQL/pgvector, follow the [installation guide](docs/development/installation.md). It covers environment files, existing Prisma migrations, seed selection, and resolving `DEMO_WORKSPACE_ID`. Installing dependencies alone does not provision a database, authentication, or AI services. Never commit credentials.

For repeatable local Demo and SaaS UI review against a dedicated database on **Windows with Docker Desktop**, see
the [local review guide](docs/development/local-review.md): `pnpm review:setup`,
`pnpm review:check`, then `pnpm dev:review` (plus `pnpm review:login` for SaaS).
These helpers require the Docker Desktop Linux-engine named pipe and are not general Linux installation commands.

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

**Portfolio MVP; read-only Public Demo is live with Chat disabled (Coming soon). Ver 1.00 is in preparation, not formally released.** The selected v1.0.0 scope is the curated English/Japanese read-only Public Demo. Live anonymous AI Chat and authenticated SaaS public operations are excluded. Applicable read-only safety and operational acceptance remain open. Chat is deferred because authoritative admission/lease safety is unresolved; its existing safety gates and Redis verification-runner hold remain in force for future work. This decision does not advance broader roadmap checkboxes. See the [release scope and acceptance policies](docs/planning/roadmap.md#ver-100-preparation-and-current-production-report-2026-10-31-jst).

Core research workflows, authentication/Workspace authorization, SaaS Chat/retrieval, and background indexing are implemented. The public portfolio deployment exposes the separate Demo experience; it is not an unrestricted SaaS instance.

Deferred work outside the v1.0.0 read-only scope includes Chat lifecycle rollout and acceptance, comprehensive normal-SaaS Production verification, AI answer-quality improvements, and live Inngest Cloud integration verification. Database-role hardening and Preview separation remain open operational work; assess applicable read-only risks under the roadmap acceptance policy. Synthetic model evaluations and bounded browser/security checks have specific limits; they do not establish general answer reliability or complete security. Uncertain Demo generation leases can exhaust capacity until reservation-driven recovery; recovery does not prove remote termination. See the roadmap for implementation, reported Production checks, and deferred work.

## License

License information has not yet been specified for public release.
