# Data Model

> Status: Core contract implemented; AI/RAG design remains provisional
> Last Updated: 2026-09-24

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

An independent dialogue unit used for interaction with the AI system.

### Message

An individual user or AI contribution within a Conversation.

### Embedding

An internal vector representation used for semantic retrieval and AI-assisted search.

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

Represents a standalone conversation related to research and knowledge exploration.

- Groups messages into a single conversation.
- Provides a context for user and AI interactions.
- May reference relevant research or accumulated knowledge.

### Message

Represents an individual message within a conversation.

- Records a user's or AI's contribution to a conversation.
- Belongs to a conversation.

### Embedding

Represents a vector representation of research-related content used for semantic search and AI-assisted retrieval.

- Supports semantic search and retrieval.
- Is generated from existing research-related data.
- Is managed as internal application data rather than user-facing content.

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

- Conversation represents an independent dialogue between a User and the AI interaction layer.
- A Conversation does not have to belong directly to a specific Research item.
- A Conversation may reference relevant Research or accumulated knowledge when needed.
- Message represents an individual user or AI contribution within a Conversation.
- Messages are authored either by a User or by the AI system.

```text
Conversation
  └── Message
       ├── User
       └── AI
```

### Research and Embedding

Embeddings are internal representations used to support semantic retrieval and AI-assisted search.

- Embeddings are generated from research-related data.
- They support retrieval rather than representing user-facing content.
- Embeddings may reference the underlying data from which they were generated.
- The exact entities that are embedded and the storage structure are defined during AI/RAG architecture and schema design.

```text
Research-related data
  └── Embedding
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
                                            └── Tag

Conversation
  └── Message
       ├── User
       └── AI

Research-related data
  └── Embedding
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

`Conclusion` is stored as `Research.conclusion`; `Embedding` remains a planned concept and has no model in the current contract. Conversation and Message models exist, but AI interactions are not implemented.

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

The contract permits a Finding without any FindingSource rows. The current create/edit forms do not manage these links, and the detail page does not display them. This is an implementation gap relative to the evidence-traceability workflow in the product definition.

### 7.6 Finding–Source Relationship

`FindingSource` represents the relationship between `Finding` and `Source`.

The relationship is many-to-many:

```text
Finding ←→ Source
```

A Finding may be supported by multiple Sources, and a Source may support multiple Findings.

The join entity is used instead of storing source references directly inside Finding.

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

`Conversation` represents an independent conversation within the AI interaction layer.

A Conversation does not need to belong directly to a Research.

`Message` represents an individual message within a Conversation and records whether it was authored by a User or generated by AI.

`Message.authorType` contains `USER` or `AI`; it does not identify an individual User. Conversation currently has no User, Organization, Workspace, or Research foreign key. Ownership and access boundaries must be defined before AI interactions are exposed.

The detailed relationship between conversations and accumulated research knowledge will be defined as the AI/RAG architecture is designed.

### 7.11 Embedding

`Embedding` represents an internal vector representation used for semantic search and AI retrieval.

The exact entities to be embedded, storage strategy, and retrieval architecture are deferred to the AI/RAG design phase.

### 7.12 Schema Design Principles

The initial Prisma schema follows these principles:

- Keep entity responsibilities explicit.
- Use explicit relationship entities where relationships have their own meaning.
- Preserve traceability between Findings and Sources.
- Keep Research as the central entity of the core workflow.
- Avoid adding fields before their domain purpose is clear.
- Keep presentation concerns separate from the underlying research data where possible.
- Defer AI/RAG-specific implementation details until their requirements are defined.
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
- AI/RAG-specific storage details are deferred until their requirements are defined.

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

The repository contains the Prisma contract, generated artifacts, baseline migration, and development seed data. Database-backed Research, Source, Finding, and Comment operations, plus Tag creation, attachment, display, and detachment, are implemented. Phase 2 is recorded as complete in the [roadmap](../planning/roadmap.md); this document review does not re-verify the state of a running database.

Remaining integration work includes Finding–Source link management, lifecycle controls, discovery controls, and enforcement of user and workspace access boundaries. Tag renaming and Workspace-level Tag deletion are also not implemented. Schema support should not be read as completion of these application features.

Details that are not yet required by the MVP, such as advanced AI/RAG storage, detailed indexing strategies, and future extensions, remain intentionally deferred.
