# Design Direction

> Status: Draft
> Last Updated: 2026-09-25

## 1. Design Concept

Calm / Structured / Evidence-oriented

### Calm

evidence-atlas should provide a calm interface that allows users to focus on the research itself without being overwhelmed by navigation, decoration, or excessive information density.

The overall layout should follow a familiar SaaS pattern with a sidebar-based navigation model. The goal is not to introduce a novel navigation pattern, but to provide an interface that feels immediately understandable and easy to use.

#### Layout

- Use a single-column layout as the primary Research workspace.
- Use a sidebar for global navigation and secondary functions.
- Keep Search, Research lists, account settings, authentication-related functions, and similar features in the sidebar.
- Keep research-related content such as Research details, Sources, Findings, Discussions, and Conclusions in the main content area.
- Avoid excessive visual decoration and unnecessary card-based grouping.
- Let the research content remain the visual focus of the interface.

#### Navigation

The sidebar should remain the primary navigation model across device sizes.

- On mobile, the sidebar should be opened from a button in the header and appear as an overlay from the left.
- On tablet and larger screens, the sidebar may be displayed persistently or opened as an overlay depending on available screen space.
- The navigation model should remain consistent even when the sidebar presentation changes across breakpoints.

#### Scrolling

Scrolling should remain visually unobtrusive while preserving usability across different device types.

- On mobile devices, scrollbars should be visually hidden to keep the limited screen space focused on the content.
- On tablet and larger screens, scrollbars should remain visible to provide users with clearer spatial awareness and navigation cues.
- The scrollbar should not become a prominent visual element and should remain secondary to the content.
- The final implementation should respect platform and browser behavior where appropriate.

> **Principle:** Scrolling should be easy to understand without becoming a dominant part of the interface.

#### AI Information

AI-generated supplementary information should be available without disrupting the primary research workflow.

- On tablet and larger screens, AI-generated information may be presented in a supplementary panel that opens from the right side.
- The main Research content should remain visible while supplementary AI information is being explored.
- On mobile, where horizontal space is limited, a modal or bottom sheet may be more appropriate.
- AI-related UI should remain secondary to the research content rather than dominating the interface.

> **Principle:** The interface should remain quiet until additional information is needed.

### Structured

evidence-atlas should provide a clear and predictable structure so that users can understand where they are, what they are working on, and how different pieces of research are related.

The interface should reflect the underlying structure of the product rather than treating each screen as an isolated page.

#### Application Structure

The conceptual application structure differs between the full application and the portfolio demo.

The full application is expected to follow an authentication and workspace-oriented flow:

```text
Application
├── Authentication
│   ├── Login
│   └── Sign up
│
└── Workspace
    ├── User
    ├── Organization
    ├── Workspace
    │
    └── Research
        ├── List
        ├── Create
        ├── Detail
        └── Edit
```

Authentication, user management, organization, and workspace management are part of the conceptual SaaS structure, even if some of these features remain outside the MVP implementation.

#### Portfolio Demo

The portfolio demo should simplify the application flow because its purpose is to demonstrate the research workflow rather than authentication or workspace administration.

The demo should provide a preconfigured workspace with curated research data:

```text
Portfolio Demo
└── Preconfigured Workspace
    │
    ├── Research List
    │   └── Research
    │
    ├── Global Search
    │
    └── Research Detail
        ├── Overview
        ├── Related Research
        ├── Sources
        ├── Findings
        ├── Discussion
        ├── Conclusion
        └── AI Exploration
```

Visitors should be able to explore the preconfigured workspace without authentication, account creation, or workspace setup.

The demo should retain the conceptual structure of the full application while removing SaaS-specific flows that are not necessary for demonstrating the product.

#### AI Interaction

AI should support the Research workflow rather than becoming a separate primary destination.

AI-assisted exploration should be integrated into the Research workspace and made available when additional information, synthesis, or exploration is needed.

On larger screens, AI-generated information may be presented in a supplementary panel that opens from the right side. On mobile, a modal or bottom sheet may be used instead.

The AI interaction should support the following conceptual flow:

```text
Workspace Knowledge
        ↓
   Retrieval
        ↓
       AI
        ↓
     Answer
```

AI-generated information should remain visually distinct from human-authored research content and evidence.

The interface should clearly distinguish between:

- Primary research content
- Sources and evidence
- Human discussion and reasoning
- AI-generated information

> **Principle:** The structure of the interface should make the structure of the knowledge understandable.

### Evidence-oriented

evidence-atlas should make the relationship between research questions, evidence, reasoning, and conclusions easy to understand.

The primary Research workspace should use a readable single-column content flow. This follows familiar patterns used by modern SaaS applications, chat applications, documentation tools, and other web applications, where the primary content remains focused while supporting functions are provided through surrounding UI regions.

