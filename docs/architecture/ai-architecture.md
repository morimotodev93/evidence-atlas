# AI Architecture

> **Status:** Implemented Phase 6 baseline with Phase 7 route authorization and Phase 8.3 background indexing
> **Scope:** Phase 5 AI Integration + Phase 6 Retrieval / RAG + Phase 7 AI route access control + Phase 8.3 Background Jobs
> **Last Updated:** 2026-10-08

## 1. Purpose

Evidence Atlas uses AI as an assisting layer over structured research knowledge.

AI does not replace the underlying research process or act as an authoritative source of truth. Answers should remain grounded in accumulated research knowledge and traceable to supporting evidence.

Phase 6 adds Workspace-wide retrieval to the Phase 5 grounded conversation workflow. Phase 7 adds authentication and Workspace-membership authorization to the Research-scoped AI routes. This document describes code currently present in the repository; it does not report a new database or provider verification.

---

## 2. Current Architecture

The Phase 6 AI flow is:

```text
Workspace knowledge -> Chunking -> Document embeddings -> RetrievalChunk
                                                              ↓
User message -> Query embedding -> Workspace cosine search -> Selected context
                                                              +
Current Research context + persisted conversation history -----+
                                                              ↓
                                                    AI SDK / Model Provider
                                                              ↓
                                              Plain text stream -> Research UI
                                                              ↓
                                  Completed answer -> Citation validation -> Message
                                                              ↓
                                  Workspace Source resolution -> Supporting sources
```

Conversations and the interaction entry point remain scoped to a single Research. Retrieval supplements the full current Research context with related knowledge from the same Workspace, including the current Research when it matches.

The server derives the Workspace ID from the authorized current Research. Research-scoped AI Route Handlers authenticate the caller and verify access to the Research through its Workspace membership boundary before Conversation data, Research context, Workspace retrieval, or Message persistence is accessed.

## Workspace filtering inside retrieval remains a data-selection boundary rather than an authorization mechanism. Authorization occurs before retrieval begins.

## 3. Research Context

The server builds AI context from the current Research.

The context contains:

- Research ID
- Workspace ID
- Research title
- Research description
- Research conclusion
- Findings
- Sources linked to each Finding
- Research Sources

A linked Source is represented using its stored ID, title, and URL.

The Source metadata identifies supporting evidence. Providing a Source title or URL to the model does not imply that the model has read or retrieved the external source content.

The current implementation therefore grounds answers in information already stored inside Evidence Atlas rather than fetching external source contents. Retrieved context is supplied separately; its selection and indexing lifecycle are described in Section 13.

---

## 4. AI Provider Boundary

AI requests use the AI SDK.

Provider-specific model configuration is isolated from the Research chat flow so that application behavior does not need to depend directly on provider-specific APIs.

The current development provider uses Google Generative AI through `@ai-sdk/google`. `src/lib/ai/model.ts` configures the model ID `gemini-3.6-flash`; this is the checked-in configuration, not a provider-availability verification performed by this review.

The provider receives:

1. the system instructions,
2. the current Research context,
3. selected Workspace retrieval context,
4. persisted conversation history,
5. the new user message.

The response is streamed back to the client.

The transport is a plain text stream consumed with `fetch` and a stream reader. The server loads persisted history rather than trusting client-supplied message history. It rebuilds Research context and retrieves Workspace context on every request. Comments are not included. No history truncation or total context-size budget is implemented; the retrieval result limit is not a total prompt budget.

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

> Persist the conversation and limited usage metadata, without storing execution payloads.

The application persists visible user messages and completed AI responses.

Limited generation metadata is stored separately in `AiUsageEvent`; see Rate Limiting & Usage Tracking below.

It does not persist AI execution internals such as:

- system prompts,
- serialized Research context snapshots,
- streaming chunks,
- provider request or response objects,
- internal reasoning.

Failed or incomplete AI responses are not intentionally persisted as completed AI Messages.

Specifically, retrieval runs before the user message is saved. The user message is then saved before generation, and an AI message is saved only for a response that is non-empty before citation validation and has finish reason `stop`.

All Research-scoped chat routes authenticate the caller before accessing Conversation or Message data. The requested Research is then authorized through its Workspace membership boundary.

Conversation-specific operations additionally match both Conversation ID and the authorized Research ID. This prevents a Conversation belonging to another Research from being accessed by supplying its ID directly.

