# Gap Analysis — Current vs Target Architecture

---

## Current Code Map

```
src/
├── app/                          # Next.js routes + API
│   ├── layout.tsx                    [PRES] root layout
│   ├── providers.tsx                 [CONF] query + theme providers
│   ├── globals.css                   [PRES] global styles
│   ├── loading.tsx                   [PRES] loading spinner
│   ├── not-found.tsx                 [PRES] 404 page
│   ├── error.tsx                     [PRES] error boundary
│   ├── [[...slug]]/page.tsx          [PRES+LOGIC] ⚠️ main orchestrator (190 LOC)
│   ├── dashboard/page.tsx            [PRES] dashboard with KPIs
│   ├── mermaid/page.tsx              [PRES] mermaid editor page
│   └── api/
│       ├── health/route.ts           [DATA] health check
│       ├── folders/route.ts          [DATA] list/create folders
│       ├── folders/[folderId]/       [DATA] folder CRUD
│       ├── folders/[folderId]/[fileId]/ [DATA] file CRUD
│       ├── readme/route.ts           [DATA] read README
│       ├── resolve/route.ts          [DATA] resolve displayId
│       ├── search/route.ts           [DATA] full-text search
│       ├── columns/[folderId]/       [DATA+CONF] ⚠️ reads YAML directly
│       ├── dashboard/route.ts        [DATA+LOGIC] ⚠️ business rules in API
│       └── csv/[...path]/route.ts    [DATA] CSV read/write
├── state/                        # Client state hooks
│   ├── useRouterState.ts             [LOGIC] URL ↔ state sync
│   ├── useFolderData.ts              [LOGIC] folder data fetching
│   └── useAutoSave.ts               [LOGIC] debounced save
├── features/                     # Feature modules
│   ├── navigation/
│   │   └── Sidebar.tsx               [PRES] ⚠️ UNUSED (dead code)
│   ├── folders/
│   │   ├── FileGrid.tsx              [PRES+LOGIC] ⚠️ 290 LOC, mixed concerns
│   │   ├── EditableCell.tsx          [PRES] inline cell editor
│   │   ├── CreateDialog.tsx          [PRES] create dialog
│   │   ├── DeleteDialog.tsx          [PRES] delete dialog
│   │   ├── RenameDialog.tsx          [PRES] rename dialog
│   │   ├── FolderActions.tsx         [PRES+LOGIC] folder CRUD UI
│   │   ├── ColumnConfigButton.tsx    [PRES] column config UI
│   │   ├── RelatedLinks.tsx          [PRES+LOGIC] relation rendering
│   │   ├── useColumnConfig.ts        [LOGIC] column config hook
│   │   ├── useFileActions.ts         [LOGIC] file mutation hook
│   │   └── useFolderActions.ts       [LOGIC] folder mutation hook
│   ├── editor/
│   │   ├── DetailPanel.tsx           [PRES] editor panel
│   │   └── MarkdownEditor.tsx        [PRES] MDXEditor wrapper
│   ├── search/
│   │   └── SearchResults.tsx         [PRES] search results grid
│   ├── csv/
│   │   └── CsvGrid.tsx              [PRES+LOGIC] ⚠️ 310 LOC, inline formulas
│   └── dashboard/
│       └── KpiCard.tsx               [PRES] KPI card
├── shared/
│   ├── lib/
│   │   ├── config.ts                [CONF+DATA] ⚠️ 200 LOC, mixed concerns
│   │   ├── files.ts                 [DATA] ⚠️ 350 LOC, all file operations
│   │   ├── csv.ts                   [DATA] CSV operations
│   │   ├── relations.ts             [LOGIC+DATA] ⚠️ relation logic + file I/O
│   │   ├── git-meta.ts             [DATA] git metadata extraction
│   │   ├── field-options.ts         [LOGIC] field option utilities
│   │   └── types.ts                 [CONF] type definitions
│   └── ui/
│       ├── DashboardLayout.tsx      [PRES] ⚠️ 290 LOC, data fetching inside
│       └── ThemeContext.tsx          [PRES] theme provider
└── plugins/
    └── mermaid/
        ├── MermaidEditor.tsx         [PRES+LOGIC] ⚠️ 220 LOC
        ├── useMermaidRender.ts       [LOGIC] mermaid render hook
        └── templates.ts             [CONF] diagram templates
```

