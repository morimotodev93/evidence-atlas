# English/Japanese localization foundation

Status: Phase 2 Public Demo UI localization implemented, 2026-11-02. Research
evidence translation and full-site localization remain outside this scope.

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
text, Workspace names, Tags, Comments, original source titles and AI prose are
canonical content and remain unchanged.

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
English titles remain the topic keys because research content is not localized.
Unknown titles use language-specific general questions. Existing no-consecutive-
repeat selection, input focus, editable insertion, draft protection and manual
submission remain. If titles become editable/localized, migrate topic selection
to stable ID-based configuration as separate content work.

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
source titles, comments, and sample conversations; it stays unchanged.

**Database schema changes are unnecessary for an initial Japanese Demo.** UI
translation alone can show canonical English evidence; a small curated Demo can
later add a version-controlled presentation overlay keyed by canonical Research,
Finding, and Source IDs plus locale. That overlay is not implemented here. Resolve
overlays only after the existing public Workspace/read boundary, fall back per
field to canonical English, and retain canonical IDs, URLs, and original titles.
Workspace and Tag display names may use the same approach. Do not use mutable
English titles as overlay keys or repurpose `Finding.data` as a translation store.

If editable multilingual research is later required, consider separate translation
records keyed uniquely by entity ID and locale, with original revision/fingerprint,
translation provenance, and review status to detect stale translations. That is a
future design decision, not a schema change approved here. Translations are
presentation derivatives, never independently verified Sources or Findings. Do
not duplicate evidence records, rewrite seed data, or feed translated overlays into
retrieval/AI context implicitly. Original publication titles and citation identity
must remain available even when a translated display title exists.

## Scoped verification and Phase 3 candidates

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

Phase 3 candidates: accurate root HTML language, Next.js/runtime and deployed SEO
verification in an authorized isolated environment, native-language copy review,
global error localization, richer plural/message formatting if needed, and
reviewed ID/locale content overlays with stale-translation detection. Editable
multilingual content storage remains a future design decision. Never duplicate
canonical Research, Source or Finding records for language variants.
