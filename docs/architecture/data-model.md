# Data Model

> Status: Core, Research-scoped conversations, and Phase 6 retrieval storage implemented
> Last Updated: 2026-10-05

## 1. Overview

This document defines the data model of Evidence Atlas, including its core entities, relationships, ownership boundaries, and database design considerations.

## 2. Core Concepts

The following concepts form the foundation of the Evidence Atlas data model.

### User

An individual user who interacts with Evidence Atlas.

### Organization

A shared organizational boundary that contains Workspaces and organization-level membership.

### Workspace

A focused working environment within an Organization for organizing Research and accumulated knowledge.

### Research

The central unit of the research workflow. A Research defines a research subject or question and contains the related research data.

### Source

An external information source referenced by a Research.

### Finding

An evidence or insight identified during Research and traceable to its supporting Sources.

### Conclusion

The overall synthesis or result of a Research.

### Comment

A discussion or clarification attached to a Research.

### Tag

A Tag is a classification label used to organize Research within a Workspace.

Tags belong to a Workspace and are unique within that Workspace.

A Research can have multiple Tags, and a Tag can be attached to multiple Research items.

### Conversation

A dialogue unit attached to one Research for interaction with the AI system.

### Message

An individual user or AI contribution within a Conversation.

### Embedding

An internal vector representation used for semantic retrieval and AI-assisted search.

### RetrievalChunk

A derived text chunk and its embedding, scoped by Workspace and Research IDs. Phase 6 stores embeddings on RetrievalChunk rather than in a separate Embedding model.

## 3. Entity Responsibilities

### User

- Represents an individual user.
- Records authorship of the data they create; shared research belongs to its Workspace rather than its creator.

### Organization

- Represents a shared organizational boundary.
- Defines the organization to which workspaces and their data belong.

### Membership

- Represents a user's membership in an organization.
- Defines the user's relationship and role within the organization.

### Workspace

Represents a shared working environment for research and accumulated knowledge.

- Groups research and related knowledge within a shared context.
- Provides a boundary for research-related data and activities.

### Research

Represents a research activity conducted within a workspace.

- Defines the subject or question being investigated.
- Groups the sources, findings, and conclusions produced through the research.
- Belongs to a workspace.
- Records the user who created the research.

### Source

Represents an external source referenced during research.

- Records the external information source used in a research.
- Provides a traceable reference to the original source.

### Finding

Represents a relevant insight or piece of evidence identified during research.

- Records information derived from research sources.
- Preserves the relationship between an insight and its source.

### Conclusion

Represents the overall conclusion of a research.

- Summarizes the knowledge derived from the research.
- Is based on the findings and evidence collected during the research.

### Comment

Represents a response, clarification, or discussion related to existing research information.

- Allows users to discuss or clarify research-related information.
- Provides a place for replies without modifying the original research data.

### Tag

Classification label for organizing Research within a Workspace.

- Supports categorization and discovery across research-related entities.

### Conversation

Represents a conversation within a specific Research.

- Groups messages into a single conversation.
- Provides a context for user and AI interactions.
- Belongs to one Research and uses its current stored knowledge plus selected knowledge from the same Workspace as AI context.

### Message

Represents an individual message within a conversation.

- Records a user's or AI's contribution to a conversation.
- Belongs to a conversation.

### Embedding

Represents a vector representation of research-related content used for semantic search and AI-assisted retrieval.

- Supports semantic search and retrieval.
- Is generated from existing research-related data.
- Is managed as internal application data rather than user-facing content.

### RetrievalChunk

- Stores indexed Finding content, Research conclusions, or Research title/description text.
- Keeps the knowledge item's identity, chunk position, text, and vector together.
- Is replaceable derived data, separate from original knowledge and conversation history.

## 4. Entity Relationships

The relationships below describe how the core entities of Evidence Atlas are connected.

This section defines conceptual relationships. Section 7 describes the implemented contract, including join models and cardinality; conceptual entities do not necessarily correspond to separate tables.

### User and Organization

A User can belong to one or more Organizations through Membership.

- User represents an individual user.
- Organization represents a shared organizational boundary.
- Membership represents a User's participation in an Organization.
- Organization-level roles are assigned through Membership.
- A User may have different roles in different Organizations.

```text
User
  └── Membership ─── Organization
```

### Organization and Workspace

