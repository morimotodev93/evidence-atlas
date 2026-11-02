# English/Japanese localization foundation

Status: Phase 3 curated Public Demo Research presentation localization implemented,
2026-11-02. Canonical evidence remains English; full-site/database localization
remains outside this scope.

Phase 4.1a adds only the SaaS locale-cookie reader described below; it is not
connected to application rendering.

## Routes and shared rendering

- `/demo` and `/demo/research/[researchId]` retain default English behavior with no redirects.
- `/en/demo`, `/ja/demo`, and `/{en|ja}/demo/research/[researchId]` use the same
  `DemoWorkspaceView`, `DemoResearchView`, and `DemoShell` as the legacy routes.
- `[locale]/demo` entrypoints and layout reject unsupported locale codes with
  `notFound()` before reading data. No middleware is introduced. Research and
  Source IDs and the existing fixed-Workspace public read boundary are unchanged.

`components/demo/demo-pages.tsx` contains shared display logic; route entrypoints
only validate parameters, read the existing projection and determine Chat
eligibility. Shared Research and Appearance components accept an optional locale
that defaults to English, retaining authenticated application behavior.

## Conventions and dictionary API

`src/lib/i18n/locales.ts` defines `Locale`, `supportedLocales` (`en`, `ja`),
`defaultLocale` (`en`), `isLocale`, and `resolveLocale`. Codes are exact and case
sensitive. Unsupported inputs, including regional codes, resolve to English;
browser preference negotiation is deliberately outside this helper.

`dictionaries/en.ts` is the complete dictionary and defines `TranslationKey` from
its keys. Keys describe UI purpose (for example `demo.researchList`), rather than
English sentences. `Dictionary` gives each key a string value; `ja.ts` uses
`satisfies Partial<Dictionary>` to permit missing entries while rejecting unknown
keys. Phase 2 extends the five original keys to cover Demo navigation, Research
section descriptions/counts/status/dates and empty states, Appearance, Chat
instructions/controls/placeholder/status/errors, and accessible labels. Research
text, Tags and curated Comments use the separate Phase 3 presentation catalog
described below. Workspace names/descriptions, original source titles and AI prose
remain unchanged. All canonical database content remains unchanged.

`translate(key, locale)` accepts only typed keys, selects a supported locale, and
falls back per missing entry to English. Omitting the locale also selects English.
Japanese entries currently cover the extracted UI keys; dictionaries may remain
partial. A scoped test temporarily omits an entry to verify English fallback.
`translate(key, locale, values)` also replaces named `{count}` placeholders with
plain text; React escapes the output. This is not an ICU/plural-message engine.
Example: `translate("demo.readOnly", "ja")` returns `閲覧専用デモ`.
Do not pass arbitrary external strings as translation keys. Dates use `ja-JP`
for Japanese and the existing `en-US` formatting for English.

The dictionary helpers have no dependencies, request state or side effects and
work in server or client modules. Route parameters select the UI language, with
no cookie/header/browser negotiation. Existing English wording is retained,
apart from additive language controls, metadata and a bilingual input hint.
The root layout, global theme initialization and hydration suppression are unchanged.

A lightweight dictionary is sufficient for these static labels. A library could
later help with plural rules, formatted messages, locale negotiation, and route/SEO
integration, at the cost of dependencies and routing/provider configuration.
Reassess when those requirements exist; no i18n library is installed.

## SaaS locale-cookie reader (Phase 4.1a)

`src/lib/i18n/saas-locale.ts` is a server-only module. Its asynchronous
`getSaasLocale(): Promise<Locale>` reads `evidence_atlas_locale` through Next.js
`cookies()` and reuses `resolveLocale()`. Only exact `en` and `ja` values are valid;
missing, empty or unsupported values (including `ja-JP` and `JA`) fall back to
English. It does not write, delete or clear cookies and has no authentication,
Workspace or database dependency.

Cookie persistence, a SaaS language-switching UI/Action and passing the locale
to screens are not implemented. Existing SaaS rendering and URL-based Public
Demo language selection remain unchanged. Scoped unit tests mock `next/headers`
without a database or running server and verify resolution and absence of cookie
mutations.

## Language switching and Chat

