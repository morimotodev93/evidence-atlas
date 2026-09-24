# Product Definition

> **Status:** Approved
> **Last Updated:** 2026-09-24

This document defines the approved product concept, target users, and primary use cases for **Evidence Atlas**.

These sections represent the current product foundation and should be treated as the baseline for subsequent product, data model, UX, and architecture decisions.

---

## 1. Product Concept

### 1.1 Overview

**Evidence Atlas** is an AI-assisted research workspace for turning independent research into structured, reusable knowledge.

Contributors can research independently and asynchronously. Evidence Atlas helps surface related research, organize findings, identify conflicts, and connect individual contributions into shared knowledge.

It is designed for small development and product teams whose members need to investigate technical or product-related questions, collect reliable sources, record findings, and preserve conclusions for future reuse.

The product does not require contributors to work on the same research simultaneously or coordinate directly during the research process.

Instead, individual research efforts accumulate within a shared workspace and can be reviewed, connected, compared, and integrated over time.

Evidence Atlas treats research as accumulated team knowledge rather than a temporary collection of browser tabs, notes, or chat conversations.

### 1.2 Core Value

Evidence Atlas helps teams:

- Collect research sources in a structured way
- Keep findings traceable to their sources
- Organize knowledge around research topics
- Make related and previously conducted research visible
- Identify conflicting or unresolved findings
- Preserve conclusions and the reasoning behind them
- Reuse previously accumulated research knowledge
- Reduce unnecessary coordination between contributors
- Use AI to search, connect, compare, and synthesize workspace knowledge

### 1.3 Core Concept

The conceptual research model is:

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

Each level represents a different stage of organizing research knowledge.

The intended role of AI is to work across the accumulated knowledge within a workspace:

```text
Workspace
    ↓
Knowledge
    ↓
AI-assisted Retrieval
    ↓
AI Analysis / Synthesis
    ↓
Answer or Insight
```

AI is therefore treated as an assisting layer over accumulated research knowledge rather than as the primary place where research is created.

### 1.4 Collaboration Model

Evidence Atlas is designed around **asynchronous knowledge accumulation** rather than simultaneous collaboration.

The intended model is:

```text
Independent Research
        ↓
Individual Contributions
        ↓
Shared Workspace
        ↓
AI-assisted Organization
        ↓
Review / Decision
        ↓
Shared Knowledge
        ↓
Reusable Results
```

Team members may investigate different questions independently and at different times.

Their research can subsequently become part of a shared body of knowledge that other contributors can discover, evaluate, extend, challenge, or reuse.

Collaboration therefore does not necessarily mean working together at the same time.

Evidence Atlas focuses on connecting the results of individual knowledge work while reducing direct coordination when it is not necessary.

---

## 2. Target Users

### 2.1 Primary Users

The primary target users are:

**Small development and product teams that need to accumulate, organize, and reuse research knowledge.**

These teams may investigate technical, product, or development-related questions as part of their normal work.

Evidence Atlas does not assume that team members need to conduct research simultaneously or communicate directly while conducting research.

Individual members may independently investigate different questions, collect sources, record findings, and form conclusions.

Their individual research can then accumulate within a shared workspace, where it can be reviewed, connected, compared, and reused by other members.

The product aims to reduce the manual coordination and knowledge-management effort required to turn independent research efforts into shared, reusable knowledge.

The intended collaboration model is therefore:

```text
Independent Research
        ↓
Individual Contributions
        ↓
Shared Workspace
        ↓
AI-assisted Organization
        ↓
Review / Decision
        ↓
Shared Knowledge
        ↓
Reusable Results
```

The product is particularly suited to small teams where research knowledge is valuable beyond the person who originally conducted the research.

### 2.2 Secondary Users

Potential secondary users include:

- Product managers
- Technical leads
- Developers conducting independent technical research
- Researchers working with development or product teams
- Small teams with distributed or asynchronous workflows
- Individual developers who want to build structured personal research knowledge

The individual developer use case is considered a potential extension of the core concept rather than the primary target.

The secondary audience may be refined as product requirements and usage patterns become clearer.

### 2.3 User Characteristics

The target user is expected to:

- Work with multiple information sources
- Investigate questions independently
- Need to compare or evaluate evidence
- Perform research repeatedly over time
- Benefit from preserving previous findings and conclusions
- Contribute knowledge asynchronously
- Reuse research conducted by other members
- Benefit from reducing unnecessary coordination and manual documentation
- Have enough technical familiarity to understand structured research concepts

The product does not assume that every team member will contribute equally or consistently.