An Organization can contain multiple Workspaces.

- Organization provides the broader organizational boundary.
- Workspace provides a focused environment for research and accumulated knowledge.
- A Workspace belongs to an Organization.
- An Organization may contain multiple Workspaces.

```text
Organization
  └── Workspace
```

### User and Workspace

Workspace participation is managed independently from Organization membership through WorkspaceMembership.

- WorkspaceMembership represents a User's participation in a specific Workspace.
- Workspace-level roles are assigned through WorkspaceMembership.
- A Workspace may have multiple Workspace Admins.
- Organization membership and Workspace membership represent different scopes of responsibility.

This separation allows a User to belong to an Organization without necessarily participating in every Workspace within that Organization.

```text
User
  └── WorkspaceMembership ─── Workspace
```

### User and Research

A User can create Research within a Workspace.

- Research belongs to a Workspace.
- Research records the User who created it.
- The creator is not necessarily the only person who contributes to the Research.
- Other users can participate through comments and other collaborative activities.

```text
User
  └── creates ─── Research
                    └── Workspace
```

### Workspace and Research

A Workspace contains the Research conducted within that working environment.

- Research belongs to a Workspace.
- A Workspace can contain multiple Research items.
- The Workspace provides the context in which research is organized and accumulated.

```text
Workspace
  └── Research
```

### Research and Research Data

Research is the central unit of the core research workflow.

A Research can be associated with:

- Sources
- Findings
- Conclusion
- Comments
- Tags

These entities represent different aspects of the same research activity.

```text
Research
  ├── Source
  ├── Finding
  ├── Conclusion
  ├── Comment
  └── Tag
```

### Source and Finding

Findings represent important evidence or insights identified during research and derived from external Sources.

- Source represents the original external information source.
- Finding represents an important piece of evidence or insight extracted during research.
- Findings retain a traceable relationship to their supporting sources.
- Findings and Sources have a many-to-many relationship through FindingSource.

```text
Source
  └── supports ─── Finding
```

### Research and Conclusion

Conclusion represents the overall result or synthesis of a Research.

- A Conclusion belongs to a Research.
- The Conclusion is based on the findings and evidence accumulated during the Research.
- It represents the final synthesis rather than an independent research activity.
- The current contract stores one optional conclusion text on Research, rather than a separate Conclusion entity.

```text
Research
  └── Conclusion
```

### Research and Comment

Comments are attached directly to Research.

- A Comment belongs to a Research.
- Comments are used for discussion, clarification, review, and collaboration around the Research.
- Comments are not attached directly to individual Sources, Findings, or Conclusions.
- This keeps the interaction model simple and predictable for users.

```text
Research
  └── Comment
```

### Research and Tag

Tags are attached to Research and provide classification and discovery support.

- Workspace → Tag: A Workspace can contain multiple Tags.
- Research ↔ Tag: Research and Tag have a many-to-many relationship through ResearchTag.
- A Tag can only be used by Research items within its Workspace.

```text
Workspace
   │
   ├── Research
   │
   └── Tag
         ▲
         │
    ResearchTag
         │
         ▼
      Research
```

### Conversation and Message

A Conversation consists of individual Messages.

- Conversation represents a dialogue between a user and the AI interaction layer within one Research.
- Each Conversation requires a Research; a Research can have multiple Conversations.
- Conversation history is persisted separately from the Research's Findings and Conclusion.
- Message represents an individual user or AI contribution within a Conversation.
- Messages are authored either by a User or by the AI system.

```text
Research
  └── Conversation
       └── Message (USER or AI)
```

### Research and Embedding

Embeddings are internal representations used to support semantic retrieval and AI-assisted search.

- Embeddings are generated from research-related data.
- They support retrieval rather than representing user-facing content.
- Phase 6 stores embeddings alongside text in RetrievalChunk, identifying the originating Finding or Research by scalar IDs.
- These identifiers are not foreign-key relations; synchronization and cleanup require application handling.

```text
Finding / Research conclusion / Research title and description
  └── RetrievalChunk (content + embedding)
```

### Overall Relationship

The core relationships can be summarized as follows:

```text
User
  ├── Membership ─────────────── Organization
  │                                  │
  │                                  └── Workspace
  │
  └── WorkspaceMembership ───────── Workspace
                                       │
                                       └── Research
                                            ├── Source
                                            ├── Finding
                                            ├── Conclusion
                                            ├── Comment
                                            ├── Tag
                                            └── Conversation
                                                 └── Message (USER or AI)

Research-related data
  └── RetrievalChunk (derived text + embedding; scalar IDs, not foreign keys)
```

These relationships establish the conceptual structure of the data model. Section 7 describes their current Prisma contract representation and the areas deferred to later phases.

## 5. Research Workflow

The research workflow is defined in the product definition.

The core workflow of Evidence Atlas is based on the following structure:

```text
Workspace
  └── Research
       ├── Source
       ├── Finding
       ├── Conclusion
       └── Comment
```

Research is the central unit of the workflow.

Sources provide external evidence, Findings capture relevant evidence and insights, and the Conclusion represents the overall synthesis of the Research. Comments support discussion and clarification around the Research.

The detailed research workflow, user interactions, and product behavior are defined in the product definition and are not duplicated here.

This document focuses on the data model required to support that workflow.

## 6. Data Ownership and Boundaries

Evidence Atlas separates data ownership boundaries from user roles and permissions.

A user's role determines what they are allowed to manage within a given boundary. It does not change who or what the underlying data belongs to.

### User-Level Data

A User represents an individual actor in the system.

User-level data is data that is directly created or managed by an individual User and is not inherently shared through an Organization or Workspace.

The exact scope of User-owned data is defined by the features that require it.

### Organization-Level Boundary

An Organization represents the broader shared boundary for organizational data.

Data that belongs to an Organization is shared within that organizational context rather than being owned by a specific Admin user.

Membership determines a User's participation and organization-level role.

```text
Organization
  ├── Membership
  └── Organization data
```

### Workspace-Level Boundary

A Workspace provides a more focused boundary within an Organization.

Research and related research data belong to a Workspace.

```text
Organization
  └── Workspace
       ├── Tag
       └── Research
            ├── Source
            ├── Finding
            ├── Conclusion
            ├── Comment
            └── ResearchTag ─── Tag
```

A User's participation in a Workspace is represented independently through WorkspaceMembership.

### Workspace Scope

Research belongs directly to a Workspace.

Research-related entities such as Source, Finding, and Comment belong to the Workspace through Research.

Tag belongs directly to a Workspace.

RetrievalChunk stores `workspaceId` and `researchId` for search scoping. The contract does not enforce these IDs through relations. The indexer copies them from Research, and retrieval uses the Workspace derived from the current Research. This is data selection, not membership enforcement.

### Roles and Ownership

Roles define permissions within their respective boundaries.

- Organization Admin has organization-level administrative permissions.
- Workspace Admin has workspace-level administrative permissions.
- Admin status does not make a User the owner of the organization's or workspace's data.
- Multiple users may have administrative roles within the same boundary.

This separation allows ownership boundaries and authorization rules to evolve independently.

### Boundary Principle

The primary data boundaries are:

```text
User
  │
  └── User-level data

Organization
  │
  └── Workspace
       │
       └── Research and related data
```

These boundaries provide the foundation for authorization design.

Detailed permission rules are defined separately from the data model and are not specified here.

## 7. Prisma Schema

The Prisma schema defines the persistent data model of Evidence Atlas.

The contract source is `src/prisma/contract.prisma`, with generated `contract.json` and `contract.d.ts` alongside it. The baseline migration is stored under `migrations/app/20260919T0109_baseline/`.

The follow-up migration `migrations/app/20260925T0120_cascade_finding_source_delete/` adds `ON DELETE CASCADE` to both FindingSource foreign keys. This describes the checked-in migration; its application to a running database is not verified by this documentation review.

The migrations `20260926T0033_add_research_conversation` and `20260926T0039_require_conversation_research` add the Conversation–Research relationship and make `researchId` required. The current contract scopes each Conversation to exactly one Research.

Phase 6 adds `migrations/pgvector/20260601T0000_install_vector_extension/` and `migrations/app/20260929T0308_add_retrieval_chunks/` for vector support and retrieval storage. Their presence records schema evolution, not verification that a particular database has applied them.

The initial schema focuses on the core research workflow and the relationships established in the data model. Implementation-specific details and fields that are not yet required are intentionally deferred.

### 7.1 Core Entities

The current contract implements the following models:

- `User`
- `Organization`
- `Membership`
- `Workspace`
- `WorkspaceMembership`
- `Research`
- `Source`
- `Finding`
- `FindingSource`
- `Comment`
- `Tag`
- `ResearchTag`
- `Conversation`
- `Message`
- `RetrievalChunk`

`Conclusion` is stored as `Research.conclusion`; embeddings are stored in `RetrievalChunk.embedding`, not a separate Embedding model. Conversation and Message retain Research-scoped ownership while generation can retrieve knowledge across the same Workspace.

### 7.2 Organization and Workspace

`Membership` represents the relationship between a `User` and an `Organization`.

An organization-level role is stored on the membership itself.

`WorkspaceMembership` independently represents the relationship between a `User` and a `Workspace`.

Organization-level and workspace-level roles are independent. A user's role in an organization does not determine their role in an individual workspace.

Both role enums contain `ADMIN` and `MEMBER`. Membership pairs are composite primary keys: `(userId, organizationId)` and `(userId, workspaceId)`. These records do not by themselves implement application authorization.

### 7.3 Research

`Research` is the central entity of the research workflow.

A Research:

- belongs to a `Workspace`
- records the `User` who created it
- represents a research subject or question
- contains `Sources`
- contains `Findings`
- may contain a `Conclusion`
- contains `Comments`
- can be classified with `Tags`

Research has a lifecycle status:

```text
IN_PROGRESS
COMPLETED
ARCHIVED
```

The initial status is `IN_PROGRESS`.

The status represents the lifecycle of the research and is independent of its conclusion.

A Research may therefore exist without a conclusion while it is still in progress.

The detail page displays the current status and allows changing it to any of the three values. Application validation checks the enum value; it does not require a Conclusion before completion or make archived Research read-only.

### 7.4 Source

`Source` represents an external source of information used by research.

For the MVP, sources are primarily external links or URLs.

A Source is independent from a Finding so that the same source can be referenced by multiple Findings.

The current Source fields are `title`, `url`, `researchId`, an ID, and timestamps. Additional source metadata and notes are not modeled yet.

### 7.5 Finding

`Finding` represents an important piece of evidence, observation, or insight identified during Research.

A Finding contains:

- content describing the finding
- optional JSON data (`data`)
- a display style (`displayStyle`)

The display style determines how the Finding is presented in the UI.

The current contract defines only `TEXT`, which is the default display style. The UI edits textual content; additional display styles, author selection, and structured data editing remain future work.

A Finding can reference one or more Sources through `FindingSource`.

This preserves traceability between a finding and its supporting evidence.

The contract permits a Finding without any FindingSource rows. Content creation/editing and evidence linking are separate operations. On the detail page, each Finding displays its supporting Sources, allows attaching an existing Source from the same Research, and allows removing individual links.

### 7.6 Finding–Source Relationship

`FindingSource` represents the relationship between `Finding` and `Source`.

The relationship is many-to-many:

```text
Finding ←→ Source
```

A Finding may be supported by multiple Sources, and a Source may support multiple Findings.

The join entity is used instead of storing source references directly inside Finding.

The composite primary key `(findingId, sourceId)` prevents duplicate links. The attachment action checks that both records belong to the same Research; the separate foreign keys alone do not enforce this boundary. The UI offers only Sources from that Research that are not already attached.

Removing a link deletes only the FindingSource row. Both foreign keys define `onDelete: Cascade`: deleting a Finding or Source removes its association rows while preserving the records on the other side. A Finding may consequently remain without supporting Sources.

### 7.7 Conclusion

A Conclusion represents the overall synthesis or result of a Research.

At this stage, Conclusion is intentionally kept simple.

A Research may have a conclusion, but a conclusion is not required while the Research is in progress.

The current design does not make Conclusion a separate entity. It is represented as the optional string field `Research.conclusion`.

The Research detail page displays the stored Conclusion and provides an editor. Application validation trims the text and limits it to 5,000 characters; an empty value is stored as null.

The exact fields and representation of the conclusion will be considered separately if future requirements justify additional structure.

### 7.8 Comment

`Comment` represents discussion, clarification, or feedback related to a Research.

A Comment:

- belongs to a Research
- is authored by a User
- contains textual content

Comments are not used as independent personal notes and are not attached directly to individual Findings or Sources.

### 7.9 Tag