The header adds a native labeled select with English/日本語 options and the current
locale selected. It supports keyboard use and wraps with the existing header at
mobile widths. `DemoLanguageBoundary` shares only local Chat activity state;
the switcher is disabled during verification/session preparation and generation.
`DemoLanguageSelect` navigates to the matching localized Demo path, preserving
the Research segment and the browser's query string (including repeated keys)
and fragment. It uses ordinary full-document navigation, creating browser history
entries without a router/middleware dependency. The header and back links remain
within their legacy/localized route family. Focus scroll margins reserve space
for the header with language and Appearance controls.

Switching after processing finishes resets the in-memory draft/session/answer;
these are not persisted or transferred across languages. Back/Forward restores
the URL, not a saved Chat session. A switch never verifies a session, submits a
question, or generates an answer. Existing browser navigation can still leave a
page; this is not an unsaved-draft confirmation feature.

`getDemoQuestions(canonicalResearchTitle, locale)` selects English/Japanese
topic-specific prompts from saved-evidence question lists. The four canonical
English titles remain the topic keys: the display overlay never replaces the
canonical title passed to Chat.
Unknown titles use language-specific general questions. Existing no-consecutive-
repeat selection, input focus, editable insertion, draft protection and manual
submission remain. The Japanese display title is never used for topic selection. Editable canonical
titles would require a separate topic-selection design.

Only client-facing Chat notices are localized. Request bodies still carry the
user's exact English/Japanese question and the same Research ID, with no locale
field or language prefix. AI prose is never translated or forced to the UI
language; the existing model receives the question as before. Actual model
language compliance has not been verified with a live service. Known fixed
evidence notices are translated for display; unknown notices remain verbatim.
Source IDs and original titles/URLs retain all existing validation. Groq model,
token limits, timeout/retry policy, Turnstile verification, Redis quotas/leases,
evidence retrieval, allowlists and all server security boundaries are unchanged.

## Metadata and document language

`demoMetadata` supplies English/Japanese titles/descriptions and relative
same-origin canonical/alternate links without hardcoding a deployment origin.
Localized pages have a canonical in their own language. Legacy English pages
canonicalize to `/en/demo`; `en`, `ja`, and `x-default` alternates point to the
matching Research ID, with `x-default` using the legacy route. Query strings are
not canonical identity. Research pages reuse the localized Demo metadata without
fetching or translating evidence for SEO. Root title templates are retained.

**Known limitation:** root `<html lang="en">` remains fixed. `DemoShell` wraps
all Demo UI in `lang="en"` or `lang="ja"`, giving Japanese content a correct
subtree language without mutating the document in an effect. Accurate per-locale
HTML language requires a future root-layout/route-group design. Do not claim the
document-wide language or Next.js hydration was verified by the browser harness.
The generic Next.js not-found/fatal error surfaces remain framework defaults;
this phase localizes Demo empty states and Chat errors, not global error handling.

## Text boundaries observed in the repository

| Text category | Current location / behavior | Localization approach |
| --- | --- | --- |
| Static interface | Demo shell/pages, shared `components/research`, Appearance and Chat | Typed UI dictionaries and accessible labels; authenticated navigation remains English |
| Saved research | `Research.title`, nullable `description` and `conclusion`; `Finding.content`, optional `data`; Workspace description, Tags, Comments | Separate presentation translations, with canonical evidence retained |
| Source titles and citations | `Source.title`, `url`; `FindingSource` links; source IDs validated in Demo chat | Preserve original title, URL, IDs, and citation links; optional translated title is a clearly labeled display aid |
| AI output and question suggestions | `lib/demo/chat-generation`, `chat-client`; `chat-questions.ts` selects prompts by canonical English Research title and locale | Keep UI locale independent of AI answer language; only predefined suggestions and client-facing notices are translated |
| Validation and errors | `types/research/validation.ts`, `lib/demo/chat-client.ts` HTTP/status notices and transport validation | Demo client notices use typed keys; retain protocol validation, limits, and internal diagnostics; authenticated validation remains English |