Individual contributions may vary in quantity, quality, and timing. The system should nevertheless provide value by making accumulated research discoverable and reusable.

### 2.4 Product Positioning

Evidence Atlas is not intended to be a general-purpose note-taking application.

Its primary purpose is to transform individual research efforts into structured, reusable knowledge that can benefit a wider group.

The distinction is:

```text
General Note-taking
    ↓
Store information for later reference

Evidence Atlas
    ↓
Research
    ↓
Structure evidence and findings
    ↓
Preserve reasoning and conclusions
    ↓
Accumulate shared knowledge
    ↓
Reuse and connect research over time
```

---

## 3. Primary Use Cases

### UC-01 — Investigate a Research Question

A user creates a research topic and investigates a technical, product, or development-related question.

The core workflow is:

```text
Create Research / Define Research Question
        ↓
AI: Surface Potentially Related Research
        ↓
User Decides:
  - Review and reuse / extend existing research
  - Review existing research and still proceed independently
  - Ignore and proceed independently
        ↓
Collect Sources
        ↓
Record Findings
        ↓
Compare Evidence
        ↓
Reach Conclusion
```

AI surfaces potentially related research as contextual information rather than as a constraint on research creation.

The user remains free to reuse, extend, challenge, or independently reproduce existing research.

The purpose of this use case is not to prevent repeated research, but to make previous work visible before or during a new investigation.

---

### UC-02 — Collect and Organize Sources

A user collects relevant external sources and associates them with a research topic.

The core workflow is:

```text
Open Research
        ↓
Add Source
        ↓
Capture Essential Metadata
        ↓
Optionally Add Notes or Context
        ↓
Associate Source with Research
```

A source represents an identifiable origin of information used during research.

Sources remain independently identifiable so that later findings can be traced back to their origins.

The system prioritizes reliable traceability over exhaustive source-management functionality.

---

### UC-03 — Record Findings

A user extracts useful information from sources and records it as structured findings.

The core workflow is:

```text
Select Source
        ↓
Extract Relevant Insight or Evidence
        ↓
Record Finding
        ↓
Link Finding to Source
        ↓
Optionally Add Context or Supporting Notes
        ↓
Associate Finding with Research
```

A Finding represents what was learned from the research, rather than a copy of the entire source.

The distinction between Source and Finding is maintained so that research can later be compared, reviewed, and retrieved by AI.

The expected relationship is:

```text
Source
    ↓
Information extracted from source
    ↓
Finding
```

---

### UC-04 — Discuss Evidence

Users discuss findings, compare interpretations, and identify areas of agreement or disagreement.

The core workflow is:

```text
Select Finding(s) or Research
        ↓
Add Interpretation, Question, or Counterpoint
        ↓
Respond to Existing Discussion Points
        ↓
Identify Agreement, Disagreement, or Open Questions
        ↓
Preserve the Discussion
```

Discussion is intended to capture reasoning that would otherwise be lost in temporary chat messages or meetings.

It remains asynchronous by default and does not require real-time collaboration.

Direct human-to-human discussion should primarily be used when existing evidence, AI-assisted analysis, and asynchronous review cannot efficiently resolve an issue.

---

### UC-05 — Preserve Conclusions

A research process may produce one or more conclusions, while some questions may remain unresolved.

The core workflow is:

```text
Review Findings and Discussions
        ↓
Synthesize the Outcome
        ↓
Record Conclusion
        ↓
Link Conclusion to Supporting Findings
        ↓
Optionally Record Remaining Uncertainties or Limitations
        ↓
Preserve the Conclusion as the Current Research Outcome
```

Conclusions preserve the result of the research so that the resulting knowledge can be reused later.

A Conclusion should remain traceable to the Findings that support it and, ultimately, to the Sources from which those Findings originated.

The product should preserve not only what was concluded, but also the evidence and reasoning that led to that conclusion.

---

### UC-06 — Reuse Accumulated Knowledge

Users can find and reuse knowledge from previous research instead of repeatedly investigating the same questions from the beginning.

Previously accumulated findings and conclusions should remain discoverable and usable as context for new research.

The purpose is not to prevent repeated research.

Instead, Evidence Atlas allows users to decide whether existing knowledge should be:

- Reused
- Extended
- Challenged
- Independently reproduced
- Ignored

This allows previous research to remain useful without treating it as automatically correct or authoritative.

---

### UC-07 — Explore Knowledge with AI

Users can ask questions about accumulated workspace knowledge and use AI to explore information across previous research.

AI should retrieve relevant sources, findings, discussions, and conclusions from the workspace and help synthesize them into useful answers.

The intended interaction is:

```text
User Question
        ↓
Workspace Knowledge
        ↓
Relevant Research / Evidence Retrieval
        ↓
AI Analysis and Synthesis
        ↓
Answer
        ↓
Trace Back to Supporting Knowledge
```

Answers should remain grounded in knowledge accumulated within the workspace.

Relevant evidence should be traceable back through the research structure to its original sources.

The intended technical direction is retrieval-augmented generation (RAG), although the exact implementation is outside the scope of this approved product definition.

---

### UC-08 — Review Conflicts and Unresolved Issues

AI analyzes accumulated research to identify potentially conflicting findings, conclusions, and unresolved issues.

Potential issues are surfaced for human review rather than being automatically resolved.

The core workflow is:

```text
Research
    ↓
Findings / Conclusions
    ↓
AI-assisted Analysis
    ↓
Potential Conflict / Unresolved Issue
    ↓
Human Review
    ↓
Decision / Further Research
```

The review process remains asynchronous by default.

When an issue cannot be efficiently resolved through existing evidence, AI-assisted analysis, or asynchronous review, contributors may communicate directly to resolve the remaining uncertainty.

The purpose of this use case is to help teams discover uncertainty and disagreement that may otherwise remain hidden within accumulated research.

---

## 3.1 Relationship Between the Primary Use Cases

The use cases form a continuous research-to-knowledge cycle:

```text
UC-01
Investigate a Research Question
        ↓
UC-02
Collect and Organize Sources
        ↓
UC-03
Record Findings
        ↓
UC-04
Discuss Evidence
        ↓
UC-05
Preserve Conclusions
        ↓
UC-06
Reuse Accumulated Knowledge
        ↓
UC-07
Explore Knowledge with AI
        ↓
UC-08
Review Conflicts / Unresolved Issues
        ↓
Further Research
        └──────────────→ UC-01
```

This cycle represents the central product concept:

> **Research should not end when a question is answered. Its evidence, reasoning, and conclusions should become reusable knowledge that can support future research and decisions.**

---

## 3.2 Core Product Boundary

The primary use cases establish the following boundary for Evidence Atlas:

```text
Evidence Atlas is primarily about:

Research
    ↓
Evidence
    ↓
Findings
    ↓
Reasoning
    ↓
Conclusions
    ↓
Reusable Knowledge
```

AI supports this process by helping users discover, connect, compare, and synthesize accumulated knowledge.

AI does not replace the underlying research process or become an authoritative source of truth.

The product therefore treats **traceable evidence and accumulated knowledge as the foundation**, with AI serving as an assisting layer over that foundation.

## 4. Core User Flows

### 4.1 Research Flow

The primary research workflow is:

```text
Workspace
    ↓
Create Research
    ↓
Define Research Question
    ↓
Add Sources
    ↓
Record Findings
    ↓
Discuss / Compare Findings
    ↓
Create Conclusion
    ↓
Preserve Research Knowledge
```

This represents the core product experience.

### 4.2 Knowledge Reuse Flow

Previously accumulated research can later be reused:

```text
Workspace
    ↓
Search Existing Knowledge
    ↓
Find Relevant Research
    ↓
Review Sources / Findings / Conclusions
    ↓
Reuse Knowledge
```

### 4.3 AI-Assisted Knowledge Flow

AI assists users in discovering, analyzing, and synthesizing knowledge accumulated within the workspace.

The core workflow is:

```text
Research / User Question
        ↓
Workspace Knowledge
        ↓
AI-assisted Retrieval and Analysis
        ↓
Relevant Research / Evidence
        ↓
AI-assisted Synthesis
        ↓
Answer / Insight / Potential Issue
        ↓
Trace Back to Supporting Knowledge
        ↓
User Review / Decision
```

AI may help surface relevant research, connect related evidence, compare findings, identify potential conflicts, and synthesize accumulated knowledge into useful answers or insights.

AI-generated results should remain grounded in the knowledge accumulated within the workspace and traceable to the supporting research and sources.

AI assists the research and knowledge-management process but does not replace human review or decision-making.

---

## 5. Terminology

The following terminology is currently used throughout the project.

