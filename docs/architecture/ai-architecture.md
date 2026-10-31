# AI Architecture

> **Status:** Implemented Phase 6 baseline with Phase 7 route authorization and Phase 8.3 background indexing
> **Scope:** Phase 5 AI Integration + Phase 6 Retrieval / RAG + Phase 7 AI route access control + Phase 8.3 Background Jobs
> **Last Updated:** 2026-10-29

## C2 browser-test runtime boundary

The opt-in validated C2 runtime keeps real Google OAuth and the isolated application
database, but disables real Chat endpoints with 503 responses before authentication,
data operations, Redis, retrieval or generation. Embedding, retrieval and indexing
also reject direct invocation; Inngest enqueue is a no-op and its endpoint/worker
are guarded. Browser tests must mock the entire conversation/Chat contract.

C2 builds replace Sentry and Google font modules with inert/system-font alternatives
and use dedicated Next artifacts. Normal SaaS and Public Demo retain their existing
boundaries, model IDs, prompts, citation validation and retrieval behavior.
See [C2 runtime isolation](../planning/c2-local-runtime.md) for offline evidence and
the required later compiler/network verification. No runtime or provider validation
is implied by these implementation checks.

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

The production Chat configuration uses Google Generative AI through `@ai-sdk/google`. `src/lib/ai/model.ts` configures the generation model ID `gemini-3.6-flash` and embedding model `gemini-embedding-001`; these are checked-in configurations, not provider-availability verification performed by this review.

Synthetic quality evaluation can additionally select Groq's `openai/gpt-oss-120b` through `scripts/evaluation-models.ts`. Groq is evaluation-only and does not replace production Chat or embeddings. The evaluator uses Vercel AI SDK 6 and `@ai-sdk/groq` 3.x (`^3.0.72`), selected after a developer-reported `LanguageModelV4` / `LanguageModelV3` compatibility issue with the newer provider generation. `scripts/evaluate-ai-chat.ts` accepts a case ID followed by `gemini` (default) or `groq`, checking `GOOGLE_GENERATIVE_AI_API_KEY` or `GROQ_API_KEY` respectively. It loads `.env`, uses `buildChatSystemPrompt()` shared with the production route, and prints raw/validated responses, parsed citations/text, and reported usage. See the [AI Chat quality evaluation report](../planning/ai-chat-quality-evaluation.md#current-multi-provider-evaluation-runner) for commands and results; the direct runner bypasses production streaming and persistence.

The provider receives:

1. the system instructions,
2. the current Research context,
3. selected Workspace retrieval context,
4. persisted conversation history,
5. the new user message.

The response is streamed back to the client.

The transport is a plain text stream consumed with `fetch` and a stream reader. The server loads persisted history rather than trusting client-supplied message history. It rebuilds Research context and retrieves Workspace context on every request. Comments are not included. No history truncation or total context-size budget is implemented; the retrieval result limit is not a total prompt budget.

---

### 4.1 Public Demo Chat configuration contract

**PR #45 connects server-side generation to the PR #42 security foundation;
the public UI remains unavailable.**
`POST /api/demo/chat` is a separate Node.js Route Handler. No existing SaaS Chat,
Auth.js or read-only Demo route is reused or changed. The default flag stays false;
with complete configuration, authorized questions use the bounded generation
contract below. PR #44 adds the
unavailable Chat UI described below; there is no generated placeholder answer,
database table or migration. Phase 9/10 completion
decisions and checkboxes are unchanged.

#### PR #44 Research Chat UI foundation

`/demo/research/[researchId]` appends a Demo-only `DemoResearchChatPanel` after
Conclusion, preserving Sources, Findings, Discussion and Conclusion order and
the shared Research display. The panel names the current Research, describes
planned Research-grounded answers, and provides an empty conversation region,
labelled question textarea and Send question button. It displays **Coming soon**,
the planned 500-character input bound, thread/session limits and a brief shared
rate/daily-limit notice. It does not display sample AI answers.

At PR #44, the textarea and button were unconditionally disabled, including if an operator
set the server feature flag to true. That presentation-only implementation had no
form, action, event handler, session creation, fetch, Turnstile widget, storage or
generation integration. It did not import server Chat configuration or serialize
credentials, Redis/model settings or feature eligibility to the browser.
`DEMO_CHAT_ENABLED=false` remains the deployment default; enabling the flag alone
did not activate that UI. Native disabled semantics and associated descriptions
communicate unavailability. The panel uses existing semantic theme tokens and
wrapping, single-column layout with a responsive composer footer.

These historical PR #44 integration restrictions are superseded only by the
client foundation below. Normal SaaS Chat, Auth.js, C2 and public read-only
boundaries remain separate. UI presence does not establish generation readiness
or deployed browser verification.

#### Public Demo Chat client integration foundation (2026-10-29 JST)

The Research detail server page now uses `isDemoChatEnabled()` to select the
client panel. Ineligible configuration, SaaS mode and any non-empty C2 marker
retain the existing disabled **Coming soon** UI, with no Turnstile script/widget
or Chat API requests. `DEMO_CHAT_ENABLED=false` remains unchanged. Eligibility
is not a public-release approval; the recovery blockers and **No-Go** remain.
Only the current public Research ID, title, public Source id/title/url projection
and public Site Key are supplied to the enabled client; no secrets or Redis/model
configuration cross the boundary. A flag alone without required configuration
cannot activate it. API ingress continues to independently enforce its boundaries.