The Demo has its own header with Appearance and repository link; authenticated
pages use `AppShell`, `AppHeader`, and `AppNavigation`. There is no shared footer
component to localize. Root metadata provides an English description and title
template; Demo routes override their own title and description as described above.
Groq configuration, token limits, Turnstile, Redis rate limits/leases, random
question behavior, evidence validation, and authentication are untouched.

## Prisma and research presentation assessment

Repository sources reviewed: `src/prisma/contract.prisma`,
`src/prisma/seeds/public-demo.ts`, `src/lib/demo/read.ts`, and
[Data Model](data-model.md). This is a repository assessment, with no database or
external service connection.

The current contract stores one canonical value per text field, with no locale
or translation relations. Research and Source IDs are language independent;
Findings retain their `FindingSource` relationships. Source metadata consists of
title, URL, and timestamps, without a separate publication-language/title field.
The seed profile contains English research descriptions, findings, conclusions,
source titles, comments, and sample conversations. Its content is now extracted to
`lib/demo/curated-content.ts`; persisted values and seeding relationships are unchanged.

**Database schema changes are unnecessary for this curated Japanese Demo.**
The Phase 3 presentation overlay is implemented after the existing public read
boundary. Code-only semantic keys in the seed catalog identify curated Research
and Findings without persisting new columns or reusing generated database IDs.
The matching and fallback rules below supersede the earlier proposed ID overlay.
Workspace names/descriptions remain canonical; known Research Tag names are
translated only within a matched Demo presentation. `Finding.data` is unused.

If editable multilingual research is later required, consider separate translation
records keyed uniquely by entity ID and locale, with original revision/fingerprint,
translation provenance, and review status to detect stale translations. That is a
future design decision, not a schema change approved here. Translations are
presentation derivatives, never independently verified Sources or Findings. Do
not duplicate evidence records, rewrite seed data, or feed translated overlays into
retrieval/AI context implicitly. Original publication titles and citation identity
must remain available even when a translated display title exists.

## Scoped verification and remaining candidates

Vitest exercises actual legacy/localized route entrypoints with mocked public
reads, locale validation, metadata, dictionaries/fallback, English compatibility,
question selection, and nearby Chat/Research/Appearance behavior. The dedicated
`playwright.demo-i18n-isolated.config.ts` runs shared production display components
at synthetic Demo URLs with local data/Turnstile/API doubles at 375/768/1280px.
Every HTTP request is fulfilled or aborted, WebSockets are closed, and a dead
proxy/DNS mapping adds isolation. `DEMO_I18N_BROWSER_CHANNEL=msedge` can use installed
Edge when the Playwright Chromium executable is unavailable. The default public
Playwright configuration excludes both isolated suites.

Browser checks cover keyboard switching, current locale, repeated query keys and
fragments, Back/Forward, Research identity, focus visibility, Japanese wrapping,
overflow, random prompt insertion, draft protection, busy guards, source links,
unchanged user question text, and localized errors without automatic retries.
These are synthetic component/browser checks plus route unit tests, **not a
running Next.js HTTP/RSC/hydration or deployed SEO verification**. No real database
or AI service is contacted. Full suites and production builds are outside scope.

Remaining candidates: accurate root HTML language, Next.js/runtime and deployed SEO
verification in an authorized isolated environment, native-language copy review,
global error localization, richer plural/message formatting if needed, and
localization beyond the curated Demo catalog. Editable
multilingual content storage remains a future design decision. Never duplicate
canonical Research, Source or Finding records for language variants.


## Phase 3 Research translation catalog

The four topics are Developer Productivity, Code Quality & Reliability,
Developer Experience, and Adoption & Organizational Impact. Japanese presentation
covers four titles/descriptions/conclusions, 17 Findings, four curated discussion
comments and known Research Tag labels. Workspace copy, user names, sample saved
conversations, original publication titles/URLs and AI prose are not translated.
The Japanese wording is a presentation derivative, never a newly verified source.
No external research or factual additions were made as part of translation.

### Catalog and matching

- `src/lib/demo/curated-content.ts` owns the original English seed data and adds
  code-only semantic Research/Finding keys. `public-demo.ts` imports it; no schema,
  generated contract, database row, ID generation or seed write behavior changes.
- `research-translation-baseline.json` is an independent, version-controlled
  snapshot of the reviewed English content and source attribution, with those
  semantic keys. It is deliberately not computed from live seed content at runtime.
