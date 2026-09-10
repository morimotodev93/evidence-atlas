# Product Definition

> **Status:** Draft
> **Last Updated:** 2026-09-10

This document defines the current product concept, target users, primary use cases, user flows, terminology, Demo experience, MVP scope, and major product decisions for **evidence-atlas**.

The document is intentionally provisional and will be revised as the product requirements become clearer.

---

## 1. Product Concept

### 1.1 Overview

**Evidence Atlas** is an AI-assisted research workspace for turning independent research into structured, reusable knowledge.

Contributors can research independently and asynchronously. Evidence Atlas helps surface related research, organize findings, identify conflicts, and connect individual contributions into shared knowledge.

It is designed for small development and product teams whose members need to investigate technical or product-related questions, collect reliable sources, record findings, and preserve conclusions for future reuse.

The product does not require contributors to work on the same research simultaneously or coordinate directly during the research process.

Instead, individual research efforts can accumulate within a shared workspace and be connected, reviewed, and integrated over time.

The product treats research as accumulated team knowledge rather than a temporary collection of browser tabs, notes, or chat conversations.

### 1.2 Core Value

Evidence Atlas aims to help teams:

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

The intended AI-assisted knowledge flow is:

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

AI is therefore treated as a layer that works with accumulated research knowledge rather than as the primary place where research is created.

---

## 2. Target Users

### 2.1 Primary Users

The primary target users are:

**Small development and product teams that need to accumulate, organize, and reuse research knowledge.**

Evidence Atlas does not assume that team members need to conduct research simultaneously or communicate directly while conducting research.

Individual members may independently investigate different questions, collect sources, record findings, and form conclusions.

Their individual research can then accumulate within a shared workspace, where it can be reviewed, connected, compared, and reused by other members.

The product aims to reduce unnecessary manual coordination and knowledge management required to turn independent research efforts into shared, reusable knowledge.

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

Collaboration does not necessarily mean working together at the same time.

Instead, Evidence Atlas focuses on connecting the results of individual knowledge work and minimizing direct coordination when it is not necessary.

### 2.2 Secondary Users

Potential secondary users include:

- Product managers
- Technical leads
- Developers conducting independent technical research
- Researchers working with development or product teams
- Small teams with distributed or asynchronous workflows
- Individual developers who want to build structured personal research knowledge

The individual developer use case is considered a potential extension of the core concept rather than the primary target.

The secondary audience may be refined after the primary use cases are defined.

### 2.3 User Characteristics

The target user is expected to:

- Work with multiple information sources
- Investigate questions independently
- Need to compare or evaluate evidence
- Perform research repeatedly over time
- Benefit from preserving previous findings and conclusions
- Contribute knowledge asynchronously rather than requiring simultaneous collaboration
- Reuse research conducted by other members
- Prefer reducing unnecessary coordination and manual documentation
- Have enough technical familiarity to understand structured research concepts

The product does not assume that every team member will contribute equally or consistently.

Instead, the system should provide value even when individual contributions vary in quantity, quality, and timing.

Evidence Atlas is not intended to be a general-purpose note-taking application.

Its primary purpose is to transform individual research efforts into structured, reusable knowledge that can benefit a wider group.

## 3. Primary Use Cases

### UC-01 — Investigate a Research Question

A user creates a research topic and investigates a technical, product, or development-related question.

The core workflow is:

```text
Create Research / Define Research Question
        ↓
AI: Surface potentially related research (broad matching)
        ↓
User decides:
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

### UC-02 — Collect and Organize Sources

A user collects relevant external sources and associates them with a research topic.

The core workflow is:

```text
Open Research
        ↓
Add Source (URL or reference)
        ↓
Capture essential metadata
        ↓
Optionally add notes or context
        ↓
Associate Source with the Research
```

Sources remain independently identifiable so that any later Finding can be clearly traced back to its origin.

The system prioritizes reliable traceability over exhaustive source management features.

---

### UC-03 — Record Findings

A user extracts useful information from sources and records it as structured findings.

The core workflow is:

```text
Select Source
        ↓
Extract relevant insight or evidence
        ↓
Record Finding (linked to the Source)
        ↓
Optionally add context, tags, or supporting notes
        ↓
