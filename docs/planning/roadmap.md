# evidence-atlas Roadmap

> **Last Updated:** 2026-10-31

Current stage: The portfolio MVP and curated Public Demo with read-only Research and limited anonymous Chat are implemented, with scoped deployment checks recorded. Phases 4–7 are complete for their defined baselines; Phase 8 is complete for the defined application infrastructure baseline. Phase 10 has four completed checklist items (Unit, bounded E2E, Validation, Authorization); other quality work remains open. Phase 11 operational reviews and Phase 12 documentation are not complete. Checked items describe specific implementation or reported verification, not blanket production, OAuth, provider, or security validation.

### Ver 1.00 preparation and current Production report (2026-10-31 JST)

Ver 1.00 is **in preparation, not formally released**; final acceptance conditions
remain partly undecided. Existing phase checkboxes are unchanged.

| State | Scope |
| --- | --- |
| Implemented | Core research workflows, SaaS authorization, Gemini Chat/pgvector retrieval, background indexing, separate bounded anonymous Groq Demo Chat |
| Production confirmed by maintainer | Public Research browsing, Turnstile, Chat session creation, Japanese questions, Groq answers including METR/GitHub Copilot comparison, Source references, 2,000-token output setting; Evidence improvements reported applied |
| Implemented, Production verification incomplete | Comprehensive normal-SaaS workflows and live Inngest integration; Demo failure/recovery guarantees are not established by happy-path checks |
| Planned / remaining | Existing unchecked quality and operational work; no phase is completed by this documentation review |
| Ver 1.00 candidates | Current portfolio MVP and limited Demo experience; final release scope is not yet fixed |

Demo Chat uses Groq Free Plan / `openai/gpt-oss-120b`, a 30-second generation
deadline and zero automatic retries. Normal SaaS Chat/embeddings remain Gemini.
Research data is read-only for visitors. This task verified local code and
supplied operational reports only, without Production API/DB access.

Dated PR reports below and linked preflight/recovery reports retain their original
No-Go decisions and settings (including older output limits). They are historical
checkpoints, not current deployment instructions. The maintainer's Production
report supersedes the earlier unavailable-UI status; it does not establish Redis
failover, uncertain remote termination, safe lease recovery, or completion of
all earlier proposed checks. Those evidence gaps remain explicit.

## 1. Project Overview

**evidence-atlas** is a collaborative research workspace for collecting evidence, organizing findings, and deepening knowledge with AI.

The project is designed as a portfolio application that demonstrates modern full-stack development, AI integration, structured data modeling, and SaaS-oriented architecture.

The public deployment is primarily a curated, read-only demo. Users who want to operate the application freely can clone the repository and configure their own database and AI provider credentials.

---

## 2. Development Principles

- Build from a minimal Next.js foundation rather than a prebuilt SaaS template.
- Design the data model before implementing complex UI.
- Keep the public portfolio deployment safe and controlled.
- Use curated demo data for the public environment.
- Keep AI provider credentials outside the repository.
- Prefer server-side operations for sensitive resources and database access.
- Introduce dependencies when they become necessary rather than building an unnecessary all-in-one stack.
- Document major architectural decisions in `docs/`.
- Prioritize maintainability and clarity over premature optimization.

### Incrementalism and requirement classification

Evidence Atlas is a non-commercial, individually developed portfolio project;
selling a commercial SaaS is not its goal. This roadmap provides direction, not
a requirement to finish every item before continuing development or publication.
Develop features and maintain the application in parallel through small cycles
of implementation, verification, scoped release and improvement. Prefer
risk-appropriate verification and continued improvement over completeness.
Real-browser checks and, where relevant to the exposed risk, bounded real-service
verification are important development activities; mocks do not replace evidence
needed for the published feature's safety boundaries.

Requirements are classified independently of their completion checkboxes:

| Class | Meaning and release implications |
| --- | --- |
| **A. Must-have — 義務目標** | Safety conditions required before operating or publishing the affected feature: prevent material authorization failures, information disclosure, abuse and uncontrolled costs. Select necessary verification according to that feature's risks. |
| **B. Should-have — 努力目標** | Improvements to quality, availability, maintainability and usability. Their incompleteness alone does not stop all development or publication. |
| **C. Known limitations — 既知の制約** | Unresolved conditions that may be accepted with their scope, failure behavior, user impact, handling, acceptance reason and reassessment trigger recorded. Acceptance must not excuse a material safety failure. |
| **D. Optional / Out of scope — 任意・対象外** | Work unnecessary for the non-commercial goal, or deferred until a concrete use case arises. |

An exposed feature may advance when its Must-have conditions are met even if
other quality work remains open. Independent development may continue while a
different feature remains disabled. Do not reclassify a material safety risk as
an availability limitation. Preserve completed scope and historical evidence;
classification does not uncheck completed work or mark unperformed checks passed.
Major changes to architecture, routes, data models or project status still require
updates to the relevant documentation. See the
[requirements review](roadmap-requirements-review.md) for the evaluation and
proposals; the policies adopted here do not imply implementation or new verification.

---

## 3. Roadmap

### Phase 0 — Foundation

**Goal:** Establish the project foundation and development environment.

- [x] Create Next.js project
- [x] Configure TypeScript
- [x] Configure ESLint
- [x] Configure Tailwind CSS
- [x] Configure VS Code workspace settings
- [x] Establish project name: `evidence-atlas`
- [x] Review `package.json`
- [x] Establish initial directory structure
- [x] Establish documentation structure
- [x] Create initial README

---

### Phase 1 — Product Definition

**Goal:** Define the core product direction before implementing the application.

- [x] Define product concept
- [x] Define target users
- [x] Define primary use cases
- [x] Define Demo experience
- [x] Define core user flows
- [x] Define terminology
- [x] Define MVP scope
- [x] Identify features explicitly outside the MVP
- [x] Document major architectural decisions

**Status: Complete**

---

### Phase 2 — Data Architecture

**Goal:** Design the knowledge model that forms the core of evidence-atlas.

Core concepts (see the [data model](../architecture/data-model.md) for implemented models and deferred concepts):

```text
User
Organization
Membership
Workspace
WorkspaceMembership
Research
Source
Finding
FindingSource
Conclusion
Comment
Tag
ResearchTag
Conversation
Message
Embedding
```

Tasks:

- [x] Design Prisma schema
- [x] Configure PostgreSQL
- [x] Configure Prisma
- [x] Create initial migration
- [x] Create seed data
- [x] Verify database operations
- [x] Document the data model

The initial model should prioritize the research workflow:

```text
Workspace
  └── Research
       ├── Source
       ├── Finding
       ├── Comment (discussion)
       └── Conclusion
```

**Status: Complete**

---

### Phase 3 — Design System & UI Foundation

**Goal:** Establish a reusable UI system before building feature screens.

- [x] Define design tokens
- [x] Configure shadcn/ui
- [x] Establish typography
- [x] Establish spacing
- [x] Establish layout primitives
- [x] Establish common UI components
- [x] Establish form components
- [x] Establish feedback states
- [x] Define responsive behavior
- [x] Define light/dark theme strategy

**Status: Baseline established.** These items establish design conventions and UI primitives. PR #34 added the authenticated application sidebar and mobile navigation. PR #36 adds shared browser-local Light / Dark / System selection through a single root provider, with Appearance in Settings navigation and the independent Public Demo header. No authenticated API, Demo write boundary, or C2 isolation policy changes. A Public Demo-specific sidebar, sidebar-integrated Global Search, semantic icon wrappers, and full accessibility/theme verification remain outstanding; see the [design system](../design/design-system.md) and [design direction](../design/design-direction.md). For PR #36, the user reports completed visual checks in Firefox normal and private windows and Chromium, covering Light/Dark display, mobile navigation, and Firefox browser 200% zoom. These scoped checks do not establish all OS-change tracking conditions, all-screen contrast, or comprehensive WCAG 2.2 AA conformance, and do not advance Phase 10 acceptance.

---

### Phase 4 — Research Workspace MVP

**Goal:** Implement the core research management experience.

#### 4.1 Workspace & Research Navigation

- [x] Workspace overview layout
- [x] Connect Workspace overview to stored data
- [x] Research list
- [x] Research detail

#### 4.2 Research Management

- [x] Create Research
- [x] Update Research title and description
- [x] Display and edit the stored Conclusion
- [x] Add Research lifecycle status controls

#### 4.3 Evidence Management

- [x] Source management
- [x] Finding management
- [x] Manage Finding–Source links and display supporting Sources

#### 4.4 Research Discussion

- [x] Comments / discussion

Comment CRUD is implemented. Following Phase 7, new Comments use the current authenticated User as the author after Research Workspace access is verified, as covered by the authentication/authorization tests. The earlier Phase 4 baseline used the Research creator; that is historical behavior, not the current authorship rule.

#### 4.5 Research Organization

- [x] Create or reuse Workspace Tags and attach them to Research
- [x] Display Tags on Research list and detail pages
- [x] Detach Tags from Research while retaining the Workspace Tag

Tag renaming and Workspace-level Tag deletion are not implemented. Discovery controls remain tracked separately below.

#### 4.6 Research Discovery

- [x] Search
- [x] Filtering
- [x] Basic sorting

**Status: Complete for the Phase 4 scope.** The overview shows stored Workspace data, the three most recently updated Research items, and Research/Source/Finding/Tag counts. Research lifecycle status and Conclusion can be edited. Findings display supporting Sources and support attaching and removing links; the contract and follow-up migration define cascading deletion of those links when a Finding or Source is deleted.

Research detail and Public Demo detail share the reading order Research Header → Sources → Findings → Discussion → Conclusion, resolving the documented Conclusion ordering gap. Existing controls and the read-only Demo boundary are retained; this update does not advance Phase 10 acceptance.

Research discovery supports case-insensitive title/description search, lifecycle status filtering, and sorting by last update or creation date (newest/oldest). The overview and Research list are scoped to the authenticated user's current Workspace. Workspace selection and membership-based access are implemented as part of Phase 7. Phase 5 provides Research-scoped conversations, and Phase 6 adds Workspace retrieval. The broader product workflow and Phase 10 quality requirements remain outstanding.

**Principle:** The initial experience should make the research
process understandable without AI.

---

### Phase 5 — AI Integration

The record below describes the Phase 5 baseline. Phase 6 extends its context and citation boundaries; current behavior is documented in [AI Architecture](../architecture/ai-architecture.md).

**Goal:** Make AI useful by grounding it in the workspace's accumulated knowledge.

- [x] Introduce AI SDK
- [x] Define minimal AI provider boundary
- [x] Configure development AI provider
- [x] Implement basic AI interaction
- [x] Implement streaming responses
- [x] Define AI conversation model
- [x] Scope conversations to Research
- [x] Build Research-scoped AI context
- [x] Connect AI interaction to Research context
- [x] Implement source-aware answers
- [x] Display supporting evidence
- [x] Handle insufficient evidence / uncertainty
- [x] Persist AI conversations and messages
- [x] Integrate AI conversation UI into Research
- [x] Document AI architecture

The AI SDK and Conversation/Message contract models are present. Conversation ownership is explicitly scoped to Research: each Conversation belongs to a Research and requires a `researchId`.

The database contract and migrations for this ownership model are complete.

A minimal Research-scoped AI context builder is implemented. It provides the Research conclusion, findings, and supporting source metadata without fetching or treating external source contents as available evidence.

The development AI provider is configured through the AI SDK using Google Generative AI and Gemini 3.6 Flash. Provider-specific configuration is kept behind a minimal model boundary rather than introducing a custom provider abstraction prematurely.

The Research chat API is implemented; the existing progress record reports verification against the Gemini API. This documentation review does not re-run provider calls. Responses stream with the current Research context, and the prompt instructs the model to state when evidence is insufficient; this is not a deterministic evidence-sufficiency check.

AI conversations are persisted as Research-scoped conversation transcripts. Conversations are created explicitly, and user and completed AI messages are stored as append-only conversation history. Previous messages are supplied to the model on subsequent requests so multi-turn conversations retain their context.

Conversation persistence stores the visible conversation rather than AI execution internals. System prompts, Research context snapshots, stream chunks, provider request/response payloads, and failed AI responses are not persisted at this stage. If AI generation fails, the user message may remain in the conversation while no AI message is created. Retry and persistent failure-state management remain deferred.

The Research UI now integrates the AI conversation workflow. Users can explicitly create a new conversation, submit questions, receive streamed responses, browse previous Research-scoped conversations, and restore an existing conversation with its persisted message history.

Conversation history is ordered by recent activity using `Conversation.updatedAt`. Because adding a Message does not implicitly update its parent Conversation, the Conversation timestamp is explicitly updated when a new user message is accepted. The history UI uses the first persisted user message as a lightweight conversation preview rather than introducing a separate conversation title model.

The AI interaction UI includes loading and error handling for conversation creation, conversation restoration, and message submission. Failed AI responses are not persisted. The client may temporarily remove a failed interaction from the current display while preserving the existing persistence semantics.

AI conversation content remains distinct from Research knowledge. AI responses do not automatically become Findings or Conclusions; promoting AI-assisted output into Research knowledge requires an explicit human action or review.

The Research UI treats AI as a supporting layer rather than another Research knowledge section. On larger screens, the AI conversation panel is presented alongside the Research content. On smaller screens, AI is accessed through a persistent mobile action that opens the same Research-scoped conversation interface, avoiding a separate mobile chat implementation.

Source-aware answers are implemented using application-level citation markers in the form `[source:<source-id>]`. The model is instructed to cite only Sources linked to Findings that support the relevant claim and to use only Source IDs supplied in the Research context. Findings without linked Sources may still contribute to an answer, but they do not produce fabricated citations.

Completed AI responses are persisted with their raw citation markers in `Message.content`. Citation interpretation remains a presentation concern: the client parses citation markers from AI messages, removes them from the displayed answer, and resolves the referenced IDs against Sources belonging to the current Research.

Model-generated Source IDs are not trusted directly. Only Source IDs that resolve to an existing Source in the current Research are presented as supporting evidence. Valid Sources are displayed separately from the generated answer under a Supporting Sources section using the stored Source title and URL. Answers without valid Source citations do not display the section.

Because citation markers remain in persisted AI messages, supporting evidence can be reconstructed when a previous conversation is restored from history without introducing a separate citation persistence model.

For Phase 5, AI context remains intentionally Research-scoped and uses knowledge already stored in the Research. Source metadata identifies supporting evidence but does not imply that external source contents were fetched or read by the model. Retrieval infrastructure such as chunking, embeddings, vector search, semantic ranking, external source retrieval, and RAG remains deferred to Phase 6.

The AI architecture is documented separately in `docs/architecture/ai-architecture.md`. It now covers both the Phase 5 conversation baseline and Phase 6 Workspace retrieval, including the extended citation-validation and Source-resolution boundaries.

Target concept:

```text
Research
├─ Conclusion
├─ Findings
│  └─ Supporting Sources
└─ Sources
       ↓
Research Context
       +
Conversation History
       ↓
AI SDK
       ↓
Gemini
       ↓
Streamed Grounded Response
       ↓
Completed AI Message
│  └─ Raw [source:<source-id>] citations
       ↓
Citation Parsing
       ↓
Research Source Validation
       ↓
Research AI UI
├─ Grounded Answer
├─ Supporting Sources
├─ New Conversation
├─ Conversation History / Restore
└─ Desktop Panel / Mobile Dialog
```

**Status: Complete for the Phase 5 scope.**

This status covers the Research-scoped baseline. Citation-to-claim verification, shared live state across desktop/mobile panels, request cancellation, retry/failure-state persistence, and automated AI/UI verification are not implemented. Authentication and public AI usage controls remain later-phase work. See [AI Architecture](../architecture/ai-architecture.md) for the current boundaries.

The Phase 5 implementation established the grounded AI workflow. Phase 6 extends context selection with retrieval and RAG, retains Research-owned conversations and streaming, and strengthens citation validation before persistence while resolving supporting Sources across the Workspace.

---

### Phase 6 — Retrieval / RAG

**Goal:** Enable AI to search a larger body of accumulated knowledge.

- [x] Define retrieval requirements
- [x] Evaluate chunking strategy
- [x] Define embedding model
- [x] Add pgvector
- [x] Create embedding pipeline
- [x] Implement vector search
- [x] Combine metadata filtering with vector search
- [x] Integrate retrieval with AI responses
- [x] Evaluate retrieval quality
- [x] Document RAG architecture

RAG should be introduced only after the basic AI workflow is working.

**Status: Complete for the Phase 6 baseline scope.** Research-scoped conversations now combine full current Research context with same-Workspace retrieval over indexed Findings, Conclusions, and Research title/description metadata. The implementation uses 768-dimensional Gemini embeddings, pgvector cosine search, ten candidates, a maximum distance of 0.35, deduplication by knowledge item, and at most five selected items.

Indexing replaces one Research's chunks; Phase 8.3 adds asynchronous, best-effort background refresh after relevant Research/Finding mutations alongside the manual reindex path. Completed AI messages validate citation IDs against Sources linked to supplied Findings; conversation detail resolves cited Sources across the current Workspace. See [AI Architecture](../architecture/ai-architecture.md) for the indexing lifecycle, retrieval flow, citation boundaries, and remaining limitations.