| Term               | Definition                                                                        |
| ------------------ | --------------------------------------------------------------------------------- |
| **Organization**   | A top-level boundary for users and teams                                          |
| **Workspace**      | A research environment containing research knowledge                              |
| **Research**       | A structured investigation of a question or topic                                 |
| **Source**         | An external information source used during research                               |
| **Finding**        | A relevant piece of information or insight extracted from research                |
| **Discussion**     | A discussion or reasoning process around research findings                        |
| **Comment**        | A user-authored message attached directly to Research, used to record Discussion  |
| **Conclusion**     | A conclusion reached from the accumulated research                                |
| **Knowledge**      | Research information that can be reused within a workspace                        |
| **Embedding**      | A vector representation of knowledge used for semantic retrieval                  |
| **Vector Search**  | Retrieval of semantically relevant knowledge using vector representations         |
| **AI**             | The AI-assisted layer used to search, connect, and synthesize workspace knowledge |
| **Demo Workspace** | A curated, read-only workspace provided for public product demonstration          |

### Terminology Principles

The distinction between the following concepts should remain clear:

```text
Source
  = Where information came from

Finding
  = What was learned from that information

Discussion
  = How the information was interpreted or debated

Conclusion
  = What was ultimately determined
```

This distinction is important for traceability and future AI retrieval.

---

## 6. Demo Experience

The public demo site is a curated, read-only portfolio experience.

Visitors can explore a prepared Demo Workspace, review its accumulated research knowledge, and interact with AI-assisted knowledge exploration.

The underlying demo data is immutable. Visitors cannot create, edit, or delete persistent research data.

The demo is intended to communicate the product concept and demonstrate its core workflow rather than operate as a publicly available SaaS.

### 6.1 Purpose

The public Demo is intended to demonstrate the product concept and user experience without exposing the full application as an unrestricted public SaaS service.

### 6.2 Demo Model

The planned public deployment is:

```text
Public Vercel Deployment
        ↓
Curated Demo Workspace
        ↓
Read-only Exploration
```

Visitors should be able to inspect representative research data and understand how Evidence Atlas organizes research knowledge.

### 6.3 Demo Goals

The Demo should allow visitors to understand:

- What a Workspace represents
- How Research is organized
- How Sources and Findings are connected
- How Discussions and Conclusions fit into the workflow
- How accumulated knowledge can be explored
- How AI-assisted research may work

### 6.4 Public Access Principles

The public Demo should avoid becoming an unrestricted public SaaS instance.

The initial direction is therefore:

- Curated data
- Read-only access
- No unrestricted user-generated content
- No unrestricted public AI API usage
- No requirement for visitors to provide personal API credentials
- No production SaaS administration through the public Demo

The exact Demo implementation remains to be defined.

---

## 7. MVP Scope

### 7.1 MVP Goal

The MVP should demonstrate the essential research workflow from collecting evidence to preserving and reusing knowledge.

The MVP should prioritize the core product concept rather than attempting to implement every planned SaaS capability.

### 7.2 Candidate MVP Capabilities

The current candidate MVP includes:

- Workspace management
- Research management
- Source management
- Finding management
- Discussion support
- Conclusion management
- Research knowledge search
- Basic AI-assisted knowledge exploration
- Curated read-only Demo experience

The exact MVP boundary will be finalized after the data model and implementation requirements are reviewed.

### 7.3 MVP Principle

A feature should be included in the MVP when it is necessary to demonstrate the following fundamental experience:

```text
Research a question
      ↓
Collect evidence
      ↓
Organize findings
      ↓
Reason about evidence
      ↓
Reach a conclusion
      ↓
Reuse the resulting knowledge
```

Features that do not contribute directly to this experience should generally be considered for post-MVP development.

---

## 8. Outside the MVP

The following areas are currently considered candidates for implementation outside the MVP:

- Advanced organization administration
- Advanced role and permission management
- Billing
- Subscription management
- Advanced usage analytics
- Email notifications
- Public research sharing
- Advanced collaboration features
- Production-scale rate limiting
- Advanced AI model management
- Advanced retrieval configuration
- Enterprise-oriented administration

These items are not necessarily rejected permanently.

They are intentionally excluded from the initial product scope unless later requirements demonstrate that they are necessary.

---

## 9. Major Product and Architecture Decisions

### 9.1 Application Framework

Evidence Atlas uses:

- Next.js 16
- React 19
- TypeScript 7+
- Next.js App Router

The application structure follows the App Router model.

**Implementation discrepancy:** `package.json` currently declares TypeScript `^6.0.3`, below the stated 7+ target. The target is retained here until a version-policy decision is made; this documentation review does not change dependencies.

### 9.2 Database

PostgreSQL is the configured primary database.

The project requires relational modeling for entities such as:

```text
Organization
Workspace
Research
Source
Finding
Comment
Conclusion
```

Discussion is represented by Comment records. Conclusion is optional text on Research, not a separate database model; see the [data model](../architecture/data-model.md).

Vector search is also planned through PostgreSQL and pgvector.

### 9.3 ORM

Prisma is used as the database ORM and data modeling layer.