The client uses a small in-memory controller and React subscription, without new
dependencies or storage. States are disabled, before session (`idle`), Turnstile /
session verification (`verifying`), ready, sending, answered, error and limited.
An explicit start action mounts Turnstile; success posts the token once to the
existing `session` operation and a validated 201 response makes the session ready.
Widget failure/expiry/timeout requires a fresh manual start. The official script
uses explicit rendering, fixed `demo-chat` action, compact size, no hidden token
field and no automatic widget retry/expiry/timeout refresh. Widget cleanup removes
the instance; tokens are not kept in React state or persisted. Rendering/callback
parameters were checked against [Cloudflare client rendering](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)
and [widget configuration](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/)
on 2026-10-29; this is documentation verification, not a live Turnstile test.

Questions post only the existing `question` fields, bound Research ID and server
thread ID. Same-origin relative fetch, browser-managed Origin, JSON, no-store,
redirect refusal and same-origin credentials preserve the Origin/cookie/CSRF
contract. No Operation ID, history, Workspace or model selector is sent. Input
uses the server's 500-code-point-before-trim and lone-surrogate restrictions.
Synchronous pending guards and disabled controls prevent duplicate submissions;
failed requests are never automatically resent. 401/403 invalidate the local
thread and require fresh verification; 404 reports unavailable; 400/408/413/415
report refused input; network/invalid response/503 report uncertainty and possible
budget consumption. Generic server error bodies are not shown. 429 enters a
limited state without claiming a reset time or a particular exhausted budget:
quarantined capacity may not recover automatically. It offers no client budget
reset or automatic session restart.

200 JSON is validated before display (including non-empty answer and evidence /
truncation fields). Source IDs, exact URLs and the server's 160-code-point title
projection must match the current page's public metadata; duplicate references,
unknown Sources, non-HTTP(S) and credential-bearing URLs are rejected. Answers,
questions, Source titles and notices are React text, never HTML or Markdown;
only validated Source URLs become external links with `noopener noreferrer`.
Evidence notices and context truncation are displayed. Membership still does not
prove factual correctness. Only the latest exchange is held in memory; requests
are independent and conversation history is not sent or persisted. A Research /
Site Key change keys a new client; cleanup aborts the old fetch and invalidates
late completions. Local abort is not proof of upstream termination or Lease release.

Offline controller, synthetic widget callback, handler wiring and static markup
tests cover these boundaries. Hook doubles do not verify React scheduling, actual
widget lifecycle, hydration, focus, screen-reader behavior, mobile layout or
deployed cookies/Origin/CSP. Real browser and real Groq/Redis/Turnstile validation
remain separate work. No Production Build or public activation is part of this
foundation, and Phase 9/10/11 completion decisions are unchanged.

The fixed provider/model is Groq / `openai/gpt-oss-120b`. `getDemoChatModel()`
checks eligibility on each call, then constructs an uncached model with an explicit
`DEMO_GROQ_API_KEY`; it never falls back to evaluation `GROQ_API_KEY` or Gemini.
Importing or reading configuration does not construct a model or call a service;
model construction itself does not generate text or make a request. `@ai-sdk/groq`
is now a runtime dependency with the same locked 3.0.72 version, compatible with
the installed AI SDK 6 provider-v3 contract. Browser input cannot select a model.
Earlier "Groq is evaluation-only" statements describe the SaaS baseline and
evaluation runner; the separate Demo server now uses Groq. Normal SaaS still uses Gemini.

`isDemoChatEnabled()` reports configuration eligibility only. Both
`DEMO_CHAT_ENABLED` (default `false`) and `PUBLIC_DEMO_MODE` must be exactly `true`;
unset, blank, whitespace-padded or other strings are rejected. Any non-empty
`C2_RUNTIME_MODE` marker denies eligibility, including malformed C2 configuration,
without database validation or external service access. The broader existing
Public Demo application lock remains unchanged and still locks unexpected
non-empty Public Demo mode values.

