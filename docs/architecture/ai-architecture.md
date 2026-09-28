# AI Architecture

> **Status:** Implemented baseline
> **Scope:** Phase 5 — AI Integration

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

The current development provider uses Google Gemini.

The provider receives:

1. the system instructions,
2. the current Research context,
3. persisted conversation history,
4. the new user message.

The response is streamed back to the client.

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

On larger screens, the AI Assistant is displayed alongside the Research detail content.

On smaller screens, a persistent action opens the AI Assistant in a dialog.

Both interfaces reuse the same Research AI panel and conversation behavior rather than maintaining separate AI implementations.

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
