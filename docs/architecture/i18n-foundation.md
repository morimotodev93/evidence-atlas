# English/Japanese localization foundation

Status: Phase 1 foundation implemented, 2026-11-02. Full Japanese UI and locale routing remain future work.

## Conventions and dictionary API

`src/lib/i18n/locales.ts` defines `Locale`, `supportedLocales` (`en`, `ja`),
`defaultLocale` (`en`), `isLocale`, and `resolveLocale`. Codes are exact and case
sensitive. Unsupported inputs, including regional codes, resolve to English;
browser preference negotiation is deliberately outside this helper.

`dictionaries/en.ts` is the complete dictionary and defines `TranslationKey` from
its keys. Keys describe UI purpose (for example `demo.researchList`), rather than
English sentences. `Dictionary` gives each key a string value; `ja.ts` uses
`satisfies Partial<Dictionary>` to permit missing entries while rejecting unknown
keys. The five initial keys cover read-only status, the source-code link, the
Research list accessible label, its empty state, and the back link.

`translate(key, locale)` accepts only typed keys, selects a supported locale, and
falls back per missing entry to English. Omitting the locale also selects English.
The Japanese empty-state entry is intentionally absent to exercise fallback.
Example: `translate("demo.readOnly", "ja")` returns `閲覧専用デモ`;
`translate("demo.noResearch", "ja")` returns `No research available.`.
Do not pass arbitrary external strings as translation keys.

The implementation has no dependencies, providers, request state, or side effects
and can be used in server or client modules. Current Demo callers explicitly use
`defaultLocale`; they do not inspect cookies, headers, or browser preferences.
Existing English copy, markup, classes, and links are preserved. No language
controls or new routes are introduced, and the root layout is unchanged.

A lightweight dictionary is sufficient for these static labels. A library could
later help with plural rules, formatted messages, locale negotiation, and route/SEO
integration, at the cost of dependencies and routing/provider configuration.
Reassess when those requirements exist; none is installed in Phase 1.

## Text boundaries observed in the repository

| Text category | Current location / behavior | Localization approach |
| --- | --- | --- |
| Static interface | Demo routes/layout, shared `components/research`, authenticated `components/layout`, Appearance controls; no shared translation system before this phase | Typed UI dictionaries, including accessible labels; only five Demo labels extracted now |
| Saved research | `Research.title`, nullable `description` and `conclusion`; `Finding.content`, optional `data`; Workspace description, Tags, Comments | Separate presentation translations, with canonical evidence retained |
| Source titles and citations | `Source.title`, `url`; `FindingSource` links; source IDs validated in Demo chat | Preserve original title, URL, IDs, and citation links; optional translated title is a clearly labeled display aid |
| AI output and question suggestions | `lib/demo/chat-generation`, `chat-client`; `chat-questions.ts` currently selects saved-evidence prompts by English Research title | Keep UI locale independent of AI answer language; do not translate validated answers through the UI dictionary. Future translated prompts should use stable Research identity rather than translated titles |
| Validation and errors | `types/research/validation.ts`, `lib/demo/chat-client.ts` HTTP/status notices and transport validation | Eventually map stable error/status codes to UI messages; retain protocol validation, limits, and internal diagnostics |

The Demo has its own header with Appearance and repository link; authenticated
pages use `AppShell`, `AppHeader`, and `AppNavigation`. There is no shared footer
component to localize. Root metadata currently provides an English description
and title template; `<html lang="en">` is fixed. Neither changes in this phase.
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

## Phase 2 work

- Expand dictionaries for shared Research, Appearance, navigation, Chat, and errors;
  review Japanese copy, typography, date formatting, and any plural/interpolation needs.
- Plan `/en/demo`, `/ja/demo`, and their Research detail routes around shared page
  implementations, retaining `/demo` compatibility and language-independent IDs.
  Decide canonical/alternate URLs and metadata; implement correct document language
  without disturbing theme initialization or hydration. No redirects exist yet.
- Add locale selection only when localized screens are ready. Define AI response
  language separately from UI language, retaining explicit question intent and all
  citation/evidence checks; review suggested-question identity and prompt behavior.
- If needed, author and review ID-keyed content overlays with stale-content checks.
- Verify both languages end to end, including fallback, accessibility, responsive
  layout, source attribution, and unchanged service limits. Phase 1 verification is
  scoped unit/render testing, TypeScript, ESLint, and whitespace checks only.