The following must all be non-blank: `DEMO_WORKSPACE_ID`, `DEMO_GROQ_API_KEY`,
`NEXT_PUBLIC_DEMO_TURNSTILE_SITE_KEY`, `DEMO_TURNSTILE_SECRET_KEY`, Redis REST URL
and token. Redis uses the existing `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
names, with `KV_REST_API_URL` / `KV_REST_API_TOKEN` aliases and the same precedence
as `Redis.fromEnv()`. Only the Turnstile site key is public. Secret values are
never returned by the eligibility API; refusal throws a fixed generic error.
Presence checks do not establish valid credentials, connectivity, Workspace
publication validity or successful Turnstile verification.

`DEMO_CHAT_REDIS` specifies Upstash with the independent namespace
`evidence-atlas:demo-chat:v1`, and separate `:session`, `:source`, `:global`,
and `:concurrency` prefixes. Existing SaaS `evidence-atlas:ai-chat` keys and
`getChatRateLimit()` behavior are unchanged. The Demo contract permits no memory
fallback, including in production. The implemented enforcement and API contracts
below supersede PR #41's provisional configuration-only descriptions.

Public API ingress invokes `requireDemoChatEnabled()` before side effects.
No normal SaaS Chat API, OAuth, write path or Inngest endpoint is opened by this
flag. C2 external-service restrictions remain intact. A previously returned model
is not revoked automatically. The Demo adapter rechecks eligibility at model
construction; changing an environment flag does not cancel an already submitted request.

#### PR #42 API and session contract

The API checks exact `PUBLIC_DEMO_MODE=true`, no non-empty C2 marker, exact
`DEMO_CHAT_ENABLED=true` and required non-blank PR #41 settings before side effects.
`DEMO_CHAT_ALLOWED_ORIGINS` is an additional mandatory server setting: a
comma-separated list of exact HTTPS origins without paths or trailing slashes.
Origin must match one entry; that entry's hostname must match Siteverify. Host,
Forwarded and arbitrary client-provided Workspace IDs are never trust sources.
Invalid configuration denies access; this eligibility does not prove credentials
work. Redis URL must use HTTPS. Dependency failures return generic, non-cacheable
errors without logging credentials, tokens, questions or upstream error details.

Both operations accept only JSON (optional UTF-8 charset), no content encoding,
at most 8,192 body bytes and a five-second body-read deadline. Content-Length is
checked before reading and chunked bodies stop as soon as the byte bound is
crossed. Unknown fields (model, system, Workspace, history, client counts) fail.
Research IDs are bounded to 128 ASCII letters/digits/underscore/hyphen. Questions
must contain non-whitespace text, at most 500 Unicode **code points before trim**;
combining marks count separately and lone surrogates are rejected.

- `{ operation: "session", researchId, turnstileToken }`: verify Turnstile before
  accessing the DB, then validate public Research with existing `getDemoResearch()`
  before issuing a session or writing Redis. Siteverify must return
  strict `success: true`, exact configured hostname and fixed `demo-chat` action.
  Token must be 1–2,048 ASCII letters/digits/dot/underscore/hyphen. The fixed
  Cloudflare endpoint has a five-second timeout, no retry and no redirects.
  Cloudflare rejects tokens expired after 300 seconds or already used. An atomic
  Redis SHA-256 token marker (600-second TTL) additionally prevents session replay.
  Success returns `201 { threadId }` and a random 256-bit session cookie. This is
  session establishment only; it provides no Chat answer. Starts are separately
  limited to three per rolling 60 seconds in a shared bucket.
- Cookie: `__Host-ea-demo-chat`, `Path=/; HttpOnly; Secure; SameSite=Strict`, no
  Domain, Max-Age 86,400 seconds. Only a SHA-256 digest identifies the Redis session;
  the bearer value necessarily exists in the protected cookie, never in JSON/logs.
  Sessions are non-renewing and expire 24 hours after issuance. Cookie presence
  alone grants no access. Threads have random 256-bit IDs, bind to the session
  digest and Research, and cannot outlive their session.
- `{ operation: "question", researchId, threadId, message }`: validate the cookie,
  then require a live Redis session and matching thread ownership/Research before
  accessing the DB to revalidate public Research (including withdrawn publication).
  Authentication failures never query Research and return the same generic error
  regardless of whether the supplied Research exists or is public.
  PR #45 then atomically reserves budgets/capacity and builds bounded context,
  generates a single answer and validates it before returning non-streamed JSON.
  No public new-thread mutation API or client history contract is provided.

Public data is selected exclusively through `DEMO_WORKSPACE_ID` and the existing
Workspace/name and Research/Workspace checks in `getDemoResearch()`. Its returned
data is projected into the dedicated context described below. No normal SaaS user
lookup, Conversation/Message/Research writes, question/answer persistence, Google
embeddings, retrieval or external Source URL fetch occurs. The context explicitly
selects public Research title, description, conclusion, Sources and Findings.

#### PR #45 server generation and response contract

The question flow preserves this order: feature/runtime configuration → exact
Origin → bounded strict JSON → cookie → Redis ownership → existing public Research
read/revalidation → atomic reservation → context projection → Groq → output and
Source allowlist validation → lease cleanup → JSON response. Session establishment,
Turnstile, cookies and existing Lua limits are unchanged. `getDemoResearch()` still
loads its public display data (including Discussion), but the dedicated builder
never serializes Comments, tags, author data, timestamps, Workspace/Research/Finding
IDs or conversation history. It does not reuse the authenticated SaaS builder.
Existing publication is Workspace-based; no new per-record publication flag exists.
Deleted or out-of-scope parents fail the existing scoped read before reservation.

`chat-context.ts` selects Research title (200 Unicode code points), description
(1,500), conclusion (2,000), up to 10 Findings (800 content points each), and up to
10 Sources (128-character ASCII IDs, 160-point titles). Finding references are
restricted to that selected Source set. Only stored HTTP(S) URLs of at most 2,048
characters without credentials are retained in the server allowlist; URLs are not
sent to the model or fetched. The serialized Research JSON is bounded to 12,000
Unicode code points, including JSON escaping. Overflow fields/items are omitted
or shortened without splitting surrogate pairs, and `truncated` is supplied to
the model and returned as `contextTruncated`. The fixed prompt and bounded question
are additional to this Research budget; it is not a tokenizer-based input limit.

The installed AI SDK **6.0.280**, Groq provider **3.0.72** and Next.js **16.3.8**
source/types were checked. `generateText` uses `getDemoChatModel()`, 700 output
tokens, zero retries, no tools, no retrieval/embedding, and disabled SDK telemetry.
The trusted system prompt is static; Research and the question are JSON in a user
message. It instructs the model to ignore embedded instructions, use only stored
evidence, acknowledge truncation/unknowns and never claim external pages were read.
No history is accepted or persisted. If substantive context or usable Sources are
absent, the server returns fixed evidence-insufficiency text without calling Groq.

The provider must produce strict JSON `{ answer, sourceIds, insufficientEvidence }`.
The server bounds raw output to 16,000 UTF-16 units and answer text to 4,000 Unicode
points, rejects unknown keys, unknown Source IDs, blank text, standard URL/domain
syntax, HTML and bracket/link/citation syntax, and requires a Source for an answer
that claims sufficient evidence. Exact, case-sensitive prose spellings `Next.js`,
`Node.js`, `package.json` and `tsconfig.json` are exceptions to the domain heuristic;
explicit URL/markup checks still examine the original answer, and surrounding ASCII
hostname/address syntax (subdomains, paths, queries, fragments, ports or email)
prevents the exception. This is a narrow textual policy, not complete domain/filename
or internationalized-hostname disambiguation: these bare names are ambiguous, and
other legitimate dotted terms may still be rejected. No URL parsing/fetching,
model-generated Source metadata or HTML execution is introduced.
Invalid output returns generic 503;
unvalidated text is never streamed. Insufficiency yields fixed server text and no
Sources. Valid Source IDs are deduplicated and resolved solely from the bounded
allowlist; title/URL values are never taken from model output.

Success is HTTP **200**, `Cache-Control: no-store`:

```json
{
  "answer": "Plain text answer",
  "sources": [{ "id": "stored-source-id", "title": "Stored title", "url": "https://example.com/evidence" }],
  "insufficientEvidence": false,
  "contextTruncated": false,
  "evidenceNotice": "Source references identify stored Research metadata; they do not verify factual accuracy or indicate external pages were read."
}
```

Errors retain `{ "error": "Demo Chat unavailable." }` with no-store and the existing
404/403/400/401/413/415/429/503 boundaries (408 for body-read timeout). No prompt,
answer, provider error details, token or credentials are logged or persisted by
this path. HTTP 503 failures emit one best-effort server console error in the form
`[demo-chat] failure category=invalid_response phase=validation status=503`.
Categories are `provider_error`, `generation_timeout`, `invalid_response`,
`generation_incomplete`, `lease_error`, `request_aborted` and `unexpected_error`;
phases are fixed processing labels, including separate reserve/renew/release
labels. Only category, phase and status are emitted, with no external error
message/stack or request/session/operation identifiers. Logging failure does not
alter the response or lease cleanup. If cleanup itself fails, `lease_error` in
the release phase describes the final failure. These diagnostics do not establish
remote provider termination or make quarantined capacity safe to release.
Valid references establish membership only: prompt instructions and
schema/allowlist validation cannot prove entailment, factual accuracy, evidence
sufficiency or complete resistance to prompt injection. There is no external
page-content verification. Public UI/Turnstile wiring, model quality, real provider
termination, live Redis durability and deployed disconnect behavior remain unverified.
No real Groq, Turnstile or Redis calls are part of PR #45 verification.
Local Production Build remains **incomplete, intentionally interrupted** by user
direction during compile, without a natural Next.js exit code or completed artifact.
The stderr command banner's PowerShell `NativeCommandError` is not a Next.js build
failure finding. Further local build retries are excluded for this PR; production
compilation/artifacts are to be verified in Vercel Preview after PR creation.

API references: [AI SDK generateText](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text),
[Groq provider](https://ai-sdk.dev/providers/ai-sdk-providers/groq),
[Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route),
checked 2026-10-27 JST. Online AI SDK docs currently default to v7; implementation
decisions use the installed v6 source/types, including abort forwarding and Groq
non-streaming terminal finish reasons. Local SDK/fetch completion after an error
is not evidence that remote computation stopped.

#### Atomic limits and generation handoff

`chat-store.ts` uses one Redis EVAL to check session/thread ownership, all budgets
and capacity, then increment every accepted budget and reserve a unique lease.
Rejected reservations do not increment budgets. All instances must use the same
dedicated, durable Redis database/namespace with no eviction or counter reset;
Preview and Production must not accidentally share it. Redis TIME determines
boundaries, independent of application clocks. REST calls use a three-second
abort signal with retries disabled; failures deny and never fall back to memory.
An uncertain response can have committed a reservation; it is never blindly
retried or refunded.

| Enforced internal reservation contract | Boundary |
| --- | --- |
| Thread | 10 accepted user-question reservations during its remaining session lifetime |
| Session | 20 total during its non-renewing 86,400-second lifetime |
| Source | 3 in the interval `(now - 60,000ms, now]` |
| Global | 50 per UTC calendar day, `[00:00:00Z, next 00:00:00Z)` |
| Concurrency | 2 outstanding generation leases across all instances |

PR #41's provisional rolling-24-hour session description is concretized as a
non-renewing 24-hour session: all its admissions fit within one rolling 24-hour
window, and new threads do not extend its lifetime or reset its budget. Session
rotation still gives another anonymous session; source/global budgets are the
cross-session bounds. No trusted client-IP adapter exists yet, so **all connections
share one source bucket**, a stricter limit than three per IP. Spoofable forwarding
headers cannot reset it. A future trusted ingress adapter needs separate review.

Leases have unique random owners and a 60-second deadline. Renewals are atomic
and succeed only before expiry. **Expiry does not free capacity**: stale leases
remain counted in quarantine, preventing a slow/partitioned generation from
overlapping a replacement. Renew failure requires stopping future upstream work;
release is idempotent ZREM by exact lease ID, only for work never submitted or a
confirmed terminal provider response. Local cancellation completion alone is not
remote termination confirmation. A crashed worker leaves its lease
quarantined. Recovery must confirm upstream termination before removing that
specific lease; automatic crash recovery and a provider cancellation confirmation
adapter remain follow-up work. This favors denial of service over oversubscription;
no claim of automatic crash-time cleanup is made.

PR #45 uses a 30-second local generation deadline, serial renewals every 15 seconds
and the request's AbortSignal for disconnects. Timeout, disconnect or failed renewal
aborts the local provider fetch and returns generic 503 promptly, even if the
provider promise never settles. No new renewal is scheduled after cleanup. Only a
successful non-streaming provider response with terminal `stop` or `length` confirms
completion: release then runs once, including when output validation fails (`length`
is rejected as an incomplete answer). Context failure/pre-submission abort/evidence
insufficiency release safely because no provider work was submitted.

Provider rejection, unknown finish reason or cancellation/renewal failure retains
the lease in quarantine, even if a cancelled call later resolves. Neither local
AbortError nor promise rejection confirms Groq-side termination. A release failure
also denies the answer and is not retried. Reservations are never refunded. A
process crash leaves capacity occupied; two uncertain requests can exhaust all
capacity indefinitely, including across UTC-day rollover. Operators must confirm
termination before removing a specific lease; automatic timeout deletion and safe
automatic recovery are deliberately absent. The 30-second deadline bounds local
waiting, not remote execution or provider charges.

**PR #46 pre-publication gate (still open):** Define and review a recovery policy
for uncertain/quarantined leases, including the case where both slots remain
occupied and remote termination cannot be confirmed. Verify actual Groq termination,
timeout/disconnect behavior and Redis reservation/renewal/quarantine/recovery behavior
in an explicitly authorized real-service test before public activation. Offline
tests do not satisfy this gate. No automatic deletion or expiry-based release is
added by the PR #45 review follow-up.

#### Pre-release lease recovery hardening (2026-10-29 JST)

**Recovery remains unresolved; public activation is blocked.** The safe improvement
separates the built-in adapter's synchronous configuration/model construction and
Research JSON preparation from SDK invocation. These steps make no network call;
their failure releases only the current request's lease. Once the SDK is invoked,
all failures remain uncertain, even if an internal SDK validation might have failed
before fetch. Injected generators are opaque and invocation is conservatively the
submission boundary, including synchronous exceptions. Release accepts only Redis
ZREM results 0 (already absent) or 1; unexpected replies fail closed without retry.

The Redis ZSET stores only random lease IDs and renewal deadlines. The operation
correlation foundation below adds reservation records, but `submitted`, `completed`
and cancellation reasons remain local process knowledge, not recorded Redis
lifecycle states. In particular, a future deadline does not prove healthy work,
and a past deadline does not prove remote termination. Quarantine can begin before
expiry and remains counted by ZCARD. There is no recovery endpoint, sweeper, admin
CLI, TTL deletion, late-completion cleanup or reset of the namespace.

| Observed event | Lease transition / permitted action |
| --- | --- |
| Reservation acknowledged | Capacity occupied; budgets consumed; prepare locally |
| Local preparation/context failure, pre-submission abort, or no evidence | Exact owned lease may be released; no refund |
| SDK invoked | Treat upstream work as potentially running |
| Non-streamed `stop` / `length` received before cancellation | Completion confirmed; release exact owned lease, even for invalid/truncated output |
| Timeout, client abort, failed/uncertain renew | Request local abort; return 503; retain lease regardless of deadline or later promise settlement |
| Abort request/fetch rejection completes | Remote termination still unconfirmed; retain lease |
| Function terminates at any point after reservation | Finally/heartbeat cannot be relied on; retained member stays counted, even if work was never sent or already completed |
| Reservation response lost | May have committed; handler does not invoke AI or retry; an operation record can correlate the retained member if Redis preserved the write |
| Renew response lost | May have extended deadline; abort locally and retain; no retry |
| Release response lost | May be present or absent; deny answer, no retry/refund; any remaining member stays counted |

Two retained members deny new generation across workers, expiry and day rollover.
Safety depends on the existing durable, non-evicting Redis assumptions; retaining
members protects the concurrency limit but does not provide availability.

**Incident procedure and future recovery prerequisites (not an implemented tool):**

1. Keep Chat disabled and fence every ingress/worker sharing this namespace,
   including old deployments and requests already admitted. A flag change alone
   does not cancel or fence an in-flight request. Establish that no worker can
   submit, renew or later act on a recovery candidate before considering removal.
2. Preserve an access-controlled incident record: environment/namespace, deployment
   and invocation identity, Redis timestamps/deadlines, reservation outcome,
   submission boundary, abort reason, terminal evidence and release outcome. Use
   lease fingerprints in ordinary logs; exact IDs needed for an operation belong
   only in restricted records. Exclude prompts, answers, cookies and credentials.
   Only reservation correlation is recorded by the foundation below. Submission,
   terminal/release evidence, deployment identity and provider correlation remain
   unrecorded; absent logs are not proof of no submission.
3. Obtain positive evidence for each exact member: either durable proof that its
   fenced worker never submitted, or provider-confirmed termination correlated to
   that generation. Lease age, 30s/60s timers, Function timeout, key revocation and
   a local abort/rejected promise are insufficient. A provider-enforced maximum
   lifetime could support a future proof only with documented scope, start/queue
   semantics and a bound on delayed submissions. No such guarantee is established.
4. Only after these prerequisites, separately review an operator-only, audited
   compare-and-remove implementation for the exact owner/member and observed
   version/deadline. It must refuse active/changed candidates, preserve other
   members and all question budgets, and record operator, evidence, before/after
   state and outcome. No wildcard deletion, whole-key reset or namespace rotation.
   Redis error, mismatch or uncertain response means stop, retain the fence and
   reconcile that exact operation under the same evidence; never blindly retry.
5. If evidence, fencing or auditing is unavailable, leave the lease and Chat
   disabled. Escalate to the provider; do not restore availability by assuming
   termination. Before public activation, implement/verify durable correlation,
   a provider termination guarantee and a reviewed recovery mechanism, then test
   two-slot exhaustion, process death, delayed Redis outcomes and active-owner
   protection in a separately authorized isolated environment.

#### Operation ID and reservation correlation foundation (2026-10-29 JST)

**Public activation remains No-Go.** Each authorized question handler creates a
256-bit random server Operation ID before calling Redis reserve. The strict input
contract accepts neither Operation ID nor Lease ID from the client. A separate
random Lease ID is selected before EVAL. There is no new public response field,
log, management endpoint or Provider state transition.

The same reservation EVAL uses `${prefix}:operations`, a bounded Redis HASH keyed
by Operation ID. Each value is JSON with `schema: 1`, `leaseId`, `scopeHash`
(SHA-256 of the JSON tuple `[SHA-256(session), thread, research]`), `reservedAt`
(Redis milliseconds at attempt start) and `reservationState`. After ownership,
capacity and budget checks, it writes `attempted` before charging budgets, then
`reserved` after all budget/Lease writes. Ordinary denials create no record and
charge no question budget; existing source-window expiry housekeeping may run.
Lua errors do not roll back prior writes. A partial attempt may retain consumed
budgets and/or a Lease with an `attempted` record; it is never refunded or repaired.

`reservationState` describes only the reservation script. Both values leave
Provider submission/completion **unknown**; `reserved` persists unchanged after
generation, timeout, quarantine and normal Lease release. In particular it is not
the future recovery design's fenced `RESERVED` lifecycle state and does not prove
that a Worker never submitted. Correlation alone never permits release.

A repeated Operation ID is rejected with internal `duplicate` outcome / public
generic 503, even after normal Lease release. It does not return the old Lease or
grant another generation. Only the first acknowledged success returns a Lease.
Known Lua denials are `rejected`; transport/Lua failures and malformed replies are
`unknown`, retaining the Operation ID on the internal error. The handler neither
retries nor calls AI on an error. Commit followed by response loss can leave the
record and Lease available for later investigation, but absence is not proof of
non-execution. There is no automatic lookup/reconciliation in this stage.

This replay guard covers calls sharing the **same server Operation ID** while
Redis retains the record. Independent HTTP requests get new IDs and are separate
budgeted questions; payload equality is not used for deduplication. Cross-request
exactly-once behavior needs a separate authenticated server-issued request-token
protocol. This foundation provides neither that protocol nor submission fencing.

Records have no TTL, GC or deletion on release. At 10,000 records, new reservations
fail closed with 503; renew and existing safe release still work. With 50 accepted
questions per day this is roughly 200 full-budget days from empty, but partial
attempts can consume the record allowance sooner. The fixed field/value payload
is under 300 bytes per record (under 3 MB at the cap), excluding Redis allocator,
index and replication overhead. No prompts, answers, raw cookies or credentials
are stored. This finite, non-reclaiming history is intentional until a separately
reviewed retention/replay policy exists; do not reset it to regain capacity.

The offline tests execute production Lua with mocked Redis commands, covering
same-ID races, delayed/lost replies, partial command failures, no-TTL retention,
record-cap denial and existing generation/security/budget behavior. They do not
prove Upstash's behavior through failover, replication or data loss. Retention
depends on the target configuration (including no eviction); a HASH write is not
an unconditional durable audit guarantee. The
[recovery design](../planning/demo-chat-lease-recovery-design.md) retains those
unknowns and the public No-Go. No automatic/forced recovery, timeout deletion,
question refund, memory fallback, normal SaaS/C2 change or UI activation is added.

Sources checked for the earlier hardening, 2026-10-29 JST: installed `ai@6.0.280`
`src/generate-text/generate-text.ts`, `@ai-sdk/groq@3.0.72`
`src/groq-provider.ts`, `src/groq-chat-language-model.ts` and
`src/map-groq-finish-reason.ts` establish lazy construction, abort forwarding and
finish-reason mapping. [Groq's API reference](https://console.groq.com/docs/api-reference#chat-create)
documents synchronous Chat completions; the cancellation endpoint listed there
is for batches. The reviewed material does not establish synchronous Chat remote
termination acknowledgment or a maximum remote lifetime after disconnect.
[Vercel duration documentation](https://vercel.com/docs/functions/configuring-functions/duration)
describes Function timeout termination, and the
[Functions API reference](https://vercel.com/docs/functions/functions-api-reference)
describes opt-in request cancellation and bounded cleanup lifetime. These are local
runtime behaviors, not a Groq termination guarantee. This conclusion is a limit of
the verified evidence, not a claim that Groq can never cancel. No real-service
tests or production access were performed; offline Lua/SDK doubles cannot prove
provider termination or deployed Function behavior.

Each reservation counts even when future generation fails; release never refunds
questions. These request counts and the configured 700 output-token target do
**not guarantee a total token-consumption or monetary cap**. Bounded single-question
generation, validated JSON and conservative lease integration are present in PR #45;
public UI activation, history and remote cancellation confirmation remain absent.

Offline tests execute the actual Lua using dev-only Fengari with a mocked
`redis.call` and deterministic time. Scripts deliberately use the Lua 5.1-compatible
subset and floating-point millisecond arithmetic (Fengari's Lua 5.3 integer model
differs from Redis). They verify rejected boundaries, shared state and parallel
callers; they do not establish live Redis durability/cluster behavior or real
provider termination. No external Groq, Turnstile or Redis endpoint is used by
these tests. Public Demo browser E2E keeps its existing non-GET prohibition.

An explicitly invoked [Redis verification runner](../planning/demo-chat-redis-verification.md)
adds real Upstash compatibility checks using only disposable test namespaces and
dedicated test credentials. It is excluded from normal Vitest discovery and has
not been executed as part of this hardening task. Production lease expiry behavior
is unchanged; TTL cleanup applies only to the runner's synthetic test keys.

Primary references checked 2026-10-27: [Cloudflare Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
(page updated 2026-10-22), [Redis EVAL atomicity](https://redis.io/docs/latest/develop/programmability/eval-intro/),
and [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route).
Online Next.js documentation currently labels 16.4.3; this repository uses installed
16.3.8 and its existing Request/Response Route Handler conventions. The installed
Upstash 1.39.0 source/types confirm per-request abort-signal factories. Its
`retry: false` unexpectedly performs two network attempts; the adapter uses
`retry: { retries: 0 }`, verified through the installed SDK with mocked fetch.

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

Chat message requests return `400` with the existing required-fields error for malformed or empty JSON bodies and invalid `conversationId`/`message` values, before Conversation lookup, rate limiting, retrieval or persistence. Unexpected body-read, authentication, database, context/retrieval and generation-setup exceptions propagate to Next.js error handling; they are not converted to authorization failures or successful responses. Rate-limit configuration and service failures have the controlled `503` contract described below.

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

The shared `buildChatSystemPrompt()` requires citations to remain scoped to their linked Findings, separates sourced and unsourced observations before derived calculations, and prohibits judging a total-development-time target from measurements of only some workflow stages. These are model instructions, not deterministic evidence or metric-scope validation.

Recent additions verified in the uncommitted local working tree explicitly distinguish Source IDs from Finding/Research IDs and retrieval metadata, prohibit pseudo-citations, require exact ASCII markers without spaces, and require coverage of each material relevant Finding with its limitations. Workflow recommendations must use net observed savings rather than interpreting increased stage duration as spare capacity, with extrapolations labeled as assumptions. These instructions are present locally; this review does not establish that they are committed, deployed, or reliably obeyed by a model.

Findings without linked Sources may still be used as Research knowledge, but the model must not fabricate a Source citation for them.

Research-level Source existence alone is not sufficient evidence for a citation.

---

## 7. Citation Persistence and Presentation

Before saving a completed AI answer, the server normalizes supported citation-marker variations and removes recognized markers whose normalized IDs are outside the request's allowed Source ID set. Allowed markers remain in standard `[source:ID]` form inside `Message.content`.

```text
AI response
   ↓