---

## Target Code Map

```
src/
├── app/                          # Next.js routes (THIN wiring only)
│   ├── layout.tsx
│   ├── [[...slug]]/page.tsx          Max 50 LOC, just composes panels
│   └── api/                          Thin route → adapter call
├── presentation/                 # Pure UI, no data fetching
│   ├── screens/
│   ├── panels/
│   ├── widgets/
│   └── controls/
├── logic/                        # Business rules, hooks, validation
│   ├── entities/
│   ├── hooks/
│   └── validation/
├── data/                         # Adapters (filesystem/csv/sqlite)
│   ├── adapters/
│   └── index/
└── config/                       # YAML loading, schema, defaults
```

---

## Gap Diagram

```
CURRENT                              TARGET                         GAP
═══════                              ══════                         ═══

┌─────────────────────┐         ┌─────────────────────┐
│ src/app/            │         │ src/app/            │
│ page.tsx (190 LOC)  │───────▶ │ page.tsx (50 LOC)   │  Split orchestration
│ has inline views    │         │ pure composition    │  into panels/widgets
│ has callbacks       │         │ no logic            │
└─────────────────────┘         └─────────────────────┘

┌─────────────────────┐         ┌─────────────────────┐
│ src/features/       │         │ src/presentation/   │
│ Mixed UI + logic    │───────▶ │ Pure UI only        │  Extract hooks OUT
│ FileGrid (290 LOC)  │         │ DataGrid (<200)     │  Split large files
│ CsvGrid (310 LOC)   │         │ CsvGrid (<200)      │  Remove fetch()
│ fetch() inside      │         │ Props only          │
└─────────────────────┘         └─────────────────────┘

┌─────────────────────┐         ┌─────────────────────┐
│ src/state/          │         │ src/logic/hooks/    │
│ 3 hooks (good!)     │───────▶ │ 6+ hooks            │  Move here, add more
│ useRouterState ✓    │         │ + useEntity         │  Entity abstraction
│ useAutoSave ✓       │         │ + useSearch         │  Centralized mutations
│ useFolderData ✓     │         │ + validation        │
└─────────────────────┘         └─────────────────────┘

                                ┌─────────────────────┐
│ (does not exist)    │───────▶ │ src/logic/entities/ │  NEW: Entity resolver
│                     │         │ resolveEntity.ts    │  Config → runtime
│                     │         │ lifecycle runner    │  Hook executor
                                └─────────────────────┘

                                ┌─────────────────────┐
│ (does not exist)    │───────▶ │ src/logic/          │  NEW: Validation
│                     │         │ validation/         │  Transition rules
│                     │         │ rules.ts            │  Zod schemas
│                     │         │ transitions.ts      │
                                └─────────────────────┘

┌─────────────────────┐         ┌─────────────────────┐
│ src/shared/lib/     │         │ src/data/adapters/  │
│ files.ts (350 LOC!) │───────▶ │ markdown.ts (<200)  │  Split by adapter
│ csv.ts              │         │ csv.ts (<200)       │  Implement interface
│ config.ts (200 LOC) │         │ types.ts (iface)    │  Separate config
│ relations.ts        │         │                     │
│ git-meta.ts         │         │                     │
└─────────────────────┘         └─────────────────────┘

┌─────────────────────┐         ┌─────────────────────┐
│ src/shared/lib/     │         │ src/config/         │
│ config.ts (mixed)   │───────▶ │ loader.ts           │  Clean separation
│                     │         │ schema.ts (Zod)     │  Validation
│                     │         │ defaults.ts         │  Explicit defaults
└─────────────────────┘         └─────────────────────┘

                                ┌─────────────────────┐
│ (does not exist)    │───────▶ │ src/data/index/     │  NEW: SQLite index
│                     │         │ indexer.ts          │  FTS5 search
│                     │         │ search.ts           │  Optional tier 2+
                                └─────────────────────┘

                                ┌─────────────────────┐
│ (does not exist)    │───────▶ │ hooks/ (user-land)  │  NEW: Lifecycle hooks
│                     │         │ global/             │  beforeCreate, etc.
│                     │         │ incidents/          │
                                └─────────────────────┘
```