Unauthenticated API requests return `401`. Requests for inaccessible Research, or for Conversations outside the authorized Research, return `404` without exposing the protected resource through subsequent reads or writes.

Conversation activity is updated when the user message is accepted. History is ordered by that activity timestamp and previews the first user message. Retrieval failures do not save the new user turn; later failures can leave persisted user messages even when the client removes the attempted exchange from its display. Retry and durable failure-state handling are deferred. Retrieval results, distances, and context snapshots are not persisted with messages.

The API surface is:

| Method and route                                         | Behavior                                                                                                                    |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| POST `/research/[id]/chat/conversations`                 | Explicitly create a Conversation; return 201                                                                                |
| GET `/research/[id]/chat/conversations`                  | List Research conversations by recent activity with previews                                                                |
| GET `/research/[id]/chat/conversations/[conversationId]` | Return the conversation, messages in creation order, and cited Sources resolved within its Workspace                        |
| POST `/research/[id]/chat`                               | Accept `conversationId` and a non-empty `message`, retrieve Workspace context, persist the user turn, and stream the answer |

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

The model is instructed to use only Source IDs supplied in the current Research and Workspace retrieval contexts, and not to reproduce Source URLs in answer text.

A Source should be cited only when it is linked to a Finding that supports the relevant claim.

Findings without linked Sources may still be used as Research knowledge, but the model must not fabricate a Source citation for them.

Research-level Source existence alone is not sufficient evidence for a citation.

---

## 7. Citation Persistence and Presentation

Before saving a completed AI answer, the server removes recognized citation markers whose IDs are outside the request's allowed Source ID set. Allowed markers remain inside `Message.content`.

```text
AI response
   ↓
Raw response with [source:ID]
   ↓
validateSourceCitations() against request allowlist
   ↓
Message.content with allowed citation markers
```

Citation eligibility is checked during persistence; citation parsing and Source presentation remain separate concerns.

```text
Message.content
   ↓
parseSourceCitations()
   ↓
Answer text + Source IDs
   ↓
Resolve IDs against current Workspace Sources
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

For each request, the server builds an allowlist from Sources linked to Findings in the full current Research context and Sources linked to retrieved `FINDING` results. A Source appearing only in the Research-level Source list or previous conversation history is not automatically eligible.

`validateSourceCitations()` removes recognized markers outside that set before persistence. It does not verify that an eligible Source supports a particular claim or validate arbitrary prose and links.

Conceptually:

```text
Model citation
[source:abc123]
       ↓
Parse Source ID
       ↓
Is abc123 linked to a Finding supplied for this request?
       ↓
    yes → retain marker in persisted answer
     no → remove marker from persisted answer
```

This separates two responsibilities:

```text
Model
→ proposes evidence references

Application
→ validates and presents evidence references
```

Conversation detail parses persisted AI citation IDs and calls `resolveWorkspaceSources()`. The resolver deduplicates IDs and restricts Sources to Research items in the Conversation's current Workspace, returning a conversation-level `sources` array.

The panel resolves citation IDs against conversation Sources first, then falls back to its current Research Sources. Repeated IDs are deduplicated and unresolved IDs are omitted. Restored transcripts resolve current Source metadata rather than a historical snapshot; history loading does not revalidate the original Finding–Source relationship or migrate older Phase 5 markers.

The outgoing text stream is not filtered by the persistence allowlist. After streaming, the panel fetches conversation detail to refresh Sources, but does not replace live messages with validated persisted text. Live and restored answers can therefore differ. Live Source lookup uses conversation-level Sources and the Research fallback, not the per-request allowlist. A Source refresh failure is logged without failing the completed exchange.

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

### Rate Limiting & Usage Tracking

The generation route (`POST /research/[id]/chat`) uses Upstash Redis and `@upstash/ratelimit` with a sliding window of 10 requests per minute. The limiter identifier is `workspaceId:userId`, so the limit applies per Workspace × User.

```text
Authentication
    ↓
Research access
    ↓
Request validation
    ↓
Conversation ownership (Conversation belongs to the requested Research)
    ↓
AI chat rate limit
    ↓
Research context
    ↓
Workspace retrieval / embedding
    ↓
Gemini generation
```

Authentication, access, request validation, and Conversation ownership checks precede the limiter. A denied request returns HTTP `429` with `Retry-After` in seconds until the rate-limit reset (rounded up, with a minimum of one second). Because rejection precedes retrieval, embedding, and generation, rate-limit-denied requests make no AI provider calls and incur no embedding or generation cost.

```text
streamText
    ↓