Retrieval evaluation covers direct, paraphrased, related-but-unsupported, and unrelated questions. The manual evaluation recorded in [AI Architecture](../architecture/ai-architecture.md#135-retrieval-evaluation) selected 0.35 as the initial cutoff: tested positive cases were retained and unrelated cases rejected. Separate manual chat E2E checks confirmed a supported answer with a Source and insufficient-evidence responses for related-but-unsupported and unrelated questions. These results are an existing evaluation record, not a new run during this documentation update.

The inspection scripts are not an automated quality gate. The local exploratory log includes distances above the current cutoff and is not a passing regression result for the filtered configuration. Broader evaluation as the corpus grows, representative-chunk selection improvements, durable index reconciliation, and public Demo controls remain outstanding. Authentication and mutation-triggered background indexing are implemented in Phases 7 and 8.3 respectively.

---

### Phase 7 — Authentication & Multi-User Architecture

**Goal:** Establish the SaaS-oriented multi-user model.

- [x] Define authentication requirements
- [x] Select authentication solution
- [x] Implement authentication
- [x] Integrate User records with authentication and account management
- [x] Implement Organization management
- [x] Implement Membership management
- [x] Implement Workspace permissions
- [x] Define authorization rules
- [x] Protect server-side resources
- [x] Test access control

The Phase 7 baseline uses Auth.js with Google OAuth and database-backed sessions. Authentication records are integrated with the existing User model, and unauthenticated application pages redirect to the sign-in flow.

A newly authenticated User without an accessible Workspace is directed through onboarding, which creates an initial Organization and Workspace together with Organization ADMIN and Workspace ADMIN memberships.

Workspace selection is persisted in a cookie but is treated as untrusted input. The selected Workspace is revalidated against WorkspaceMembership before use, with fallback to another accessible Workspace when necessary.

Organization membership and Workspace membership remain independent authorization scopes. Organization ADMIN users can manage Organization member roles, while Workspace ADMIN users can manage Workspace member roles. Both boundaries prevent removal of the final ADMIN through role demotion.

Workspace membership provides access to Research and its related resources within that Workspace. Research reads and writes, evidence management, Tags, Comments, Research status changes, and Research-scoped AI conversations enforce the Research → Workspace membership boundary on the server.

Research resources that are missing or inaccessible are intentionally handled through the same Research access failure boundary so that authorization checks do not expose Research existence to users outside the Workspace. Unexpected database failures are not converted into authorization failures.

Chat Route Handlers perform authentication separately from page-oriented helpers: unauthenticated API requests return `401`, while inaccessible Research or Conversation resources return `404`.

Access-control tests cover Research actions, Research creation-related actions, Organization and Workspace role management, onboarding provisioning, and Research chat routes.

The Phase 7 baseline intentionally does not include invitation flows, member removal flows, advanced organization administration, or advanced role and permission management. Those remain future product decisions rather than requirements for this phase.

Target structure:

```text
User
  ├── Membership ───────────── Organization
  │                                │
  │                                └── Workspace
  │
  └── WorkspaceMembership ─────────── Workspace
                                          └── Research
```

**Status: Complete for the Phase 7 baseline.**

---

### Phase 8 — Application Infrastructure

**Goal:** Establish infrastructure that supports safe and stable operation of the personal portfolio application.

Defined baseline scope:

- [x] Rate limiting
- [x] Usage tracking
- [x] Background jobs
- [x] Error monitoring
- [x] Application observability

**Out of scope:** Evidence Atlas is a personal portfolio project with no plan to sell it as a commercial SaaS. Subscription model, Stripe integration, and billing state synchronization are outside the current project scope, not pending requirements. Additional email infrastructure is not required: Phase 7 already implements Auth.js Google OAuth with database-backed sessions. Email login, Magic Link, and email notifications are not development goals; email infrastructure may be reconsidered only if a concrete use case arises.

**Implemented baseline:** AI chat uses an Upstash Redis sliding-window rate limit of 10 requests per minute per Workspace × User, enforced before retrieval, embedding, and generation. Chat-generation token usage and finish reason are recorded in `AiUsageEvent`, with Workspace, User, Research, and Conversation IDs stored as scalar attribution fields.

**Phase 8.3 Background Jobs:** Inngest refreshes the Research-scoped retrieval index after successful Research creation, title/description updates, Conclusion updates, and Finding creation, content updates, and deletion. Events are debounced per Research ID (`5s` period, `30s` timeout), with singleton mode `cancel` and `3` retries. A PostgreSQL advisory transaction lock and idempotent upserts protect the database write path. Enqueue is best-effort and does not fail successful CRUD operations; transactional outbox, a general-purpose job platform, and strong consistency are outside this baseline.

**Phase 8.4 Error Monitoring:** Sentry Next.js SDK 11.4.0 is manually configured for the App Router client, Node.js, and edge runtimes, including `onRequestError`, the router transition hook, and the global error boundary. Best-effort Research index enqueue failures are captured with operation tags and a Research ID without failing successful CRUD operations. Tracing, replay, logs, profiling, metrics, and AI monitoring are outside this scope; automatic dependency instrumentation at build time and Vercel cron monitors are disabled.

`dataCollection` disables automatic user information, cookies, HTTP headers/bodies, URL query parameters, stack-frame variables, AI inputs/outputs, database query data, queue arguments, and GraphQL content. It does not redact arbitrary exception messages, manual extras, console/DOM breadcrumbs, or all URL fields; Research/AI content must not be placed in those fields. The public `NEXT_PUBLIC_SENTRY_DSN` controls runtime delivery (and is embedded in the browser at build time). `SENTRY_ORG`, `SENTRY_PROJECT`, and the secret `SENTRY_AUTH_TOKEN` are build-time source map upload settings. Live client and server error ingestion has been verified against the Sentry project.
Source-map resolution was also verified with a local production build, where Sentry
resolved the emitted client error back to the original TSX source and source context.
The deployed production environment should be re-verified during Phase 11 deployment.

**Phase 8.5 Application Observability:** Sentry performance tracing is configurable across the client, Node.js, and edge runtimes, providing sampled Next.js request tracing and targeted custom spans for Workspace retrieval and Research indexing. `getSentryTracesSampleRate()` reads the public, non-secret `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` and accepts finite values within `0..1`. Missing, empty, non-numeric, non-finite, or out-of-range values fall back to `0`, which disables tracing. Like the public DSN, the browser configuration is embedded at build time. `.env.example` defaults to `0` and recommends `0.1` as a production baseline; this is not a required production value. `SENTRY_AUTH_TOKEN` remains a build-only secret.

The custom spans record only operational counts: retrieval candidates, selected items, hydrated results, and indexing candidates/chunks. Their attributes exclude AI query text, Research title/description/conclusion, Finding content, Source content/URLs, Workspace/Research/Finding IDs, and other user-generated content. Phase 8.4's restrictive `dataCollection` configuration is retained; it does not provide complete redaction of arbitrary exception messages or manually supplied data. Replay, logs, profiling, and metrics are outside this baseline, and it does not enable automatic database query data collection. Span boundaries and attributes are documented in [AI Architecture](../architecture/ai-architecture.md#136-retrieval-and-indexing-observability).

Vitest covers sample-rate parsing and verifies count-only custom span attributes without Research/query identifiers or content. Targeted tests, the full test suite, and `pnpm build` were reported successful by the implementation author; this documentation review does not rerun runtime verification or establish production performance validation.

This baseline does not include embedding usage tracking, monetary cost accounting, daily/monthly quotas, subscription-based limits, a usage analytics dashboard, or billing enforcement.

**Status: Complete for the defined application infrastructure baseline.** This covers the five implemented items above, not commercial operational readiness, a comprehensive security audit, or verification of all production behavior. Phase 11 operational reviews and the existing unverified items remain outstanding.

---

### Phase 9 — Public Demo

**Goal:** Prepare a safe and understandable portfolio demonstration.

**Release scope policy (2026-10-29 JST):** The implemented curated read-only Demo
and limited Demo Chat have separate acceptance scopes. Preserve
the Demo/SaaS separation, server-side authorization and secret protection, and
the fixed public-data boundary. Any public Chat additionally requires effective
API abuse and cost controls, safe admission shutdown/feature disablement, and
basic real-service and real-browser verification of the exposed feature.
Resolving every availability or quality issue is not a universal release gate;
material safety gaps remain blockers. The conditional Chat policy is defined in
[Public Demo Strategy](#5-public-demo-strategy). The 2026-10-29 revision granted no activation and retained the disabled UI /
No-Go checkpoint. See the current Production report above for later operation;
this does not mark all release-policy verification complete.

- [x] Create curated Demo Workspace
- [x] Create realistic Research data
- [x] Create Sources
- [x] Create Findings
- [x] Create Conclusions
- [x] Configure read-only Demo behavior
- [x] Add Demo labels
- [x] Add GitHub link
- [x] Add project documentation
- [x] Verify that no private credentials are exposed
- [x] Verify that arbitrary public writes are disabled

**Phase 9.1 — Curated dataset implementation:** Seed profiles are split into `development` and `public-demo`. `src/prisma/seed.ts` dispatches the selected profile, handles errors, and closes the database runtime; omitting the profile selects `development`. `seeds/development.ts` contains local development fixtures, while `seeds/public-demo.ts` defines curated portfolio data using the existing application UI and Research models.

The Demo Organization is **Evidence Atlas Demo**. Its Workspace and official theme are **AI-Assisted Software Development**, with four `COMPLETED` Research records:

- Developer Productivity
- Code Quality & Reliability
- Developer Experience
- Adoption & Organizational Impact

The dataset defines six Workspace Tags attached through ResearchTag. Each Research has three Sources, four text Findings linked through FindingSource, a stored Conclusion, one Comment, and one persisted example Conversation with a USER question and a predefined AI answer. AI answers build the existing `[source:<source-id>]` citation markers from generated Source IDs, providing examples for citation restoration without calling an AI provider.

`pnpm seed` selects `development`; `pnpm seed:demo` selects `public-demo`. The Demo seed provisions canonical data only: it does not create RetrievalChunk records or embeddings, request Inngest jobs, or run retrieval indexing. The derived retrieval index requires a separate indexing operation.

Both profiles create rows without deleting or truncating existing data; neither is a database reset or an idempotent operation. Repeated execution can fail on unique User emails, including `demo@evidence-atlas.local` for the Demo. Provisioning should therefore target a fresh or otherwise appropriate database after checking existing data.

The Public Demo seed has been verified against the isolated local database `evidence_atlas_demo_test`, without modifying or resetting the existing `evidence_atlas` database. `pnpm prisma db verify --db "$env:DATABASE_URL"` confirmed that the database marker and schema match the current Prisma contract.

The seeded Demo data was also verified directly in PostgreSQL. All four expected Research records are present with `COMPLETED` status, the Workspace is **AI-Assisted Software Development**, and the Organization is **Evidence Atlas Demo**. The verified Demo dataset contains 4 Research records, 6 Tags, 10 ResearchTag links, 12 Sources, 16 Findings, 22 FindingSource links, 4 Comments, 4 Conversations, and 8 Messages. `retrievalChunk` remains empty, as expected before the separate indexing step.

The verification database contains two User records in total: the expected `demo@evidence-atlas.local` Demo user and one pre-existing non-Demo user. The additional User is not a duplicate created by the Public Demo seed and does not affect the verified Demo dataset.

Demo Research indexing has been verified against the isolated `evidence_atlas_demo_test` database. All four Demo Research records produced the expected six retrieval chunks each—four `FINDING`, one `CONCLUSION`, and one `RESEARCH` chunk—for 24 `RetrievalChunk` records in total.

**Phase 9.2 — Public access and read-only boundary:** `/demo` and `/demo/research/[researchId]` provide an unauthenticated public read path separate from the authenticated SaaS routes. The server-only `src/lib/demo/read.ts` resolves only `DEMO_WORKSPACE_ID` in the database configured by `DATABASE_URL`, then verifies the expected Workspace/Organization names. Missing configuration, an unknown ID, or identity mismatch disables publication. There is no name-based lookup, selected-Workspace cookie, or arbitrary fallback.

Detail reads constrain the parent query by Research ID and Demo Workspace ID before reading children. Supporting Sources must belong to the same Research; Tags must belong to the Demo Workspace. Public Comments contain only an author display label, content, and dates. Missing/inaccessible public resources use the same not-found boundary; unexpected database failures propagate normally.

The shell displays **Demo** and **Read-only demo** labels. Shared Research display components have no authentication, database, mutation-action, or AI imports. Authenticated pages compose their existing controls separately; Demo pages provide none. No public chat, AI panel, conversation history, or persistence is enabled. Existing membership-based mutation guards and Research new/edit page guards remain unchanged.

Set server-side `DEMO_WORKSPACE_ID` to the curated Workspace ID in the intended database; `.env.example` intentionally leaves it empty. All Research in that Workspace is published, so keep it dedicated to curated public content. Authenticated members retain their existing SaaS write permissions in normal mode; Public Demo deployment mode disables those entry points. Public visitors receive no membership or Demo User session. Vitest covers public read boundaries, related-data scope, Comment privacy, query ordering, UI/import separation, and failure propagation alongside existing authorization regressions.

The GitHub link, Phase 9 portfolio documentation, final credential exposure review, and production deployment are complete. Separate limited Public Demo Chat is now reported working in Production; Research data remains read-only.

The deployed Public Demo uses a dedicated Prisma Postgres database and the Public Demo deployment lock. No private credential exposure was found in the reviewed repository files, reachable Git history, or deployed Demo HTML.

Database-role hardening, normal-SaaS telemetry redaction, Preview environment separation, and live Inngest Cloud integration verification remain separate later hardening tasks.

The public-write checkbox covers visitor-originated authenticated SaaS writes as verified in Phase 9.3 below; it does not claim that infrastructure or background systems cannot write.

Phase 9.2 validation passed `pnpm lint`, `pnpm test --run` (13 files, 147 tests), and `pnpm build`. Additional read-only verification against the existing isolated `evidence_atlas_demo_test` database exercised the real Prisma read helper: all four Research records returned three Sources, four Findings, a Conclusion, Comments, and Tags. A local production server using a PostgreSQL read-only connection returned HTTP 200 for the Demo list and all four details, with no mutation forms/controls or Comment emails; an unknown Demo Research returned 404. Logged-out `/research`, `/research/new`, and `/research/<id>/edit` returned sign-in redirects. No seed, reset, or database writes were performed.

These checks record the pre-deployment local verification baseline. Production behavior was verified separately after deployment.

Manual browser verification of the Phase 9.2 read paths and normal SaaS mode after configuring the intended Demo database:

1. Log out and open `/demo`; verify the four curated Research items, statuses, Tags, and Demo/read-only labels.
2. Open each detail; verify Sources, Findings and supporting links, Conclusion, Comments, and back navigation.
3. Verify there are no create/edit/delete, Tag/status/Conclusion editing, settings, Workspace switcher, sign-out, or AI controls.
4. Substitute a Research ID outside the Demo Workspace, then a nonexistent ID; both must return 404.
5. In normal mode (`PUBLIC_DEMO_MODE=false` or unset), check `/research`, `/research/new`, and `/research/<id>/edit` while logged out; all still redirect to sign-in.
6. In normal mode, sign in as an authorized Workspace member and verify existing Research editing and authenticated controls.

**Phase 9.3 — Public deployment write lock:** Server-only `src/lib/deployment-mode.ts` provides `isPublicDemoMode()` and `requireApplicationEnabled()`. `PUBLIC_DEMO_MODE=true` is a **required Public Demo deployment setting**, at both build and runtime. If the deployment forgets this flag, unset/empty/`false` intentionally runs the normal authenticated SaaS application. Trimmed `true`, `1`, and any other non-empty value except exact lowercase `false` lock the application; document and configure `true` or `false`. Mode changes require consistent build/runtime configuration and redeployment rather than an assumed hot switch.

In Public Demo mode, `/` redirects to `/demo` before auth or database access. Research, settings, and onboarding pages return 404 through the common `requireUser()` deployment guard, which runs before `auth()`. Auth catch-all GET/POST requests return 404 with `Cache-Control: no-store` without dispatching Auth.js, including sign-in, callbacks, session, sign-out, providers, and CSRF. All four existing Research chat handler functions reject before session, DB, rate limiting, or AI work. Phase 9.2 public read paths remain available and independent of this flag; missing/incorrect `DEMO_WORKSPACE_ID` returns 404 without reopening SaaS.

Server Actions also pass through the common boundary. Eight actions with pre-authentication child reads check deployment mode at entry: FindingSource attach/detach and Source/Finding/Comment update/delete. Onboarding, Research creation/updates, member roles, and Workspace switching remain protected through `requireUser()`. The inline sign-out Action checks the mode before `signOut()`. `notFound()` rejection is used for actions as well as pages; local direct POST checks confirmed the action error result and HTTP 404. Normal-mode input validation, membership checks, and ADMIN semantics are unchanged.

Existing cookies do not bypass the lock: sessions are not evaluated by the protected entry points. Persisted Session rows are not revoked or deleted by enabling the mode. When normal mode is restored, still-valid sessions may work again. Separate limited Public Demo Chat is now reported working in Production; Research data remains read-only. Global session revocation, database-role hardening, normal-SaaS telemetry redaction, live Inngest Cloud integration verification, and Preview environment separation remain separate tasks. The lock covers visitor-originated SaaS operations, not all database or background writes.

Verification passed `pnpm lint`, `pnpm test --run` (17 files, 214 tests), and `pnpm build`. Tests exercise the real User/deployment guards, all eight early-read actions, representative writes, seven SaaS pages, root redirect, catch-all dispatch, sign-out, and all four chat handlers. Local production HTTP verification against the existing isolated database confirmed five public pages, seven unavailable SaaS pages, fourteen Auth GET/POST requests, four unavailable chat handlers, and 404 rejection results from all 22 registered Server Actions. Missing and invalid Demo Workspace configuration kept SaaS closed; normal mode preserved the sign-in redirect and Google provider dispatch. Verification used process-only local Auth host trust and a read-only connection, with identical before/after fingerprints for all 18 application/auth/index tables. No seed/reset/record writes or persisted environment changes occurred.

Verification passed `pnpm lint`, `pnpm test --run` (17 files, 214 tests), and `pnpm build`. Tests exercise the real User/deployment guards, all eight early-read actions, representative writes, seven SaaS pages, root redirect, catch-all dispatch, sign-out, and all four chat handlers.

Local production HTTP verification against the isolated database confirmed five public pages, seven unavailable SaaS pages, fourteen Auth GET/POST requests, four unavailable chat handlers, and 404 rejection results from all 22 registered Server Actions. Missing and invalid Demo Workspace configuration kept SaaS closed; normal mode preserved the sign-in redirect and Google provider dispatch.

Verification used process-only local Auth host trust and a read-only connection, with identical before/after fingerprints for all 18 application/auth/index tables. No seed, reset, record writes, or persisted environment changes occurred.

After deployment to Vercel, production checks confirmed that `/` redirects to `/demo`, `/research` is unavailable, and both `/api/auth/session` and `/api/inngest` return 404 in Public Demo mode. Live normal-SaaS Google login and authenticated CRUD remain outside the Public Demo deployment verification scope.

Phase 9.3 verification checklist and deployment record:

1. Set `PUBLIC_DEMO_MODE=true` in both build/runtime environments, configure the existing curated Workspace, rebuild/restart, and verify `/` redirects to `/demo`.
2. Logged out, verify `/demo` and all four details remain readable without mutation or AI controls.
3. Verify all Research, settings, and onboarding pages are unavailable; repeat with a browser holding an existing valid session cookie.
4. Verify Auth sign-in/providers/session/sign-out/Google callback endpoints are unavailable; Research chat GET/POST handlers must also be unavailable.
5. Verify representative direct Server Action requests cannot read private children, provision Organization/Workspace/memberships, mutate Research, change roles or Workspace cookies, or sign out.
6. Remove or invalidate `DEMO_WORKSPACE_ID`: public data becomes unavailable, but SaaS and Auth endpoints remain closed.
7. Restore `PUBLIC_DEMO_MODE=false` or unset and rebuild/restart; verify Google sign-in, onboarding, authorized Research operations, member administration, Research AI, and sign-out.
8. Before public deployment, explicitly verify the mode flag: forgetting it opens normal SaaS mode. Production deployment and the primary Public Demo route boundaries have now been verified. Database-role hardening, normal-SaaS telemetry redaction, Preview environment separation, and live Inngest Cloud integration remain separate follow-up tasks.

**Public Demo Inngest hardening:** `/api/inngest` GET/POST/PUT are unavailable in Public Demo mode and return 404 with `Cache-Control: no-store` before SDK, client, or function initialization. The curated Demo requires no runtime indexing, Inngest credentials, or Cloud sync.

Normal SaaS retains the existing Inngest event and indexing behavior. Production serving sets `enableUnauthedSync: false`, and the server-only client rejects SDK-resolved dev mode before serving handlers or sending indexing events. Custom and self-hosted endpoints remain supported when the SDK resolves to cloud mode.

Hardening verification passed `pnpm lint`, `pnpm test --run` (19 files, 239 tests), `pnpm build`, and `git diff --check`. Live signed Inngest Cloud integration remains outside the Public Demo deployment scope.

Prior investigation found no confirmed real credentials in tracked files, reachable Git history, or the inspected browser build.

The final credential exposure review found no confirmed private credentials in tracked files, the checked reachable Git history, or the deployed Public Demo HTML. Tracked credential-like files are limited to `.env.example`; real environment files remain ignored.

The deployed Public Demo was also checked for Prisma database hostnames and sensitive environment-variable names, with no matches found in the rendered Demo response.

This review covers the repository and current Public Demo exposure surfaces. Normal-SaaS telemetry redaction, Preview environment separation, database-role hardening, and live Inngest Cloud integration remain separate operational hardening tasks.

Sentry/Inngest event-key URL redaction for normal SaaS, actual Vercel configuration, signed Inngest Cloud integration/sync, Preview environment separation, and database-role hardening remain separate deployment or later hardening tasks.

Hardening verification passed `pnpm lint`, `pnpm test --run` (19 files, 239 tests), production `pnpm build`, and `git diff --check`. The production build succeeded without an Inngest-specific process override. Tests cover Demo dispatch/initialization blocking, normal request/context delegation, production signed-sync policy, SDK-resolved dev/cloud mode behavior, self-hosted/custom endpoint compatibility, event-send guarding, development compatibility, and secret-free configuration errors. Live signed Cloud sync/integration remains unverified.

Public deployment concept:

```text
Portfolio Visitor
       ↓
Public Demo
       ↓
Curated Workspace
       ↓
Read-only Data
```

Users who want to operate the application themselves should use their own database and AI provider credentials.

---

### Phase 10 — Testing & Quality

**Goal:** Ensure the application is reliable and maintainable.

**Verification selection policy (2026-10-29 JST):** The eleven checklist items
track implementation evidence and quality work; completing all eleven is not a
universal prerequisite for feature development or every release. Select checks
from the change's scope, exposed risks and failure impact, and record the chosen
coverage, results, exclusions and remaining limitations. Reuse relevant unchanged
evidence rather than repeating every suite, browser and screen for each PR.

- Security, authorization and data-boundary changes require appropriate regression
  verification of the affected server boundaries, refusals and side effects.
- UI changes prioritize the affected screens in the target browsers, including
  relevant narrow/desktop layouts, keyboard operation, focus and readability.
  Important operations that cannot be used are release blockers for that feature,
  not automatically deferrable accessibility or responsive improvements.
- A local Production Build is not mandatory for every PR. Vercel Preview build
  evidence may establish the intended deployment artifact's build completion when
  its commit/configuration and result are identified; include runtime/browser
  checks appropriate to the release. It does not establish a successful isolated
  local build, reproducible dependencies or verification of every external service.
- Keep Pass, Fail, Not run and Blocked distinct. Do not expand mock-only, developer-
  reported, historical or Preview results into broader verified claims.

The existing [acceptance document](phase10-quality-acceptance.md), historical
evidence and finite completion decisions remain unchanged. In particular, its
isolated local PB acceptance is still incomplete; using Preview for a scoped
release does not complete that item. This policy separates feature release
decisions from the eleven-item completion record; it changes no checkbox.

**Quality acceptance baseline (2026-10-19 JST; PR #10 documentation):** [Phase 10 acceptance criteria](phase10-quality-acceptance.md) inventories evidence, gaps, safety gates and the follow-up sequence for all eleven items. E2E remains checked only for Public Demo + C2 authenticated read-only Smoke 4/4 + Chat mock-only 6/6; the other ten items remain open. PR #9's 58-file / 1,287-test success is historical evidence, not a new execution or completion decision. This documentation update runs no tests, build or live-service verification and changes no checklist state.

**Current status through PR #39 (2026-10-26 JST):** The paragraph above preserves the PR #10 snapshot; the checklist below reflects the later four-item acceptance state. PR #37 merged the Sources → Findings → Discussion → Conclusion reading order. PR #38 (`315502b`) added desktop AI open/close with retained state and in-flight sends, scoped browser checks, Vitest 73 files / 1,582 passes, and C2 Chat mock-only E2E 6/6. PR #39 (`ef1c09d`) corrected Public Demo keyboard focus/scroll margins; the user reports E2E **20/20 (2.1 minutes)** against a Vercel Preview containing those CSS changes. See [execution attribution and limits](phase10-quality-acceptance.md#pr37-39-status-alignment). Historical overlap/deployment/pending records below describe their checkpoints; these later results do not complete Accessibility or Responsive review and change no checkboxes.

- [x] Unit tests
- [ ] Integration tests
- [ ] Database tests
- [ ] AI-related tests
- [x] End-to-end tests — Public Demo smoke + C2 authenticated read-only Smoke (4/4) + Chat mock-only (6/6), per developer-run logs; Google OAuth flow excluded
- [x] Validation tests
- [x] Authorization tests
- [ ] Error handling review
- [ ] Accessibility review
- [ ] Responsive UI review
- [ ] Production build verification

**Unit acceptance approved (2026-10-22 JST; PR #23/#24):** The finite Unit scope passed after the ASCII estimation precision and Unicode surrogate-pair boundary fixes. Chunker tests passed 34/34; full offline Vitest passed 66 files / 1,448 tests, with TypeScript, lint and Git diff checks successful. See the [acceptance record](phase10-quality-acceptance.md). This checklist update reuses those results; no tests were rerun.

Vitest and Playwright dependencies and scripts are present. Phase 6 adds manual retrieval/citation inspection scripts and records manual chat E2E checks. Existing Vitest tests cover access control for the ten mutation actions described in Phase 7, using mocked authentication and database operations: missing Research, non-membership, unauthenticated requests, unexpected Research lookup failures, and authorized writes. Finite Unit, Validation, Authorization, and bounded E2E acceptance is recorded above; broader regression coverage, accessibility/responsive review, and comprehensive production deployment verification remain outstanding.

**Phase 10 — Minimal Public Demo E2E (2026-10-09):** `playwright.config.ts` and `e2e/public-demo.spec.ts` add six Chromium smoke tests against the deployed read-only Public Demo. The default target is `https://evidence-atlas-mu.vercel.app`, overridable with `E2E_BASE_URL`; one worker runs without starting a local server or requiring a local database. Tests cover the root redirect, four current seeded Research entries and Demo links, detail sections/back navigation, absence of mutation/AI UI, unknown Research 404 without fallback, and GET-only 404 checks for `/research`, `/api/auth/session`, and `/api/inngest`. Research IDs come from list links. A preflight verifies the Demo target, browser non-GET traffic is blocked, execution stops on the first failure, and failure traces are retained. Vitest excludes `e2e/**` from its collection.

Validation passed all six remote E2E tests, `pnpm lint`, `pnpm test --run` (19 files, 239 tests), and `pnpm build`. Browser installation, test subprocesses, and Google Fonts fetching required execution outside the restricted sandbox. Existing Vitest missing-Inngest-event-key diagnostics and build warnings for unconfigured Upstash credentials remain. This establishes Public Demo UI/GET regression coverage; it does not verify server-side write prevention, database integration, AI answer quality, authenticated SaaS workflows, or complete Phase 10. Follow-up E2E coverage includes the other three Research details, accessibility/responsive checks, and authenticated workflows in an isolated environment.

**Public Demo mobile smoke (2026-10-17, JST):** `e2e/public-demo.spec.ts` adds two Chromium cases using scoped `test.describe` / `test.use` viewports: 375 × 812 and 768 × 1024. Each checks the Workspace name, read-only label, all four curated Research links, full accessible titles despite intentional list ellipsis, Tab reachability and click actionability. Actual clicks open Developer Productivity and return through the Back to Demo Workspace link. Detail title and Conclusion/Sources/Findings/Discussion headings are checked for clipping; bounding boxes check primary content/link placement, and `document.documentElement.scrollWidth <= clientWidth` checks list/detail/returned-list horizontal overflow. The existing desktop project, six smoke cases, Public Demo preflight and browser non-GET blocking are unchanged. No UI defect reproduced or UI change was needed.

Final verification passed `pnpm exec playwright test e2e/public-demo.spec.ts` (**8/8: desktop 6, 375px 1, 768px 1**), `pnpm test --run` (**52 files, 976 tests**), `pnpm exec tsc --noEmit`, `pnpm lint`, and `git diff --check`. Playwright/Vitest initially failed to spawn subprocesses in the restricted sandbox (`EPERM`); authorized execution outside it passed. An initial new-test locator scoping error was corrected before the final run. Coverage uses Chromium viewport resizing, not real mobile devices or touch emulation; the other three Research detail pages, broader accessibility/responsive review and Phase 10 remain open. No C2 browser suite, OAuth flow, direct database operation or AI API call was performed.

**Public Demo basic accessibility review (2026-10-17, JST):** Limited to the deployed read-only `/demo` and Developer Productivity detail, compared with local baseline `dd46982`, the [design system](../design/design-system.md), and [WCAG 2.2](https://www.w3.org/TR/WCAG22/) (W3C Recommendation, 2024-12-12), especially 1.3.1, 1.4.1/3/4, 2.1.1/2, 2.4.3/4/6/7/11 and 4.1.2. This is a bounded review, not a conformance audit. Three added cases in `e2e/public-demo.spec.ts` run the same accessibility scenario at Desktop Chrome project viewports **1280 × 720, 375 × 812 and 768 × 1024** (installed Chromium 153.0.8010.12; not branded Chrome or physical mobile devices).

- **Automated regression checks:** Real Tab traversal reaches the site-name and Source code links, all four Research links, the detail Back link, all three external Sources and all five Supporting Source links. Shift+Tab checks reverse order; Enter opens Developer Productivity and returns to the list, where Tab remains usable. `expectTabReachable` is reused; no `locator.focus()` is used. `:focus-visible`, an outline/shadow style and multi-point hit tests check the focused link remains at least partly exposed to the viewport rather than completely covered by the sticky header. These checks alone do not prove perceptual visibility or indicator contrast. Both pages have one `main` and one page-specific `h1`; list titles are `h2`, detail sections are Conclusion/Sources/Findings/Discussion `h2`, and Source titles are `h3`. Header/Back names are selected by role/name; external/Supporting links have nonempty accessible names and HTTPS/HTTP destinations without opening third-party sites. Existing full accessible list-title checks and 375px/768px overflow/clipping checks are preserved rather than duplicated.
- **Browser visual inspection:** The agent inspected screenshots captured after real keyboard events in headless Chromium, including header links, the four list-link focus patterns, Back and representative Source/Supporting Source links across the three viewports. Blue focus outlines were distinguishable in the inspected light-theme captures. This is screenshot inspection, not a headed, manually operated browser session or screen-reader test. Separately, the developer manually explored the deployed Public Demo using only the keyboard and opened multiple links. This provides additional hands-on evidence of keyboard navigation and link operability, but does not constitute a complete manual review of all accessibility categories A–F. This developer-reported check is separate from the agent-run browser tests and screenshot inspection. A supplemental **CSS `zoom: 2`** check at 1280 × 720 retained Tab access and no page horizontal overflow on list/detail; representative captures were inspected. CSS zoom does not establish browser-UI 200% zoom or text-only resizing support.
- **Code review:** Native anchors carry visible titles; the GitHub icon is decorative (`aria-hidden="true"`). Status (`Completed`), Demo/read-only and tag labels use text rather than color alone. Section headings express content hierarchy rather than decoration; the list's existing `aria-label="Research list"` names its region. No additional ARIA is needed. Link focus uses the browser's `outline-style: auto` (computed 1px) with the global `outline-ring/50` color and no shadow. `.dark` tokens exist, but system-theme selection and a theme control are absent, matching the implementation gap already recorded in the design system. The sidebar and other Draft design-direction proposals are not treated as implemented requirements.
- **Numerical text-contrast samples:** A temporary Playwright/Chromium script read computed text colors and the nearest nontransparent ancestor background in the current light theme at rest, checked sampled ancestor chains for opacity/filter/gradient effects, and converted colors through Canvas 2D sRGB `getImageData` (8-bit RGB). WCAG relative luminance uses linearized sRGB with coefficients 0.2126/0.7152/0.0722 and ratio `(Llighter + 0.05) / (Ldarker + 0.05)`. The opaque pairs below exceed the normal-text 4.5:1 threshold before display rounding. They are samples, not all-state or whole-page contrast certification; antialiased glyph pixels were not used. Translucent/blurred header backgrounds, hover backgrounds, focus outlines and dark colors are excluded from numerical conclusions.

| Sample                                                 | Foreground / opaque background (sRGB) | Ratio   | Result for sampled pair |
| ------------------------------------------------------ | ------------------------------------- | ------- | ----------------------- |
| Page heading / main background                         | `#0f172a` / `#fafafa`                 | 17.10:1 | Pass                    |
| Finding text and Supporting link / card                | `#0f172a` / `#ffffff`                 | 17.85:1 | Pass                    |
| Muted description and small metadata / main background | `#475569` / `#fafafa`                 | 7.26:1  | Pass                    |
| Muted list/Source description and small date / card    | `#475569` / `#ffffff`                 | 7.58:1  | Pass                    |
| Tag text / secondary badge                             | `#0f172a` / `#e2e8f0`                 | 14.48:1 | Pass                    |

- **Findings and fixes:** No UI defect requiring a change reproduced within the reviewed scope; UI/shared SaaS components and dependencies are unchanged. At 375px, reverse Tab can place part of a Source link behind the sticky header, with the remaining part still visible. This is recorded as partial overlap, not complete occlusion under [2.4.11 Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html). The first new-test run falsely treated a covered centre point as complete occlusion; the test was corrected to sample multiple points across rendered fragments and then passed. This does not establish zero partial overlap or full focus-indicator contrast compliance.
- **Validation:** `pnpm exec playwright test e2e/public-demo.spec.ts` passed **11/11** (existing 8 + new 3); `pnpm test --run` passed **52 files / 976 tests**; `pnpm exec tsc --noEmit`, `pnpm lint` and `git diff --check` passed. Playwright/Vitest initially failed to spawn subprocesses in the restricted sandbox (`EPERM`) and passed after approved execution outside it. Public Demo preflight and browser non-GET blocking remain intact. Only the Public Demo browser suite ran; Vitest's C2-named tests are offline/mock checks, not a live C2 suite. No C2 environment operation, OAuth flow, real Chat/AI call, direct DB operation, production mutation, or authentication-state acquisition/export was performed.
- **Unverified / remaining:** Actual browser-UI 200% zoom, text-only resize/spacing overrides, screen readers, physical mobile/tablet input, other browsers, the other three Research details, dark rendering/theme support, numerical focus/icon/non-text contrast, translucent/overlapping/hover-state contrast and broader WCAG 2.2 AA coverage remain open. The public deployment's exact build identity was not independently established. **Phase 10 and its Accessibility review checkbox remain incomplete.**

**Public Demo remaining Research details / native Chrome zoom review (2026-10-17, JST; PR #4 work):** Three data-driven Desktop Chrome project cases in `e2e/public-demo.spec.ts` cover **Code Quality & Reliability**, **Developer Experience**, and **Adoption & Organizational Impact**. Each opens `/demo`, selects the exact Research title, clicks its actual list link, checks the resulting URL and unique matching `h1`, and separately GETs the discovered detail URL for HTTP 200 and the expected final URL (client navigation may use prefetch). Existing clipping/viewport helpers check the main content, four section headings, body text and Source titles; page-level horizontal overflow is checked before navigation, on detail and after returning. Sources/Findings/Discussion counts are derived from rendered items and compared with displayed counts; zero items require the appropriate empty message. External Source links are inspected without navigation. Back returns to the four titled Research entries. No Research IDs or content counts are fixed. Existing 11 cases, including 375px/768px representative detail checks, preflight, non-GET blocking and Playwright configuration remain unchanged.

- **Automated validation / Codex observations:** `pnpm exec playwright test e2e/public-demo.spec.ts` passed **14/14 (existing 11 + new 3)** against the deployed read-only Public Demo; `pnpm test --run` passed **52 files / 976 tests**; `pnpm exec tsc --noEmit`, `pnpm lint` and `git diff --check` passed. Playwright/Vitest first failed to spawn subprocesses in the restricted sandbox (`EPERM`); approved execution outside it succeeded. The first new-case run exposed a test locator scoped incorrectly inside `has`, corrected before the final full run; this was not a UI defect. Codex observed automated assertions in headless Chromium, without a new manual visual review. No new UI defect reproduced within this scope and no UI/shared SaaS component changed. Only the Public Demo browser suite ran; C2-named Vitest checks were offline/mock tests. No live C2 suite, OAuth flow, real Chat/AI call, direct DB operation, production mutation, external Source navigation or authentication-state acquisition was performed. Native browser-UI zoom is not part of these results.
- **Developer native Chrome 200% result:** **手動確認待ち (awaiting manual verification)**. No developer result has been supplied. Codex did not operate or observe Chrome's browser-UI zoom; the available headless Playwright run is not evidence of it. Chrome version, actual window dimensions, OS/display scaling and native 200% result are therefore unrecorded, rather than inferred from the Chromium project/device name.
- **Developer-reported native Chrome zoom follow-up (reported 2026-10-17, JST):** The developer reports having performed a manual check using Chrome's native **200%** zoom on **Windows**. The preceding "手動確認待ち" entry records the initial PR #4 checkpoint; the current status is **手動確認の実施報告あり・具体的な結果待ち (manual execution reported; detailed results pending)**. The supplied report still contains `(実測値)` for window size, `(成功／問題あり)` for the Research list, Developer Productivity, Code Quality & Reliability, Developer Experience, Adoption & Organizational Impact and keyboard operation, and `(なし／詳細)` for horizontal scrolling, clipped text and inoperable controls. These placeholders do not establish pass/fail outcomes or absence of defects. Actual window dimensions, Chrome/Windows versions, OS display scaling, exact check time and per-item outcomes remain unprovided. This is developer-reported execution, not a Codex-observed native zoom check; Codex has not independently repeated it. Existing automated results and unverified items remain unchanged. No tests were rerun or UI changes made for this documentation-only follow-up.
- **Developer-reported native Chrome zoom results — additional report (2026-10-17, JST):** Following the Windows Chrome native **200%** execution report above, the developer reports checking **keyboard operation and vertical scrolling**, with **no clipped text or inoperable controls observed**. The reported environment is a **"1920サイズのモニター"** and **"最新のChrome"**; these descriptions do not supply measured browser window/viewport dimensions, a complete monitor resolution or an exact Chrome version. The latest status is **手動確認の部分結果報告あり (partial manual results reported)**; the preceding pending-result entries preserve earlier checkpoints. The report does not separately identify outcomes for the Research list and each of the four Research details, nor explicitly confirm the absence of horizontal scrolling. Those details, actual window dimensions, exact Chrome/Windows versions, OS display scaling and the check time remain unrecorded. These are developer observations, not independently observed or repeated by Codex, and do not establish complete zoom/reflow or WCAG 2.2 AA conformance. Earlier automated results, other unverified items and the deferred 375px overlap remain unchanged. This follow-up changes documentation only; no browser tests were rerun or UI changes made.
- **Limits / remaining:** This adds desktop detail regression coverage, not an all-width review of every Research, a complete accessibility audit or WCAG 2.2 AA certification. CSS `zoom: 2`, viewport resizing and `deviceScaleFactor` do not establish native browser zoom. The previously documented partial Source-link/sticky-header overlap at 375px remains deferred. Exact deployed build identity, broader zoom/reflow, text-only resizing, screen-reader and other-browser checks remain open. **Accessibility review and Responsive UI review remain unchecked.**

**Windows Chrome native 200% manual procedure (developer; record results as a new dated entry):**

1. Open `https://evidence-atlas-mu.vercel.app/demo` in Windows Chrome. Record the test date/time, Chrome version (`chrome://version`, version number only), Windows version, window size/maximized state and, if known, OS display scaling and page viewport dimensions. Use the same window size throughout the check.
2. Open Chrome's three-dot menu and use its **Zoom** controls to set **200%**. Confirm the menu shows 200%; do not substitute CSS zoom, viewport emulation or device scaling.
3. Confirm the Workspace heading and all four Research links are readable/identifiable. List titles intentionally use ellipsis; check that the full titles remain available as link names.
4. Follow each Research link from the list, including Developer Productivity and the three titles above. Confirm the expected detail title and return to the list between Research pages; do not follow external Source or Source code links.
5. On each detail, vertically scroll through **Conclusion, Sources, Findings and Discussion**. Check that headings, body text, Source titles and any empty-state messages remain readable; truncated Source URL previews alone are intentional.
6. Check that horizontal scrolling, overlapping elements or clipping do not prevent reading primary information or using necessary links, especially Back. If a problem occurs, record the viewport/window size, URL, exact actions, expected/actual behavior and whether an element is partially covered or completely inaccessible. Keep the known 375px partial-overlap issue separate from newly reproduced blocking issues.
7. Use **Tab / Shift+Tab** to reach the Research and Back links and **Enter** to open each detail and return through **← Back to Demo Workspace**. Check visible focus and operability at 200%. Traverse external links without activating them.
8. Restore **100%** using Chrome's menu. Append a dated result with the environment, menu-confirmed zoom, list and per-Research reading/keyboard results, observed defects and anything not checked. A limited pass does not complete WCAG 2.2 AA or all zoom/reflow requirements.

**Phase 10 — Synthetic AI Chat Quality Evaluation (2026-10-10, JST):** The [six-case quality report](ai-chat-quality-evaluation.md) preserves the first Gemini evaluation: **Pass 4 / Provisional Pass 1 / Fail 1 / Not Run 0**. Case 03 failed semantic citation grounding. Later implemented prompt clarifications were followed by five Gemini Case 03 executions with appropriate citations in all five, but full marks in only one; limitations and qualifications remained weaker in the others. The direct runner supports Gemini and evaluation-only Groq (`openai/gpt-oss-120b`) with the shared production System Prompt. The earlier Groq Case 06 **Pass, 6/6** and qualitative Case 03 failures remain unchanged.

Developer-provided terminal observations now cover all six Groq cases. Case 01 failed **4/6 in each of two executions**; Case 02's raw result was **Fail, 4/6**, with a separate post-normalization **6/6 equivalent** criterion assessment; Case 04 failed **7/8** under the strict rubric; and Case 05 failed **8/10**. Case 03 remains evaluated without a consolidated numerical score and with unresolved inference errors. Execution coverage is complete, not universal passing behavior or a uniform statistical sample. Supported citation normalization and unit coverage are implemented, including later whitespace handling; earlier test completion was developer-reported, and no tests, builds, or provider evaluations were rerun for this documentation update. These are synthetic-context observations, not full production Chat API validation or general reliability evidence. Production Chat and embeddings remain Gemini. Remaining work includes prompt regressions, calibrated shared-criteria provider comparisons, semantic citation grounding, Finding/Source ID distinctions, pseudo-citation handling, inference consistency, and separate authenticated Chat API E2E validation. Phase 10 remains incomplete.

**Latest Gemini regression (2026-10-10, JST):** All six cases were executed with the locally modified shared System Prompt and manually assessed: Agreement **Pass, 6/6**; Contradiction **Fail, 5/6**; Inference **Fail, 7/8**; Insufficient Evidence **Fail, 7/8**; Source Limitations **Pass, 10/10**; Simple Question **Pass, 6/6**. All six handled Source citation eligibility appropriately in these responses; the strict-rubric failures concerned causal wording, qualifications, or explanatory completeness. Recent Finding/Source ID distinctions, multi-Finding coverage, and net-savings instructions were originally inspected in the local prompt and are now committed in `e707e23`; deployment and exact historical execution-time prompt identity remain unverified. Original Gemini and Groq records remain intact. The provider comparison spans different prompt revisions and repetition counts and does not prove general model superiority or compare monetary costs. Current follow-up work is to freeze/identify the prompt version, calibrate C2/I2/N2, retain versioned run artifacts, run controlled repeated evaluations with additional data, and separately validate authenticated Chat API streaming/persistence/UI behavior. No provider calls, tests, or builds were performed for the original regression documentation update, and Phase 10 remains incomplete.

**Optional AI Chat run storage (2026-10-10, JST):** The direct evaluation CLI now supports opt-in `--save` JSON observations under the Git-ignored `evals/ai-chat/runs/` directory. Versioned records retain separate response stages, provider/model and dataset metadata, reported token counts, and hashes of the exact prompt and selected fixture. Synthetic unit coverage verifies serialization, collision protection, and filesystem error propagation without provider calls. Storage adds no automatic scoring; model-backed saving and authenticated Chat E2E remain unverified, and Phase 10 remains incomplete. See the [quality report](ai-chat-quality-evaluation.md#optional-local-json-run-storage) for usage and schema.

**Phase 10 C1 — Mocked Chat API integration (2026-10-10, JST):** B fixture/citation coverage from `6546148` remains intact. Fifteen additional deterministic tests verify ordered history and role mapping, real prompt-context construction, blank/completed/incomplete generation boundaries, failure/write ordering, real-parser conversation restoration, and Workspace-filtered Supporting Source metadata. Only test files and documentation change; no provider or real database calls are made. Tests characterize an existing limitation: citation-only raw output can become empty after validation and still be persisted as an AI Message. A post-validation blank policy remains follow-up work. C2 browser streaming/rendering and authenticated full-stack E2E need an isolated SaaS environment and controlled data/streaming. Mocked coverage does not establish model quality or production E2E, and Phase 10 remains incomplete. See [C1 verification](ai-chat-quality-evaluation.md#completed-c1--chat-api-integration-verification-2026-10-10-jst) for coverage, checks, and prerequisites.

---

**C2 environment preparation — Step 1 (2026-10-12, JST):** A standalone Compose configuration now defines a dedicated PostgreSQL/pgvector container, persistent volume, network and loopback-only port 5433. An explicit C2 environment template and offline-tested connection-target guard prevent the C2 Prisma wrapper from falling back to development `DATABASE_URL`. [Local C2 PostgreSQL setup](c2-local-postgres.md) documents later schema replay, genuine OAuth-linked fixtures and safe teardown. No Docker resources were activated, no database was connected or initialized, and no migrations, seeds, OAuth or browser tests were executed. This completes configuration preparation only; authenticated C2 execution and Phase 10 remain incomplete.

**C2 Step 2-B1 (2026-10-12, JST):** The dedicated `pnpm dev:c2` launcher now validates separate DB/OAuth files, shadows standard Next.js dotenv keys, sanitizes child environment and fixes the local origin/binding. Both database clients validate C2 targeting before construction. The Prisma wrapper's string-false dotenv override vulnerability is corrected and tested offline. [Runtime setup and B2 handoff](c2-local-runtime.md) records pending server-side external-service, font and generated-artifact safeguards. No startup, OAuth, database writes or browser tests were performed; authenticated C2 and Phase 10 remain incomplete.

**C2 Step 2-B2 (2026-10-12, JST):** Validated C2 mode now rejects Chat/Inngest endpoints and lower AI, embedding, retrieval, Redis and indexing boundaries before side effects. Index enqueue is disabled, Sentry runtime/build delivery is gated or replaced with an inert adapter, and both bundlers substitute a system-font module. C2 uses dedicated `.next-c2` artifacts and TypeScript configuration; shared `next-env.d.ts` still precludes a same-checkout concurrency guarantee. Offline validation passed 431 tests, TypeScript and lint. No Next compiler/startup, OAuth, DB operation or browser test was performed. [C2 runtime verification](c2-local-runtime.md) remains separately authorized follow-up; authenticated C2 and Phase 10 remain incomplete.

**C2 Step 2-C startup repair (2026-10-12, JST):** A top-level await in Next config failed the installed default TypeScript/CommonJS loader after Next's early Ready log. Moving the lazy Sentry import into an exported async config function fixed the failure without changing stdio or service/DB guards. The temporary Webpack switch was removed. Offline regression passed 438 tests and TypeScript; lint passed after excluding generated `.next-c2` output. One separately authorized bounded C2 startup stayed running, listened on `127.0.0.1:3001`, created dedicated artifacts, and served anonymous session 200 and Inngest 503 before being stopped. Ordinary `.next` file metadata remained unchanged. Observed external established TCP connections were zero at two checks, not an exhaustive traffic audit. OAuth, fixtures, root/font/client compilation and browser E2E remain unverified. See [runtime verification record](c2-local-runtime.md#step-2-c-startup-failure-and-controlled-verification-2026-10-12-jst).

**C2 Step 2-C OAuth verification (2026-10-12, JST):** Dedicated Google OAuth login succeeded and redirected to `/onboarding`. C2 PostgreSQL User, Google Account, and Session counts increased from 0/0/0 to 1/1/1. The authenticated browser User ID matched the database User ID. The C2 container identity and isolated port were confirmed, and Inngest returned HTTP 503. No workspace or test fixture was created. Next: guarded C2 fixture implementation and authenticated Playwright E2E.

**C2 Step 3-A fixture implementation (2026-10-13, JST):** A dedicated fixture CLI now validates the strict C2 target before client construction, selects an explicit existing Google-authenticated User with an active database-backed Session, and defines a deterministic eight-record graph. Read-only dry-run/verify, explicit write opt-in, transactional insertion/cleanup, exact ownership/collision checks and dependency boundaries are covered offline. Verification passed 502 tests across 34 files (64 fixture tests), TypeScript, ESLint and diff checks. User/Account/Session are never mutated; regular development/public-demo seeds and external-service protections remain unchanged. No fixture command or real DB operation, app startup, OAuth or Playwright test ran for this step. Implementation is complete; runtime dry-run, fixture insertion/verification and separately approved cleanup/E2E remain pending. See [Step 3-A design and proposed commands](c2-local-runtime.md#step-3-a-safe-fixture-implementation-2026-10-13-jst). Phase 10 remains incomplete.

**C2 Steps 3-B/3-C — developer-reported runtime verification (reported 2026-10-13, JST):** Guarded fixture insertion succeeded and real DB verification found all eight records (`present:8`, `plannedInserts:0`, `plannedDeletes:8`). Manual authenticated Workspace overview displayed 1 Research, 1 Source, 1 Finding and 0 Tags; Research detail and the expected Source/Finding loaded successfully. No UI mutations were performed. Real Google User/Account/Session preservation follows the implemented mutation scope; no independent before/after auth-row integrity audit is claimed. These reported manual observations were not repeated by Step 4-A and are not Playwright results.

**C2 Step 4-A — authenticated Playwright foundation (2026-10-13, JST):** Separate fixed-origin Chromium configuration and four read-only fixture scenarios are implemented, with no automatic app startup or Demo-config reuse. Preflight checks disabled Inngest, Google Auth indicators, selected existing session and Workspace; it does not prove DB/container identity. A future manually initiated headed bootstrap exports only a minimal C2 application cookie into ignored private state; ordinary tests block auth/write/cross-origin traffic and reject redirects before following them. Recording and page-snapshot capture are suppressed, and diagnostics are redacted. Offline verification passed 607 tests across 36 files (105 new C2 Playwright tests), TypeScript, full ESLint and diff checks; `--list` collected four C2 cases without executing them. Step 4-A is implementation/offline verification only: no browser/HTTP/DB connection, real OAuth, state acquisition, fixture operation or live E2E was performed. [Runtime design, limitations and proposed commands](c2-local-runtime.md#step-4-a-isolated-authenticated-playwright-foundation-2026-10-13-jst) describe the next separately approved bootstrap/preflight/run gate. Phase 10 remains incomplete.

**C2 Step 4-B1 — first bootstrap failure and offline triage (2026-10-13, JST):** The developer reported fresh Chromium and the default Auth.js sign-in page, a broken icon/loading indicator, and no visible Google navigation after one click; the attempt was aborted and saved state was reported absent. Installed-source inspection confirms the existing native POST/CSRF route is correct. The known Auth.js icon is now served inertly without outbound traffic during bootstrap, with fixed phase/network diagnostics and explicit form readiness; no navigation root cause or live fix is claimed. Offline verification passed 644 tests across 37 files (37 new cases), TypeScript, ESLint and diff checks. Cookie/session, ordinary read-only E2E, Demo and fixture guards remain unchanged. The second manual bootstrap and all live authenticated E2E remain unexecuted pending separate approval. See [failure evidence and next controlled attempt](c2-local-runtime.md#step-4-b1--bootstrap-navigation-failure-offline-triage-2026-10-13-jst). Phase 10 remains incomplete.

**C2 Bootstrap OAuth follow-up — second reported failure (2026-10-13, JST):** The developer reported SIGNIN_READY/COSMETIC_ICON_LOCAL/AUTH_SUBMIT/AUTH_REDIRECT, no successful Google navigation, a stopped manual wait and absent saved state. AUTH_REDIRECT preceded fulfillment and did not prove browser delivery. Installed Playwright can auto-continue redirect hops outside user routes and suppress some fulfillment command errors; the direct live cause remains unresolved. Fixed diagnostics now separate fulfillment return, browser redirect response, provider request/failure and main-frame commit, with a pre-close summary. Permissions, normal E2E, cookie/session and fixture guards remain intact. Offline verification passed 662 tests across 38 files (18 new regressions), TypeScript, ESLint and diff checks. No third bootstrap or live operation was executed. See [navigation-stage evidence and next controlled attempt](c2-local-runtime.md#bootstrap-oauth-navigation-follow-up--second-attempt-2026-10-13-jst). Phase 10 remains incomplete.

**C2 Step 4-B2 — Chromium navigation stall diagnostics (2026-10-13, JST):** The developer reported a successful Windows TCP check, browser-observed Auth.js redirect and Google main-frame request, then a blank/loading page without response/commit before manual stop; final cancellation and absent state are reported, not an independent Google connectivity failure. Installed-source inspection explains redirect route bypass but does not establish the stall's cause. A fixed 20-second observation now separates pending-without-response, pending-after-response, pre-shutdown failure and shutdown cancellation, with TLS/DNS categories and timer cleanup; it performs no retries or navigation. Offline verification passed 684 tests across 39 files (22 new cases), TypeScript, ESLint and diff checks. No live browser/HTTP/OAuth/DB/Docker or fixture operation ran. A non-authenticated browser probe remains design-only and separately reviewed; the fourth bootstrap is not executed. See [Step 4-B2 evidence and limits](c2-local-runtime.md#step-4-b2--third-attempts-uncommitted-google-navigation-2026-10-13-jst). Phase 10 remains incomplete.

**C2 Step 4-B3 — isolated native Chromium HTTPS probe (2026-10-13, JST):** The fourth developer-reported bootstrap reached a provider request but no response before the 20-second deadline, then was stopped without saved state. A separately opted-in probe now targets only `https://accounts.google.com/robots.txt` through native navigation in fresh non-persistent full Chromium. CDP Request/Response interception gates one exact GET and terminates every response before body/redirect continuation; auth challenges, arbitrary traffic and containment failures refuse. It requires no app/User/DB/auth state and is never invoked automatically. Offline verification passed 751 tests across 40 files (67 new cases), TypeScript, ESLint and diff checks. The probe, fifth OAuth attempt and live authenticated E2E remain unexecuted; no connectivity/OAuth root cause is claimed. See [probe contract, limitations and proposed command](c2-local-runtime.md#step-4-b3--isolated-chromium-https-probe-2026-10-13-jst). Phase 10 remains incomplete.

**C2 D19 — developer-reported scenario failures and offline investigation (2026-10-16, JST):** After the resolved-browser configuration fix at `fd48697`, both authenticated suites passed runner configuration/state checks, HTTP/session preflight and expected Smoke 4 / Chat mock 6 collection, but returned scenario failures and exit 1. The developer reported successful Session revocation, private-state removal and verification of all eight protected fixture rows. Offline investigation reproduced a Smoke summary assertion defect against actual server rendering and replaced its whitespace assumption with exact paragraph label/count checks. Bounded reporter step codes now distinguish fixture, context preflight, navigation, assertion and cleanup observations without raw details. This does not identify D19's historical failure phase or resolve the Chat failure. No browser, OAuth, HTTP/DB operation, Session creation or live E2E was performed for this investigation. See [D19 evidence, regression coverage and remaining gate](../archive/c2-d19-scenario-investigation.md). Authenticated E2E and Phase 10 remain incomplete; another live run requires fresh explicit authorization. Keep PR #1 Draft.

**C2 authenticated E2E verification — developer-reported completion (2026-10-16, JST):** Following the D19 investigation and subsequent C2 fixes committed in `5bbf0ce`, the developer supplied a Windows PowerShell transcript from a bounded C2 run. A private C2 application E2E Session was created without performing Google OAuth; HTTP/session preflight succeeded, but PostgreSQL container identity was not proven. All four authenticated read-only Smoke cases and all six Chat mock-only cases reported passing, with both runners reporting `RUNNER_PASSED`. FixtureBefore, Create, Preflight, Smoke, Chat, Revoke and FixtureAfter each exited **0**. Protected fixture verification before and after showed `{"mode":"verify","present":8,"plannedInserts":0,"plannedDeletes":8}`; planned deletion was **not** executed. The private Session was revoked and the saved authentication state was deleted (`Auth state exists: False`). This completes the Phase 10 **End-to-end tests** checklist item for the defined Public Demo + C2 Smoke + Chat mock-only scope, based on developer-provided runtime evidence rather than independent re-execution. Google OAuth browser sign-in, the unmocked Chat API/AI behavior, and PostgreSQL container identity remain outside this result. Other Phase 10 checklist items remain open; Draft PR #1 remains unmerged.

**PR #1 post-merge status (2026-10-17 JST):** [PR #1](https://github.com/morimotodev93/evidence-atlas/pull/1) was merged into `main` at [`969af82`](https://github.com/morimotodev93/evidence-atlas/commit/969af82a863b34b343ad59e40221e5b4f7f9fc13). Earlier "Draft/unmerged" or "authenticated E2E pending" wording in dated C2 investigation records describes the checkpoints when those records were written, not the current PR status. The completed Phase 10 E2E checkbox covers the Public Demo smoke, authenticated C2 read-only Smoke 4/4, and C2 Chat mock-only 6/6 based on developer-provided runtime evidence; it does not establish automated Google OAuth, unmocked Chat/AI behavior, independent PostgreSQL container identity, or complete external egress containment. No fresh tests or live C2 operations were performed merely by merging this PR, and the merge does not authorize new live operations.

**PR #5 — Production build verification (2026-10-17, JST):** Verification uses baseline `71c9ec7a5278cc726f0cdad77db0760ae57970d5` (PR #4 merged), on `test/production-build-verification`. The branch and HEAD matched the requested baseline, and the working tree was clean at the start of the initial Codex run. The final PR changes only this roadmap and the Vitest `build/**` collection exclusion; no application, dependency, Next.js, Sentry, Playwright test, C2 fixture, or safety-policy change is included. The initial Codex evidence and subsequent developer-reported Windows results are recorded separately below.

#### Initial Codex isolated verification

- **Environment:** Windows NT `10.0.26200.0`, Windows PowerShell `5.1.26100.9711`, Node.js `24.16.0`, pnpm `12.9.1`, Next.js `16.3.8`, Sentry Next.js SDK `11.4.0`, Vitest `3.2.7`, TypeScript `6.0.3`, ESLint `9.39.5`. Package-manager and framework versions agree with `package.json`, `pnpm-lock.yaml`, and the installed packages. The restricted workspace-write/network execution environment was retained. The shell profile initially failed to create an fnm multishell symlink; subsequent commands used PowerShell without loading its profile and the installed Node.js 24 executable.
- **Pre-build review:** Reviewed `package.json` (build is only `next build`, with no pre/post-build migration or seed scripts), `pnpm-lock.yaml`, `next.config.ts`, `.env.example`, `.gitignore`, `src/lib/app-font.ts`, instrumentation/runtime Sentry configuration, DB/Auth client initialization, Demo guards, AI/rate-limit initialization, Inngest dispatch, and this roadmap. Next.js production lookup is process environment, `.env.production.local`, `.env.local`, `.env.production`, then `.env`; the installed `@next/env@16.3.8` implementation confirms that it reads project-directory files. Original `.env` contains configured DB/AI keys; `.env.local` contains configured Auth/OAuth, Inngest dev-mode, and Sentry runtime settings; `.env.sentry-build-plugin` contains a configured Sentry auth token. `.env.production` and `.env.production.local` are absent. C2-specific local files also exist, but are not standard Next.js auto-load files. Only presence and purpose were inspected/reported; no credential value or connection string is recorded here.
- **Sentry hazard and isolation:** `withSentryConfig` disables build telemetry and automatic Vercel monitors, but does not itself disable release creation or source-map upload. Installed `@sentry/bundler-plugins@11.4.0` reads `.env.sentry-build-plugin` and uses `Object.assign(process.env, dotenvResult)` before normalizing options; merely unsetting or shadowing shell variables is therefore insufficient isolation. The original working directory was not built. Instead, all 662 tracked files were copied byte-for-byte into ignored `build/production-verification/source/`, including only tracked example env files, with no real `.env*`, `.sentryclirc`, or `.git` copied. A junction reuses the existing `node_modules`; dependencies were not deliberately upgraded or reinstalled. The original files and existing build directories were retained. The user-level `.sentryclirc` was absent.
- **Build conditions:** Commands ran with the copy as the current directory, a fresh environment containing only selected Windows OS/path/temp/profile variables, `NEXT_TELEMETRY_DISABLED=1`, and `NPM_CONFIG_OFFLINE=true`. The build additionally used `NODE_ENV=production`, `PUBLIC_DEMO_MODE=true`, and `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0`. `DATABASE_URL`, `DEMO_WORKSPACE_ID`, Auth/OAuth/AI/Upstash/Inngest credentials and overrides, Sentry DSN/token/org/project, C2 mode, Node preload options, and dotenv overrides were not inherited. A separate check with installed `@next/env` returned **zero loaded env files and zero service credential keys** in that environment. Existing `.env` files were not edited, deleted, or moved. Application Demo and external-service guards were not weakened; no C2 alias or replacement font was used.
- **Build result — interrupted, not verified:** The corrected `pnpm build` invocation started at **11:51:47 JST** and exited **1** after **496 seconds**. Next.js loaded `next.config.ts` successfully in 8.8 seconds and entered `Creating an optimized production build ...`, but did not finish compilation. An observed build worker's CPU time and working set continued growing without a stage change; at **11:59:44 JST** its working set was **6,549,807,104 bytes** (about 6.1 GiB). The verifier stopped that specific Node process, checking its PID and creation time first, to bound resource use. The subsequent Turbopack error names `src/app/globals.css`, reports a crashed Node subprocess evaluating PostCSS loaders (`0xffffffff`), and includes packet-read/message timeout details. This is a **verifier-interrupted run**; its exit 1 and downstream loader error do not establish a naturally reproducing application defect, a native out-of-memory error, or a Google Fonts failure. No heap-limit increase, alternate bundler, application/configuration fix, or retry outside the sandbox was performed. The copied layout/junction, installed dependency state, and restricted environment remain possible influences, not confirmed causes.
- **Artifacts and build-stage limits:** Partial outputs were created under ignored `build/production-verification/source/.next/`, including generated route types, build chunks, cache, and diagnostic files. Final diagnostics remained `buildStage: "compile"`; **`BUILD_ID` is absent**. Compilation completion, Next.js's built-in TypeScript stage, page-data/static generation, final route results and a complete production artifact are therefore **unverified**. These partial outputs are not deployable build evidence and were not staged in Git. Logs and the local PowerShell verification launcher are also under ignored `build/production-verification/`; they are local evidence, not committed PR artifacts.
- **Related checks:** `pnpm test --run` exited **1** before test collection: Vite/esbuild could not spawn its service (`spawn EPERM`), so no Vitest passing result is claimed. `pnpm exec tsc --noEmit` exited **0** with no TypeScript diagnostics, using the types generated in the verification copy. `pnpm lint` exited **0** with no ESLint diagnostics. These cover the unchanged baseline sources in the env-free copy; the separate `tsc` success is not evidence that the unfinished build's internal type-checking stage ran. Tests used the existing offline/mock configuration, not Playwright or live C2 workflows. `git diff --check` passed in the original working tree after this record was finalized. An initial local wrapper argument error prevented the first build/lint invocations from reaching their scripts; the reported build/lint results use the corrected array argument handling, without changing project scripts. The first Vitest invocation already passed its arguments correctly and was not rerun with relaxed settings.
- **Package-manager diagnostics:** pnpm attempted its automatic dependency verification/install before running scripts. Project install-lock acquisition and the user-level store operation lock were denied (`ERR_PNPM_STORE_DIR_OPEN_OPERATION_LOCK`, OS error 5), followed by a warning that installed dependencies may be out of sync with the lockfile. pnpm nevertheless continued to the existing tools. Consequently the TypeScript/ESLint exit-0 results cover the existing installed dependencies, not a successful clean dependency installation. The suggested `verifyDepsBeforeRun: false` bypass was **not** applied; permissions, package manager, lockfile, and dependency settings were not changed to suppress these messages.
- **Initial Codex warning/error classification:**

##### PR #5 / Prevents build verification

- **Observation in this run:**
  Compilation did not complete; verifier stopped the growing worker, followed by the PostCSS subprocess/timeout error
- **Decision:**
  Preserve as interrupted/inconclusive; investigate environment and copy layout before attributing a code defect or
  changing CSS/configuration

##### PR #5 / Environment-dependent tooling failure

- **Observation in this run:**
  pnpm project/store locks denied; automatic dependency verification failed, then existing tools ran
- **Decision:**
  Existing dependency results only; resolve legitimate local permissions/dependency verification before a clean rerun;
  do not disable the check

##### PR #5 / Known environment restriction, reproduced now

- **Observation in this run:**
  Vitest's Vite/esbuild startup failed with `spawn EPERM`, consistent with earlier restricted-sandbox test startup
  records
- **Decision:**
  No tests ran; do not claim the historical passing test count for this run

##### PR #5 / Informational configuration output

- **Observation in this run:**
  Next.js lists experimental `clientTraceMetadata` while using the existing Sentry wrapper
- **Decision:**
  Not an error or a new application regression; no configuration change warranted

##### PR #5 / Historical warnings, not reproduced here

- **Observation in this run:**
  Earlier roadmap entries mention unconfigured Upstash build credentials and missing Inngest event-key test
  diagnostics
- **Decision:**
  Neither appeared in this interrupted build / pre-collection test run; do not claim they are resolved or count them
  as current warnings

##### PR #5 / Outside this verification

- **Observation in this run:**
  Live DB, OAuth, AI, Redis, Inngest Cloud, Sentry upload, and deployment behavior
- **Decision:**
  No live-service validation or production-readiness conclusion

- **Communication and side effects:** Google Fonts CSS/font fetching is the expected build-time asset dependency, but this run recorded neither successful font acquisition nor a font-specific error. There was no packet capture or complete outbound-traffic audit, so actual destinations and the absence of every unexpected packet are not proven. No external-network permission was expanded and no sandbox escalation was requested. With no env files loaded, no service credentials inherited, no Sentry DSN, and no Sentry build token, runtime event delivery and authenticated source-map/release upload had no configured credentials; the compilation did not reach Sentry's after-production-compile hook. Source review found request/lazy DB, AI, Redis, and Inngest paths rather than a migration/seed/build-time query script; Public Demo guards and the missing Demo Workspace prevented intended data entry paths. No service request, DB query, migration, seed, C2 startup, production server, browser/OAuth flow, fixture operation, or deployment was intentionally invoked. This is configuration/source/log evidence, not a DB audit or complete egress-containment proof.
- **Secret and workspace checks:** Original local environment files were not modified, removed, or moved; local fingerprints taken during verification still matched at the final check (fingerprints were not published). A value-match scan of **519 generated/log files** found **zero matches** for configured local values of at least eight characters from `.env`, `.env.local`, and `.env.sentry-build-plugin`. This bounded scan is not a general secret-detection certification. At the end of this initial Codex run, only this roadmap was changed in the working tree. No generated artifact was added to Git; no commit, push, PR creation, Vercel deployment, or application/configuration/dependency change was performed.
- **Completion decision:** Keep **Production build verification** unchecked. Phase 10 gives no explicit acceptance criteria beyond the checklist label; historical Phase 9/11 build successes do not complete this new baseline verification. Proposed bounded criteria: unchanged baseline application/configuration and declared tool versions; a credential-free build with prohibited side effects excluded; actual `pnpm build` exit **0**, successful compilation, built-in type checking and route processing, expected `.next` outputs/`BUILD_ID`; classified current warnings and recorded limitations; related checks passed or explicitly bounded. These criteria do not imply deployment or live-service validation. Other Phase 10 checkboxes are unchanged.
- **Remaining at the initial Codex checkpoint:** Reproduce in a credential-free, correctly scoped checkout with verified dependencies and legitimate subprocess/write permissions, preserving the network restrictions and application guards; isolate the compile-stage resource growth before considering any code fix. The local launcher deliberately omitted inherited proxy variables as well as service variables, so this run does not establish font-fetch viability under the host's normal network transport. A rerun should retain only already-authorized transport settings if needed, without widening network access. At this checkpoint, a complete successful production build, full Vitest execution, clean installation/lockfile reproducibility, final route generation, actual font network results, Vercel deployment, real DB connectivity, OAuth, AI/provider behavior, Redis/Inngest Cloud integration, Sentry uploads, and actual production operation were unverified. The following Windows report supplies later build/test observations without resolving the isolated-build or side-effect limits.
- **Sources and version scope:** [Next.js environment-variable load order](https://nextjs.org/docs/app/guides/environment-variables#environment-variable-load-order) and [Next.js Font reference](https://nextjs.org/docs/app/api-reference/components/font) were consulted on 2026-10-17. The current online docs can describe a newer Next.js release; behavior specific to this run was checked against installed Next.js / `@next/env` **16.3.8** and Sentry **11.4.0** source. `src/lib/app-font.ts` retains Google `IBM_Plex_Sans` weights 400/500/600/700; font CSS/assets are build-time network dependencies, separate from Sentry upload and application service calls.

#### Windows developer follow-up and PR #5 final review (2026-10-17, JST)

- **Evidence attribution:** The developer supplied the Windows PowerShell build/test observations below. Codex reviewed the existing diff and collection configuration during finalization, but did **not** rerun the build, Vitest, TypeScript, or ESLint. The detailed OS/tool versions above describe the initial Codex environment; the later report explicitly identifies Windows PowerShell and Next.js **16.3.8**, without independently re-establishing every environment version or flag.
- **Production build completed, per developer report:** `pnpm build` reported `Compiled successfully`, `Completed runAfterProductionCompile`, and `Finished TypeScript`; it completed page-data collection, static generation **10/10**, and final page optimization, then displayed the route list including `/demo` and `/demo/research/[researchId]`. PowerShell returned to its prompt. These observations support completion of the build pipeline on the developer's Windows environment. A numeric `$LASTEXITCODE` was **not supplied**, so exit **0** is not independently recorded. No subsequent `BUILD_ID` or artifact inspection by Codex is claimed.
- **Windows build safety limit:** The log explicitly lists **`Environments: .env.local, .env`**. This was not the credential-free Codex copy. The report does not establish whether real DB operations, Sentry source-map/release uploads, or other external service communication occurred; it also does not prove secret isolation or the complete absence of external side effects. Completion of `runAfterProductionCompile` alone does not prove either that an upload occurred or that uploads were disabled. The earlier env-file/value-match checks apply only to the initial isolated run and must not be transferred to this Windows build. Build completion does not establish Vercel deployment success, DB connectivity, OAuth/AI behavior, or actual production operation.
- **Vitest collection defect and bounded fix:** The developer's first Windows test run traversed `build/production-verification/source/`, duplicating baseline unit-test collection and incorrectly collecting three copied Playwright suites: `build/production-verification/source/e2e/public-demo.spec.ts`, `build/production-verification/source/e2e-c2/authenticated-smoke.spec.ts`, and `build/production-verification/source/e2e-c2/chat.spec.ts`. It reported **1,952 tests passing with three suites failing**, not a passing regression suite. The existing exclusions `e2e/**` and `e2e-c2/**` covered the root directories, not those nested copies. The developer added **`"build/**"`** to `test.exclude`in`vitest.config.ts`, preserving `configDefaults.exclude`and both root E2E exclusions. Codex confirmed this exact one-line change is present. It removes generated-copy tests from Vitest collection while retaining the original unit suite; it does not modify or disable the Playwright tests themselves.`.gitignore`already excludes`/build`, so no additional ignore/configuration changes are included.
- **Developer-reported final checks after the exclusion fix:**

##### PR #5 / Developer-reported `pnpm test --run`

- **Reported Windows result:**
  **52/52 files, 976/976 tests passed**, duration **7.80s**
- **Evidence limit:**
  Supplied log: `Test Files 52 passed (52)` and `Tests 976 passed (976)`; not re-executed by Codex

##### PR #5 / Developer-reported `pnpm exec tsc --noEmit`

- **Reported Windows result:**
  **Passed**
- **Evidence limit:**
  Developer report; no new Codex execution or numeric exit-code transcript

##### PR #5 / Developer-reported `pnpm lint`

- **Reported Windows result:**
  **Passed**
- **Evidence limit:**
  Developer report; no new Codex execution or numeric exit-code transcript

- **Unresolved isolated-build issues:** Retain the initial **496-second / exit 1** interrupted run, approximately **6.1 GiB** worker working set, absent `BUILD_ID`, pnpm dependency-verification/permission diagnostics, and post-interruption PostCSS communication/timeout errors as historical evidence. The Windows completion report does not resolve their causes or demonstrate a successful build under the same isolation conditions. No application build defect has been established from that interrupted run, and no CSS, bundler, dependency, heap-limit, or safety-guard change is justified by this evidence alone.
- **Final scope and checks:** The final working-tree diff is limited to `vitest.config.ts` and `docs/planning/roadmap.md`; existing uncommitted changes were preserved, and branch/HEAD were not changed. Codex checked `git branch --show-current`, `git status --short`, `git diff --stat`, `git diff --check`, and the diff for both files; whitespace validation passed. No environment file was edited and no build/test command, DB/OAuth/AI/C2 operation, Sentry upload, production-server startup, deployment, commit, push, or PR creation was performed during this finalization. PR #5 is ready for review as a bounded collection fix and evidence update, with the outstanding verification limits stated explicitly.
- **Final completion decision:** **Production build verification remains unchecked**, and all other Phase 10 checkboxes remain unchanged. Windows build-pipeline completion and the corrected test results are developer-reported successes; they do not satisfy the full proposed criteria for an isolated build, recorded numeric build exit status, dependency reproducibility, and side-effect verification. A successful build under safe isolation conditions and the outstanding external-side-effect/deployment checks remain separate follow-up work; no additional build was needed merely to finalize this PR.

**PR #6 — Bounded Error Handling Review (2026-10-17, JST):** Started on `test/error-handling-review` at `589af59b50e86c90c9c33483b5a0f3dfa0831dc5` (PR #5 merged), with a clean working tree. Branch and HEAD were retained. This review uses the implemented Demo/SaaS boundaries in `docs/` and the existing mock-test patterns; it does not treat deferred functionality as implemented. No dependency, package-manager version, Vitest exclusion, authentication policy, or Sentry runtime configuration was changed.

- **Inventory before adding coverage:** The following categories distinguish existing evidence from gaps and reproduced failures. Existing tests were retained and strengthened where appropriate, rather than duplicated.

##### PR #6 / Demo configuration and missing resources

- **Error path:**
  Demo missing Workspace/Research; missing/blank/wrong configuration; Workspace/Organization name mismatch
- **Initial classification:**
  Existing tests confirm
- **Evidence / bounded outcome:**
  `src/lib/demo/read.test.ts` and `src/app/demo/pages.test.ts`: fail closed, no arbitrary fallback, unavailable public
  data invokes `notFound()`

##### PR #6 / Demo tenant and private fields

- **Error path:**
  Demo other-Workspace Research and related private fields
- **Initial classification:**
  Existing tests confirm
- **Evidence / bounded outcome:**
  Parent query matches Research ID and Demo Workspace ID before child reads; linked Sources/Tags are filtered; private
  User metadata is excluded from returned Comments and rendered pages

##### PR #6 / Demo DB exceptions

- **Error path:**
  Demo unexpected DB errors
- **Initial classification:**
  Existing tests confirm
- **Evidence / bounded outcome:**
  Reader tests cover Workspace/Research/Source/Finding/Comment/ResearchTag failures; both page tests rethrow reader
  failures without invoking `notFound()`

##### PR #6 / Public deployment locks

- **Error path:**
  Public deployment page/Auth.js/Chat locks, including session-shaped input and invalid Demo configuration
- **Initial classification:**
  Existing tests confirm
- **Evidence / bounded outcome:**
  `requireUser.test.ts`, `publicDeploymentRoutes.test.ts`, `publicDeploymentWrites.test.ts`, `chatRoutes.test.ts`:
  block protected work before auth/DB/providers; Demo reads remain independent of authentication

##### PR #6 / Authentication and Research refusal

- **Error path:**
  Normal unauthenticated requests and Research authorization refusal
- **Initial classification:**
  Existing tests confirm
- **Evidence / bounded outcome:**
  `requireUser` redirects to sign-in; actual guards exercised through `researchActions.test.ts` and
  `researchPages.test.ts` deny missing Research/non-members; create Actions test their caller contracts; Chat maps
  `ResearchAccessError` to fixed 404 bodies

##### PR #6 / Authentication and lookup exceptions

- **Error path:**
  Unexpected authentication and Action Research lookup errors
- **Initial classification:**
  Implementation present, test gap
- **Evidence / bounded outcome:**
  Added `requireUser` auth-exception propagation and expanded the existing ten-Action DB-failure matrix from
  membership lookup to Research lookup as well

##### PR #6 / Current Workspace DB failures

- **Error path:**
  Current Workspace selection after cookie-based membership/Workspace DB failure
- **Initial classification:**
  Reproduced behavior defect
- **Evidence / bounded outcome:**
  `requireCurrentWorkspace` caught all exceptions and returned another accessible Workspace; two new tests rejected
  that false success before the fix

##### PR #6 / Chat status and rejection effects

- **Error path:**
  Chat Demo 404, list/message 401, denied Research/Conversation 404, invalid fields 400, rate limit 429 with
  `Retry-After`
- **Initial classification:**
  Existing tests confirm
- **Evidence / bounded outcome:**
  Existing exact status/body tests retained; rejection tests now also check no Conversation create/update, Message
  create or usage-event write

##### PR #6 / Chat handler boundaries

- **Error path:**
  Chat Conversation create/detail 401; unexpected auth/access/Conversation lookup or create errors; rate-limit/context
  exceptions; vanished context
- **Initial classification:**
  Implementation present, test gap
- **Evidence / bounded outcome:**
  Added representative handler-boundary tests: exact error identity propagates, failed creation does not return 201,
  vanished context returns the existing Research 404, downstream writes/AI are absent

##### PR #6 / Malformed and empty JSON

- **Error path:**
  Chat malformed/empty JSON
- **Initial classification:**
  Reproduced behavior defect
- **Evidence / bounded outcome:**
  New tests with `"{"` and an empty body initially threw `SyntaxError` instead of returning the existing
  invalid-request 400 contract

##### PR #6 / Chat generation and persistence failures

- **Error path:**
  Chat retrieval/generation startup/usage write/AI-message write failures and incomplete/blank generated responses
- **Initial classification:**
  Existing tests confirm
- **Evidence / bounded outcome:**
  Existing `chatRoutes.test.ts` characterizes failures and retained writes: retrieval failure precedes persistence;
  later generation failures can retain the accepted user message; usage-write and AI-message-write failures propagate

##### PR #6 / Global error and Sentry capture

- **Error path:**
  Global error rendering and configured Sentry capture in Demo vs normal SaaS
- **Initial classification:**
  Implementation present, test gap
- **Evidence / bounded outcome:**
  Added static rendering and explicitly invoked registered-effect tests with a mocked SDK; added client/server/edge
  init-option tests with absent/synthetic DSN in both deployment modes

##### PR #6 / C2 Sentry and enqueue reporting

- **Error path:**
  C2 Sentry isolation, tracing sample configuration and best-effort index-enqueue reporting
- **Initial classification:**
  Existing tests confirm
- **Evidence / bounded outcome:**
  Existing `sentry-config.test.ts`, C2 service/client/build isolation tests and `request-research-index.test.ts`
  retained; no live Sentry delivery

##### PR #6 / Runtime and delivery limits

- **Error path:**
  Actual Next.js production error responses, browser mounting/recovery, real DB/provider/stream failures and actual
  Sentry delivery/redaction
- **Initial classification:**
  Cannot confirm in this review
- **Evidence / bounded outcome:**
  Offline mocks/source inspection only; no production build, live server, browser or external-service verification

- **Caller semantics:** `WorkspaceAccessError` and `ResearchAccessError` are internal exceptions, not HTTP responses. `requireResearchAccess` translates only a missing membership's `WorkspaceAccessError`; DB errors retain their identity. Normal pages use the Research access exception to call `notFound()`. Actions either return `{ error: "Research not found." }` or throw the existing generic Research error, while unexpected errors propagate. Chat returns the fixed JSON 404 only for `ResearchAccessError`. `requireUser` retains its sign-in redirect in normal mode and its earlier deployment refusal in Demo mode. Research access depends on membership in the Research's actual Workspace, not solely on the currently selected Workspace; membership in multiple Workspaces is not itself an access violation. Current Workspace switching/admin/settings callers were source-inspected, not exhaustively tested here.

- **Minimal fixes, demonstrated before modification:** (1) Chat JSON parsing now catches only `SyntaxError` and returns the existing `400` required-fields body. A separate body-read failure test proves other exceptions still propagate. Auth/access checks still precede parsing, and invalid input causes no Conversation lookup, rate-limit consumption, retrieval or persistence. (2) `requireCurrentWorkspace` now falls back only for `WorkspaceAccessError`, propagating membership and selected-Workspace DB exceptions. Tests preserve selected-Workspace success, absent-cookie/non-member/missing-Workspace fallback, and onboarding when there is no accessible Workspace. No authorization guard was relaxed. The planning code snapshot `docs/planning/requireCurrentWorkspace.ts` still shows an older selection implementation without cookies; it differs from current source and is not used as a new runtime specification or silently rewritten.

- **Added/extended offline coverage:** **53 additional cases**, from **52 files / 976 tests** at the baseline to **55 files / 1,029 tests**. `chatRoutes.test.ts` adds 21 cases through new boundary tests and expansion of its existing invalid-field test; `requireUser.test.ts` adds 1; the existing ten-Action matrix adds 10 Research lookup failures. New files add global-error presentation/capture (2), Sentry runtime options (12), and current Workspace error/fallback behavior (7). Existing Demo coverage was sufficient and received no duplicate tests. `global-error.tsx` is unchanged: its real NextError rendering omits the supplied synthetic exception message, stack and digest, and the registered effect passes the exception to the mocked SDK. This simulates the effect explicitly; it is not a browser lifecycle/recovery test.

- **Sentry and information boundaries:** Demo and normal SaaS share DSN-controlled Sentry runtime delivery (`enabled: Boolean(dsn)`) and the same restricted `dataCollection` settings; Public Demo mode alone does not disable Sentry. Existing C2 adapters/runtime checks provide a separate isolation boundary. Capture invocation is distinct from actual delivery. The global effect reports the supplied exception; its message is not application-redacted. Existing configuration does not guarantee redaction of arbitrary exception messages, manual extras, console/DOM breadcrumbs or every URL. Private Research content/credentials must not be inserted into those fields. Installed Next.js 16.3.8 error-handling source was inspected for framework propagation/production sanitization; tests do not prove deployed HTML/RSC/HTTP sanitization or a custom 500 JSON contract, and no blanket catch was added to suppress unexpected errors.

- **Validation:** Node.js **24.16.0**, pnpm **12.9.1**, Next.js **16.3.8**. Initial restricted Vitest startup failed with `spawn EPERM` in esbuild before tests ran. The same offline mock tests were then run with subprocess-capable execution: the initial Chat regression run failed **2/32** as expected; the current-Workspace regression run failed **2/7** as expected. After both minimal fixes and the final no-write assertions, `pnpm test --run` passed **55 files / 1,029 tests**, exit **0**; `pnpm exec tsc --noEmit`, `pnpm lint` and `git diff --check` all exited **0**. Individual no-index checks for the three new files emitted no whitespace-error diagnostics (exit **1** for added-file differences); Git also emitted LF-to-CRLF conversion notices. No successful test execution is inferred from the initial EPERM failure. `build/**`, `e2e/**` and `e2e-c2/**` remain excluded from Vitest. A production build is unnecessary for these bounded parser/catch changes and was not run; PR #5's env-loading/Sentry upload risks were retained as constraints.

- **Safety and limits:** Only offline tests, static checks and local source inspection were executed. No production/C2 PostgreSQL connection, migration, seed, data/fixture mutation, server/container startup, OAuth, authentication-session acquisition/storage/use, Gemini/other AI API, Upstash, Inngest Cloud, Sentry event/upload, Public Demo request/write, browser E2E, deployment, commit, push or PR creation was performed. Synthetic fixtures, mocked SDK calls and existing C2 script unit tests do not establish live integration behavior or complete outbound-packet auditing.

- **Completion decision / next work:** **Error handling review remains unchecked.** Phase 10 does not define its full acceptance criteria, and all other checkboxes remain unchanged. Define those criteria before completing the item. Remaining work includes real production-mode sanitized responses and browser recovery under separately approved safe isolation, broader Action/Workspace/admin/onboarding and Conversation list/detail persistence-error coverage, post-response streaming/abort/provider failures, concurrency/deletion races and observability redaction/deduplication. Existing citation-only output can still become an empty persisted AI message after validation (already characterized by a baseline test); this content-quality limitation was not introduced or changed here. This review neither adds retries/transactions nor proves that all later failures roll back accepted user messages or usage records.

**PR #7 — Bounded Authorization Boundary Review (2026-10-17, JST):** Started on `test/authorization-boundary-review` at `5072bbca97f60e4b06cfe0edd88fb42b2e0ecb5c` (PR #6 merged), with a clean working tree. Branch and HEAD were retained. Scope: the Organization/Workspace access and admin guards, Research access guard, both member-role Server Actions, Workspace switching, and the existing role/Research/Public Demo authorization tests. The implemented rules in product definition §9.6, the data model and Phase 7 are the authority; invitation, removal and advanced permission proposals remain outside this review.

- **Inventory before adding coverage:**

##### PR #7 / Workspace role caller contract

- **Authorization case:**
  Workspace non-admin guard refusal, missing target membership, last-ADMIN refusal and demotion with another ADMIN
  remaining
- **Initial classification:**
  Existing tests confirm the Action contract
- **Evidence / bounded result:**
  Four cases in `workspaceMemberRole.test.ts`, but both `requireUser` and `requireWorkspaceAdmin` were mocked; they
  did not prove the actual admin/access guard chain

##### PR #7 / Organization role management

- **Authorization case:**
  Organization role management in normal SaaS mode
- **Initial classification:**
  Test gap
- **Evidence / bounded result:**
  The baseline had only its Public Demo entry-refusal test, not normal-mode admin/target lookup or mutation coverage.
  The Phase 7 summary broadly mentions Organization role-management tests; this inventory records that coverage limit
  without rewriting the historical summary

##### PR #7 / Real guard and tenant boundaries

- **Authorization case:**
  MEMBER/non-member refusal using real guards; ADMIN from another Organization/Workspace; independence of the two role
  scopes; exact target read/update and admin-count scoping; membership/count DB exceptions
- **Initial classification:**
  Test gap
- **Evidence / bounded result:**
  Added direct Action tests with real `requireUser` and access/admin guards, synthetic auth results, and
  predicate-aware DB mocks

##### PR #7 / Research guard coverage

- **Authorization case:**
  Research membership/missing-resource/unauthenticated refusal, authorized mutations, unexpected Research/membership
  lookup exceptions
- **Initial classification:**
  Existing tests confirm
- **Evidence / bounded result:**
  `researchActions.test.ts`: ten Actions × six cases, with real Research/Workspace access guards and mocked
  `requireUser`/DB. No duplicate cases added

##### PR #7 / Research creation callers

- **Authorization case:**
  Research creation-related Action refusal/error propagation and authorized authorship/Workspace Tag scoping
- **Initial classification:**
  Existing tests confirm the caller contract
- **Evidence / bounded result:**
  `researchCreateActions.test.ts`: six Actions × three refusal/error cases plus six authorized cases;
  `requireResearchAccess` is mocked here, so this is not independent proof of its implementation

##### PR #7 / Public Demo refusal

- **Authorization case:**
  Public Demo direct Action refusal before auth/private queries/writes/cookies/index enqueue
- **Initial classification:**
  Existing tests confirm
- **Evidence / bounded result:**
  Fourteen existing cases in `publicDeploymentWrites.test.ts` retained; added explicit
  no-`refresh`/no-`revalidatePath` assertions to the same cases

##### PR #7 / Workspace switching

- **Authorization case:**
  Workspace switching in normal SaaS mode
- **Initial classification:**
  Test gap
- **Evidence / bounded result:**
  Added real-guard direct calls for unauthenticated refusal, another Workspace's ADMIN lacking target membership, DB
  failure propagation and an allowed MEMBER switch

##### PR #7 / Selected Workspace revalidation

- **Authorization case:**
  Selected-Workspace cookie revalidation/fallback and DB exception propagation
- **Initial classification:**
  Existing tests confirm
- **Evidence / bounded result:**
  The seven `requireCurrentWorkspace.test.ts` cases from PR #6 remain unchanged; they test selection, not the switch
  Action

##### PR #7 / Runtime defect result

- **Authorization case:**
  Runtime authorization defect
- **Initial classification:**
  None reproduced
- **Evidence / bounded result:**
  All bounded new cases passed against the unchanged application implementation; no guard, Action, role model or
  Public Demo policy was modified

##### PR #7 / Concurrency and runtime limits

- **Authorization case:**
  Concurrent membership changes, real DB/Next.js transport/browser enforcement, OAuth, live services and exhaustive
  application-wide authorization
- **Initial classification:**
  Out of scope / unverified
- **Evidence / bounded result:**
  Offline mocks and source inspection only; no security or integration completeness claim

- **Implemented permission model:** Organization ADMIN is derived only from `Membership(userId, organizationId)` and manages that Organization's member roles. Workspace ADMIN is derived only from `WorkspaceMembership(userId, workspaceId)` and manages that Workspace's member roles. An ADMIN in the opposite scope cannot elevate a MEMBER or non-member; an ADMIN in one Organization/Workspace cannot use that membership against another. A local ADMIN can act even with a MEMBER role in the opposite scope. Target lookup and mutation use the requested scope ID plus target User ID, and the last-admin count uses that scope ID. Tests cover self-demotion of the last ADMIN while an unrelated tenant still has an ADMIN, and permit demotion when another local ADMIN remains. Research access and Workspace selection require Workspace membership, including MEMBER; they do not require Organization ADMIN or Workspace ADMIN. Access to multiple Workspaces is allowed; a different current-Workspace cookie is not itself a reason to deny a permitted explicit target ID.

- **Added/strengthened coverage:** **24 additional cases**, from **55 files / 1,029 tests** to **56 files / 1,053 tests**. The four existing Workspace role cases were moved and strengthened in `memberRoleActions.test.ts`, which runs twelve cases per scope: **12 Organization cases + 8 additional Workspace cases**, with all 24 exercising the real guard chains. `switchWorkspace.test.ts` adds **4** cases. The same fourteen Public Demo cases now also assert absence of cache refresh/revalidation, without increasing their count. Rejected role calls check no mutation, cookie access, `revalidatePath` or `refresh`; failed switch calls check no cookie access/write or refresh/revalidation. Missing target User IDs and targets belonging only to another scope both return the existing `Member not found.` state. Unexpected actor lookup, target lookup and admin-count exceptions retain their exact identity and cause no effects. Authorized promotion/demotion checks bind the update to the exact target predicate and revalidate only the relevant settings path. The successful MEMBER switch verifies that membership is read before setting the cookie and refreshing.

- **Fixes and specification differences:** No application bug was reproduced and no application implementation was changed. No runtime permission-model conflict with the cited current specifications was found within this scope. This test-only review does not redefine role inheritance, introduce per-Research ownership restrictions, or treat historical/planning snapshots as current runtime requirements.

- **Validation:** Node.js **24.16.0**, pnpm **12.9.1**, Next.js **16.3.8**. The initial restricted targeted Vitest attempt failed during config loading with esbuild `spawn EPERM`, before any tests executed. The same offline command with subprocess-capable execution passed the four baseline files (**102 tests**); the two new/reworked suites passed **28 tests**. After the final Public Demo assertions, full `pnpm test --run` passed **56 files / 1,053 tests**, exit **0**; `pnpm exec tsc --noEmit`, `pnpm lint` and `git diff --check` exited **0**. Separate no-index checks for both new files reported no whitespace errors (exit **1** reflects added-file differences); Git emitted LF-to-CRLF conversion notices. No test/config/dependency exclusions or package-manager versions were changed. A production build was unnecessary and was not run; PR #5's environment-loading and Sentry upload risks remain constraints.

- **Safety / limits / completion decision:** Only local source inspection, offline Vitest mocks, TypeScript, ESLint and diff checks were performed. No production/C2 DB connection, migration, seed, real data/fixture mutation, OAuth, session acquisition/storage/use, real AI API, Upstash, Inngest Cloud, Sentry delivery/upload, server/container startup, C2/browser E2E, deployment, commit, push or PR creation was performed. Synthetic auth-shaped values are not real sessions, and offline tests of C2 scripts are not C2 browser runs. The last-admin tests establish sequential Action behavior only: the implementation reads/counts before a separate update, so concurrent demotions, membership revocation between authorization and mutation, deletion races and DB isolation/atomicity remain unverified. A separately scoped review with controlled concurrency and DB isolation should define and verify atomic guarantees before claiming them. The full Phase 10 acceptance criteria are undefined; **Authorization tests remains unchecked**. Broader endpoint/settings-read/onboarding coverage, real Next.js Server Action transport behavior and the above concurrency boundaries remain follow-up work.

**PR #8 — Bounded Input Validation Review (2026-10-19, JST):** Started on `test/input-validation-review` at the requested baseline `ecd376685c3891c817e4ee3940164ad5f91866e3`, with a clean `git status --short`. Branch and HEAD were retained. Scope: the seven shared Research validation modules, their eleven create/update Actions, initial Workspace onboarding, both member-role Actions, and existing authentication/authorization/Public Demo tests. Product definition §9.6–9.7, data model §7.3–7.9 and directory architecture describe the implemented boundaries; future invitation, metadata, permission and structured-Finding proposals are not new input requirements. No application/specification conflict was found in the reviewed contracts.

- **Inventory before adding coverage:**

##### PR #8 / Validation / Research update and child mutations

- **Case:**
  Research updates and child mutations: missing Research, missing membership, unauthenticated calls, unexpected
  Research/membership lookup exceptions and authorized writes
- **Initial classification:**
  Existing tests confirm
- **Evidence / result:**
  `researchActions.test.ts`: ten Actions × six cases with real Research/Workspace guards and mocked User/DB I/O;
  retained unchanged

##### PR #8 / Validation / Research creation callers

- **Case:**
  Comment/Finding/Source/Tag creation, Tag detachment and status change: auth/access refusal, unexpected access errors
  and authorized writes
- **Initial classification:**
  Existing tests confirm caller behavior
- **Evidence / result:**
  `researchCreateActions.test.ts`: six Actions × three refusals plus six successes; its User/Research guards are
  mocked, so these do not independently prove the guards

##### PR #8 / Validation / Onboarding

- **Case:**
  Onboarding provisioning, already-provisioned redirect, both names empty, transaction failure
- **Initial classification:**
  Existing tests confirm
- **Evidence / result:**
  Four original `createInitialWorkspace.test.ts` cases retained

##### PR #8 / Validation / Roles and Public Demo

- **Case:**
  Organization/Workspace roles and admin boundaries; fourteen direct Public Demo write refusals
- **Initial classification:**
  Existing tests confirm
- **Evidence / result:**
  PR #7's 24 role cases and fourteen Demo cases retained; existing Chat malformed-JSON and authorization cases were
  not duplicated

##### PR #8 / Validation / Shared input contracts

- **Case:**
  Shared text lengths, trim/null/empty behavior, invalid URL/status, normalization before persistence, invalid
  role/name handling and no downstream effects
- **Initial classification:**
  Implementation present, test gap
- **Evidence / result:**
  Added schema tests and direct Action tests below; role/onboarding schemas stay private and are exercised through
  their Actions

##### PR #8 / Validation / Additional Demo refusals

- **Case:**
  Six further Public Demo Actions: create Source/Finding/Comment/Tag, update Conclusion/status
- **Initial classification:**
  Implementation present, test gap
- **Evidence / result:**
  Added to the existing real-`requireUser` Demo matrix, with valid input reaching the deployment refusal

##### PR #8 / Validation / Runtime defect result

- **Case:**
  Runtime validation defect
- **Initial classification:**
  None reproduced
- **Evidence / result:**
  All final contract tests pass against unchanged application code. Seven initial supplementary-character assertions
  failed because the new tests incorrectly assumed UTF-16 length; installed Zod source established the actual
  behavior, and only those test expectations were corrected

##### PR #8 / Validation / Transport and live limits

- **Case:**
  Live Server Action transport, browser forms/links, real DB semantics, concurrency and all application inputs outside
  this scope
- **Initial classification:**
  Unverified
- **Evidence / result:**
  Offline mocks and local source inspection only

- **Schema → Action inventory (current behavior, not new requirements):** All Actions convert `FormData.get()` with `String(value ?? "")` before parsing. A missing form field therefore differs from a missing property passed directly to a schema. Text properties below are required at the schema object level; only Research description accepts `null`. Length limits are applied after the stated transforms.

##### PR #8 / Schema / Research title and description

- **Schema / fields:**
  `src/types/research.ts`: title, description
- **Current input contract:**
  Title: trim, 1–200. Description: trim, 0–2000 or null, not an optional schema property. Both Actions convert
  missing/empty/whitespace description to null. Internal newlines are preserved
- **Actions / effects after validation and authorization:**
  `createResearch`: User → current Workspace → create with actor/Workspace → index → redirect. `updateResearch`: User
  → Research access → update → index → redirect

##### PR #8 / Schema / Source title and URL

- **Schema / fields:**
  `source.ts`: title, URL
- **Current input contract:**
  Title: trim, 1–200. URL: required `z.url()`, max 2048; Actions trim before parsing. Installed `z.url()` also trims
  and strips tab/CR/LF, retaining spelling rather than canonicalizing via `URL.href`
- **Actions / effects after validation and authorization:**
  `createSource`: User → Research access → create → redirect. `updateSource`: deployment guard at entry → validation →
  child lookup → User/Research access → update → redirect. Neither indexes

##### PR #8 / Schema / Finding content

- **Schema / fields:**
  `finding.ts`: content
- **Current input contract:**
  Trim, 1–10000. Both Actions replace CRLF and lone CR with LF before schema parsing/length checks; the schema alone
  preserves internal newlines
- **Actions / effects after validation and authorization:**
  `createFinding`, `updateFinding`: validate → User/Research access → write → index → redirect; update additionally
  performs deployment refusal at entry and child lookup before User/access

##### PR #8 / Schema / Comment content

- **Schema / fields:**
  `comment.ts`: content
- **Current input contract:**
  Trim, 1–5000. Both Actions normalize CRLF/CR to LF before parsing; the schema alone preserves internal newlines
- **Actions / effects after validation and authorization:**
  `createComment`, `updateComment`: validate → User/Research access → write → redirect; create binds the author to the
  actor. Update has the same entry deployment guard/child lookup ordering as Finding. Neither indexes

##### PR #8 / Schema / Tag name

- **Schema / fields:**
  `tag.ts`: name
- **Current input contract:**
  Trim, 1–50; blank invalid; no internal newline conversion
- **Actions / effects after validation and authorization:**
  `createTag`: User/Research access → look up normalized name in that Research's Workspace → attach existing Tag or
  transactionally create Tag + association → redirect. No index

##### PR #8 / Schema / Conclusion

- **Schema / fields:**
  `conclusion.ts`: conclusion
- **Current input contract:**
  Trim, 0–5000, not nullable at schema level. Action normalizes CRLF/CR to LF; missing/blank clears stored value to
  null
- **Actions / effects after validation and authorization:**
  `updateConclusion`: User/Research access → Research update → index → redirect

##### PR #8 / Schema / Research status

- **Schema / fields:**
  `status.ts`: status
- **Current input contract:**
  Exactly `IN_PROGRESS`, `COMPLETED`, `ARCHIVED`; no trimming/case conversion. No Conclusion requirement or transition
  restriction
- **Actions / effects after validation and authorization:**
  `updateResearchStatus`: User/Research access → update → redirect; no index

##### PR #8 / Schema / Onboarding names

- **Schema / fields:**
  Private onboarding schema: organizationName, workspaceName
- **Current input contract:**
  Each trim, 1–100, required; no internal newline conversion
- **Actions / effects after validation and authorization:**
  `createInitialWorkspace`: User → accessible-Workspace lookup → redirect if already provisioned; otherwise
  transactionally create Organization/Workspace and ADMIN memberships → cookie → redirect

##### PR #8 / Schema / Organization and Workspace roles

- **Schema / fields:**
  Private Organization/Workspace role schemas
- **Current input contract:**
  Exactly `ADMIN`, `MEMBER`; no trimming/case conversion
- **Actions / effects after validation and authorization:**
  `updateOrganizationMemberRole`, `updateWorkspaceMemberRole`: User → scoped admin guard → target lookup → no-op or
  last-admin check as needed → update → revalidate settings path

- **Length and URL findings:** Installed **Zod 4.6.5**, `v4/core/checks.js` (`$ZodCheckMaxLength`) and `util.codePointLength` count string code points when needed; supplementary-character tests characterize that installed behavior rather than adding an application counter or byte limit. ASCII fixtures cover max−1, max and max+1 without ambiguity. Local `z.url()` checks and `v4/core/schemas.js` inspection confirmed broad URL parsing: HTTP(S), FTP and mailto are accepted; a local probe also accepted `javascript:alert(1)`. Shared Research display and AI citation components pass stored Source URLs to links. No HTTP(S)-only protocol/hostname policy is currently specified, and this review does not silently introduce one or claim that link navigation is safe for every accepted scheme. Define that policy and assess each renderer/browser boundary in a separately scoped follow-up before changing the acceptance contract. No URL was navigated or fetched.

- **Error and execution-order contracts:** Invalid Research create/update throws an `Error` with the first schema issue; the other reviewed Actions return their existing `{ error }` states. Source/Finding/Comment/Tag/Conclusion return the first schema issue; status returns `Invalid research status.`, onboarding returns `Enter an organization name and workspace name.`, and roles return the scoped invalid-role message. Validation generally precedes User/access checks; update Source/Finding/Comment additionally refuses Public Demo mode at entry, before parsing or child lookup. Other reviewed Actions reach the Demo guard via real `requireUser` after valid parsing; invalid input can return/throw its validation error first without writing. These orders were not changed. Auth redirects, expected access-error translations, unexpected guard exceptions and persistence-error states/exceptions remain distinct. Persistence exceptions from Research create/update and Conclusion propagate; the other Research Actions return their existing save-error states. New save-failure tests check no index enqueue or redirect; they do not prove real DB rollback.

- **Added coverage: 202 cases**, from PR #7's recorded **56 files / 1,053 tests** to **58 files / 1,255 tests**. The five baseline suites were executed before additions: **126/126** passed. New `src/types/research/validation.test.ts` adds **119** cases: all seven text fields' missing/null/blank/minimum/max−1/max/max+1/trim/newline/supplementary-character/type contracts, Source URL invalid inputs and length boundaries, all three statuses and invalid enum values, and nullable-versus-optional Research description. New `src/auth/inputValidationActions.test.ts` adds **49** direct-call cases: eleven Actions × invalid input/normalized persistence/save failure, six missing-or-blank Research description cases, three Conclusion clearing cases, three pre-limit CRLF normalization cases, missing Research title, File-valued Source URL rejection after current coercion, unauthenticated Research creation and current-Workspace selection failure. User and Research/Workspace access guards are real; auth, DB, Workspace selection, indexing and navigation I/O are mocked. Existing Onboarding tests add **14** cases for each name independently (missing/blank/101 refusal and trimmed lengths 1/99/100). Existing real-guard member-role tests add **14** invalid-role cases. Existing Public Demo tests add the **6** valid-input refusals above, with no duplicate cases for the previously covered Actions.

- **Side effects and guards:** All eleven invalid-input Action cases assert no DB create/update/delete/transaction, index request or redirect and no auth/Workspace/private query. Invalid onboarding additionally checks no membership/provisioning/cookie effects; invalid roles check no membership access/update, cookies, cache revalidation or refresh. Successful Research Action cases assert the exact normalized payload, relevant scope/author, authorization before persistence, indexing only for indexed fields after persistence, and the detail redirect. Tag creation covers the new-Tag transaction path; the existing test already covers reusing a Workspace Tag. Demo refusals use real `requireUser` and check no auth/private query/write/cookie/index/cache effects. Existing real-guard auth/access tests were rerun; no guard, permission model, validation order or read-only Demo policy was modified.

- **Validation:** Node.js **24.16.0**, pnpm **12.9.1**, Next.js **16.3.8**, Zod **4.6.5**. Initial restricted baseline Vitest startup failed with esbuild **`spawn EPERM`**, before tests ran. The same offline tests then ran successfully in the approved subprocess-capable execution environment. After correcting the test-only counting assumption, related tests passed **7 files / 328 tests**; full `pnpm test --run` passed **58 files / 1,255 tests**, exit **0**. `pnpm exec tsc --noEmit`, `pnpm lint` and `git diff --check` passed, exit **0**. No dependencies, package-manager versions, Vitest exclusions or configuration changed. Production build was unnecessary and not run; PR #5's environment/Sentry upload risks remain constraints.

- **Safety / limits / completion decision:** Only local inspection, offline mock tests and static checks were performed. No production/C2 database connection, migration, seed, real-data change, session acquisition/use, Google OAuth, real AI API, Upstash, Inngest Cloud, Sentry delivery/upload, browser E2E, C2/server/container startup, deployment, commit, push or PR creation was performed. Offline C2/Playwright script unit tests in the full suite do not run browser E2E or prove live isolation. Non-string form input was characterized only for a Source URL File; other fields retain their existing `String(...)` coercion and were not assigned a new file-rejection policy. Actual transaction rollback, concurrent changes, payload/transport size limits, duplicate form keys, Unicode grapheme/combining-sequence UX and browser behavior remain unverified. No application bug was reproduced, so there is no implementation fix. **Validation tests remains unchecked** because Phase 10's full acceptance criteria are undefined; all other Phase 10 checkboxes remain unchanged. Next work: define those criteria and the Source protocol policy, then separately scope the remaining transport/form/concurrency boundaries under suitable isolation.

**PR #9 — Source URL Security Hardening (2026-10-19, JST):** Started on `fix/source-url-protocol-validation` at the requested baseline `05e4b71316b787b8600ae8ee883899c8edf898cf` (PR #8 merged), with a clean `git status --short`. Branch and HEAD were retained. This entry supersedes PR #8's undecided Source protocol policy; PR #8's record remains a historical description of its implementation and verification. No Phase 10 checkboxes were changed.

- **Decision / minimal implementation:** Source URL input accepts HTTP and HTTPS; `javascript:`, `data:`, `file:`, `ftp:`, `mailto:`, `tel:` and all other protocols are rejected. `src/types/research/source.ts` now uses `z.url({ protocol: /^https?$/, error: "Please enter a valid URL" })` with the existing 2048-character maximum. Source title validation, URL trim and spelling preservation, Action error/redirect contracts, authorization and Public Demo guard order are unchanged. No canonicalization, dependency, UI, DB schema, migration, seed or API response change was made. Data model §7.4 records the input policy.

- **Installed API verification:** Node.js **24.16.0**, pnpm **12.9.1**, Next.js **16.3.8**, Zod **4.6.5**. Local `node_modules/zod/v4/classic/schemas.d.ts` and `v4/core/schemas.js` plus offline string probes verified the `protocol` and `error` options: parsed protocols are checked without the trailing colon; mixed-case HTTP(S), `http://localhost:3000`, paths/queries/fragments and original spelling are retained. Both malformed URLs and unsupported protocols use the existing error message. Installed Zod trims surrounding whitespace and removes internal ASCII tabs/CR/LF without returning canonical `URL.href`; those behaviors are retained. `z.httpUrl()` was not used because the local probe rejected `localhost` through its additional hostname restriction. No URL was fetched or navigated.

- **Regression evidence / coverage:** Before edits, the two existing suites passed **168/168** tests (schema **119**, Actions **49**). Updated FTP/mailto acceptance expectations and added HTTP(S), localhost, mixed-case, query/fragment, six unsupported protocols, unchanged error messages, whitespace/spelling and trimmed max/max+1 checks; PR #8's max−1/max/max+1 and title tests remain. Schema suite: **129** tests (**+10 net**). Direct Action suite: **71** tests (**+22**): two Actions × six protocol refusals, three successful HTTP(S)/localhost writes and two Public Demo cases. Before the one-line schema fix, the revised suites reproduced **19 failures / 200 tests** (six schema refusals, twelve Action refusals and createSource's newly invalid Demo input returning an input error before requireUser). After the fix, related schema/Action/auth/access/Demo suites passed **5 files / 304 tests**.

- **Action effects and guard order:** Each new protocol refusal asserts `{ error: "Please enter a valid URL" }`, no auth/current-Workspace/private model lookup and no create/update/delete/transaction, redirect or indexing. Authorized HTTP(S)/localhost success checks exact trimmed persistence payloads, Research/Workspace authorization before saving and the existing `/research/<id>` redirect, without indexing. Public Demo valid input remains refused before auth/queries/writes; invalid createSource input returns its validation error before requireUser, while updateSource refuses at entry before validation or child lookup. Existing real-guard authentication/authorization/Public Demo tests also pass; all external boundaries in these direct-call tests are mocked.

- **Tracked data audit (static only):** Literal Source URLs in `src/prisma/seeds/development.ts` (**2**) and `public-demo.ts` (**12**), `src/lib/demo/test-fixtures.ts` (**1**), `scripts/c2-fixture-plan.ts` (**1**) and `e2e-c2/conversation-mocks.ts` (**1**) are all HTTPS. The tracked AI evaluation dataset `evals/ai-chat/cases.json` contains **19** URL fields, all HTTP(S). Repository searches of Source writes, URL literals and unsupported schemes found no non-HTTP(S) Source seed/fixture value; unsupported examples occur in rejection tests. Seed/fixture modules were read as text, not executed. No tracked data needed modification. This finding does **not** establish the contents of any real database.

- **Existing records / display follow-up:** The schema protects new/edited Source input only; an existing unsupported URL stays stored and also prevents saving a title-only edit until the user supplies an allowed URL. No real DB was connected to, searched or repaired. `research-detail-content.tsx` passes stored URLs directly to Next Link in both the Sources list and Finding supporting sources; the same component serves authenticated and public Demo Research detail. `research-ai-panel.tsx` passes supporting Source URLs to an anchor for citations in desktop/mobile AI views. Demo reads, AI context/retrieval and workspace-source resolution carry URL strings without this schema. Reproduction condition for the residual display exposure: a pre-existing unsupported Source URL is read by one of these views, or its Source ID is resolved for a displayed citation. Input hardening does not enforce an HTTP(S) display policy there. Framework/browser handling may block particular schemes; exploitability and navigation behavior were not tested and are not claimed. Separately scoped defense should apply a parsed HTTP(S) allowlist at these link boundaries, render disallowed values as non-link text, and add offline renderer tests; any audit/remediation of existing DB records needs its own approved scope. No display guard/refactor or automatic URL rewriting was added here.

- **Final validation:** Initial restricted baseline Vitest startup failed before tests with esbuild **`spawn EPERM`**; the same offline tests were rerun successfully in the approved subprocess-capable environment. Full `pnpm test --run`: **58 files / 1,287 tests passed**, exit **0** (**+32** over PR #8's developer-provided 1,255-test comparison, with the 168 relevant baseline tests independently rerun here). `pnpm exec tsc --noEmit`, `pnpm lint` and `git diff --check`: exit **0**. No dependency, package-manager version, test exclusion or configuration changed. Git emitted only LF-to-CRLF conversion notices. `pnpm build` was unnecessary and not run, retaining PR #5's environment-loading/Sentry upload constraints.

- **Safety / merge limits:** Work was limited to offline mock tests, string-only URL probes and static source inspection. No production/C2 DB connection, migration, seed, real-data operation, Google OAuth/real session operation, real AI API, Upstash, Inngest Cloud, Sentry delivery/upload, external URL access validation, browser E2E, server/container startup, deployment, commit, push or PR creation was performed. Full-suite C2/Playwright script unit tests use mocks and do not run browser E2E. Real DB contents, actual browser/framework link handling and live Server Action transport remain unverified. Merge this as input protocol hardening only; existing-record audits, display guards and unrelated SSRF/hostname policies remain separate work.

### Phase 11 — Deployment

**Goal:** Deploy the portfolio version and verify production behavior.

**Individual Demo deployment policy (2026-10-29 JST):** Verify the configuration,
secrets, access controls and data boundaries required by the features actually
published. Prioritize detection of material failures and an executable way to
stop admission or disable the affected feature. Review logs/errors and security
against those exposed risks; comprehensive commercial SaaS operations, continuous
staffing and advanced monitoring are not universal prerequisites. Use identified
Vercel Preview artifacts and real-browser checks according to release risk, and
record unverified areas explicitly. AI-provider setup and public-AI operational
checks are required before enabling Chat, not before an otherwise safe read-only
Demo release. Existing deployment achievements below retain their original scope;
this policy does not complete the remaining reviews or authorize a deployment.

- [x] Configure production environment
- [x] Configure production database
- [x] Apply production migrations
- [x] Seed curated Demo data
- [ ] Configure AI provider
- [x] Configure environment variables
- [x] Deploy to Vercel
- [x] Verify production build
- [x] Verify Demo Workspace
- [x] Verify read-only behavior
- [ ] Review logs and errors
- [ ] Perform security review

**Operations record (2026-10-27 JST; user manual report, not independently verified):**
Vercel Functions was changed from `iad1` (US East) to `hnd1` (Tokyo).
Prisma Postgres is in Tokyo (`ap-northeast-1`); the Demo Chat Upstash Redis
instance is also in Tokyo (`ap-northeast-1`), on the Free Tier. The user reported
a substantial perceived improvement in Public Demo page loading speed. No
quantitative performance measurements have been performed; no measured latency
or improvement percentage is established. Groq communication speed and security
tests against the real Redis service remain unverified. This report does not
establish completion of Phase 10 or Phase 11 tasks.

---

### Phase 12 — Documentation & Portfolio Presentation

**Goal:** Make the project understandable as a portfolio artifact.

**Documentation priority policy (2026-10-29 JST):** Completing every document or
directory is not a prerequisite for all feature development or publication.
Prioritize:

1. Information needed to use, configure and safely operate the published feature,
   including public scope, secret handling and shutdown instructions.
2. Important design contracts and operational limitations, including accepted
   impacts, reasons and reassessment conditions.
3. Information another developer needs to understand and reproduce the project.
4. Supplementary detail and organization of historical records.

Retain documentation updates for important specification and project-status
changes. The checklist below remains a progress record, not an all-documents
release gate. Preserve past implementation and verification records; their
reorganization is a separate task and is not part of this revision.

- [ ] Complete `README.md`
- [ ] Complete `docs/planning/`
- [ ] Complete `docs/architecture/` and `docs/design/`
- [ ] Complete `docs/reference/`
- [ ] Complete `docs/usage/`
- [ ] Document architecture
- [ ] Document database design
- [x] Document Phase 5 AI architecture and Phase 6 RAG architecture
- [ ] Document local development
- [ ] Document environment variables
- [ ] Document Demo behavior
- [ ] Document deployment
- [ ] Add screenshots
- [ ] Review project presentation

---

## 4. MVP Definition

The initial MVP should focus on the following experience:

```text
Workspace
    ↓
Research
    ↓
Sources
    ↓
Findings
    ↓
Conclusion
    ↓
AI-assisted exploration
```

The MVP does not need to implement every SaaS feature.

Authentication, advanced RAG, background processing, and other infrastructure should be introduced after the core research experience has been validated. Commercial billing is outside the current portfolio scope.

---

## 5. Public Demo Strategy

The public portfolio deployment is not intended to function as an unrestricted public SaaS service.

The Demo uses curated data with separate public read-only routes implemented in Phase 9.2 and a visitor-facing SaaS write lock in Phase 9.3. Public deployments must set `PUBLIC_DEMO_MODE=true`. The selected deployed Demo pages and visitor-facing route boundaries have been verified as recorded in Phase 9; separate limited Public Demo Chat is now reported working in Production. Further normal-SaaS security, telemetry, and infrastructure hardening remain pending.

### Historical conditional Demo Chat release policy (2026-10-29 JST)

**Decision at the 2026-10-29 checkpoint: public activation remained No-Go.** The following policy and proposed verification scope are retained as recorded; see the current status above. At that checkpoint, the instruction was to keep
`DEMO_CHAT_ENABLED=false` and the unavailable UI. This is a policy revision only,
not activation approval, implementation, real-service verification or a new
completion decision. The existing read-only Demo scope is independent.

Complete automatic recovery and a guarantee of safely recovering every uncertain
Lease are **Should-have**, not universal pre-publication obligations. A
**stop-tolerant limited release is a conditional candidate**: retain uncertain
Leases indefinitely; if two occupy all capacity, deny new generation and maintain
the shutdown unless admissible evidence supports safe recovery. Record potential
indefinite Chat unavailability, its user impact, handling and acceptance reason
as a Known limitation. Reassess after repeated exhaustion, unacceptable loss of
the intended demo experience, or availability of stronger termination evidence.
Read-only Research browsing should remain independent of Chat availability.

The following remain **Must-have before any limited live release**:

- Preserve Demo/SaaS/C2 separation, public Research scope, authorization, secret
  protection, Origin/Turnstile/session ownership checks and bounded input/output.
- Enforce shared budgets and outstanding-generation limits across all relevant
  senders/deployments. Keep fail-closed behavior, no uncertain automatic retry,
  no memory fallback and no budget refunds. Never infer remote termination from
  Lease expiry, local abort, a timeout or Function termination. Do not delete an
  uncertain Lease merely because time elapsed, reset its ledger, rotate the
  namespace or increase capacity to forget unresolved generation.
- Confirm the target Redis configuration's failure-time consistency, admission
  ordering, acknowledged-reservation retention and no-eviction assumptions with
  appropriate evidence. Basic Lua success alone does not prove failover safety.
  Unresolved safety assumptions must not receive a Go decision.
- Before release, confirm actual Groq pricing/usage entitlements and maximum
  consumption risk for the selected account/model, including uncertain remote
  work and relevant infrastructure costs. Question limits, the output-token
  target and local timeouts are not a monetary cap or remote billing-stop
  guarantee. Verify effective abuse/cost controls and document an acceptable
  cost bound or otherwise justified maximum exposure; if that cannot be
  established, keep live Chat disabled. Do not assume an unverified provider
  spending-cap feature exists or treat an alert as a hard cap.
- Perform bounded basic checks against real Groq, Redis and Turnstile, plus
  deployment/browser checks of normal operation, refusals, renewal/quarantine,
  disconnect/timeout behavior, exhausted capacity and admission shutdown.
  Define a safe isolated target, call/cost bounds and stop conditions before
  execution. Do not substitute mock or local Redis success for Upstash/deployed
  evidence, or bypass the recorded hold on the dedicated Redis verification
  runner. Observed cancellation behavior is not a general termination guarantee.
- Verify an executable admission-stop/disablement procedure covering relevant
  public endpoints and old deployments. A flag change or key revocation does
  not prove that previously submitted Groq work has ended or stopped charging.
  Retain uncertain work and stop accepting new work when safety is unresolved.
- Separately integrate and verify the public UI in real browsers, including
  opt-in, loading, failure/limit/unavailable states, duplicate-send handling,
  keyboard operation and relevant narrow layouts. The existing UI stays disabled;
  the feature flag alone does not connect it.

PR #47's Operation ID / Lease reservation correlation foundation is not proof
of Groq submission or termination, a Provider lifecycle ledger, submission fencing,
cross-HTTP-request deduplication or automatic recovery. Its bounded no-TTL history
can also stop new reservations at capacity; retain that limit and reassess its
retention policy before approaching the cap rather than deleting evidence.

Recovery tooling is not required for a release that accepts indefinite shutdown
and performs no uncertain recovery. **Any recovery that is implemented or used
still requires** exact-attempt proof of non-submission or confirmed termination,
prevention of future submission by the affected workers, and a reviewed, audited
owner/version-bound exact-member operation without refunds. If proof, fencing or
audit is unavailable, retain the Lease and shutdown. No general force-release or
expiry-only recovery is authorized.

**Policy precedence and outstanding document alignment:** The dated records below
preserve the earlier stricter pre-publication decision, including the blanket
termination-guarantee/recovery prerequisites. For future release planning, this
section replaces only those universal recovery/availability obligations with the
conditional policy above; their underlying safety requirements remain. The
[AI Architecture contract](../architecture/ai-architecture.md#41-public-demo-chat-configuration-contract)
and [Lease recovery design §12](demo-chat-lease-recovery-design.md#12-public-activation-go--no-go-criteria)
still contain the earlier blanket activation gates and require a separately scoped
alignment before any Go decision. They are unchanged in this task. Missing Redis,
cost-control or other safety evidence remains blocking under this policy too.

### Historical implementation and verification records

The following dated entries retain their original decisions, results and pending
conditions. They are historical evidence, not new runs or claims that the current
conditional release criteria have been met.

**PR #42 — Demo Chat security foundation (2026-10-27, JST):** The separate
`POST /api/demo/chat` now validates deployment/feature configuration, configured
HTTPS Origin, bounded JSON input and the existing public Research read boundary.
Opt-in session establishment uses server-side Turnstile and hardened anonymous
cookies backed by expiring Redis sessions. Questions still return 503; no UI or
Groq generation is connected. Internal Redis EVAL contracts implement thread,
session, shared-source, UTC-day and concurrency limits; stale leases stay counted
until upstream termination is confirmed. Source bucketing is deliberately shared
until a trusted IP adapter is designed. See the [security and handoff contract](../architecture/ai-architecture.md#41-public-demo-chat-configuration-contract)
and [PR #42 verification record](../archive/demo-chat-api-security-pr42.md). This foundation
does not complete Phase 9 or Phase 10; no completion checkbox changes are implied.

**PR #44 — Demo Chat UI foundation (2026-10-27, JST):** Research detail now
appends an AI Chat section after Conclusion, with a current-Research description,
empty conversation area, disabled labelled input and disabled Send question
button. Coming soon and planned usage limits explain the unavailable state.
There is no API/session/Turnstile/Groq connection or sample AI answer, and
`DEMO_CHAT_ENABLED=false` remains the default. The panel stays disabled regardless
of the flag until a separate integration. See the [UI contract](../architecture/ai-architecture.md#pr-44-research-chat-ui-foundation).
This UI-only work does not complete Phase 9/10 or change their checkboxes.

Local validation: related Vitest **3 files / 82 tests**, full Vitest **79 files /
1,725 tests**, TypeScript, lint and diff whitespace checks passed. Production
build initially failed fetching Google Fonts in the sandbox, then passed on the
same command with expanded permissions. Offline Chromium checked synthetic
Research static markup with project CSS in **12 cases** (Light/Dark,
375/768/1280px, 16/32px root font sizes): no horizontal overflow, disabled input
and send, and zero network requests on attempted interaction. Root-font doubling
is a text enlargement check, not browser-native zoom. Updated Public Demo E2E
expectations were not run against a live deployment; hydration, native 200% zoom,
screen-reader behavior and actual SaaS/C2 runtime flows still need browser
verification. Vitest covers the existing SaaS/C2 boundaries with offline doubles.

**PR #45 — Demo Chat server generation foundation (2026-10-27, JST):**
Authorized `question` requests now reserve atomic Redis budgets and concurrency,
project bounded public Research context, call the fixed Groq model through AI SDK 6,
validate strict answer JSON/Source allowlist membership and return non-cacheable
JSON. Research JSON is capped at 12,000 Unicode points, 10 Findings and 10 Sources;
Comments, internal metadata and history are excluded. Missing evidence yields fixed
insufficiency text. No Source URL is fetched and no question/answer is persisted.
The [generation/response contract](../architecture/ai-architecture.md#pr-45-server-generation-and-response-contract)
records field limits, response fields and validation limitations.

Only confirmed terminal provider responses (or work never submitted) release the
lease. A 30-second local deadline, disconnect or failed 15-second renewal aborts
the local request, but uncertain remote termination retains quarantine indefinitely.
Two uncertain leases can exhaust all capacity; automatic deletion/recovery is
not implemented. Accepted question budgets are never refunded. References prove
Source membership, not factual correctness. Real Groq, Turnstile, Redis and deployed
disconnect/cancellation behavior are unverified. `DEMO_CHAT_ENABLED=false`, Coming
soon, disabled controls and the unconnected Turnstile UI remain unchanged. SaaS
Chat, Gemini and C2 are unchanged. This does not complete Public Demo Chat or change
Phase 9/10/11 completion checkboxes.

**PR #45 review follow-up (2026-10-29 JST):** Answer validation permits the exact
technical prose names `Next.js`, `Node.js`, `package.json` and `tsconfig.json` while
retaining explicit URL/markup refusal, the remaining conservative domain heuristic
and Source-ID allowlisting. This narrow exception does not fully disambiguate
filenames and domains; see the architecture contract for its limits. Lease behavior
is unchanged. **PR #46 must resolve the recovery policy and verify real Groq/Redis
termination, renewal, quarantine and recovery behavior before public activation.**
Two uncertain leases can still exhaust capacity indefinitely; safe automatic
recovery remains unimplemented. These real-service checks were not run here.
Follow-up checks passed: related Demo Vitest **8 files / 204 tests**, TypeScript,
ESLint and `git diff --check`. Full Vitest was not rerun for this follow-up; the
following full-suite result belongs to the earlier foundation verification.

**Pre-release Redis lease hardening (2026-10-29 JST):** The built-in adapter now
prepares configuration/model and Research JSON before the SDK submission boundary,
so those proven local failures release their own lease. Unrecognized Redis release
replies fail closed. Offline tests cover two quarantined slots refusing new work,
ownership-safe local cleanup, installed SDK abort rejection, and renew/release
responses lost after Redis commit, alongside the existing completion, timeout,
abort, budgets and concurrency checks. See the
[lease state transitions and incident prerequisites](../architecture/ai-architecture.md#pre-release-lease-recovery-hardening-2026-10-29-jst).

**Still required before activation:** durable lease/invocation/provider correlation
and lifecycle audit evidence; a verified provider termination acknowledgment or
enforceable remote lifetime bound; fencing of all existing workers and a reviewed,
audited exact-member recovery mechanism; separately authorized isolated verification
of provider/Redis/Function crash and recovery behavior. No safe automatic recovery
was established or implemented. Two uncertain leases can still block all new
generation indefinitely; if termination cannot be proved, retain them and keep
Chat disabled. No real Groq/Redis/Turnstile calls, production access or local
Production Build were performed. `DEMO_CHAT_ENABLED=false`, the disabled UI and
Phase 9/10/11 checkboxes remain unchanged. **The recovery issue is not resolved.**
Validation: related offline Vitest **8 files / 214 tests**, TypeScript
(`--noEmit --incremental false`), full ESLint (plus the final edited test file)
and `git diff --check` passed. Full Vitest was not run for this task.

**Operation ID / reservation correlation foundation (2026-10-29 JST):** The server
creates a random Operation ID before Redis reservation and records its exact Lease
and hashed request scope in the same EVAL. A bounded, no-TTL HASH retains reservation
attempt/completion metadata, including after safe Lease release; same-ID retries
are denied rather than granting another generation. Partial Lua errors and lost
replies remain fail-closed, with no budget refund. The 10,000-record cap denies new
admission instead of deleting history. This covers same-server-operation replay,
not deduplication of independent HTTP requests or proof of Groq submission/end.
Provider lifecycle, submission fencing, recovery tools, automatic release and
unconditional Upstash durability remain unimplemented/unverified. See the
[architecture contract](../architecture/ai-architecture.md#operation-id-and-reservation-correlation-foundation-2026-10-29-jst)
and [design status](demo-chat-lease-recovery-design.md#25-後続実装-operation-id--予約相関の基盤).
**Public activation remains No-Go; `DEMO_CHAT_ENABLED=false`, disabled UI and
Phase 9/10/11 completion checkboxes remain unchanged.**
Validation: related offline Vitest **11 files / 261 tests**, TypeScript
(`--noEmit --incremental false`), full ESLint and `git diff --check` passed.
Full Vitest, Production Build and real-service verification were not run.

**Public Demo Chat client integration foundation (2026-10-29 JST):** The existing
Research Chat panel now has a separately gated client path for the reviewed JSON
session/question API. Server configuration eligibility selects this path; normal
SaaS and C2 remain excluded. Explicit session start mounts the public-key-only
Turnstile widget, consumes each token once and handles failure/expiry. The
in-memory client handles ready, sending, answer, error and usage/capacity limit
states, prevents duplicate submissions and never automatically resends a failed
question. Requests carry no Operation ID or history. Answer JSON and current
public Source metadata are checked before React text rendering; Research changes
discard old state and ignore late responses. See the
[client contract](../architecture/ai-architecture.md#public-demo-chat-client-integration-foundation-2026-10-29-jst).

This supersedes the earlier UI-unconnected status only for the implemented client
foundation. **Public activation remains No-Go; `DEMO_CHAT_ENABLED=false` and the
default disabled Coming soon UI remain unchanged.** No Lease recovery, budget
refund, SaaS Chat/C2 changes or Phase 9/10/11 checkbox completion is implied.
Real-browser hydration, keyboard/focus, mobile/screen-reader behavior and deployed
Origin/cookie/CSP behavior remain unverified, as do real Groq/Redis/Turnstile
interactions and the existing provider termination/recovery blockers. Production
Build is deferred to a later Vercel Preview. No real-service calls or DB operations
were performed for this client foundation.

Offline validation: related Vitest **18 files / 496 tests**, TypeScript
(`--noEmit --incremental false`), full ESLint and `git diff --check` passed.
The UI checks use synthetic hook/widget doubles and static markup, not a browser.
Full Vitest and Production Build were not run. Earlier PR verification records
below remain historical evidence and are not results of this work.

PR #45 offline validation: related Demo Vitest **8 files / 180 tests**, full
Vitest **81 files / 1,756 tests**, TypeScript, ESLint and `git diff --check` pass.
Local Production Build is **incomplete, intentionally interrupted**, not passed.
The isolated default Turbopack attempt was stopped during compile; the later
`pnpm build --webpack` attempt used copied source, existing dependencies, synthetic
configuration, blocked outbound networking and mocked Google Fonts. Its process
remained CPU-active at `compile`, without a compiled-success message, `BUILD_ID`
or Next.js-specific build error in the captured log. PowerShell's `NativeCommandError`
wrapped the stderr command banner and did not establish build failure. At the
user's explicit direction, the verified PR #45 script process tree was stopped;
the execution wrapper returned **-1 after forced interruption**, not a natural
Next.js completion code. Bundling, built-in build checks, static generation and
final production artifacts remain unverified. No further local Production Build
retry is planned for this PR; verify those stages through **Vercel Preview Deployment
after PR creation**. No deployment or PR creation was performed in this task.

### Portfolio presentation

This approach allows the project to demonstrate:

- collaborative workspace architecture
- structured research data
- AI-assisted knowledge exploration
- database design
- modern full-stack development

without exposing the production database or AI provider credentials to arbitrary public writes.

Users who want unrestricted usage can clone the repository and configure their own infrastructure.

---

## 6. Long-Term Direction

The long-term concept of evidence-atlas is:

> Collect evidence, organize knowledge, and use AI to deepen understanding.

The application should evolve from a structured research workspace into an environment where accumulated evidence can be searched, connected, discussed, and used as the basis for informed conclusions.

The architecture should remain flexible enough to support additional research and knowledge-management capabilities without requiring a fundamental redesign of the core data model.