---

## Detailed Gap Table

### ✅ Exists and Aligns

| Current | Target | Status |
|---------|--------|--------|
| `src/state/useRouterState.ts` | `src/logic/hooks/useRouterState.ts` | ✅ Move only |
| `src/state/useAutoSave.ts` | `src/logic/hooks/useAutoSave.ts` | ✅ Move only |
| `src/state/useFolderData.ts` | `src/logic/hooks/useFolderData.ts` | ✅ Move only |
| `src/features/editor/MarkdownEditor.tsx` | `src/presentation/widgets/RecordEditor.tsx` | ✅ Move + rename |
| `src/features/editor/DetailPanel.tsx` | `src/presentation/panels/DetailPanel.tsx` | ✅ Move only |
| `src/features/folders/EditableCell.tsx` | `src/presentation/controls/EditableCell.tsx` | ✅ Move only |
| `src/features/folders/CreateDialog.tsx` | `src/presentation/widgets/CreateDialog.tsx` | ✅ Move only |
| `src/features/folders/DeleteDialog.tsx` | `src/presentation/widgets/DeleteDialog.tsx` | ✅ Move only |
| `src/features/folders/RenameDialog.tsx` | `src/presentation/widgets/RenameDialog.tsx` | ✅ Move only |
| `src/features/search/SearchResults.tsx` | `src/presentation/widgets/SearchResults.tsx` | ✅ Move only |
| `src/features/dashboard/KpiCard.tsx` | `src/presentation/controls/KpiCard.tsx` | ✅ Move only |
| `src/shared/ui/ThemeContext.tsx` | `src/presentation/theme/ThemeContext.tsx` | ✅ Move only |
| `src/shared/lib/csv.ts` | `src/data/adapters/csv.ts` | ✅ Move + adapt interface |
| `src/shared/lib/git-meta.ts` | `src/data/adapters/git-meta.ts` | ✅ Move only |
| `src/shared/lib/field-options.ts` | `src/logic/entities/field-options.ts` | ✅ Move only |
| `src/plugins/mermaid/` | `src/plugins/mermaid/` | ✅ Keep in place |

### ⚠️ Exists but Needs Refactoring

| Current | Problem | Target | Action |
|---------|---------|--------|--------|
| `page.tsx` (190 LOC) | Orchestrator + inline views + callbacks | `page.tsx` (50 LOC) | Extract views to panels, logic to hooks |
| `FileGrid.tsx` (290 LOC) | Mixed presentation + logic + mutations | `DataGrid.tsx` (<200) | Extract mutations to hooks, props-only |
| `CsvGrid.tsx` (310 LOC) | Inline formula engine + fetch | `CsvGrid.tsx` (<200) | Extract formulas to logic, fetch to hook |
| `DashboardLayout.tsx` (290 LOC) | Fetches data + renders tree + search | Split into 3 | TreeNav widget, SearchBox, AppShell panel |
| `files.ts` (350 LOC) | All CRUD in one file | Split per-adapter | markdown.ts, plus shared interface |
| `config.ts` (200 LOC) | Loading + types + discovery + cache | Split 3 files | loader.ts, schema.ts, defaults.ts |
| `relations.ts` | Logic + direct file I/O mixed | Split | Logic in `logic/`, I/O in adapter |
| `api/dashboard/route.ts` | Business rules in API route | Split | Rules in `logic/`, API just calls |
| `api/columns/route.ts` | Reads YAML directly (bypasses config) | Use config module | Go through config layer |
| `MermaidEditor.tsx` (220 LOC) | Slightly over limit | Extract toolbar | Widget + separate toolbar component |

### ❌ Does Not Exist Yet (New)