The project currently follows the Prisma 8 data contract approach.

### 9.4 AI

The AI integration is planned around the AI SDK.

Provider-specific AI services will be selected and integrated when the actual AI requirements are implemented.

### 9.5 Retrieval

The intended knowledge retrieval architecture is:

```text
Research Knowledge
       ↓
Embedding
       ↓
PostgreSQL + pgvector
       ↓
Vector Search
       ↓
AI SDK
       ↓
Generated Answer
```

The exact chunking, embedding, retrieval, ranking, and citation strategies remain undecided.

### 9.6 Public Demo

The public deployment will be conceptually separated from the full authenticated SaaS application.

The public Demo is a curated, read-only experience intended to demonstrate the product safely.

Visitors may explore the prepared knowledge and interact with AI-assisted features, but they cannot create, edit, or delete persistent demo data.

### 9.7 Incremental Architecture

The architecture will evolve as product requirements become clearer.

The project should avoid introducing infrastructure solely because it may be useful in a future version.

New architectural components should be introduced when their responsibilities and requirements are sufficiently clear.

---

## 10. Open Questions

The following areas remain intentionally undecided:

- Exact authentication model
- Organization membership administration and invitation flows (the Membership model and roles are defined)
- Workspace permission enforcement (WorkspaceMembership and roles are defined)
- Research lifecycle transition rules (the three status values are defined)
- Source metadata beyond the current title and URL
- Finding display styles beyond TEXT and structured JSON data requirements
- Discussion behavior beyond Research-level Comments, including whether threaded replies are needed
- Conclusion structure beyond the current optional text on Research
- AI provider
- Embedding model
- Chunking strategy
- Retrieval and ranking strategy
- AI citation behavior
- Exact Demo interaction model
- Billing requirements
- Production deployment architecture
- Rate limiting implementation
- Monitoring and observability requirements

These decisions should be made when they become necessary for the corresponding implementation phase.

---

## 11. Product Principles

Evidence Atlas should follow these principles during development:

1. **Evidence should remain traceable.**
   Research findings should retain a clear relationship to their sources.

2. **Research should become reusable knowledge.**
   The product should help prevent useful research from becoming temporary or forgotten information.

3. **AI should augment research and reduce coordination overhead.**
   AI should work with accumulated evidence and knowledge rather than becoming an opaque source of conclusions. It should also reduce unnecessary searching, comparison, coordination, and verification work between contributors.

4. **Related research should be visible early.**
   Existing and similar research should be surfaced before contributors unknowingly duplicate work.

5. **Direct collaboration should be the exception.**
   Human-to-human coordination should be minimized and primarily occur when AI-assisted analysis and asynchronous review cannot resolve an issue.

6. **The core research workflow comes first.**
   Supporting infrastructure should not overshadow the primary product experience.

7. **The Demo should communicate the product clearly.**
   The public deployment should prioritize demonstrating the concept and UX safely.

8. **Architecture should follow requirements.**
   Technologies and infrastructure should be introduced when their responsibilities are justified.

9. **Keep the MVP focused.**
   Features outside the core research workflow should not unnecessarily expand the initial implementation.

## 12. Status

The product concept, target users, and primary use cases are **approved**. Implementation details and the open questions above remain provisional.

It establishes the current direction of Evidence Atlas while intentionally leaving implementation details and future product decisions open.

The document should be revised when:

- Core user flows change
- The MVP boundary changes
- Terminology changes
- Major architectural decisions are made
- Demo requirements become clearer
- Authentication, collaboration, or AI requirements are defined

### Current Implementation Gaps

The intended workflows above remain the product baseline. As of 2026-09-24:

- Research creation and title/description editing, plus Source, Finding, and Comment CRUD, are implemented.
- Workspace Tags can be created or reused by name, attached to Research, displayed on list/detail pages, and detached without deleting the Tag. Tag renaming, Workspace-level Tag deletion, and Tag filtering are not implemented.
- Finding–Source links exist in the contract and seed data, but cannot yet be managed or inspected through the Finding UI.
- The detail page displays the stored Conclusion and supports editing or clearing it.
- Comments attach to Research, not individual Findings; the UC-04 wording about selecting Findings describes discussion context, not a separate Comment relationship. Threaded replies are not modeled.
- UC-05's broader conclusion workflow has only one optional text field in the current contract; multiple conclusion records and structured links to supporting Findings are not implemented.
- Workspace selection, authentication, permission enforcement, search, AI assistance, and read-only Demo controls remain pending.

See the [roadmap](roadmap.md) for remaining work. These gaps do not redefine the approved product behavior.