Associate Finding with the Research
```

A Finding represents what was learned from the research, not a copy of the entire source.

Clear separation between Source and Finding is maintained to support later comparison, conflict detection, and AI retrieval.

---

### UC-04 — Discuss Evidence

Users discuss findings, compare interpretations, and identify areas of agreement or disagreement.

The core workflow is:

```text
Select Finding(s) or Research
        ↓
Add interpretation, question, or counterpoint
        ↓
Respond to existing discussion points
        ↓
Highlight agreement, disagreement, or open questions
        ↓
Preserve the discussion thread
```

Discussion is intended to capture reasoning that would otherwise be lost in temporary chat or meetings.

It remains asynchronous by default and does not require real-time collaboration.

Direct human-to-human discussion should primarily be used when asynchronous research and AI-assisted analysis cannot efficiently resolve an issue.

---

### UC-05 — Preserve Conclusions

A research process may produce one or more conclusions, while some questions may remain unresolved.

The core workflow is:

```text
Review Findings and Discussions
        ↓
Synthesize the outcome
        ↓
Record Conclusion (linked to supporting Findings)
        ↓
Optionally note remaining uncertainties or limitations
        ↓
Mark the Conclusion as the current outcome of the Research
```

Conclusions preserve the result of the research so the knowledge can be reused later.

A Conclusion should remain traceable to the Findings (and ultimately the Sources) that support it.

### UC-06 — Reuse Accumulated Knowledge

Users can find and reuse knowledge from previous research instead of repeatedly investigating the same questions.

Previously accumulated findings and conclusions should remain discoverable and usable as context for new research.

The purpose is not to prevent repeated research, but to make existing knowledge available so users can decide whether to reuse, extend, challenge, or independently reproduce it.

### UC-07 — Explore Knowledge with AI

Users can ask questions about accumulated workspace knowledge and use AI to explore information across previous research.

AI should retrieve relevant sources, findings, discussions, and conclusions from the workspace and help synthesize them into useful answers.

Answers should remain grounded in the knowledge accumulated within the workspace, with relevant evidence traceable back to its original sources.

The intended technical direction is retrieval-augmented generation (RAG).

### UC-08 — Review Conflicts and Unresolved Issues

AI analyzes accumulated research to identify potentially conflicting findings, conclusions, and unresolved issues.

Potential issues are surfaced for human review rather than being automatically resolved.

```text
Research
    ↓
Findings / Conclusions
    ↓
AI-assisted Analysis
    ↓
Potential Conflict / Unresolved Issue
    ↓
Review Queue
    ↓
Human Review
    ↓
Decision / Further Research
```

The review process should remain asynchronous by default.

When an issue cannot be efficiently resolved through existing evidence, AI-assisted analysis, or asynchronous review, contributors may communicate directly to resolve the remaining uncertainty.

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

### 4.3 AI-Assisted Flow

The intended AI-assisted experience is:

```text
User Question
    ↓
Workspace Knowledge
    ↓
Retrieve Relevant Information
    ↓
AI Synthesis
    ↓
Answer
    ↓
Trace Back to Supporting Knowledge
```

The exact interaction model and citation behavior remain to be defined.

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

The exact MVP boundary will be finalized after the core user flows and data model are reviewed.

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

- Next.js
- React
- TypeScript
- Next.js App Router

The application structure follows the App Router model.

### 9.2 Database

PostgreSQL is the planned primary database.

The project requires relational modeling for entities such as:

```text
Organization
Workspace
Research
Source
Finding
Discussion
Conclusion
```

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

The public Demo is intended to provide a safe, curated demonstration rather than unrestricted access to the application's write operations or AI resources.

### 9.7 Incremental Architecture

The architecture will evolve as product requirements become clearer.

The project should avoid introducing infrastructure solely because it may be useful in a future version.

New architectural components should be introduced when their responsibilities and requirements are sufficiently clear.

---

## 10. Open Questions

The following areas remain intentionally undecided:

- Exact authentication model
- Organization membership model
- Workspace permission model
- Detailed Research lifecycle
- Source metadata requirements
- Finding structure
- Discussion model
- Conclusion structure
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

This document is a **provisional product definition**.

It establishes the current direction of Evidence Atlas while intentionally leaving implementation details and future product decisions open.

The document should be revised when:

- Core user flows change
- The MVP boundary changes
- Terminology changes
- Major architectural decisions are made
- Demo requirements become clearer
- Authentication, collaboration, or AI requirements are defined
