# evidence-atlas Roadmap

> **Last Updated:** 2026-09-25

Current stage: Phase 4 is in progress. Phases 0–3 have established the foundation, product direction, data contract, and design-system baseline. Checked implementation items describe code present in the repository, not a fresh runtime verification or completion of every related product requirement.

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

Research discovery supports case-insensitive title/description search, lifecycle status filtering, and sorting by last update or creation date (newest/oldest). The overview and list use the first returned Workspace; Workspace selection and membership-based access remain Phase 7 work. Phase 10 verification and the broader AI-assisted MVP remain outstanding.

**Principle:** The initial experience should make the research
process understandable without AI.

---

### Phase 5 — AI Integration

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
- [ ] Implement source-aware answers
- [ ] Display supporting evidence
- [x] Handle insufficient evidence / uncertainty
- [x] Persist AI conversations and messages
- [ ] Integrate AI conversation UI into Research
- [ ] Document AI architecture

The AI SDK and Conversation/Message contract models are present. Conversation ownership is explicitly scoped to Research: each Conversation belongs to a Research and requires a `researchId`.

The database contract and migrations for this ownership model are complete.

A minimal Research-scoped AI context builder is implemented. It provides the Research conclusion, findings, and supporting source metadata without fetching or treating external source contents as available evidence.

The development AI provider is configured through the AI SDK using Google Generative AI and Gemini 3.6 Flash. Provider-specific configuration is kept behind a minimal model boundary rather than introducing a custom provider abstraction prematurely.

The Research chat API is implemented and verified against the Gemini API. It supports streamed responses grounded in the current Research context and explicitly handles cases where the available Research does not provide enough evidence to answer a question.

AI conversations are persisted as Research-scoped conversation transcripts. Conversations are created explicitly, and user and completed AI messages are stored as append-only conversation history. Previous messages are supplied to the model on subsequent requests so multi-turn conversations retain their context.

Conversation persistence stores the visible conversation rather than AI execution internals. System prompts, Research context snapshots, stream chunks, provider request/response payloads, and failed AI responses are not persisted at this stage. If AI generation fails, the user message may remain in the conversation while no AI message is created. Retry and failure-state management are deferred.

AI conversation content remains distinct from Research knowledge. AI responses do not automatically become Findings or Conclusions; promoting AI-assisted output into Research knowledge requires an explicit human action or review.

For Phase 5, AI context remains intentionally Research-scoped and uses knowledge already stored in the Research. Retrieval infrastructure such as chunking, embeddings, vector search, and RAG remains deferred to Phase 6.

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
```

The next implementation step is to integrate the conversation workflow into the Research UI, including explicit conversation creation, message history, user input, and streamed response rendering. Source-aware evidence presentation remains a separate Phase 5 step after the basic conversation UI is connected.

---

### Phase 6 — Retrieval / RAG

**Goal:** Enable AI to search a larger body of accumulated knowledge.

- [ ] Define retrieval requirements
- [ ] Evaluate chunking strategy
- [ ] Define embedding model
- [ ] Add pgvector
- [ ] Create embedding pipeline
- [ ] Implement vector search
- [ ] Combine metadata filtering with vector search
- [ ] Integrate retrieval with AI responses
- [ ] Evaluate retrieval quality
- [ ] Document RAG architecture

RAG should be introduced only after the basic AI workflow is working.

---

### Phase 7 — Authentication & Multi-User Architecture

**Goal:** Establish the SaaS-oriented multi-user model.

- [ ] Define authentication requirements
- [ ] Select authentication solution
- [ ] Implement authentication
- [ ] Integrate User records with authentication and account management
- [ ] Implement Organization management
- [ ] Implement Membership management
- [ ] Implement Workspace permissions
- [ ] Define authorization rules
- [ ] Protect server-side resources
- [ ] Test access control

User, Organization, Membership, and WorkspaceMembership models and sample records already exist from Phase 2. The tasks above refer to application behavior and access control. Current reads and writes do not enforce these membership boundaries.

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

---

### Phase 8 — SaaS Infrastructure

**Goal:** Add infrastructure required for a realistic SaaS architecture where appropriate.

Potential features:

- [ ] Subscription model
- [ ] Stripe integration
- [ ] Billing state synchronization
- [ ] Email infrastructure
- [ ] Rate limiting
- [ ] Usage tracking
- [ ] Background jobs
- [ ] Error monitoring
- [ ] Application observability

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

Vitest and Playwright dependencies and scripts are present. No application test suites are currently checked in; installing test runners does not complete the testing tasks.

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
- [ ] Document AI architecture
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
