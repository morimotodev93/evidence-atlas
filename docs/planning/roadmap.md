# evidence-atlas Roadmap

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

---

### Phase 2 — Data Architecture

**Goal:** Design the knowledge model that forms the core of evidence-atlas.

Potential core entities:

```text
User
Organization
Membership
Workspace
Research
Source
Finding
Conclusion
Comment
Tag
Conversation
Message
Embedding
```

Tasks:

[x] Design Prisma schema
[x] Configure PostgreSQL
[x] Configure Prisma
[x] Create initial migration
[ ] Create seed data
[ ] Verify database operations
[x] Document the data model

The initial model should prioritize the research workflow:

```text
Workspace
  └── Research
       ├── Source
       ├── Finding
       ├── Discussion
       └── Conclusion
```

---

### Phase 3 — Design System & UI Foundation

**Goal:** Establish a reusable UI system before building feature screens.

- [ ] Define design tokens
- [ ] Configure shadcn/ui
- [ ] Establish typography
- [ ] Establish spacing
- [ ] Establish layout primitives
- [ ] Establish common UI components
- [ ] Establish form components
- [ ] Establish feedback states
- [ ] Define responsive behavior
- [ ] Define light/dark theme strategy

---

### Phase 4 — Research Workspace MVP

**Goal:** Implement the core research management experience.

- [ ] Workspace overview
- [ ] Research list
- [ ] Research detail
- [ ] Create Research
- [ ] Update Research
- [ ] Source management
- [ ] Finding management
- [ ] Comments / discussion
- [ ] Tags
- [ ] Search
- [ ] Filtering
- [ ] Basic sorting

The initial experience should make the research process understandable without AI.

---

### Phase 5 — AI Integration

**Goal:** Make AI useful by grounding it in the workspace's accumulated knowledge.

- [ ] Introduce AI SDK
- [ ] Define AI provider abstraction
- [ ] Configure development AI provider
- [ ] Implement basic AI interaction
- [ ] Implement streaming responses
- [ ] Define AI conversation model
- [ ] Connect AI to workspace context
- [ ] Implement source-aware answers
- [ ] Display supporting evidence
- [ ] Handle insufficient evidence / uncertainty
- [ ] Document AI architecture

Target concept:

```text
Workspace Knowledge
       ↓
Context Selection
       ↓
AI SDK
       ↓
Model Provider
       ↓
Grounded Response
       ↓
Evidence / Sources
```

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
- [ ] Implement User
- [ ] Implement Organization
- [ ] Implement Membership
- [ ] Implement Workspace permissions
- [ ] Define authorization rules
- [ ] Protect server-side resources
- [ ] Test access control

Target structure:

```text
User
  ↓
Organization
  ↓
Membership
  ↓
Workspace
  ↓
Research
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