Raw response with citation markers
   ↓
validateSourceCitations(): normalize markers, then check request allowlist
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

`normalizeSourceCitationMarkers()` converts `【source:id】` to `[source:id]`, removes ASCII space/tab padding immediately after `[` and after the ID before `]` in supported ASCII markers such as `[ source:id ]`, and replaces U+2011 non-breaking hyphens with U+002D ASCII hyphens inside recognized citation IDs. Normalization is confined to citation markers, not arbitrary answer text. The prefix is case-sensitive `source:`. Japanese-bracket IDs must be nonempty and exclude whitespace and Japanese/ASCII square brackets; Japanese-bracket padding is unsupported. ASCII normalization requires a nonempty ID without whitespace or a closing `]`; whitespace after the colon, within the ID, or as line breaks is unsupported. Other Unicode variants and arbitrary malformed syntax are not generally repaired.

Both `validateSourceCitations()` and `parseSourceCitations()` invoke this normalizer. Validation removes recognized markers outside the allowed set before persistence; parsing removes recognized markers from answer text and deduplicates IDs without independently checking an allowlist. The parser also cleans whitespace before recognized punctuation and trims the answer text. Neither function verifies that an eligible Source supports a particular claim. Normalization is format compatibility, not semantic evidence verification.

Finding IDs and retrieval metadata are not automatically equivalent to Source citations. A recognized marker containing a disallowed Finding ID is removed during validation, but unrecognized text such as `【type:FINDING, researchId:...】` can remain visible. The Groq Case 05 observation in the quality report demonstrates this processing boundary; it does not establish complete live-stream or restored-UI behavior.

