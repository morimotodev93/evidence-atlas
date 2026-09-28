# AI Architecture

> **Status:** Implemented baseline
> **Scope:** Phase 5 — AI Integration
> **Last Updated:** 2026-09-28

## 1. Purpose

Evidence Atlas uses AI as an assisting layer over structured research knowledge.

AI does not replace the underlying research process or act as an authoritative source of truth. Answers should remain grounded in accumulated research knowledge and traceable to supporting evidence.

The current AI architecture establishes the basic grounded conversation workflow before retrieval-augmented generation (RAG) is introduced.

---

## 2. Current Architecture

The Phase 5 AI flow is:

```text
Research
   ↓
Research Context
   ├── Research metadata
   ├── Conclusion
   ├── Findings
   └── Finding → Sources
          ↓
      AI SDK
          ↓
   Model Provider
          ↓
  Streaming Response
          ↓
Source Citation Markers
          ↓
Application Validation
          ↓
Answer + Supporting Sources
```

AI interaction is currently scoped to a single Research.

Workspace-wide retrieval, embeddings, vector search, and ranking are not part of the Phase 5 architecture.

---

## 3. Research Context

The server builds AI context from the current Research.

The context contains:

- Research ID
- Research title
- Research description
- Research conclusion
- Findings
- Sources linked to each Finding
- Research Sources

A linked Source is represented using its stored ID, title, and URL.

The Source metadata identifies supporting evidence. Providing a Source title or URL to the model does not imply that the model has read or retrieved the external source content.

The current implementation therefore grounds answers in information already stored inside Evidence Atlas rather than fetching external source contents.

---

## 4. AI Provider Boundary

AI requests use the AI SDK.

Provider-specific model configuration is isolated from the Research chat flow so that application behavior does not need to depend directly on provider-specific APIs.

The current development provider uses Google Generative AI through `@ai-sdk/google`. `src/lib/ai/model.ts` configures the model ID `gemini-3.6-flash`; this is the checked-in configuration, not a provider-availability verification performed by this review.

The provider receives:

1. the system instructions,
2. the current Research context,
3. persisted conversation history,
4. the new user message.

The response is streamed back to the client.

The transport is a plain text stream consumed with `fetch` and a stream reader. The server loads persisted history rather than trusting client-supplied message history. It rebuilds Research context on every request; Comments and other Research items are not included. No history truncation or context-size budget is implemented.

---

## 5. Conversation Model

AI conversations belong to a Research.

```text
Research
   └── Conversation
          └── Message
```

A Message is authored by either:

```text
USER
AI
```

Conversation history is persisted so that users can restore previous AI conversations.

The persistence boundary follows this principle:

> Persist the conversation, not the execution.

The application persists visible user messages and completed AI responses.

It does not persist AI execution internals such as:

- system prompts,
- serialized Research context snapshots,
- streaming chunks,
- provider request or response objects,
- internal reasoning.

Failed or incomplete AI responses are not intentionally persisted as completed AI Messages.

Specifically, the user message is saved before generation, and an AI message is saved only for a non-empty response with finish reason `stop`. Conversation activity is updated when the user message is accepted. History is ordered by that activity timestamp and previews the first user message. Failed requests can leave persisted user messages even when the client removes the attempted exchange from its display; retry and durable failure-state handling are deferred.

The API surface is:

| Method and route | Behavior |
| --- | --- |
| POST `/research/[id]/chat/conversations` | Explicitly create a Conversation; return 201 |
| GET `/research/[id]/chat/conversations` | List Research conversations by recent activity with previews |
| GET `/research/[id]/chat/conversations/[conversationId]` | Return the conversation and messages in creation order |
| POST `/research/[id]/chat` | Accept `conversationId` and a non-empty `message`, persist the user turn, and stream the answer |

Conversation detail and chat requests match both Conversation ID and Research ID. These checks do not authenticate users or enforce Workspace membership.

---

## 6. Source-Aware Answers

AI answers can reference supporting Sources using an application-level citation marker:

```text
[source:<source-id>]
```

For example:

```text
This finding is supported by the recorded Prisma documentation. [source:abc123]
```

The model is instructed to use only Source IDs supplied in the Research context.

A Source should be cited only when it is linked to a Finding that supports the relevant claim.

Findings without linked Sources may still be used as Research knowledge, but the model must not fabricate a Source citation for them.

Research-level Source existence alone is not sufficient evidence for a citation.

---

## 7. Citation Persistence and Presentation

Citation markers are stored unchanged inside `Message.content`.

```text
AI response
   ↓
Raw response with [source:ID]
   ↓
Message.content
```

Citation interpretation happens at the presentation boundary rather than during persistence.