| Target | Purpose | Priority |
|--------|---------|----------|
| `src/data/adapters/types.ts` | DataAdapter interface | Phase 5 |
| `src/data/adapters/markdown.ts` | MarkdownAdapter implementation | Phase 5 |
| `src/data/index/indexer.ts` | SQLite index builder | Phase 9 |
| `src/data/index/search.ts` | FTS5 search queries | Phase 9 |
| `src/logic/entities/resolveEntity.ts` | Config → runtime Entity | Phase 4 |
| `src/logic/validation/rules.ts` | Zod schemas from config | Phase 6 |
| `src/logic/validation/transitions.ts` | State machine checker | Phase 6 |
| `src/logic/hooks/useEntity.ts` | Generic entity hook (replaces ad-hoc fetching) | Phase 4 |
| `src/logic/hooks/useSearch.ts` | Search hook (extracted from inline code) | Phase 4 |
| `src/config/schema.ts` | Zod schema for .muimark.yaml | Phase 6 |
| `src/config/defaults.ts` | Default config values | Phase 6 |
| `hooks/` (user-land) | Lifecycle hooks directory | Phase 11 |
| `docker-compose.yaml` | Enterprise deployment | Phase 8 |
| `Dockerfile` (standalone) | Next.js standalone output | Phase 8 |

### 🗑️ Should Be Removed

| File | Reason |
|------|--------|
| `src/features/navigation/Sidebar.tsx` | Dead code, replaced by DashboardLayout |
| `src/features/navigation/index.ts` | Dead barrel export |
| `src/shared/lib/index.ts` | Barrel re-export (violates CPM rules) |
| `src/features/folders/index.ts` | Barrel re-export |
| `src/features/editor/index.ts` | Barrel re-export |
| `src/features/csv/index.ts` | Barrel re-export |
| `src/features/search/index.ts` | Barrel re-export |
| `src/features/dashboard/index.ts` | Barrel re-export |
| `src/state/index.ts` | Barrel re-export |

---

## Metrics Summary

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Files over 200 LOC | 6 | 0 | -6 |
| Files over 300 LOC | 2 | 0 | -2 |
| Layer violations (presentation fetches data) | 4 | 0 | -4 |
| Dead code files | 2 | 0 | -2 |
| Barrel re-exports | 7 | 0 | -7 |
| DataAdapter interface | 0 | 1 | +1 |
| Adapter implementations | 0 | 3 | +3 |
| Validation schemas | 0 | 2 | +2 |
| Config schema (Zod) | 0 | 1 | +1 |
| Lifecycle hook system | 0 | 1 | +1 |
| SQLite index | 0 | 1 (optional) | +1 |
| Docker standalone | 0 | 1 | +1 |

---

## Layer Violations (current)

| File | Violation | Fix |
|------|-----------|-----|
| `DashboardLayout.tsx` | Presentation fetches from `/api/folders` | Move fetch to hook, pass data as props |
| `FileGrid.tsx` | Presentation contains mutation logic | Extract to useFileActions (partly done) |
| `CsvGrid.tsx` | Presentation contains formula engine | Extract evaluateFormula to `logic/` |
| `RelatedLinks.tsx` | Presentation calls resolve API | Move resolve logic to hook |
| `api/dashboard/route.ts` | API route contains business rules | Extract metric calculation to `logic/` |
| `relations.ts` | Logic module directly reads/writes files | Split: logic in `logic/`, I/O via adapter |

---

## Migration Priority (what to do first)

```
Phase 1: Remove dead code + barrel exports         [30 min]  ← Quick wins
Phase 2: Move state/ → logic/hooks/                [15 min]  ← Just rename
Phase 3: Split files.ts → markdown adapter         [1 hr]    ← Biggest payoff
Phase 4: Split config.ts → config/                 [30 min]  ← Clean separation
Phase 5: Extract DashboardLayout fetch → hook      [1 hr]    ← Layer fix
Phase 6: Split FileGrid + CsvGrid (size + logic)   [2 hr]    ← Size compliance
Phase 7: Create resolveEntity + useEntity          [2 hr]    ← Architecture
Phase 8: Zod config schema                         [1 hr]    ← Validation
Phase 9: Docker standalone                         [30 min]  ← Deployment
```

Each phase = one commit. Each commit passes `npm run check`.