Conceptually:

```text
Model citation
[source:abc123]
       ↓
Normalize supported marker variants and extract Source ID
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

The outgoing text stream is not filtered by the persistence allowlist. The panel parses accumulated live text with the shared parser, so supported complete citation markers can be normalized for presentation. After streaming, it fetches conversation detail to refresh Sources, but does not replace live messages with validated persisted text. Live and restored answers can therefore differ. Live Source lookup uses conversation-level Sources and the Research fallback, not the per-request allowlist. A Source refresh failure is logged without failing the completed exchange. Raw output, normalized/validated output, parsed references, live rendered content, and persisted content are distinct boundaries; the direct synthetic evaluation does not fully verify streaming, partial-marker display, or persistence/UI parity.

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

The generation route (`POST /research/[id]/chat`) uses Upstash Redis and `@upstash/ratelimit` by default, with a sliding window of 10 requests per minute. The limiter identifier is `workspaceId:userId`, so the limit applies per Workspace × User. The standard backend, prefix and analytics configuration are retained in production.

Normal local development may explicitly select the server-only `CHAT_RATE_LIMIT_BACKEND=memory`, but only when `NODE_ENV=development`. This backend counts up to ten accepted requests in a rolling 60-second timestamp window per identifier. It stores at most ten timestamps per active key, prunes expired timestamps and keys on the next check, and uses no Redis or added dependencies. Its counters belong to one module instance/process, reset on restart or module reload, and are not shared across workers. It is a development aid rather than a distributed production limit; its timestamp algorithm is separate from the Upstash SDK's sliding-window implementation. See [local enablement](../../README.md#local-chat-without-upstash).

Unset/empty backend settings and explicit `upstash` use the standard backend. Its credentials are checked before constructing Redis, preserving `Redis.fromEnv()`'s `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` and `KV_REST_API_URL` / `KV_REST_API_TOKEN` fallbacks. Missing credentials, unsupported backends, and `memory` outside development fail closed with HTTP `503`, a fixed safe message and `code: "CHAT_RATE_LIMIT_NOT_CONFIGURED"`. They never fall back to unlimited access or to memory. Redis initialization/request exceptions instead return `503` with `code: "CHAT_RATE_LIMIT_UNAVAILABLE"`, without exposing the exception, credentials or destination.

The installed `@upstash/ratelimit@2.2.0` defaults to a five-second timeout and can resolve with `success: true, reason: "timeout"`. The route explicitly converts that result to `CHAT_RATE_LIMIT_UNAVAILABLE` / `503`, so this SDK fail-open path cannot proceed into retrieval or writes. Pending Redis and analytics work is not cancelled by this check; this is not an assertion that all SDK background failures are observed. Both 503 paths stop before new USER/AI Message, Conversation activity and AiUsageEvent writes, embedding and generation. The UI displays a fixed service-availability message for any 503 without reading the response body. Other authentication, stream-consumption and saved-history recovery behavior is retained.

C2 still rejects Chat with its existing 503 before authentication or limiter selection, including when memory is requested; direct limiter access also checks the C2 service guard first. Public Demo still returns its existing 404 before authentication or limiter selection. Neither mode is enabled by the new setting.

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

At `lg` (1024px) and above, the AI Assistant starts hidden. Ask AI opens a sticky right-hand panel (20rem at `lg`, 24rem at `xl`); Close returns focus to Ask AI. PR #38 keeps the panel mounted while hidden, preserving the draft, selected Conversation, Messages, Supporting Sources, and in-flight sends. The Research body uses the available width while closed. Crossing below `lg` closes desktop AI and returns focus to the Research body when needed.

Below `lg`, a fixed bottom Ask AI action opens the AI Assistant in a dialog with a maximum height of `90dvh` and scrollable content.

Both interfaces reuse the same Research AI panel and conversation behavior rather than maintaining separate AI implementations.

Component reuse does not mean shared live state: the desktop and dialog panels have separate selected-conversation, message, and draft state. History restores persisted messages; drafts and in-progress streams are not synchronized between layouts. Users create a conversation with New or restore one with History before sending a question. The UI provides creation, loading, restoration, and submission feedback, but has no stop-generation control. PR #38 records scoped focus, 1023px/1024px boundary, mobile regression, and user real-browser checks, including an answer displayed after closing and allowing sufficient time. Comprehensive responsive/accessibility acceptance and production AI quality remain open; see the [verification scope](../planning/phase10-quality-acceptance.md#pr37-39-status-alignment).

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
| `scripts/evaluate-ai-chat.ts`               | Generate a selected synthetic quality case with Gemini or Groq; print raw, validated, parsed, and usage outputs |

Context evaluation covers strong positives, weak/paraphrased positives, related-but-unsupported questions, and unrelated questions. These scripts print results for human review; they do not provide assertion-based regression tests or recall/precision metrics. End-to-end generated-answer behavior was evaluated separately through manual chat testing.

The [Phase 10 AI Chat quality report](../planning/ai-chat-quality-evaluation.md) preserves the original six-case Gemini baseline, later prompt improvements, five Gemini Case 03 repeats, and the earlier Groq Cases 03 and 06 records. Developer-reported Groq executions now cover all six cases: Cases 01, 02, 04, and 05 have Fail assessments, Case 03 has unresolved inference issues without a consolidated score, and Case 06 retains **Pass, 6/6**. Raw-model compliance is assessed separately from application normalization and ID validation. Existing citation unit-test source covers bracket, U+2011, and space-padding normalization; neither test coverage nor terminal observations establish semantic grounding, full production E2E behavior, or general model reliability. No provider calls or tests were rerun for this documentation update.

The latest developer-reported Gemini six-case regression on October 10, 2026 (JST), using the locally improved shared prompt, received **Pass 3 / Fail 3** under the strict manual rubric. Citation eligibility was appropriate in all six observed responses; failures concerned causal wording, qualifications, or measurement guidance. The report compares these observations with earlier Groq runs while explicitly retaining different prompt revisions, repetition counts, and rubric interpretations as limitations. This is not a controlled head-to-head trial, a cost comparison, or authenticated production Chat API validation; historical scores remain unchanged.

The initial maximum cosine distance of **0.35** was selected from the current Phase 6 evaluation set. It preserved the tested strong and weak positive cases while rejecting the tested unrelated cases. Related-but-unsupported questions can still pass the similarity threshold, which is intentional: semantic relevance is not equivalent to answer support. The threshold is an evaluation-derived initial parameter rather than a permanent confidence boundary and should be reevaluated as Workspace knowledge grows.

A separate manual chat E2E evaluation covered three behaviors: a positive question supported by retrieved Workspace evidence, a related-but-unsupported question, and an unrelated question. The positive case produced a grounded answer with a Supporting Source. The related-but-unsupported and unrelated cases produced insufficient-evidence responses rather than unsupported answers.

One known retrieval-quality limitation remains: Finding-level deduplication retains only the closest chunk for each knowledge item. That representative chunk may not contain the most useful answer span even when the correct Finding was retrieved. Adjacent-chunk expansion, reranking, or other chunk-selection improvements are deferred until broader evaluation shows that this limitation materially affects answer quality.

The local `retrieval-evaluation.txt` contains exploratory results, including distances above the current 0.35 cutoff. It should be treated as an exploratory evaluation artifact rather than a passing regression result for the current filtered implementation. The log also illustrates that topic similarity can return link-only Findings or chunks that omit the requested information. Broader threshold calibration and retrieval-quality evaluation remain necessary as the indexed Workspace corpus grows. No database or provider evaluation was rerun specifically for this documentation update.

---

### 13.6 Retrieval and Indexing Observability

Phase 8.5 adds targeted Sentry custom spans for operation latency and execution visibility. Performance tracing uses the environment-driven sample rate documented in the [Phase 8 roadmap](../planning/roadmap.md#phase-8--application-infrastructure); spans are subject to sampling rather than a record of every execution. Phase 8.4 remains responsible for error capture and source-map support.

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