Tag belongs to a Workspace.

Tag names are unique within a Workspace.

Research and Tag have a many-to-many relationship through ResearchTag.

The contract enforces unique `(workspaceId, name)` pairs and unique `(researchId, tagId)` pairs. The separate foreign keys do not enforce that a Research and its Tags share a Workspace. The current tag assignment action preserves this boundary by looking up or creating Tags within the target Research's Workspace.

The Research detail page accepts a Tag name, reuses an existing Tag in the same Workspace or creates one, and attaches it through ResearchTag. Names are trimmed and validated as 1–50 characters by the application. Duplicate attachments are rejected. Creating a new Tag and its ResearchTag association happens in one transaction.

Tags are displayed on the Research list and detail pages. Detaching a Tag deletes only the ResearchTag association; the Tag and its associations with other Research items remain. Tag renaming, Workspace-level Tag deletion, and Tag filtering are not implemented.

### 7.10 Conversation and Message

`Conversation` represents a Research-scoped conversation within the AI interaction layer.

A Conversation has a required `researchId`, an ID, and creation/update timestamps. Its Workspace and Organization boundaries follow its Research. The Research relation declares `onDelete: Cascade`; the Message–Conversation relation does not declare cascading deletion, so this is not a complete Research/transcript deletion workflow.

`Message` represents an individual message within a Conversation and records whether it was authored by a User or generated by AI.

`Message.authorType` contains `USER` or `AI`; it does not identify an individual User. Neither Conversation nor Message records an authenticated author. `Message.authorType` contains `USER` or `AI`; it does not identify an individual User. Neither Conversation nor Message records an authenticated author.

Authentication and Research access are enforced by the application before Conversation or Message data is read or written. Research access is derived through the Conversation's Research and its Workspace membership boundary.

The application explicitly creates Conversations, retrieves context, and then appends user messages before generation. Retrieval failure does not save the new user turn. An AI Message is saved only when generation finishes with `finishReason: "stop"` and text that is non-empty before citation validation. Later failures may leave a user message without a saved AI reply. Accepting a user message explicitly updates `Conversation.updatedAt`; history lists use that timestamp and the first user message as a preview.

Messages store visible text with allowed `[source:<source-id>]` citation markers. Before saving an AI reply, the server removes recognized markers outside the Sources linked to Findings supplied in that request's current and retrieved contexts. Citations are not foreign keys or separate records. Conversation detail resolves persisted IDs against current Workspace Sources; metadata changes and deletions therefore affect restored supporting evidence. Context snapshots, retrieval results, and execution details are not persisted. See [AI Architecture](ai-architecture.md) for the separate live-stream, persistence, and presentation boundaries.

### 7.11 RetrievalChunk and Embedding

`RetrievalChunk` maps to `retrievalChunk`. Its embedding uses the contract type `Embedding768 = pgvector.Vector(768)`.

| Field                       | Meaning                                                   |
| --------------------------- | --------------------------------------------------------- |
| `id`                        | UUID chunk identity                                       |
| `workspaceId`, `researchId` | Scalar scope identifiers                                  |
| `sourceType`                | `FINDING`, `CONCLUSION`, or `RESEARCH`                    |
| `sourceId`                  | Finding ID for `FINDING`; Research ID for the other types |
| `chunkIndex`                | Position within the original knowledge item               |
| `content`                   | Indexed text snapshot                                     |
| `embedding`                 | 768-dimensional vector                                    |
| `createdAt`, `updatedAt`    | Row timestamps                                            |

`sourceId` here is not a citation Source ID. Supporting Sources are obtained from current FindingSource relationships during hydration, not stored on the chunk.

The contract enforces uniqueness on `(sourceType, sourceId, chunkIndex)` and ordinary indexes on `workspaceId` and `researchId`. It has no HNSW/IVFFlat vector index and no foreign keys to Workspace, Research, or Finding. Deleting original knowledge therefore does not cascade to chunks.