- `research-ja.ts` stores Japanese fields under Research semantic keys, with
  Findings under their own semantic keys. Missing entries/fields are allowed by
  the resolver and fall back to canonical text.
- `research-presentation.ts` resolves display copies only in `DemoWorkspaceView`
  and `DemoResearchView`, after the existing fixed-Workspace public read boundary.
  Reads, evidence selection and Chat context never import the presentation overlay.

A Research matches exactly one baseline title + description pair. Exact comparison
includes case, whitespace and punctuation. These two fields jointly form the
canonical identity guard; a change to either conservatively falls back for the
whole Research. List rows with duplicate identity pairs remain English. Detail
matching also requires the complete original Source title/URL multiset. Source
order and generated IDs do not affect the match; added/removed/edited Sources
conservatively fall back for the whole detail. Duplicate baseline identities are
rejected rather than selected by array order.

Within a matched Research, the conclusion must equal its independent English
baseline. Each Finding matches exactly one baseline content string and must be
unique among the displayed Findings, with the same supporting Source title/URL
multiset. Missing, changed, duplicated or differently attributed Findings retain
English. A curated comment matches the exact expected text within that Research
and must be unique among its comments; other or edited comments remain English.
No matching uses array position or generated database IDs. No fuzzy, normalized,
or cross-Research search is performed. Missing Japanese fields retain English.

Exact duplicate canonical Research records cannot be distinguished on a detail
page without persisted semantic identity. Such a detail can display the same
translation only when its identity and complete source attribution match; it
cannot pick a different catalog entry. Lists reject duplicate identity pairs.
Comments are matched by scoped content, not author identity. This is appropriate
for the curated read-only Demo, not general editable multilingual data.

### Evidence, identity and dates

All Research/Finding/Source/Comment/Tag IDs, source links and FindingSource
relationships are retained. Only text-bearing display copies change. Canonical
objects and timestamps are not mutated. Original source publication titles and
URLs remain visible in Sources, supporting references and Chat citations.
Tag names are translated only through an exact known-label map; unknown names
remain English and no new tag records are created. Existing optional locale date
formatting uses `ja-JP` for Japanese and `en-US` for English, including Research,
Source, Finding and Comment timestamps. Global/authenticated behavior is unchanged.

Developer Productivity preserves the GitHub 2022 experiment's 95 professional
developers, JavaScript HTTP-server task, reported 55% faster completion, and
1h11m/2h41m averages. METR retains July 2025, 16 experienced developers, 246 real
issues in familiar repositories, early-2025 tools, and 19% increased completion
time. Proposed explanations remain hypotheses; neither result is presented as a
universal productivity effect. The translations add no metrics or citations.

Chat still receives canonical English Research titles for suggestions, original
Research IDs and original Sources. The question is sent unchanged; UI locale does
not force answer language. Backend model/security/quotas/validation/retention and
evidence retrieval are unchanged. Translated Findings never become AI evidence.

### Maintenance and limits

When canonical curated English changes, review the Japanese against that exact
revision and its original attribution. Update the affected baseline and Japanese
fields together only after reviewing facts, scope and uncertainty. Do not blindly
regenerate the baseline to make tests pass. The baseline/seed alignment test
flags repository drift; runtime guards protect against deployed database drift.
A deployed database still containing the old reviewed English can use its matching
old translation safely. Reseeding with new IDs does not change matching.

Focused tests exercise all four topics, all translated fields, baseline coverage,
reordered Findings/reseeded IDs, duplicate/missing/stale/misattributed content,
English routes, original links, tags/dates and unchanged canonical Chat context.
The isolated browser fixture now uses the curated English seed content, with all
HTTP fulfilled/aborted locally and no live AI/database connections. It verifies
Japanese study figures/conditions/uncertainty/comments, original Source links,
Chat question passthrough and language navigation at three viewport widths.
These checks remain synthetic browser/component plus route unit tests, not live
Next.js RSC/hydration, deployed SEO, Production data or live model verification.
Independent native-language editorial review remains desirable. Full SaaS data
localization, translated Sources, root HTML language and global errors remain
outside scope.
