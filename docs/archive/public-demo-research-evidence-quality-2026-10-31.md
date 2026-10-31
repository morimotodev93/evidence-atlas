# Public Demo Research evidence quality investigation

Date: 2026-10-31 (Asia/Tokyo)

## Root cause and confidence

The existing public-demo seed lacks the specific evidence needed for questions A
and B. The Developer Productivity Research has three Sources and four Findings.
The METR Source exists, and two Findings link to it, but those Findings only say
that effects vary and familiar-codebase work may differ from isolated tasks.
Neither the negative result nor any numerical outcome was recorded in the
Research description, conclusion or Findings. A Source title cannot supply those
missing results. Insufficient evidence is therefore justified for that dataset.

This is a confirmed seed-level defect, not confirmation of the currently deployed
database contents or a reproduction of the live model's decision. No retrieval
defect or Japanese-specific refusal condition was found in the inspected path.

## Evidence path

- `src/prisma/seeds/public-demo.ts`: creates Research, Sources, Findings and
  FindingSource links. There is no separate Evidence entity in this path;
  Finding content and its linked Sources supply the evidence.
- `src/lib/demo/read.ts`, `getDemoResearch`: scopes Research by the configured
  public Workspace, then fetches all its Sources and Finding bodies. Linked
  Sources are retained only when they belong to that same Research.
- `src/lib/demo/chat-handler.ts`: calls the public read for the requested Research,
  then passes its result to `buildDemoChatContext` and `runDemoGeneration`.
- `src/lib/demo/chat-context.ts`: sends description, conclusion, Source IDs/titles,
  Finding content and linked Source IDs. Bounds are ten Sources, ten Findings,
  800 code points per Finding and 12,000 code points for serialized JSON. Both
  the old dataset and the revised three-Source/five-Finding dataset fit. No
  question-language filter or search ranking excludes METR.
- `src/lib/demo/chat-generation.ts`: `generateText` receives that JSON and the
  original question in the user message. The system prompt forbids outside
  knowledge and treating Source titles as page contents. The local empty-evidence
  shortcut is language-independent; otherwise the model sets the insufficient
  evidence flag. A true flag replaces the answer with generic insufficient prose
  and clears references. This replacement also hides any model-provided partial
  answer, but it is not established as the cause of the reported refusals.
- `validateDemoAnswer` resolves returned Source IDs against the context allowlist.
  `chat-client.ts` checks these against the public Research's Sources and
  `DemoChatAnswerView` renders the returned title/URL pairs. This establishes ID
  correspondence, not semantic proof that every sentence is supported.

## Changes and primary-source verification

Only the public-demo seed's Developer Productivity Findings change. Runtime
retrieval, prompts, bounds and insufficient-evidence behavior remain unchanged.

Verified on 2026-10-31 against the existing linked primary publications:

1. [METR, July 10, 2025](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/):
   Methodology/Core Result describe the 16-developer, 246-issue randomized trial
   and 19% longer completion time. Discussion identifies high standards and
   implicit requirements as possible explanations. The added Finding explicitly
   labels explanations as hypotheses and limits the result to early-2025 tools
   in this setting. The page links a later study; this seed describes the named
   historical study, not current tool performance.
2. [GitHub, September 7, 2022; updated May 21, 2024](https://github.blog/news-insights/research/research-quantifying-github-copilots-impact-on-developer-productivity-and-happiness/):
   Finding 2 describes the randomized HTTP-server task, 95 professional
   developers, reported 55% faster completion and average times of 1h11m versus
   2h41m. These are recorded as reported task-time results, not a universal
   productivity percentage or survey-derived gain. No new rate is calculated.

The new comparison Finding links both existing Sources. No numerical result is
invented for the Stack Overflow survey. No Source URL or schema changes.

## Validation

- `pnpm exec vitest run src/lib/demo/seed-evidence.test.ts src/lib/demo/read.test.ts src/lib/demo/chat-generation.test.ts src/lib/demo/chat-generation-sdk.test.ts src/lib/demo/chat-client.test.ts src/components/demo/demo-chat-client-panel.test.tsx`
  passed: six files, 147 tests. See ZIP `tests.txt` for the actual output.
- New tests execute the real seed against mocked ORM writes, reconstruct its
  Research/Finding/Source links, verify untruncated negative/numerical evidence,
  and inspect the installed Groq adapter's outgoing request for both original
  Japanese questions. Fetch is mocked; no real provider request occurs.
- Canned responses verify Source mapping and preservation of the insufficient
  evidence refusal: unsupported numerical prose is discarded when that flag is
  true. They do not prove that a live model will reason correctly, refrain from
  fabricating a number when it sets the flag false, or select the best citations.
- `pnpm exec tsc --noEmit --incremental false` passed, exit 0.
- `pnpm exec eslint src/prisma/seeds/public-demo.ts src/lib/demo/seed-evidence.test.ts`
  and `git diff --check`: results recorded alongside tests in the ZIP.
- Initial sandbox test startup failed with esbuild `spawn EPERM`; the same
  targeted suite passed after the execution permission escalation. No full
  test suite, build or live browser verification was performed.

## Remaining issues and operational limits

- No database was connected to or written. A guarded inspection of the isolated
  test configuration refused a non-loopback target before opening a connection;
  its isolation was not independently established. No URL or secret was logged.
  Actual isolated/production rows and live prompt contents remain unverified.
- Editing the seed does not update any already seeded database. The current seed
  creates new records and is not an idempotent update tool. Do not rerun it against
  an existing production database as a backfill. Any existing-data update needs
  a separate, explicitly scoped operational task; none was performed here.
- Whether Groq now answers A/B adequately remains unverified; no real Groq calls
  were made. There is no evidence justifying a prompt/threshold change yet.
- No architecture, routes, models or roadmap phase changed, so no specification
  update was needed. No implementation/specification conflict was found.
- Pre-existing changes to `.env.example`, `docs/architecture/ai-architecture.md`,
  `src/lib/c2/build-isolation.test.ts`, and untracked `isolated-demo-db-fixed.ps1`
  were preserved. They are excluded from the review ZIP. No commit/push/merge.

## Review package

Includes the three task files, task-only patch, before/after status, targeted test
output and check results. Environment files, database credentials, API keys and
unrelated working-tree patches are excluded. ZIP path, entry count, size and
SHA-256 are reported in the final response.