onFinish
    ├── persist AiUsageEvent from totalUsage
    └── if finishReason === "stop" and text is non-empty
           ↓
         validate citations and persist AI Message
```

Usage persistence and AI Message persistence have different completion conditions. The callback first records an `AiUsageEvent` with operation `CHAT`, scalar Workspace/User/Research/Conversation IDs, provider, model, input/output/total token counts, and finish reason. Missing token counts are stored as null. A `length` finish still records usage but does not save an AI Message. The Message condition checks non-empty text before citation validation. Recording happens in `onFinish`; this is not a guaranteed accounting record for requests that fail before that callback.

The baseline does not implement query or indexing embedding usage tracking, monetary cost accounting, daily/monthly quotas, subscription-based limits, a usage analytics dashboard, or billing enforcement. See the [data model](data-model.md#712-aiusageevent) for storage fields and indexes.

## 10. Insufficient Evidence

The model is instructed to answer only from the supplied current Research and Workspace retrieval contexts.

This is prompt-based behavior, not a deterministic evidence-sufficiency check. Phase 6 baseline evaluation confirmed the expected behavior for positive, related-but-unsupported, and unrelated questions, but broader evaluation remains necessary as Workspace knowledge grows.

When the available contexts do not contain enough information, the model should state that limitation rather than filling the gap with unrelated model knowledge. Semantic similarity alone does not establish answer support.

The expected behavior is:

```text
Question
   ↓
Sufficient knowledge exists in the supplied contexts?
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

The current implementation does not implement:

- incremental change detection, durable reconciliation, and lifecycle cleanup beyond mutation-triggered reindexing,
- query rewriting, hybrid retrieval, reranking, or adjacent-chunk expansion,
- total context/history budgets or persisted retrieval provenance,
- automatic external Source fetching,
- automatic conversion of AI responses into Findings or Conclusions,
- advanced citation verification against external source contents.

Authentication and Workspace-membership enforcement are implemented for the Research-scoped AI routes. They are application authorization responsibilities and are intentionally separate from retrieval filtering.

AI chat burst rate limiting and chat-generation usage tracking are implemented for authenticated routes. Phase 9.2 adds separate read-only Public Demo routes without an AI panel, chat endpoint, or conversation history. Public AI access remains pending. Workspace retrieval does not by itself establish deployed public-demo readiness or a standalone Workspace chat workflow; Conversation ownership and routes remain Research-scoped.

The remaining retrieval, public-access, and operational responsibilities require additional design and belong to later phases.

These responsibilities require additional retrieval and evidence-processing design and belong to later phases.

---

## 13. Phase 6 Retrieval / RAG

### 13.1 Indexed Knowledge

`indexResearch()` builds candidates from stored knowledge:

| Type         | Indexed content                              | Knowledge role                                            | Retrieved Sources        |
| ------------ | -------------------------------------------- | --------------------------------------------------------- | ------------------------ |
| `FINDING`    | Finding content                              | Evidence from Workspace knowledge                         | Currently linked Sources |
| `CONCLUSION` | Research conclusion                          | Synthesized knowledge, not automatically authoritative    | None                     |
| `RESEARCH`   | Title and description joined by a blank line | Discovery metadata, not equivalent to a supported Finding | None                     |

Empty candidates are skipped. Source bodies, external pages, Comments, Tags, and conversation transcripts are not indexed. Finding and Conclusion embeddings do not prepend Research metadata. A retrieved Conclusion has no direct Source citations unless supporting Findings are also supplied.

### 13.2 Chunking and Embedding

`chunkText()` trims input and leaves short knowledge items intact. Longer text targets **768 estimated tokens** with approximately **96 tokens of overlap**, preferring paragraph boundaries, then sentence punctuation, then character boundaries. Chunks do not cross knowledge-item boundaries, but overlap can begin mid-sentence.

The local estimate weights ASCII characters at one third of a token and non-ASCII characters at 1.5 tokens. It is not the provider tokenizer or a strict provider token limit.

`model.ts` configures `gemini-embedding-001`. `embedTexts()` uses AI SDK `embedMany()` with task type `RETRIEVAL_DOCUMENT`; `embedQuery()` uses `embed()` with `RETRIEVAL_QUERY`. Both request **768 dimensions** from the same embedding model.

### 13.3 Storage and Indexing Lifecycle

Prisma's pgvector extension is registered in control configuration and the database runtime. The contract defines `Embedding768 = pgvector.Vector(768)` and `RetrievalChunk`, mapped to `retrievalChunk`:

| Fields                      | Purpose                                 |
| --------------------------- | --------------------------------------- |
| `id`                        | Chunk identity                          |
| `workspaceId`, `researchId` | Search scope and owning Research        |
| `sourceType`, `sourceId`    | Knowledge type and identity             |
| `chunkIndex`                | Position within the knowledge item      |
| `content`, `embedding`      | Indexed text and 768-dimensional vector |
| `createdAt`, `updatedAt`    | Row timestamps                          |

For `FINDING`, `sourceId` is the Finding ID; for `CONCLUSION` and `RESEARCH`, it is the Research ID. It is **not** the Source ID used in citation markers. Citation Sources are loaded through Finding–Source links at retrieval time.

The contract defines uniqueness on `(sourceType, sourceId, chunkIndex)` and ordinary indexes on Workspace and Research IDs. It defines neither an HNSW/IVFFlat vector index nor foreign-key relations to the original knowledge records. Migrations exist for the vector extension and retrieval table; their presence does not verify deployment to a particular database.

`indexResearch(researchId)` loads current Research and Findings, builds and chunks candidates, generates document embeddings, and checks the embedding count. Its write transaction acquires a Research-scoped PostgreSQL advisory transaction lock, deletes that Research's old chunks, and upserts the replacement set using `(sourceType, sourceId, chunkIndex)`. The lock serializes writes for the same Research, and the idempotent write path handles duplicate or retried execution without relying solely on Inngest cancellation. Embeddings are generated before deletion, so an embedding failure preserves the previous index. Missing Research returns `null` without cleaning up existing chunks.

Successful Research creation, title/description updates, Conclusion updates, and Finding creation, content updates, and deletion call `requestResearchIndex(researchId)`. Source CRUD, Comments, Tags, Research status changes, and FindingSource attachment/detachment do not request reindexing; these do not change the indexed fields in Section 13.1.

```text
Relevant Research/Finding mutation
    -> best-effort research/index.requested event enqueue
    -> Inngest debounce/singleton
    -> indexResearch(researchId)
    -> transaction-protected RetrievalChunk refresh
```

The `index-research` Inngest function is served at `/api/inngest` through GET, POST, and PUT handlers. It debounces on `event.data.researchId` with a `5s` period and `30s` timeout, uses singleton key `event.data.researchId` with mode `cancel`, and configures `3` retries. Burst updates are coalesced per Research rather than indexing each mutation separately.

#### Inngest endpoint and production configuration

In Public Demo mode (`PUBLIC_DEMO_MODE=true`), all three `/api/inngest` methods return 404 with `Cache-Control: no-store` before loading or dispatching the SDK, client, or indexing function. Curated read-only Demo data requires no runtime indexing, Inngest credentials, or Inngest Cloud sync/integration. Normal SaaS mode keeps the registered function and best-effort event sender unchanged; endpoint handlers are loaded once on demand after the deployment check. Auth.js is not used to authenticate Inngest.

The server-only Inngest client exposes a runtime safety check based on the installed SDK's resolved mode. In production, resolved dev mode is rejected before serving Inngest handlers or sending indexing events. SDK-compatible `false` and `0` values remain cloud-mode configurations.

The safety check intentionally does not reject endpoint overrides based on URL scheme or hostname. Self-hosted or custom endpoints remain compatible when the SDK resolves to cloud mode. In particular, production configuration such as `INNGEST_DEV=0` with a self-hosted endpoint is not treated as dev mode solely because the endpoint uses a local or HTTP URL.

The check is performed at Inngest usage boundaries rather than during module initialization. This allows Next.js production builds to evaluate application modules without failing because a developer's local Inngest setting selects dev mode. `/api/inngest` checks the mode before constructing SDK handlers, and `requestResearchIndex()` checks it before creating or sending an event.

Normal Cloud SaaS requires server-only `INNGEST_SIGNING_KEY` for request authentication/sync and `INNGEST_EVENT_KEY` for event sends. `INNGEST_SIGNING_KEY_FALLBACK` is for coordinated rotation; `INNGEST_ENV` selects an environment/branch. Production serving sets the supported `enableUnauthedSync: false` option, while development leaves the option unset and retains SDK/env behavior.

Public Demo mode does not initialize or serve Inngest through `/api/inngest` and does not require Inngest credentials or runtime indexing. Actual Vercel configuration, signed Inngest Cloud integration/sync, Preview environment separation, and normal-SaaS telemetry handling still require deployed verification.

