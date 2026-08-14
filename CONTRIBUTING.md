# Contributing to Muimark

## Quick Start

```bash
pnpm install
pnpm dev           # http://localhost:3000
```

## Development Workflow

1. Create a branch from `main`
2. Make changes, ensure tests pass
3. Open a pull request

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm test` | Unit tests (vitest) |
| `pnpm test:coverage` | Tests with coverage |
| `pnpm typecheck` | TypeScript check |

## Quality Checks

```bash
bash checks/check-component-size.sh 300
bash checks/check-max-usestate.sh 5
bash checks/check-no-fetch-in-components.sh
bash checks/check-feature-coverage.sh
```

## Architecture Rules

- **Max 300 lines** per source file
- **Max 5 useState** calls per component
- **No fetch()** in presentational components (`src/plugins/`, `src/shared/ui/`)
- Data fetching belongs in hooks (`src/state/`, `src/logic/`) or API routes

## Feature Coverage

Every feature needs:
1. Entry in `src/shared/features.ts`
2. `// @feature F-XXX` marker in implementation
3. `// @covers F-XXX` marker in test file

Run `bash checks/check-feature-coverage.sh` to check coverage.

## Project Structure

```
src/
├── app/           # Next.js routes + API
├── config/        # Config loading + schema
├── logic/         # Business logic + hooks
├── presentation/  # UI components (panels, widgets, screens)
├── features/      # Feature modules (editor, folders, csv, search)
├── plugins/       # Editor plugins (mermaid)
├── shared/        # Shared utilities + types
└── state/         # Client state hooks
```

## Commit Messages

Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