There is no strong reason for evidence-atlas to adopt a dense multi-column reading layout. Academic papers often use multiple columns to efficiently present large amounts of text, but this can make it harder to follow the relationship between evidence, reasoning, and conclusions in an interactive research workspace.

The goal is therefore not to avoid multiple UI regions entirely, but to keep the **primary research content** readable and sequential while using additional regions for navigation and supplementary information.

#### Research Flow

The primary Research view should organize information in a clear vertical sequence:

```text
Research
│
├── Overview
│
├── Related Research
│
├── Sources
│
├── Findings
│
├── Discussion
│
└── Conclusion
```

This structure should help users move from the research question to the supporting evidence, then through interpretation and discussion toward a conclusion.

The main research content should remain a single-column flow even when supporting UI elements are present.

#### Supporting UI Regions

Additional interface regions may be used when they provide useful supporting functions without interrupting the primary reading flow.

Examples include:

- **Header** — mobile sidebar trigger and contextual actions
- **Sidebar** — primary navigation, global search, and secondary functions
- **Right-side panel** — supplementary or AI-generated information on larger screens
- **Modal or bottom sheet** — supplementary information on smaller screens

These regions should support the research experience rather than compete with the primary content.

#### Evidence Visibility

Sources and Findings should remain closely connected to the Research they support.

The interface should make it clear:

- where a piece of evidence came from
- which Source supports a Finding
- how Findings contribute to the Research
- how Discussion relates to the available evidence
- how the Conclusion is derived from the accumulated research

Evidence should not be hidden behind unnecessary navigation or excessive interaction.

#### Visual Hierarchy

The Research content should remain the primary visual focus.

Supporting information such as metadata, status, tags, and secondary actions should have a lower visual priority than the research itself.

AI-generated information should also remain visually distinguishable from sources and human reasoning so that users can understand which information represents evidence, which represents human interpretation, and which represents AI assistance.

> **Principle:** Keep primary research content readable, sequential, and traceable while using surrounding UI regions for navigation and supplementary information.

## 2. Visual Principles

### Evidence-oriented

The interface should give research information enough space to remain readable and understandable, even when the amount of information grows.

### Information-first

Primary content should remain unobstructed and visually dominant. Supporting UI should not interfere with the user's ability to read or understand the main content.

### Focused and calm

Use clear visual hierarchy and spacing to guide the user's attention naturally without creating unnecessary visual noise.

### Structured simplicity

Follow the underlying information structure and familiar UI patterns. Keep the interface simple through clear organization rather than by unnecessarily reducing information.

## 3. Information Density

Use comfortable spacing between content and UI elements. Avoid overly dense layouts while keeping enough information visible for efficient use.

## 4. Color Direction

Use a restrained, accessible color palette with clear semantic roles.

- **Neutral colors** form the primary visual foundation.
- **Primary** is used for main actions, links, and interactive elements.
- **Success** and **Destructive** communicate semantic states.
- Colors used directly on the page background are adjusted between Light and Dark modes to maintain sufficient contrast.
- Filled controls use dedicated colors that maintain sufficient contrast with their foreground text.
- Status information should never rely on color alone; use icons or text labels alongside semantic colors.

The defined color tokens serve as the initial design-system foundation. Contrast must be verified for the actual foreground/background combinations and interactive states in both themes; this document does not establish application-wide accessibility conformance.

## 5. Surface and Shape

### Border

Use subtle, standard borders to separate surfaces and UI elements without making the interface feel overly segmented.

### Radius

Use moderate, consistent corner radii following familiar SaaS UI conventions.

### Shadow

Use shadows primarily to communicate elevation and layering. Keep buttons mostly flat, while floating surfaces such as popovers and dialogs may use stronger shadows. Shadow definitions may differ between Light and Dark modes.

## 6. Theme Direction

### Light

Use the defined Light theme tokens.

### Dark

Use the defined Dark theme tokens.

## 7. Typography

Use a distinctive, well-balanced font family rather than an overly generic default choice, giving the interface a deliberate and considered visual identity.

## 8. Spacing

Use the default spacing scale provided by the design system, adjusting values only when necessary for readability and visual balance.

## 9. Current Implementation Gaps

The direction above remains the design baseline. The current implementation differs in the following ways:

- Research screens use a simple header; the primary sidebar and mobile overlay navigation are not implemented.
- The Research detail page places the stored, editable Conclusion before Sources. The intended sequence above places Conclusion after Discussion; this ordering difference remains an implementation gap, not an approved design change.
- Research list search, status filtering, and sorting are implemented as an inline form above the list. Sidebar-based global search, Related Research, and AI exploration are not implemented.
- Light and dark palettes are defined, but automatic system-theme selection is not wired up.
- Research content uses a single-column flow, but responsive navigation and end-to-end accessibility verification remain outstanding.

These gaps are recorded for implementation follow-up. They do not replace the intended navigation, evidence flow, or theme behavior.
