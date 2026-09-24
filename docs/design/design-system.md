# Design System

> **Status:** Design baseline; implementation gaps noted below
> **Last Updated:** 2026-09-24

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

## 17. Light / Dark Verification

The application should support both Light and Dark themes and respect the user's preferred color scheme by default.

**Implementation gap:** `src/app/globals.css` defines light tokens on `:root` and dark tokens under `.dark`, but the application does not currently apply a theme class based on system preference or provide a preference control. Defined palettes alone do not complete theme support.

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
