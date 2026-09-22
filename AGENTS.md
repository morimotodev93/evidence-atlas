## Documentation

- Treat `docs/` as the primary project specification.
- When an implementation changes documented architecture, routes, data models,
  or project status, update the relevant documentation in the same task.
- Do not update documentation merely because implementation details changed.
- Keep `docs/roadmap.md` aligned with completed roadmap phases.
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
