# Design System

> **Status:** Design baseline; implementation gaps noted below
> **Last Updated:** 2026-10-26

This document defines the intended design system. Statements about required behavior are not a claim that every screen has been verified against it.

## 1. Design Principles

The design system follows the principles established in [Design Direction](design-direction.md).

- **Clarity over decoration** — Prioritize readability and information hierarchy over visual decoration.
- **Evidence-oriented** — Make evidence, sources, findings, and their relationships easy to identify and understand.
- **Consistency** — Prefer reusable patterns and semantic tokens over ad hoc visual decisions.
- **Accessibility** — Treat accessibility and sufficient contrast as design constraints from the beginning.
- **Focused complexity** — Present necessary information without introducing unnecessary UI complexity.

## 2. Accessibility

The design system adopts **WCAG 2.2 Level AA** as its baseline accessibility standard.

Accessibility is considered during design and implementation rather than treated solely as a final verification step.

The following principles are applied throughout the UI:

- Maintain sufficient contrast between text and its background.
- Provide clear and visible focus states for interactive elements.
- Do not rely on color alone to communicate meaning or state.
- Use semantic HTML and accessible names where appropriate.
- Consider keyboard accessibility for interactive components.
- Verify icon and other non-text contrast as part of component testing, and adjust the design system where necessary.
- Consider reduced-motion preferences for animated interactions.

## 3. Color

The color system uses semantic tokens rather than hard-coded colors.

Color choices take the accessibility requirements defined in the previous section into account, with particular attention to sufficient contrast between foreground and background colors.

### Light / Dark

Light mode uses a light neutral background with dark foreground colors to provide a clear and readable workspace.

Dark mode uses a dark neutral background with light foreground colors. Semantic colors are adjusted where necessary to maintain appropriate contrast and readability.

Light and dark themes share the same semantic roles, while their underlying color values may differ.

### Color Tokens

Colors are defined using OKLCH and exposed through the Tailwind CSS v4 theme system.

The system currently defines semantic tokens for:

- background and foreground
- muted foreground
- primary actions and text
- success states
- destructive states
- focus indicators

Where the same semantic role requires different values for Light and Dark themes, the theme-specific values are defined separately.

## 4. Typography

Typography is designed to prioritize readability and clear information hierarchy.

Textual content and numeric data may use different font families where appropriate. A proportional font is used for general text, while a suitable font for numeric and data-oriented content may be used to improve alignment and readability.

Font size, line height, font weight, and text spacing follow the typography scale provided by Tailwind CSS v4 rather than introducing arbitrary values.

Typography should maintain a clear hierarchy between page titles, section headings, body content, labels, metadata, and supporting information.

## 5. Spacing

Spacing follows the spacing scale provided by Tailwind CSS v4.

Padding, margin, gap, and other layout spacing should use the predefined Tailwind spacing scale rather than arbitrary values.

Custom spacing values should only be introduced when a specific design requirement cannot be reasonably represented by the existing scale.

## 6. Shape / Border / Radius

Borders, border widths, and border radii follow the conventions and utilities provided by Tailwind CSS v4.

The existing Tailwind scale should be preferred over arbitrary values to maintain visual consistency across components.

Rounded corners should be used purposefully and should support clear grouping and hierarchy rather than being applied decoratively.

## 7. Elevation / Shadow

Elevation is used to communicate surface hierarchy and separation rather than as purely decorative styling.

Shadow utilities provided by Tailwind CSS v4 are used as the default implementation. Existing shadow scales should be preferred over arbitrary values.

Typical usage may include:

- subtle elevation for surfaces that need slight separation
- moderate elevation for dropdowns and popovers
- stronger elevation for dialogs and other prominent overlays

Shadow appearance should be verified against the project's custom color palette in both Light and Dark themes. Where necessary, shadow values may be adjusted to maintain consistent visual hierarchy across themes.

Other visual effects, such as masking, are considered separately from the elevation system.

## 8. Icons

Icons use **Lucide**. The application icon entry point is `src/components/icons`.

The entry point currently re-exports Lucide's X icon for the Tag detachment control. UI primitives still import Lucide icons directly. Semantic wrappers remain a design requirement; the current application export is a direct alias.

Icons are organized by semantic usage, such as navigation, actions, and status.

Icon components provide a consistent interface for:

- size
- stroke width
- semantic color
- accessibility attributes

Icon appearance should be controlled through design-system tokens and semantic utility classes rather than arbitrary colors.

Icons must not be the sole carrier of semantic meaning when color is involved. Status and state indicators should be accompanied by text, labels, shape, or another visual cue.