```text
Message.content
   ↓
parseSourceCitations()
   ↓
Answer text + Source IDs
   ↓
Validate IDs against current Research Sources
   ↓
Valid Supporting Sources
   ↓
UI
```

This keeps the persisted AI response independent from the current presentation design.

It also allows restored conversation history to reconstruct supporting evidence from the stored citation markers.

---

## 8. Citation Validation

Model-generated Source IDs are not trusted directly.

After citation markers are parsed, each Source ID is checked against Sources belonging to the current Research.

Only matching Sources are exposed as supporting evidence in the UI.

Conceptually:

```text
Model citation
[source:abc123]
       ↓
Parse Source ID
       ↓
Does abc123 exist in this Research?
       ↓
    yes → display Source
     no → ignore citation
```

This separates two responsibilities:

```text
Model
→ proposes evidence references

Application
→ validates and presents evidence references
```

The application remains responsible for determining whether a referenced Source is a valid Research Source.

Current validation only checks Source membership in the Research using the Sources supplied to the panel. It does not verify the cited Finding–Source relationship or whether a Source supports the answer's claim; those constraints are prompt instructions. Repeated citation IDs are deduplicated, and unresolved IDs are omitted from Supporting sources. Restored transcripts resolve against current Source metadata rather than a historical snapshot.

---

## 9. Supporting Evidence UI

Validated Sources are displayed separately from the generated answer under:

```text
Supporting sources
```

The citation marker itself is not shown in the final rendered answer.

A supporting Source displays its stored title and links to its stored URL.

If an answer contains no valid Source citations, the Supporting Sources section is omitted.

This distinction keeps AI-generated text visually separate from evidence references.

---

## 10. Insufficient Evidence

The model is instructed to answer only from the supplied Research context.

This is prompt-based behavior, not a deterministic evidence-sufficiency check. Its reliability still requires evaluation.

When the available Research context does not contain enough information, the model should state that limitation rather than filling the gap with unrelated model knowledge.

The expected behavior is:

```text
Question
   ↓
Relevant Research knowledge exists?
   ├── yes → grounded answer
   └── no  → insufficient-evidence response
```

A Finding without a linked Source can still contribute to an answer, but its lack of supporting Source should not be hidden by a fabricated citation.

---

## 11. Desktop and Mobile Interaction

The same Research AI conversation functionality is used across viewport sizes.

At the `lg` breakpoint and above, the AI Assistant is displayed in a sticky, 20rem right-hand column alongside the single-column Research content. The panel is always visible; there is no desktop open/close control.

Below `lg`, a fixed bottom Ask AI action opens the AI Assistant in a dialog with a maximum height of `90dvh` and scrollable content.

Both interfaces reuse the same Research AI panel and conversation behavior rather than maintaining separate AI implementations.

Component reuse does not mean shared live state: the desktop and dialog panels have separate selected-conversation, message, and draft state. History restores persisted messages; drafts and in-progress streams are not synchronized between layouts. Users create a conversation with New or restore one with History before sending a question. The UI provides creation, loading, restoration, and submission feedback, but has no stop-generation control. Responsive and accessibility verification remain outstanding.

---

## 12. Current Boundaries

The Phase 5 architecture intentionally does not implement:

- embeddings,
- vector search,
- pgvector retrieval,
- semantic ranking,
- chunking,
- workspace-wide retrieval,
- automatic external Source fetching,
- automatic conversion of AI responses into Findings or Conclusions,
- advanced citation verification against external source contents.

Authentication, membership enforcement, rate limiting, and read-only public Demo controls are also absent. The current Research-scoped baseline does not complete the broader Workspace-wide product workflow or establish public-demo readiness.

These responsibilities require additional retrieval and evidence-processing design and belong to later phases.

---

## 13. Phase 6 Extension

Phase 6 can extend the context-selection boundary without replacing the basic conversation architecture.

Current:

```text
Research
   ↓
Build Research Context
   ↓
AI
```

Future:

```text
Workspace Knowledge
       ↓
Retrieval
       ↓
Relevant Context
       ↓
AI
       ↓
Grounded Answer
       ↓
Supporting Evidence
```

The existing conversation, streaming, citation parsing, validation, and supporting-evidence presentation can remain useful when retrieval is introduced.

The primary Phase 6 change is therefore expected around how relevant context is selected, rather than requiring the Phase 5 interaction model to be replaced.

---

## 14. Architectural Principles

The AI implementation follows these principles:

1. **Ground AI in stored research knowledge.**
2. **Keep evidence traceable.**
3. **Treat AI as an assisting layer, not an authoritative source.**
4. **Validate model-generated evidence references in the application.**
5. **Keep persistence independent from presentation.**
6. **Persist conversation state rather than provider execution details.**
7. **Introduce retrieval infrastructure only when its requirements are clear.**
8. **Prefer incremental architecture over premature abstraction.**
