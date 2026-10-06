# evidence-atlas Roadmap

> **Last Updated:** 2026-10-06

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
- [ ] Error monitoring
- [ ] Application observability

**Implemented baseline:** AI chat uses an Upstash Redis sliding-window rate limit of 10 requests per minute per Workspace × User, enforced before retrieval, embedding, and generation. Chat-generation token usage and finish reason are recorded in `AiUsageEvent`, with Workspace, User, Research, and Conversation IDs stored as scalar attribution fields.

**Phase 8.3 Background Jobs:** Inngest refreshes the Research-scoped retrieval index after successful Research creation, title/description updates, Conclusion updates, and Finding creation, content updates, and deletion. Events are debounced per Research ID (`5s` period, `30s` timeout), with singleton mode `cancel` and `3` retries. A PostgreSQL advisory transaction lock and idempotent upserts protect the database write path. Enqueue is best-effort and does not fail successful CRUD operations; transactional outbox, a general-purpose job platform, and strong consistency are outside this baseline.

This baseline does not include embedding usage tracking, monetary cost accounting, daily/monthly quotas, subscription-based limits, a usage analytics dashboard, or billing enforcement. Phase 8 remains partially complete; subscription, Stripe, billing, email, error monitoring, and application observability remain pending.

Only features that contribute meaningfully to the portfolio should be implemented.

---

### Phase 9 — Public Demo

**Goal:** Prepare a safe and understandable portfolio demonstration.

- [ ] Create curated Demo Workspace
- [ ] Create realistic Research data
- [ ] Create Sources
- [ ] Create Findings
- [ ] Create Conclusions
- [ ] Configure read-only Demo behavior
- [ ] Add Demo labels
- [ ] Add GitHub link
- [ ] Add project documentation
- [ ] Verify that no private credentials are exposed
- [ ] Verify that arbitrary public writes are disabled

Development seed data exists, but a curated public Demo and read-only enforcement are not implemented. Seed data alone does not complete this phase.

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
- [ ] End-to-end tests
- [ ] Validation tests
- [ ] Authorization tests
- [ ] Error handling review
- [ ] Accessibility review
- [ ] Responsive UI review
- [ ] Production build verification

Vitest and Playwright dependencies and scripts are present. Phase 6 adds manual retrieval/citation inspection scripts and records manual chat E2E checks. Vitest now covers access control for the ten mutation actions described in Phase 7, using mocked authentication and database operations: missing Research, non-membership, unauthenticated requests, unexpected Research lookup failures, and authorized writes. Broader automated regression coverage, accessibility/responsive review, and production build verification remain outstanding.

---

### Phase 11 — Deployment

**Goal:** Deploy the portfolio version and verify production behavior.

- [ ] Configure production environment
- [ ] Configure production database
- [ ] Apply production migrations
- [ ] Seed curated Demo data
- [ ] Configure AI provider
- [ ] Configure environment variables
- [ ] Deploy to Vercel
- [ ] Verify production build
- [ ] Verify Demo Workspace
- [ ] Verify read-only behavior
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

The Demo environment uses curated data and is primarily read-only.

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
