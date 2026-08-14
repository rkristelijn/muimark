# Quality Gates & Structure

---

## RTFM — Framework Model

### Principle

> Before writing any code that touches a framework API, read the
> framework's own documentation first. Do not rely on training data or
> assumptions.

### Sources

```
node_modules/next/dist/docs/   ← Next.js 16 breaking changes
node_modules/@mui/material/    ← MUI 9 API reference
```

### Checklist (before using any API)

1. Check `node_modules/<package>/` for docs, CHANGELOG, or migration guide
2. Check if the API is deprecated in this version
3. Check if the import path has changed
4. Verify with `npm run typecheck` after writing

### AI Agent Enforcement (`.kiro/AGENTS.md`)

```markdown
<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure
may all differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` before writing any code.
Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
```

---

## CPM Configuration

### Target (`.config/cpm.toml`)

```toml
[project]
name = "muimark"
level = 3
lang = "typescript"
build = "npm"

[limits]
file-lines = 200
files-per-dir = 12
function-params = 4

[checks]
code-yaml-syntax-format = true
docs-markdown-syntax-format = true
code-scripts-syntax-format = true
code-generic-vulnerability-scan = true
code-generic-secrets-scan = true
code-typescript-no-any = true
code-typescript-strict-null = true

[hooks]
pre-commit = true
pre-push = true
commit-msg = true
```

### Custom Quality Rules

| Rule | Description | Enforcement |
|------|-------------|-------------|
| Max 200 LOC/file | No file exceeds 200 lines | `cpm check` + pre-commit |
| Max 12 files/dir | No directory exceeds 12 files | `cpm check` + pre-commit |
| Max 3 useState | Components extract to hook if > 3 | Custom check script |
| No fetch in components | Data fetching in hooks/server only | grep-based check |
| No barrel re-exports | Direct imports only | Custom check script |
| Conventional commits | `type(scope): message` | commit-msg hook |
| No `any` | TypeScript strict mode | tsconfig + eslint |
| Layer separation | No cross-layer imports | Import lint rule |

---

## Layer Dependency Rules

```
Presentation → Logic → Data        ✅ allowed (top-down)
Presentation → Data                 ❌ forbidden (skip layer)
Data → Logic                        ❌ forbidden (bottom-up)
Data → Presentation                 ❌ forbidden (bottom-up)
Logic → Presentation                ❌ forbidden (bottom-up)
Config → any layer                  ✅ allowed (cross-cutting)
```

---

## Directory Structure

```
muimark/
├── .config/
│   ├── cpm.toml              # Quality gate config
│   ├── vitest.config.ts      # Test runner config
│   └── yamllint.yaml         # YAML lint rules
├── .kiro/
│   └── AGENTS.md             # AI agent instructions (RTFM)
├── bin/
│   └── muimark.js            # CLI entrypoint for npx
├── docs/
│   ├── DESIGN.md             # Master design (index)
│   ├── design/               # Design sub-documents
│   ├── adrs/                 # Architecture Decision Records
│   └── refactor-plan.md      # Migration roadmap
├── data/
│   └── demo/                 # Demo data (for development)
│       ├── .muimark.yaml
│       ├── incidents/
│       ├── changes/
│       └── runbooks/
├── src/
│   ├── app/                  # Next.js App Router (thin wiring)
│   │   ├── layout.tsx
│   │   ├── [[...slug]]/
│   │   │   └── page.tsx      # Dynamic route → Screen resolver
│   │   └── api/
│   │       ├── files/        # CRUD endpoints
│   │       ├── search/       # Search endpoint
│   │       └── config/       # Config endpoint
│   ├── presentation/         # UI Layer
│   │   ├── screens/
│   │   │   └── MainScreen.tsx
│   │   ├── panels/
│   │   │   ├── SidebarPanel.tsx
│   │   │   ├── GridPanel.tsx
│   │   │   └── DetailPanel.tsx
│   │   ├── widgets/
│   │   │   ├── DataGrid.tsx
│   │   │   ├── RecordEditor.tsx
│   │   │   ├── KanbanBoard.tsx
│   │   │   └── TreeNav.tsx
│   │   └── controls/
│   │       ├── ChipControl.tsx
│   │       ├── SelectControl.tsx
│   │       └── DateControl.tsx
│   ├── logic/                # Business Layer
│   │   ├── entities/
│   │   │   └── resolveEntity.ts
│   │   ├── hooks/
│   │   │   ├── useEntity.ts
│   │   │   ├── useAutoSave.ts
│   │   │   └── useRouterState.ts
│   │   └── validation/
│   │       ├── rules.ts
│   │       └── transitions.ts
│   ├── data/                 # Data Layer
│   │   ├── adapters/
│   │   │   ├── types.ts       # DataAdapter interface
│   │   │   ├── markdown.ts    # MarkdownAdapter
│   │   │   ├── csv.ts         # CsvAdapter
│   │   │   └── sqlite.ts      # SqliteAdapter
│   │   └── index/
│   │       ├── indexer.ts     # Build/update index
│   │       └── search.ts     # FTS5 query
│   └── config/               # Config Layer
│       ├── loader.ts          # Load .muimark.yaml
│       ├── schema.ts          # Zod schema for config
│       └── defaults.ts        # Default values
├── hooks/                    # User-defined lifecycle hooks (optional)
│   └── incidents/
│       ├── beforeCreate.ts
│       └── afterChange.ts
├── public/
├── package.json
├── tsconfig.json
├── next.config.ts
├── Dockerfile
├── docker-compose.yaml
└── .editorconfig
```
