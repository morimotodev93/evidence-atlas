# English/Japanese localization foundation

Status: Phase 3 curated Public Demo Research presentation localization implemented,
2026-11-02. Canonical evidence remains English; full-site/database localization
remains outside this scope.

Phases 4.1a and 4.1b-1 add the SaaS locale-cookie reader and saving Server Action.
Phase 4.1b-2 connects them to the shared SaaS Header, with switching limited to
Home until input-state preservation is verified. SaaS page translation is deferred.
Phase 4.2a localizes shared SaaS navigation only, using that same cookie-derived
locale; page bodies and business forms/dialogs remain English.
Phase 4.2b adds opt-in translation of the shared Dialog's own Close controls;
existing business Dialogs have not been connected to the locale.

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
work in server or client modules. Demo route parameters select its UI language, with
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

The saving Action and Header control are described below. Locale delivery to SaaS
page content and its translation are not implemented. URL-based Public Demo
language selection remains unchanged. Scoped unit tests mock `next/headers`
without a database or running server and verify resolution and absence of cookie
mutations.

## SaaS locale-cookie saving Action (Phase 4.1b-1)

`src/lib/i18n/set-saas-locale.ts` uses `"use server"` and exports
`setSaasLocale(locale: unknown): Promise<void>`. It validates client input with
the existing `isLocale()` before accessing cookies. Only exact `en` and `ja`
are accepted; all other inputs throw without changing cookies, rather than
saving an English fallback. The Action shares `SAAS_LOCALE_COOKIE` with the
reader and uses Next.js `cookies().set()` in the Server Action context.

The cookie has `Path=/`, `SameSite=Lax`, `HttpOnly`, a 180-day `maxAge`
(15,552,000 seconds), and `Secure` only when `NODE_ENV` is `production`.
No authentication, Workspace or database dependency, redirect or explicit cache
revalidation/refresh is introduced. Workspace and Auth.js cookies are untouched;
locale is never an authorization or Workspace-selection input.

Cookie saving is implemented; no Provider is introduced. SaaS page content still
defaults to English and Public Demo continues to select its locale through URLs.
Scoped mocked-cookie
tests cover validation, attributes, environment-dependent `Secure`, preservation
of other cookies and round trips through the existing reader.

## SaaS Header language control (Phase 4.1b-2)

The existing Server Component `AppShell` now awaits `getSaasLocale()` and passes
the typed locale through `AppHeader` to the client `SaasLanguageSelect`. The same
cookie-derived prop determines the initial server markup and client selection;
missing/invalid cookies still select English. No new Provider, locale-based key,
root-layout change or page-content translation is introduced. At Phase 4.1b-2,
only the control's language label used the dictionary; Phase 4.2a below extends
translation to shared navigation. The Header wraps its controls at narrow widths alongside the existing
Workspace slot and Sign out. Appearance remains in navigation.