Explicit indexing generates embeddings, then transactionally replaces all chunks for one Research. CRUD does not automatically reindex or clean up derived rows. Retrieval skips missing records but can return stale text for edited records until reindexing. The table stores neither embedding model/version metadata nor a historical snapshot of Source links. Chunking, model settings, search selection, and evaluation are defined in [AI Architecture](ai-architecture.md#13-phase-6-retrieval--rag).

### 7.12 Schema Design Principles

The initial Prisma schema follows these principles:

- Keep entity responsibilities explicit.
- Use explicit relationship entities where relationships have their own meaning.
- Preserve traceability between Findings and Sources.
- Keep Research as the central entity of the core workflow.
- Avoid adding fields before their domain purpose is clear.
- Keep presentation concerns separate from the underlying research data where possible.
- Keep derived retrieval data separate from original knowledge and conversation records.
- Prefer a small, understandable schema over premature generalization.

## 8. Database Considerations

The database design prioritizes clear ownership, traceable relationships, and a small schema that can evolve as requirements become clearer.

### 8.1 Data Boundaries

Data ownership follows the application hierarchy:

```text
Organization
    └── Workspace
          ├── Tag
          └── Research
                ├── Source
                ├── Finding
                ├── Comment
                ├── conclusion (optional text)
                └── ResearchTag ─── Tag
```

Organization and Workspace provide shared boundaries for research-related data.

Roles and permissions are represented separately through membership entities and do not determine data ownership.

### 8.2 Relationship Design

Relationships that have their own domain meaning are represented explicitly.

Examples include:

- `Membership` for User–Organization membership
- `WorkspaceMembership` for User–Workspace membership
- `FindingSource` for Finding–Source relationships
- `ResearchTag` for Research–Tag relationships

This keeps relationships explicit and avoids embedding relationship-specific behavior into unrelated entities.

### 8.3 Traceability

Findings should remain traceable to their supporting Sources.

A Finding can reference multiple Sources, while a Source can support multiple Findings.

This relationship is represented through `FindingSource`.

Traceability is a core database requirement because evidence should remain connected to its original source.

### 8.4 Optional and Lifecycle Data

The schema should distinguish between lifecycle state and optional content.

For example, Research has an explicit status:

```text
IN_PROGRESS
COMPLETED
ARCHIVED
```

while `conclusion` remains optional.

This allows research to exist and accumulate Findings before a final conclusion is available.

### 8.5 Avoid Premature Structure

The database should not be expanded solely for possible future features.

Fields and entities should be introduced when their domain purpose is clear.

In particular:

- Conclusion remains part of Research unless independent lifecycle or metadata becomes necessary.
- Finding data is kept flexible while its presentation requirements are explored.
- RetrievalChunk provides the Phase 6 storage baseline; additional provenance, synchronization, and indexing structures should follow demonstrated needs.

### 8.6 Evolution

The initial database schema is intentionally small and should evolve with the product.

Changes to the schema should be driven by established requirements rather than speculative future use cases.

Migration history should be maintained through Prisma migrations so that database changes remain reproducible and reviewable.

### 8.7 Tag Scope

Tags are scoped to Workspace rather than globally.

This allows different Workspaces to use the same Tag name independently while preventing duplicate Tag names within the same Workspace.

## 9. Status

This document defines the current data model and database design for the Evidence Atlas MVP.

The core entities, responsibilities, relationships, ownership boundaries, and initial Prisma schema design have been established.

The repository contains the Prisma contract, generated artifacts, migrations for core data, FindingSource cascades, Research-owned conversations, and pgvector retrieval storage, plus development seed data. Database-backed Research, Source, Finding, and Comment operations, Finding–Source link management, lifecycle controls, Conclusion editing, and Tag creation, attachment, display, and detachment are implemented. The overview and Research discovery controls use stored Workspace data. Phases 2 and 4–7 are recorded as complete for their baseline scopes in the [roadmap](../planning/roadmap.md); this document review does not re-verify a running database.

Workspace selection and enforcement of authenticated User and Workspace access boundaries are implemented at the application layer. Organization and Workspace membership administration currently covers role management, while invitation flows, member removal flows, and advanced permission management remain outside the Phase 7 baseline.

Tag renaming, Workspace-level Tag deletion, and Tag filtering are also not implemented. Schema support should not be read as completion of these application features.

Phase 5 adds required Research ownership for Conversations and persisted user/AI Messages. Phase 6 adds same-Workspace retrieval without changing Conversation ownership. A standalone Workspace conversation model is not implemented.

Automatic index synchronization, vector-index tuning, richer provenance, and future storage extensions remain deferred. The existing index and retrieval pipeline are described in [AI Architecture](ai-architecture.md).