Sentry redaction of event keys embedded in event-API URL paths remains a separate normal-SaaS hardening task when Inngest and HTTP tracing are enabled. Public Demo does not execute this event-send path. This endpoint/configuration change does not alter event payloads, indexing, embeddings, retries, debounce, singleton behavior, or background writes in normal SaaS.

Enqueue is best-effort: event-send errors are logged and are not thrown to the caller, so a successful primary mutation remains successful. Enqueue and the primary database mutation are not atomic; there is no transactional outbox or general reconciliation worker. Synchronization is asynchronous and eventual when background refresh succeeds, without guaranteed immediate consistency or exactly-once execution. A failed enqueue can leave the derived index stale until a later successful request or manual reindex. Reads and embedding generation occur before the write lock, so it does not guarantee that the newest snapshot writes last.

A manual reindex command remains available for development and maintenance:

```sh
pnpm exec tsx scripts/index-research.ts <research-id>
```

Indexing requires configured database and AI provider credentials. A successful refresh after Finding deletion removes its stale chunks by rebuilding the Research index; this is application-managed cleanup, not foreign-key cascade cleanup. There is no generic Research-deletion cleanup. Retrieval skips missing original records during hydration, but existing records can have stale indexed text while refresh is pending or after an enqueue/job failure. Research titles and Source links are hydrated from current records, so they can differ from the text's original indexing state. Incremental change detection, embedding model/version history, and vector-index tuning remain unimplemented. RetrievalChunk remains derived data.

### 13.4 Selection and Hydration

Every chat request embeds the new message directly. Previous turns do not rewrite the retrieval query, so context-dependent follow-up questions can retrieve poorly even though generation receives conversation history.

`searchRetrievalChunks()` filters by Workspace ID, sorts by ascending cosine distance, and applies a candidate limit. Its standalone default is five; `retrieveWorkspaceContext()` requests ten and then:

1. Removes candidates with distance greater than **0.35**.
2. Deduplicates by `(sourceType, sourceId)`, retaining the closest chunk per knowledge item.
3. Selects at most **five** items.
4. Hydrates current Research/Finding records and linked Source metadata.

Results contain type, Research ID/title, indexed chunk content, distance, and Sources. Finding results also include the Finding ID. Conclusions and Research metadata have empty Source arrays.

Selection precedes hydration. Missing records are skipped without backfilling, so fewer than five results can be returned. Only one chunk per item survives; neighboring chunks and full retrieved Findings are not expanded. Multiple chunks of one item can occupy the ten-candidate pool before deduplication. Retrieved items are not deduplicated against the full current Research context.

The cutoff is a heuristic, not a confidence score or evidence-sufficiency check. Metadata filtering currently means Workspace scope; there is no Tag/status filter, hybrid search, type weighting, or reranker. Empty retrieval still allows generation from current Research knowledge. Embedding or database failures fail the request rather than falling back automatically to Research-only generation.

### 13.5 Retrieval Evaluation

The repository includes manual inspection scripts:

| Script                                       | Purpose                                                       |
| -------------------------------------------- | ------------------------------------------------------------- |
| `scripts/test-vector-search.ts`              | Inspect query dimensions and raw ranked chunks                |
| `scripts/test-retrieve-workspace-context.ts` | Inspect filtered, deduplicated, hydrated context              |
| `scripts/evaluate-retrieval.ts`              | Inspect raw retrieval for four sample queries                 |
| `scripts/evaluate-retrieval-context.ts`      | Inspect final context for 16 queries in four relevance groups |
| `scripts/test-source-citations.ts`           | Print citation validation/parsing examples                    |

Context evaluation covers strong positives, weak/paraphrased positives, related-but-unsupported questions, and unrelated questions. These scripts print results for human review; they do not provide assertion-based regression tests or recall/precision metrics. End-to-end generated-answer behavior was evaluated separately through manual chat testing.

The initial maximum cosine distance of **0.35** was selected from the current Phase 6 evaluation set. It preserved the tested strong and weak positive cases while rejecting the tested unrelated cases. Related-but-unsupported questions can still pass the similarity threshold, which is intentional: semantic relevance is not equivalent to answer support. The threshold is an evaluation-derived initial parameter rather than a permanent confidence boundary and should be reevaluated as Workspace knowledge grows.

