# Data Model

> Status: Draft
> Last Updated: 2026-09-11

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

Classification metadata used to organize and discover Research.

### Conversation

An independent dialogue unit used for interaction with the AI system.

### Message

An individual user or AI contribution within a Conversation.

### Embedding

An internal vector representation used for semantic retrieval and AI-assisted search.

## 3. Entity Responsibilities

### User

- Represents an individual user.
- Owns the data they create or manage.

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

Represents a classification label used to organize and discover research-related data.

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

The purpose of this section is to define the conceptual relationships between entities. Database-specific details such as foreign keys, join tables, deletion behavior, and exact cardinality are defined during schema design.

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
- A Finding may potentially be supported by multiple Sources, so the exact database relationship is defined during schema design.

```text
Source
  └── supports ─── Finding
```

### Research and Conclusion

Conclusion represents the overall result or synthesis of a Research.

- A Conclusion belongs to a Research.
- The Conclusion is based on the findings and evidence accumulated during the Research.
- It represents the final synthesis rather than an independent research activity.
- The exact cardinality is finalized during schema design.

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

- A Tag helps organize and categorize Research.
- Tags can be used for filtering and discovering related Research.
- Tags are not attached directly to Sources, Findings, or Conclusions.
- The exact ownership and scope of Tags are finalized during schema design.

```text
Research
  └── Tag
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

These relationships establish the conceptual structure of the data model without prematurely defining database-specific implementation details. The next stage can translate these relationships into concrete Prisma models, cardinality, foreign keys, join tables, and deletion behavior.

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

```text id="2t0r8p"
Organization
  ├── Membership
  └── Organization data
```

### Workspace-Level Boundary

A Workspace provides a more focused boundary within an Organization.

Research and related research data belong to a Workspace.

```text id="9p4x6c"
Organization
  └── Workspace
       └── Research
            ├── Source
            ├── Finding
            ├── Conclusion
            ├── Comment
            └── Tag
```

A User's participation in a Workspace is represented independently through WorkspaceMembership.

### Roles and Ownership

Roles define permissions within their respective boundaries.

- Organization Admin has organization-level administrative permissions.
- Workspace Admin has workspace-level administrative permissions.
- Admin status does not make a User the owner of the organization's or workspace's data.
- Multiple users may have administrative roles within the same boundary.

This separation allows ownership boundaries and authorization rules to evolve independently.

### Boundary Principle

The primary data boundaries are:

```text id="x0n7mf"
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

## 8. Database Considerations

## 9. Status