Only icons actually used by the application should be wrapped and exposed through `components/icons`.

## 9. Motion

Motion is used to provide clear visual feedback and smooth transitions rather than as a decorative element.

Motion utilities provided by Tailwind CSS v4 are used as the default implementation. Custom animation systems should not be introduced unless a specific product requirement requires them.

Motion should be:

- subtle and purposeful
- consistent across similar interactions
- short enough to avoid interrupting the user's workflow
- used to communicate changes in state, visibility, or interaction

Typical use cases may include:

- hover and focus transitions
- opening and closing menus, dialogs, and popovers
- showing or hiding content
- loading and progress states

Animations should not be required to understand or operate the interface.

Reduced-motion preferences should be respected where applicable.

## 10. Layout Primitives

Layout primitives provide reusable building blocks for composing page and component layouts.

Tailwind CSS v4 layout utilities are used as the default implementation. Custom layout primitives should only be introduced when a repeated layout pattern cannot be expressed clearly and consistently with the existing utilities.

Common layout patterns may include:

- container
- stack
- inline
- grid
- section

Layout primitives should remain small and composable rather than becoming feature-specific components.

## 11. Responsive Behavior

Responsive behavior follows the responsive utilities and breakpoint conventions provided by Tailwind CSS v4.

The layout should adapt to available screen space while maintaining readability, information hierarchy, and usability.

Tailwind's default breakpoints should be preferred over introducing custom breakpoints.

Responsive styles should be applied based on actual layout requirements rather than targeting specific device models.

When necessary, components may change their layout, visibility, spacing, or interaction patterns at different breakpoints.

## 12. Component Architecture

Components are organized by their scope and responsibility.

The following tree is the proposed organization, not the current directory inventory. `components/ui/` and `components/icons/` currently contain implementations; route-specific dialogs are colocated under `src/app/research/[id]/_components/`. See [Directory Structure](../architecture/directory-structure.md) for the current architecture.

```text
components/
├── icons/
├── ui/
├── common/
├── header/
├── footer/
└── ai/
```

## 13. Common Components

Common components are application-level components shared across multiple pages or features.

They are built from reusable UI components in `components/ui/` and provide application-specific composition or behavior.

Typical examples may include:

- page headers
- breadcrumbs
- empty, loading, and error states
- search interfaces
- user and workspace navigation
- other application-wide shared patterns

Components should only be promoted to `common/` when they are genuinely shared across multiple parts of the application.

Feature-specific components should remain within their respective feature directories.

## 14. Form System

Form components follow the styling conventions and utilities provided by Tailwind CSS v4.

Reusable form UI components should primarily use the components provided by shadcn/ui and the project's semantic design tokens.

Forms should provide clear:

- labels
- validation feedback
- required or optional field indications where appropriate
- focus states
- disabled and loading states

Form behavior and validation should use the project's established libraries and application requirements rather than introducing a separate form abstraction layer.

## 15. Feedback / States

The design system defines consistent visual feedback for common UI states.

Feedback should clearly communicate what is happening, what has changed, and whether user action is required.

Common states include:

- loading
- pending
- success
- error
- empty
- disabled
- validation error

State feedback should not rely on color alone. Appropriate text, icons, or other visual cues should be used where necessary.

Form validation is handled through the project's established form and validation libraries, while the design system defines how validation and other states are presented to users.

## 16. Information Hierarchy

The interface prioritizes content and information over decorative elements.

Visual hierarchy should help users quickly understand:

- what information is most important
- how different pieces of information are related
- what actions are available
- what requires attention

Typography, spacing, color, layout, and component styling should reinforce the information hierarchy rather than compete with the content.

Content should remain clear and readable even when decorative elements are reduced or removed.

### Authenticated Application Navigation

Home, Research list/detail/create/edit, and Organization/Workspace settings use a shared server-rendered AppShell with AppHeader and a small client navigation component. Page authentication and data fetching remain server-side. The header keeps the Evidence Atlas brand and the guarded sign-out Server Action; Home and Research list retain their Workspace selector, on a second header row below `sm`.

At `xl` (80rem) and above, the 13rem sidebar sits below the 3.5rem sticky header with its own viewport-bounded vertical scroll area. A subtle muted background and right border separate it from the flexible, zero-minimum-width content area. Below `xl`, a labelled Menu button opens a left-side Base UI Dialog with a labelled title, close button, modal focus containment, Escape/outside dismissal, and focus restoration. Selecting any destination closes it; resizing to `xl` also closes the modal and releases its scroll lock. The popup is bounded by the viewport with a scrollable navigation area, including on short screens. No navigation animation is added.