The labeled native select offers English / 日本語 and calls `setSaasLocale()`
inside a transition. It disables while pending, guards immediate duplicate events,
and restores the server-provided selection with an accessible generic error on
failure. Cookie mutation in a Server Action causes a server rerender according to
the [Next.js mutation documentation](https://nextjs.org/docs/app/getting-started/mutating-data).
The updated Shell reads the new cookie again; no extra `router.refresh()`, URL
change, document reload, redirect or navigation is added. Authentication and
Workspace code and cookies are unchanged.

**Input-protection restriction:** switching is enabled only at the exact Home
pathname `/`, which currently has no research drafts, dialogs or AI panel. Every
other pathname (including unknown/unavailable pathnames) disables the control and
explains the Home-only restriction. Research list filters, create/edit forms,
Source/Finding/Comment dialogs, settings forms and Research AI input, sending and
streaming therefore cannot initiate a locale mutation/rerender from the Header.
No distributed dirty-state or AI-activity tracking is added. Ordinary navigation
and Workspace switching retain their existing behavior; this is not a general
unsaved-input guard.

Scoped tests cover actual cookie resolution through Shell/Header markup, changed
server props, native labels, production handler closures with mocked hooks/Action,
pending/duplicate/failure behavior, restricted routes, unchanged links and separate
Demo rendering. Hook doubles do not verify React scheduling or RSC merging.
**Phase 4.1b-3 remains open:** verify the real Next.js/Review DB round trip, initial
hydration, URL/query/fragment and auth/Workspace preservation, keyboard/focus,
narrow Header layouts and Appearance/Sign out interactions. Actual form, Dialog
and AI input/conversation/stream state preservation is unverified; keep switching
disabled there until it is demonstrated safe. No Review DB, live AI, Production
Build or full E2E was used for Phase 4.1b-2.

## SaaS shared navigation (Phase 4.2a)

Implemented 2026-11-03: `AppShell` reads `getSaasLocale()` once and passes the
same typed value to `AppHeader` and `AppSidebar`. Header passes it to
`AppNavigationMenu` and `SaasLanguageSelect`; desktop/mobile `NavigationLinks`
pass it to the existing `AppearanceSelect`. Optional navigation locale props
default to English. No Provider, Context, client cookie read or locale state is
added. Missing/invalid cookies and missing Japanese keys retain English fallback
through the existing resolver and `translate()`.

Fourteen `nav.*` dictionary keys cover the actual fixed navigation text: Primary
navigation, Home, Research, Settings, Organization, Workspace, Application landmark,
Menu, Navigation title, Close navigation, Sign out, Home only, language restriction
explanation and language-save failure. Japanese preserves Research, Organization,
Workspace and the Evidence Atlas brand; Home becomes ホーム, Settings 設定 and
Sign out ログアウト. Appearance/options and the language label reuse existing
dictionary keys. Organization/Workspace are the actual link labels; no new
"Organization settings" or "Workspace settings" labels are introduced.

All hrefs, active-route checks, IDs, permissions, sign-out Action and Workspace
selector slot remain unchanged. Organization/Workspace names, user names/email,
Research titles and supplied page content are not translated. A Japanese cookie
therefore keeps navigation Japanese after leaving Home, with the language select
disabled everywhere except exact `/`, as before. The Phase 4.1c error contract is
unchanged; only the language control's own fixed notice is translated here.

Header, Sidebar and mobile overlay use the same locale and retain their original
CSS, widths, spacing, responsive breakpoints, focus styles, Base UI modal behavior
and close-on-navigation handlers. Scoped Vitest tests verify English/Japanese
markup, cookie/default/fallback propagation, matching desktop/mobile links and
active states, accessible labels, navigation handlers, preserved caller text and
the Home-only guard. Mobile portal contents are exposed by a test double; these
are DB-free markup/handler checks, not browser layout, real keyboard/focus,
Next.js hydration or RSC verification. Actual narrow-screen wrapping and visual
balance remain unverified in a browser.

Only shared navigation is localized. Dashboard/Research/settings page bodies,
Source/Finding forms, business dialogs, AI Panel and existing Action errors remain
outside this phase. Public Demo, root `<html lang>`, authentication, DB/Prisma,
locale saving behavior and the language-switching scope are unchanged.

## SaaS common UI (Phase 4.2b)

Implemented 2026-11-03: Appearance already receives the same cookie-derived
locale as the navigation through `AppShell` → Header/mobile menu and Sidebar →
`NavigationLinks` → `AppearanceSelect`. Its existing `appearance.*` keys cover
Appearance/Theme/Light/Dark/System (外観/テーマ/ライト/ダーク/システム).
No Appearance implementation, theme values (`light`, `dark`, `system`), persistence,
English/日本語 language options or switching behavior changes in this phase.

`components/ui/dialog.tsx` owns two fixed Close labels: an `sr-only` span in
the top-right icon button and an optional visible Footer button. Both reuse the
single new `dialog.close` key (English `Close`, Japanese `閉じる`).
`DialogContent` and `DialogFooter` each accept an optional `locale?: Locale`;
omission retains English. No Context/Provider or cookie read is added. Existing
business callers pass no locale and remain English, including their titles,
descriptions, form controls and Close labels. Adoption is deferred.

For opt-in use, pass the same locale to both `DialogContent` and any
`DialogFooter showCloseButton`; the Footer does not infer it from Content.
For example, use `<DialogContent locale={locale}>` and
`<DialogFooter locale={locale} showCloseButton>`. Content sets `lang` on the
actual Base UI Popup inside its Portal, so language does not rely on DOM ancestry
under AppShell. An explicit locale takes precedence over a caller's `lang` on
Content; without locale, an existing caller-provided `lang` is preserved and no
Popup language is added by default. Each generated Close label has its own
language attribute so its pronunciation does not depend on caller content.
Popup language applies to its supplied content: callers are responsible for using
matching language or explicit overrides on mixed-language children.

Portal/Backdrop/Popup structure, button variants/positions/sizes, CSS, focus props,
refs, Root event callbacks and Base UI Close primitives remain unchanged. Escape,
focus trapping and close behavior remain delegated to Base UI. The generic
`DialogClose` wrapper does not own text and is unchanged.

Scoped DB-free Vitest checks cover default/English/Japanese Close markup using
the real Base UI Close, missing Japanese fallback, Popup/Portal structure and
language props, legacy props/children/visibility, unchanged styles and forwarding
of Escape/Close dismissal reports. For static button rendering only, the test
substitutes a plain container for Popup: actual Popup requires a browser Portal.
Appearance tests cover translated options and unchanged theme values/handlers;
existing Shell tests retain cookie-to-display coverage. These checks do not
dispatch real browser keys or verify focus trapping, portal placement, hydration
or visual layout. Browser interaction verification remains open.

Root `<html lang="en">` is unchanged. Existing business Dialogs, the separately
implemented mobile-navigation Popup and Appearance Select's portal are not given
new language attributes here; their Japanese text can still inherit root English
in portal DOM. No global portal-language solution is introduced. Business Dialog
localization, SaaS page bodies/AI Panel, Action errors, auth, DB/Prisma and Public
Demo are unchanged. Home-only language switching remains in force.

## SaaS error display contract (Phase 4.1c)

Implemented 2026-11-03: `src/lib/i18n/errors.ts` provides a display-only
`DisplayError` union, its `ErrorCode` type and `getErrorMessage(error, locale?)`.
Existing Actions, forms and their error return types are unchanged; adoption is
deferred to later phases. Home-only language switching remains in force.

Repository investigation found five failure categories:

- Input validation: Research create/edit throws the first Zod issue; Source and
  Finding Actions usually return it as `{ error: string | null }`. Schemas contain
  English required/length/URL messages; role and onboarding validation use fixed
  English notices. There is no shared structured field-error contract.
- Authentication/authorization: `requireUser()` redirects to sign-in; admin
  guards throw `Forbidden`. Research access combines missing/inaccessible records
  into `ResearchAccessError`, which many Actions expose as `Research not found.`.
  Future adoption must preserve this information boundary and navigation behavior.
- Missing data: Source, Finding and membership Actions return fixed not-found
  messages; Research edit can throw instead.
- Business restrictions/conflicts: role changes preserve at least one admin;
  evidence attachment checks Research ownership; duplicate Tags are rejected.
- Unexpected failures: many write catches return operation-specific generic
  notices, while unexpected access/read/indexing failures can propagate.

Client dialogs use `useActionState` and render `state.error` directly, often in
an alert; onboarding and member-role forms also render that string. The new helper
does not parse these strings, Zod messages, exceptions or DB error codes.

| Stable code | Dictionary key | Parameters |
| --- | --- | --- |
| `INVALID_INPUT` | `errors.invalidInput` | None |
| `INPUT_TOO_LONG` | `errors.inputTooLong` | `params.maxLength`: positive safe integer |
| `UNAUTHENTICATED` | `errors.unauthenticated` | None |
| `FORBIDDEN` | `errors.forbidden` | None |
| `NOT_FOUND` | `errors.notFound` | None |
| `CONFLICT` | `errors.conflict` | None |
| `INTERNAL_ERROR` | `errors.internal` | None |

Callers will choose codes from structured failure conditions, never by matching
existing English wording. Example:
`getErrorMessage({ code: "INPUT_TOO_LONG", params: { maxLength: 200 } }, "ja")`
returns `200文字以内で入力してください。`. No arbitrary field names, entity names,
operation text or diagnostic strings are interpolated. All seven keys have English
and Japanese entries; no existing Demo wording changes.

The function accepts unknown boundary input and maps only allowlisted codes to
typed keys. Unknown codes (including prototype property names), missing/invalid
length parameters and raw exceptions produce the generic internal-error notice.
`message`, `stack`, `cause` and extra parameters are ignored, never displayed.
It reuses `translate()` for English default/unsupported-locale resolution,
per-key English fallback when Japanese is absent, and named interpolation.

This synchronous pure helper and its dictionary-only dependency graph have no
Prisma/DB, Next.js, cookie, auth, request state, server-only or client-only dependency;
they can be imported on either side. Scoped Node tests cover both languages,
temporarily missing Japanese entries, interpolation, malformed/unknown input,
diagnostic non-disclosure and repeated calls with frozen inputs. Browser/RSC
integration and all existing Action/form adoption remain unimplemented.

## Demo language switching and Chat

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
| Static interface | Demo shell/pages, shared `components/research`, Appearance and Chat; SaaS Header/Sidebar/mobile navigation | Typed UI dictionaries and accessible labels; shared SaaS navigation follows the cookie locale, while SaaS page bodies remain English |
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
