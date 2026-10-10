# evidence-atlas Roadmap

> **Last Updated:** 2026-10-09

Current stage: Phases 4–7 are complete for their stated baseline scopes. Phases 0–3 established the foundation, product direction, data contract, and design-system baseline. Checked implementation items describe code present in the repository, not a fresh runtime verification or completion of every related product requirement.

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

**Status: Baseline established.** These items establish design conventions and UI primitives. Automatic system-theme selection, sidebar navigation, semantic icon wrappers, and full accessibility/theme verification remain outstanding; see the [design system](../design/design-system.md) and [design direction](../design/design-direction.md).

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

Comment CRUD is implemented. New Comments currently use the Research creator as the author; authenticated authorship and permissions remain part of Phase 7.

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

### Phase 8 — SaaS Infrastructure

**Goal:** Add infrastructure required for a realistic SaaS architecture where appropriate.

Potential features:

- [ ] Subscription model
- [ ] Stripe integration
- [ ] Billing state synchronization
- [ ] Email infrastructure
- [x] Rate limiting
- [x] Usage tracking
- [x] Background jobs
- [x] Error monitoring
- [x] Application observability

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

This baseline does not include embedding usage tracking, monetary cost accounting, daily/monthly quotas, subscription-based limits, a usage analytics dashboard, or billing enforcement. Phase 8 remains partially complete; subscription, Stripe, billing, and email remain pending.

Only features that contribute meaningfully to the portfolio should be implemented.

---

### Phase 9 — Public Demo

**Goal:** Prepare a safe and understandable portfolio demonstration.

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

The GitHub link, Phase 9 portfolio documentation, final credential exposure review, and production deployment are complete. Public AI remains intentionally disabled for the current read-only Demo scope.

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

Existing cookies do not bypass the lock: sessions are not evaluated by the protected entry points. Persisted Session rows are not revoked or deleted by enabling the mode. When normal mode is restored, still-valid sessions may work again. Public AI remains intentionally disabled for the current read-only Demo scope. Global session revocation, database-role hardening, normal-SaaS telemetry redaction, live Inngest Cloud integration verification, and Preview environment separation remain separate tasks. The lock covers visitor-originated SaaS operations, not all database or background writes.

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

- [ ] Unit tests
- [ ] Integration tests
- [ ] Database tests
- [ ] AI-related tests
- [x] End-to-end tests — Public Demo smoke coverage; authenticated SaaS remains pending
- [ ] Validation tests
- [ ] Authorization tests
- [ ] Error handling review
- [ ] Accessibility review
- [ ] Responsive UI review
- [ ] Production build verification

Vitest and Playwright dependencies and scripts are present. Phase 6 adds manual retrieval/citation inspection scripts and records manual chat E2E checks. Existing Vitest tests cover access control for the ten mutation actions described in Phase 7, using mocked authentication and database operations: missing Research, non-membership, unauthenticated requests, unexpected Research lookup failures, and authorized writes. Broader automated regression coverage, accessibility/responsive review, and Broader automated regression coverage, accessibility/responsive review, and comprehensive production deployment verification remain outstanding.

**Phase 10 — Minimal Public Demo E2E (2026-10-09):** `playwright.config.ts` and `e2e/public-demo.spec.ts` add six Chromium smoke tests against the deployed read-only Public Demo. The default target is `https://evidence-atlas-mu.vercel.app`, overridable with `E2E_BASE_URL`; one worker runs without starting a local server or requiring a local database. Tests cover the root redirect, four current seeded Research entries and Demo links, detail sections/back navigation, absence of mutation/AI UI, unknown Research 404 without fallback, and GET-only 404 checks for `/research`, `/api/auth/session`, and `/api/inngest`. Research IDs come from list links. A preflight verifies the Demo target, browser non-GET traffic is blocked, execution stops on the first failure, and failure traces are retained. Vitest excludes `e2e/**` from its collection.

Validation passed all six remote E2E tests, `pnpm lint`, `pnpm test --run` (19 files, 239 tests), and `pnpm build`. Browser installation, test subprocesses, and Google Fonts fetching required execution outside the restricted sandbox. Existing Vitest missing-Inngest-event-key diagnostics and build warnings for unconfigured Upstash credentials remain. This establishes Public Demo UI/GET regression coverage; it does not verify server-side write prevention, database integration, AI answer quality, authenticated SaaS workflows, or complete Phase 10. Follow-up E2E coverage includes the other three Research details, accessibility/responsive checks, and authenticated workflows in an isolated environment.

**Phase 10 — Synthetic AI Chat Quality Evaluation (2026-10-10, JST):** The [six-case quality report](ai-chat-quality-evaluation.md) preserves the first Gemini evaluation: **Pass 4 / Provisional Pass 1 / Fail 1 / Not Run 0**. Case 03 failed semantic citation grounding. Later implemented prompt clarifications were followed by five Gemini Case 03 executions with appropriate citations in all five, but full marks in only one; limitations and qualifications remained weaker in the others. The direct runner now supports Gemini and evaluation-only Groq (`openai/gpt-oss-120b`) with the shared production System Prompt. Groq Case 06 received **Pass, 6/6**; multiple Case 03 responses exposed bracket/Unicode citation issues and inference errors, without a supplied numerical quality score. Supported citation normalization and updated unit coverage are implemented, with test completion reported by the developer. These are limited synthetic-context observations, not full production Chat API validation or general reliability evidence. Production Chat and embeddings remain Gemini. Remaining work includes the other Groq cases, prompt regressions, shared-criteria provider comparisons, semantic citation grounding, inference reliability, and separate authenticated Chat API E2E validation. Phase 10 remains incomplete; no tests, builds, or provider evaluations were rerun for this documentation update.

---

### Phase 11 — Deployment

**Goal:** Deploy the portfolio version and verify production behavior.

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

---

### Phase 12 — Documentation & Portfolio Presentation

**Goal:** Make the project understandable as a portfolio artifact.

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

Authentication, billing, advanced RAG, background processing, and other infrastructure should be introduced after the core research experience has been validated.

---

## 5. Public Demo Strategy

The public portfolio deployment is not intended to function as an unrestricted public SaaS service.

The Demo uses curated data with separate public read-only routes implemented in Phase 9.2 and a visitor-facing SaaS write lock in Phase 9.3. Public deployments must set `PUBLIC_DEMO_MODE=true`; deployment verification, public AI controls, credential review, and infrastructure hardening remain pending.

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
