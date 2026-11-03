## Documentation

- Treat `docs/` as the primary project specification.
- Follow `docs/planning/source-memo.md` when researching or verifying external information.
- When an implementation changes documented architecture, routes, data models,
  or project status, update the relevant documentation in the same task.
- Do not update documentation merely because implementation details changed.
- Keep `docs/planning/roadmap.md` aligned with completed roadmap phases.
- Keep directory-structure documentation focused on meaningful architecture,
  not every individual file.
- If implementation and documentation conflict, report the conflict instead of
  silently changing the specification.

## Package management

- Use pnpm for dependency management.
- Respect the package manager version declared in package.json.
- Do not replace pnpm with npm or yarn.
- Do not modify the packageManager field solely to accommodate the agent environment.
- Run `pnpm install` when dependencies need to be installed.

## Git and change safety

- Work on `main` unless explicitly instructed otherwise.
- Never commit or push automatically.
- Preserve existing uncommitted changes and stashes.
- Do not run destructive Git commands such as `reset --hard`, `clean`, or destructive checkout operations.
- Keep changes small and limited to the requested scope.
- Check Git status before and after implementation.
- Report unexpected changes or conflicts instead of silently resolving them.

## Implementation principles

- Prefer existing architecture, components, and utilities.
- Avoid unrelated refactoring, new features, and dependency updates.
- Preserve authentication, authorization, validation, and existing business behavior.
- Do not change Prisma schemas, migrations, or database behavior unless explicitly requested.
- Before modifying sensitive logic, identify affected contracts and risks.
- Keep v1.0.0 work focused on stabilization, localization, security, and release readiness.

## Testing and verification

- Prefer targeted Vitest and ESLint checks for changed code.
- Run TypeScript checks when appropriate.
- Do not routinely run the full test suite, full E2E suite, or production build.
- Use the existing Review environment for UI verification when needed.
- Follow `docs/development/local-review.md`.
- Never reset, reseed, or modify Review fixtures without explicit authorization.
- Verify database targets before any database operation.
- Never use Production, C2, or the normal development database for Review checks.
- Report tests performed, failures, and verification gaps.

## Localization

- Follow `docs/architecture/i18n-foundation.md`.
- Preserve English UI behavior and design while adding natural Japanese translations.
- Keep user-authored content, stored values, IDs, and internal enum values unchanged.
- Reuse existing locale handling and translation dictionaries.
- Do not reuse Public Demo translation overlays for editable SaaS data.
- Keep the SaaS language selector disabled outside Home until explicitly authorized.
- Do not translate action errors by matching English message strings.

## Task completion

- Update relevant documentation when project status or documented behavior changes.
- For substantial changes, create a Review ZIP when requested or required by the task.
- Report changed files, behavior, tests, remaining risks, and final Git status.
- Leave all changes uncommitted and unpushed for user review.
- Treat `AGENTS.md` and referenced project documentation as standing instructions; do not require task prompts to repeat them.
- Prefer established implementation patterns over new abstractions for similar features.
- When the task scope is clear, inspect the relevant code and proceed without unnecessary planning phases or repeated confirmation.