Primary navigation contains Home (`/`) and Research (`/research`); Settings contains Organization (`/settings/organization`) and Workspace (`/settings/workspace`). Lucide icons accompany visible labels. Active destinations use `aria-current="page"`, a leading border, and semibold text in addition to color; Research detail/new/edit activate Research. Links and controls have hover and visible keyboard-focus states. Contextual Back links remain in the content.

At `lg`, the existing 20rem Chat column remains; at `xl`, the shell allocates the 13rem left navigation while retaining the 24rem Chat column and the Research detail container's `max-w-7xl` cap. The content flex item and Research grid track can shrink without widening the page. Chat message scrolling, sticky positioning, viewport height limits, and composer behavior remain unchanged. Zoom uses the available CSS viewport width to switch navigation presentation.

Public Demo keeps its independent read-only shell and URLs. Global Search, Related Research, a Demo-specific sidebar, and on-demand desktop AI remain outside this implementation. Appearance selection is described in §17. This navigation work does not advance Phase 10.

### Research Detail Presentation

Research detail and Public Demo detail share a display-only header and content component. The title uses `text-3xl` / `sm:text-4xl` with tight leading; descriptions preserve line breaks. Status retains an explicit text label, while tags and creation/update dates remain secondary. The Edit action stacks below the title on narrow screens; status and tag controls wrap independently. Long titles, tags, body text, and URLs wrap within the available width.

Sources, Findings, Discussion, and Conclusion use the same `text-lg` section heading, explanatory text, and `py-8` spacing. Counts sit beside headings as muted metadata; optional actions wrap beside or below the heading group. Empty states use short, muted text inside compact dashed borders, without additional calls to action. The existing section controls remain available in editable Research; Public Demo receives no controls or editing invitations.

Conclusion, Finding, and Discussion bodies preserve whitespace with `text-base` / `leading-7`. Conclusion remains plain human-authored text, distinct from AI answers and evidence rows. Sources prioritize titles over full wrapping URLs and update dates, with separate action rows outside the evidence links. Findings indent Supporting sources with a subtle left border; source attachment controls precede the secondary display-style/update/action footer. Discussion retains body-first presentation with author, date, and actions in a wrapping footer. Rows use separators rather than individual cards or shadows. Detail action groups give existing button triggers a minimum height of eight spacing units; evidence links have explicit keyboard focus outlines using the ring token. Existing Source URL validation and external-link attributes are unchanged.

The primary content remains a single column following the Research Header: Sources, Findings, Discussion, Conclusion, matching Design Direction. Section separators follow Sources, Findings, and Discussion; the final Conclusion has no bottom separator. This presentation update does not advance Phase 10. Static rendering tests cover content, optional controls, empty states, long text/URLs, and Source links; actual reflow at 375px, 768px, desktop, and 200% zoom, keyboard interactions, and light/dark contrast still require real-browser verification.

### Current AI Answer Presentation

The Research AI panel separates user and AI messages with role labels and presents supporting evidence under **Supporting sources**. User messages retain plain text and whitespace, with a restrained `bg-muted/50` surface. AI text uses `react-markdown` for paragraphs and line breaks, bold/italic, nested bullet and numbered lists, inline code, code blocks, and modest headings (`text-base` for level 1, `text-sm` for levels 2–6). Body text remains `text-sm` with `leading-6`. Long words and code blocks wrap within the panel instead of widening the page; code uses the existing muted surface and monospace typography. Color and focus styling use semantic tokens.

Markdown is a display transformation only, including while a streamed answer is incomplete. Raw HTML is skipped; no raw-HTML plugin or HTML injection is used. Markdown images are omitted, and all generated links (including autolinks) render as noninteractive text with no URL-bearing attributes. User input does not pass through Markdown or citation parsing. Stored message content, generation, and citation validation are unchanged.

The existing `parseSourceCitations()` runs before AI Markdown rendering. Recognized citation markers are removed from displayed answer text; only Sources resolved against supplied Source metadata appear in Supporting sources, with the existing stored-URL safety check. A citation-only answer may have an empty body and still show its Sources. Generated Markdown URLs never become evidence links. The evidence section is omitted when no Sources resolve.

### Research Chat Layout and Scrolling