A separate manual chat E2E evaluation covered three behaviors: a positive question supported by retrieved Workspace evidence, a related-but-unsupported question, and an unrelated question. The positive case produced a grounded answer with a Supporting Source. The related-but-unsupported and unrelated cases produced insufficient-evidence responses rather than unsupported answers.

One known retrieval-quality limitation remains: Finding-level deduplication retains only the closest chunk for each knowledge item. That representative chunk may not contain the most useful answer span even when the correct Finding was retrieved. Adjacent-chunk expansion, reranking, or other chunk-selection improvements are deferred until broader evaluation shows that this limitation materially affects answer quality.

The local `retrieval-evaluation.txt` contains exploratory results, including distances above the current 0.35 cutoff. It should be treated as an exploratory evaluation artifact rather than a passing regression result for the current filtered implementation. The log also illustrates that topic similarity can return link-only Findings or chunks that omit the requested information. Broader threshold calibration and retrieval-quality evaluation remain necessary as the indexed Workspace corpus grows. No database or provider evaluation was rerun specifically for this documentation update.

---

### 13.6 Retrieval and Indexing Observability

Phase 8.5 adds targeted Sentry custom spans for operation latency and execution visibility. Performance tracing uses the environment-driven sample rate documented in the [Phase 8 roadmap](../planning/roadmap.md#phase-8--saas-infrastructure); spans are subject to sampling rather than a record of every execution. Phase 8.4 remains responsible for error capture and source-map support.

#### Retrieval observability

`retrieveWorkspaceContext()` runs inside a span named `retrieve workspace context` with op `ai.retrieval`. Its boundary covers query embedding, vector candidate search, distance filtering, deduplication, result selection, and hydration.

| Attribute                                  | Meaning                                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| `evidence_atlas.retrieval.candidate_count` | Raw vector-search candidates before filtering                                |
| `evidence_atlas.retrieval.selected_count`  | Items selected after distance filtering, deduplication, and the result limit |
| `evidence_atlas.retrieval.result_count`    | Results returned after hydration skips missing records                       |

#### Indexing observability

`indexResearch()` runs inside a span named `index research` with op `ai.indexing`, including when called by the Inngest background function. Its boundary covers Research/Findings reads, candidate construction, chunking, embedding, advisory-lock acquisition, and transactional cleanup/upsert.

| Attribute                              | Meaning                                                        |
| -------------------------------------- | -------------------------------------------------------------- |
| `evidence_atlas.index.candidate_count` | Knowledge candidates constructed from non-empty indexed fields |
| `evidence_atlas.index.chunk_count`     | Chunks generated for the replacement index                     |

Both functions attach counts only after their pipelines complete successfully. Missing Research returns `null` before indexing counts are attached; failures can also end a span before counts are recorded.

#### Data and usage boundaries

These custom span attributes contain operational counts only. They do not include AI query text, Research title/description/conclusion, Finding content, Source content/URLs, Workspace/Research/Finding IDs, or other user-generated content. Function inputs and returned context/indexing data remain application data and are not attached as custom span attributes.

The restrictive Phase 8.4 `dataCollection` settings remain in effect, including disabled AI input/output and database query data collection. This is not complete redaction of arbitrary exception messages or manually supplied data. Replay, logs, profiling, and metrics are not enabled by this baseline, and the spans do not establish tracing of every database operation.

Sentry provides sampled request/operation latency and retrieval/indexing execution visibility. `AiUsageEvent` separately records chat-generation domain usage: provider, model, token counts, finish reason, and the application attribution defined by the [data model](data-model.md). These spans do not store AI prompts/responses or replace database usage tracking.

Colocated Vitest tests cover sample-rate parsing and verify the custom span names, operations, and count-only attributes, with checks against identifiers and content. This documentation review does not rerun database/provider calls or validate production performance.

---

## 14. Architectural Principles

The AI implementation follows these principles:

1. **Ground AI in stored research knowledge.**
2. **Keep evidence traceable.**
3. **Treat AI as an assisting layer, not an authoritative source.**
4. **Validate model-generated evidence references in the application.**
5. **Keep persistence independent from presentation.**
6. **Persist conversation state rather than provider execution details.**
7. **Keep derived retrieval chunks separate from authoritative knowledge records and evaluate retrieval quality.**
8. **Prefer incremental architecture over premature abstraction.**
9. **Authorize before retrieval and persistence.** Research-scoped AI operations authenticate the caller and verify Workspace-derived Research access before loading protected conversation data, retrieving Workspace knowledge, or writing Messages.
