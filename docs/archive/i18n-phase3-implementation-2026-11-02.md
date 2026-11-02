# Public Demo i18n Phase 3 implementation review

Date: 2026-11-02 JST. Branch: `main`. No commit, push, branch, stash, schema,
migration, database or external AI operation was performed. Initial working tree
was clean. Package manager: existing `pnpm@12.9.1`; no dependency changes.

## Result

Japanese display covers Developer Productivity, Code Quality & Reliability,
Developer Experience, and Adoption & Organizational Impact: four titles,
descriptions and conclusions, 17 Findings, four curated comments and known tags.
Legacy and explicit English routes preserve original content. Shared display
components apply the overlay; Research page implementations are not duplicated.

`research-ja.ts` is keyed by code-only Research/Finding semantic identifiers.
`research-translation-baseline.json` independently pins the reviewed English and
source attribution. The original seed content moved to `curated-content.ts` with
those keys, and the seed imports it without changing persisted values. Matching
uses exact title + description, then exact child content and source attribution;
neither generated IDs nor array positions select translations. Duplicate list
identities or duplicate child content fall back. Missing/stale fields retain
English; changed Research identity or complete detail source attribution causes
whole-Research fallback. See the architecture document for precise rules.

The productivity translation retains GitHub's 95 developers, 2022 JavaScript
HTTP-server experiment, 55% reported faster completion and 1h11m/2h41m averages;
METR's 16 developers, 246 issues, familiar repositories, early-2025 tools and
19% longer completion time. Scope, hypotheses and uncertainty remain explicit.
This task translated existing evidence without introducing or re-verifying claims.

Research, Finding, Source, Comment and Tag IDs, relationships, timestamps,
publication titles and URLs remain canonical. Dates use existing locale-aware
formatting. Chat receives original English titles/evidence and original sources;
questions and answer-language behavior remain unchanged. No backend/security,
model, quota, Turnstile, validation or retention settings were changed.

## Exact verification

All commands ran from the repository root with the declared pnpm version.

```powershell
pnpm exec vitest run src/lib/demo/research-presentation.test.tsx src/lib/demo/seed-evidence.test.ts src/app/demo/localization.test.tsx src/app/demo/pages.test.ts src/lib/i18n/demo-routes.test.ts src/lib/i18n/translate.test.ts src/lib/demo/chat-questions.test.ts src/lib/demo/chat-client.test.ts src/components/demo/demo-chat-client-panel.test.tsx src/components/research/research-detail-content.test.tsx --exclude 'test-results/**'
```

Result: **10 files, 157 tests passed**. By file, in command order:
11, 4, 10, 19, 9, 16, 3, 47, 16, 22 tests. Coverage includes all translated
fields/topics, factual qualifiers, reseeded IDs, reordered Findings, stale/missing/
duplicate/misattributed content, English routes and nearby Chat compatibility.

```powershell
$env:DEMO_I18N_BROWSER_CHANNEL = 'msedge'
pnpm exec playwright test --config playwright.demo-i18n-isolated.config.ts
```

Result: **9 passed** at 375/768/1280px (three flows per width). Existing isolated
fixture fulfils/aborts every HTTP request and closes WebSockets; no Next.js server,
database or AI service was started. Checks include Japanese facts/comments/tags/
dates, original publication and answer citation links, unchanged English questions,
busy guards, error/draft behavior, keyboard switching, Back/Forward and identity/
query/fragment preservation. Synthetic screenshots and network accounting are
included in the review ZIP.

```powershell
pnpm exec tsc --noEmit
pnpm exec eslint src/lib/demo/curated-content.ts src/lib/demo/curated-test-fixtures.ts src/lib/demo/research-ja.ts src/lib/demo/research-presentation.ts src/lib/demo/research-presentation.test.tsx src/components/demo/demo-pages.tsx src/prisma/seeds/public-demo.ts src/app/demo/localization.test.tsx e2e/demo-i18n-isolated.spec.ts e2e/fixtures/demo-i18n-entry.tsx e2e/fixtures/demo-i18n-offline.ts
git diff --check
```

Result: all passed. Git emits only the repository's normal LF/CRLF notices.
An additional read-only comparison against `HEAD` verified that extracted seed
content is identical after removing only new semantic keys and the export keyword.
The React component review retained shared rendering, immutable projections,
existing accessible markup and server/client boundaries. Prisma 8 contract
artifacts were inspected; schema/query changes were unnecessary.

Initial sandboxed esbuild startup returned `spawn EPERM`; the scoped Vitest and
Playwright commands succeeded with approved child-process permissions. An early
PowerShell text-encoding issue in newly inserted browser assertions was corrected
before the successful checks. An initial narrower Vitest filter also discovered
one pre-existing archived test copy; the final run explicitly excludes
`test-results/**` and counts only the ten source test files above.

No full test suite, production build, Production database or live AI call ran.

## Changed files

- `src/lib/demo/curated-content.ts` (new canonical data extraction with keys)
- `src/lib/demo/research-translation-baseline.json` (new independent English baseline)
- `src/lib/demo/research-ja.ts` (new Japanese catalog)
- `src/lib/demo/research-presentation.ts` (new guarded display overlay)
- `src/lib/demo/curated-test-fixtures.ts` (new offline curated fixtures)
- `src/lib/demo/research-presentation.test.tsx` (new focused tests)
- `src/prisma/seeds/public-demo.ts` (imports extracted canonical catalog)
- `src/components/demo/demo-pages.tsx` (uses overlay only for display)
- `src/app/demo/localization.test.tsx` (all curated topics through real route entrypoints)
- `e2e/fixtures/demo-i18n-entry.tsx` (curated synthetic browser data)
- `e2e/fixtures/demo-i18n-offline.ts` (original source metadata in canned response)
- `e2e/demo-i18n-isolated.spec.ts` (localized Research facts and navigation checks)
- `docs/architecture/i18n-foundation.md` (architecture and maintenance policy)
- `docs/planning/roadmap.md` (bounded localization completion status)
- This implementation report.

## Limitations and maintenance

Content matching is intentionally strict and can show mixed English/Japanese
after edits. Title/description or complete source changes conservatively disable
detail translation; review the baseline and Japanese together, without blindly
regenerating the baseline. Identical canonical duplicate Research records cannot
be distinguished by detail projection alone; only an exact same identity/source
set can match the same translation. Lists reject duplicate identities. Comments
match scoped content rather than author identity.

No general SaaS localization, source-document translation, workspace copy
translation, root HTML language fix, global error localization or saved
conversation translation is included. Independent native-language editorial
review remains desirable. Browser checks establish synthetic component behavior,
not deployed Next.js hydration/SEO or live model answer-language compliance.

Review ZIP: `C:\Users\owner\Desktop\sm-dev\review-zips\evidence-atlas-i18n-phase3-2026-11-02.zip`.
It contains the complete patch (including new files), changed source/docs/tests,
this report, and scoped browser evidence. Secrets, environment files, database
dumps, dependencies and unrelated files are excluded.