- At `lg`, the page uses `max-w-5xl` and a 20rem chat column; at `xl` and above, `max-w-7xl` and a 24rem chat column. Research content remains a single column alongside it, with a zero-minimum-width grid track.
- The desktop panel has fallback height `calc(100dvh - 6rem)` inside its `top-20` sticky wrapper, leaving space below the viewport edge. Its maximum height is also capped against its actual top position on mount, page scroll, and window resize, so the Research header above it does not put the composer below the initial viewport. A `min-h-0` flex layout keeps header and composer from shrinking and gives the message region the remaining height with `overflow-y-auto`.
- The message region is keyboard-focusable, labelled, and has a visible focus ring. Automatic following changes only its scroll offset, never focus or the page scroll. It follows while within 48px of the bottom, pauses when reading older text or selecting answer text, and resumes through Latest messages, a new send, or successful history selection. Resizing follows the same rule. Existing temporary, checking, saved-history, unconfirmed-send, and error feedback retain their meanings.
- Below `lg`, the Ask AI dialog uses `90dvh`; the shared panel's mobile variant fills the remaining height rather than applying the desktop viewport calculation. Repeated header descriptions remain accessible but visually hidden, and the composer uses two textarea rows. The outer dialog clips overflow while messages own the scroll area. History is a separate dialog capped at `90dvh` with a single scrollable list and its existing selection/focus behavior.

These are UI contracts, not browser-verification results. Small viewports, virtual keyboards, long conversations, text selection, focus, and light/dark rendering still require visual checks in a real browser. Existing navigation, evidence-label, and theme gaps remain recorded in Design Direction; this change does not advance Phase 10 acceptance.

Phase 6 allows these Sources to come from other Research items in the same Workspace. After streaming, the panel refreshes Source metadata; history restoration loads messages and Sources together. Source titles and links are currently the only evidence labels: originating Research and retrieval distances are not displayed. Generated answers remain separate from editable Research knowledge.

This describes the current presentation, not a claim of citation correctness or complete accessibility verification. Source eligibility, live-stream differences, and restoration behavior are documented in [AI Architecture](../architecture/ai-architecture.md).

## 17. Light / Dark Verification

The application should support both Light and Dark themes and respect the user's preferred color scheme by default.

**Implementation (PR #36):** A single root `next-themes` 0.4.6 provider applies the existing `:root` / `.dark` tokens through the HTML class, defaults to System, follows OS changes in System mode, and persists explicit Light / Dark / System selection in browser localStorage (`theme`). Theme changes disable color transitions temporarily and set the native color scheme. Invalid saved values are cleared before the first-paint theme script; invalid cross-tab preferences fall back to System. No DB preference, authenticated API, or C2 isolation change is involved.

Appearance uses the shared Base UI Select in the authenticated sidebar's Settings group and the same overlay navigation below `xl`. Public Demo exposes the same client-only preference as a secondary header control without adding research mutations or privileged dependencies. SSR and initial hydration render a static, noninteractive placeholder with the same width and height as the selector; the actual Select is rendered after mounting and displays the stored selection. Only HTML's expected theme class/style difference is covered by `suppressHydrationWarning`; descendants retain normal hydration diagnostics.

Offline tests cover first-paint bootstrap and preserved font classes, preference options, hydration-stable selector markup, navigation placement, and Demo read-only/import boundaries. For PR #36, the user reports completed real-browser visual checks in Firefox normal and private windows and Chromium, covering Light/Dark display, mobile navigation, and Firefox browser 200% zoom. These are user-reported visual checks, not an agent-run browser test or exhaustive compatibility certification. All OS-change tracking conditions, reload/navigation persistence, focus and form/Chat/scroll preservation, and comprehensive contrast across all screens and interactive states remain outside the reported verification scope. Known upstream issues [#385](https://github.com/pacocoursey/next-themes/issues/385) (React script warning) and [#375](https://github.com/pacocoursey/next-themes/issues/375) (cached route/provider state) remain compatibility risks; no warning-suppression patch is applied. This app does not enable `cacheComponents` and keeps its provider above route layouts. Full accessibility and theme contrast verification, including comprehensive WCAG 2.2 AA conformance, remain incomplete.

Light and Dark themes use the same semantic design tokens, while their underlying color values may differ where necessary to maintain readability and sufficient contrast.

Theme selection should not compete with primary navigation or core workflows. When an explicit theme preference is provided, it should be accessible through an appropriate settings or preferences interface rather than being treated as a primary header action.

Both themes should be verified across:

- text and background contrast
- interactive elements
- focus states
- icons and other non-text elements
- borders and visual separation
- shadows and elevation
- form controls and feedback states

## 18. Implementation Rules

The design system should evolve alongside the implementation.

Existing standards and project conventions should be preferred over introducing custom solutions.

Implementation decisions should be evaluated against actual UI requirements and refined when repeated patterns or inconsistencies emerge.

New design tokens, components, abstractions, or conventions should only be introduced when they provide a clear and reusable benefit.

The design system should remain focused and avoid unnecessary abstraction.
