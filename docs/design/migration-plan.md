# Migration Plan

Step-by-step migration from current architecture to target layered model.
Each step is one atomic commit that passes `npm run check`.

---

## Rules

1. **One commit per step** — easy to revert
2. **Every commit passes** `npm run check` (lint + test + build)
3. **No feature changes** — pure refactoring (behavior stays identical)
4. **Tests first** — add/move tests before moving code
5. **Verify after each step** — manual smoke test: open app, navigate, edit, save

---

## Phase 1 — Cleanup (30 min)

Remove dead code and barrel re-exports. Zero risk.

### Step 1.1: Remove dead code

```
DELETE  src/features/navigation/Sidebar.tsx
DELETE  src/features/navigation/index.ts
```

**Test:** `npm run check` passes. App still works (Sidebar was unused).

### Step 1.2: Remove barrel re-exports

```
DELETE  src/shared/lib/index.ts
DELETE  src/features/folders/index.ts
DELETE  src/features/editor/index.ts
DELETE  src/features/csv/index.ts
DELETE  src/features/search/index.ts
DELETE  src/features/dashboard/index.ts
DELETE  src/state/index.ts
```

Update all imports that used barrel paths to direct file imports.

**Test:** `npm run check` passes. No runtime change.

---

## Phase 2 — Create target directory structure (15 min)

Create empty directories. No code moves yet.

### Step 2.1: Create layer directories

```
CREATE  src/presentation/screens/.gitkeep
CREATE  src/presentation/panels/.gitkeep
CREATE  src/presentation/widgets/.gitkeep
CREATE  src/presentation/controls/.gitkeep
CREATE  src/logic/entities/.gitkeep
CREATE  src/logic/hooks/.gitkeep
CREATE  src/logic/validation/.gitkeep
CREATE  src/data/adapters/.gitkeep
CREATE  src/data/index/.gitkeep
CREATE  src/config/.gitkeep
```

**Test:** `npm run check` passes. Nothing changed functionally.

---

## Phase 3 — Move state hooks to logic/ (30 min)

Pure file moves + import path updates.

### Step 3.1: Move useRouterState

```
MOVE  src/state/useRouterState.ts       → src/logic/hooks/useRouterState.ts
MOVE  src/state/useRouterState.test.tsx  → src/logic/hooks/useRouterState.test.tsx
```

Update imports in `src/app/[[...slug]]/page.tsx`.

**Test:** `npm run check` passes. Tests pass.

### Step 3.2: Move useAutoSave

```
MOVE  src/state/useAutoSave.ts       → src/logic/hooks/useAutoSave.ts
MOVE  src/state/useAutoSave.test.tsx  → src/logic/hooks/useAutoSave.test.tsx
```

Update imports in `src/features/editor/DetailPanel.tsx`.

**Test:** `npm run check` passes. Tests pass.

### Step 3.3: Move useFolderData

```
MOVE  src/state/useFolderData.ts → src/logic/hooks/useFolderData.ts
```

Update imports in `src/app/[[...slug]]/page.tsx`.

**Test:** `npm run check` passes. App still fetches folder data correctly.

### Step 3.4: Delete empty state/ directory

```
DELETE  src/state/
```

**Test:** `npm run check` passes.

---

## Phase 4 — Extract config layer (45 min)

Split `shared/lib/config.ts` into focused modules.

### Step 4.1: Create config/schema.ts

Extract type definitions (FolderDef, FieldDef, TreeNode, Config) to
`src/config/schema.ts`. Keep the original file importing from the new one
temporarily (re-export for backward compat).

```
CREATE  src/config/schema.ts    ← types + Zod validation (later)
```

**Test:** `npm run check` passes. Types still resolve.

### Step 4.2: Create config/loader.ts

Move `getConfig()`, `getFolderDef()`, `getAbsolutePath()`, `getTree()`,
`clearConfigCache()` to `src/config/loader.ts`.

```
CREATE  src/config/loader.ts    ← all config loading logic
```

**Test:** `npm run check` passes. API routes still load config.

### Step 4.3: Create config/defaults.ts

Extract default values and auto-discovery logic.

```
CREATE  src/config/defaults.ts  ← default field types, icons, etc.
```

**Test:** `npm run check` passes. Auto-discovery still works.

### Step 4.4: Delete shared/lib/config.ts

Remove the old file. Update all imports to use `@/config/loader` and
`@/config/schema`.

```
DELETE  src/shared/lib/config.ts
MOVE    src/shared/lib/config.test.ts → src/config/loader.test.ts
```

**Test:** `npm run check` passes. Full config test suite passes.

---

## Phase 5 — Create DataAdapter interface (1 hr)

The architectural cornerstone: define the contract between logic and data.

### Step 5.1: Define adapter interface

```
CREATE  src/data/adapters/types.ts
```

```typescript
export interface DataAdapter {
  list(collection: string, opts?: ListOptions): Promise<Record[]>;
  get(collection: string, id: string): Promise<Record | null>;
  create(collection: string, data: RecordData): Promise<Record>;
  update(collection: string, id: string, data: Partial<RecordData>): Promise<Record>;
  delete(collection: string, id: string): Promise<void>;
  search(query: string, opts?: SearchOptions): Promise<SearchResult[]>;
  count(collection: string, filter?: Filter): Promise<number>;
}

export interface ListOptions { ... }
export interface SearchOptions { ... }
export interface RecordData { ... }
export interface SearchResult { ... }
```

**Test:** `npm run check` passes. Interface compiles.

### Step 5.2: Create MarkdownAdapter

Extract logic from `shared/lib/files.ts` into `src/data/adapters/markdown.ts`
implementing the DataAdapter interface.

```
CREATE  src/data/adapters/markdown.ts  ← implements DataAdapter
```

Keep `shared/lib/files.ts` temporarily as a thin wrapper that delegates to
the adapter (so existing API routes don't break).

**Test:** `npm run check` passes. Existing tests still pass.

### Step 5.3: Create CsvAdapter

Extract logic from `shared/lib/csv.ts` into `src/data/adapters/csv.ts`.

```
CREATE  src/data/adapters/csv.ts  ← implements DataAdapter
```

**Test:** `npm run check` passes. CSV loading/saving works.

### Step 5.4: Migrate API routes to use adapters

Update all API routes (`folders/`, `files/`, `csv/`) to call the adapter
instead of `shared/lib/files.ts` directly.

```
UPDATE  src/app/api/folders/route.ts
UPDATE  src/app/api/folders/[folderId]/route.ts
UPDATE  src/app/api/folders/[folderId]/[fileId]/route.ts
UPDATE  src/app/api/csv/[...path]/route.ts
```

**Test:** `npm run check` passes. Full CRUD works end-to-end.

### Step 5.5: Delete old shared/lib/files.ts and csv.ts

```
DELETE  src/shared/lib/files.ts
DELETE  src/shared/lib/csv.ts
MOVE    src/shared/lib/files.test.ts → src/data/adapters/markdown.test.ts
```

**Test:** `npm run check` passes. All file operations tested via adapter.

---

## Phase 6 — Move presentation components (1 hr)

Pure moves. No logic changes.

### Step 6.1: Move controls

```
MOVE  src/features/folders/EditableCell.tsx    → src/presentation/controls/EditableCell.tsx
MOVE  src/features/dashboard/KpiCard.tsx       → src/presentation/controls/KpiCard.tsx
MOVE  src/shared/ui/ThemeContext.tsx           → src/presentation/controls/ThemeContext.tsx
```

Update all imports.

**Test:** `npm run check` passes.

### Step 6.2: Move widgets

```
MOVE  src/features/folders/CreateDialog.tsx      → src/presentation/widgets/CreateDialog.tsx
MOVE  src/features/folders/DeleteDialog.tsx      → src/presentation/widgets/DeleteDialog.tsx
MOVE  src/features/folders/RenameDialog.tsx      → src/presentation/widgets/RenameDialog.tsx
MOVE  src/features/folders/ColumnConfigButton.tsx → src/presentation/widgets/ColumnConfigButton.tsx
MOVE  src/features/search/SearchResults.tsx      → src/presentation/widgets/SearchResults.tsx
MOVE  src/features/editor/MarkdownEditor.tsx     → src/presentation/widgets/RecordEditor.tsx
```

Update all imports.

**Test:** `npm run check` passes. UI looks identical.

### Step 6.3: Move panels

```
MOVE  src/features/editor/DetailPanel.tsx → src/presentation/panels/DetailPanel.tsx
```

**Test:** `npm run check` passes.

### Step 6.4: Move layout

```
MOVE  src/shared/ui/DashboardLayout.tsx → src/presentation/panels/AppShell.tsx
```

(Rename to AppShell reflects its role better. Will be split further in Phase 8.)

**Test:** `npm run check` passes.

---

## Phase 7 — Move logic modules (45 min)

### Step 7.1: Move feature hooks

```
MOVE  src/features/folders/useColumnConfig.ts  → src/logic/hooks/useColumnConfig.ts
MOVE  src/features/folders/useFileActions.ts   → src/logic/hooks/useFileActions.ts
MOVE  src/features/folders/useFolderActions.ts → src/logic/hooks/useFolderActions.ts
```

Update imports in FileGrid, FolderActions.

**Test:** `npm run check` passes.

### Step 7.2: Move relations logic

```
MOVE  src/shared/lib/relations.ts → src/logic/entities/relations.ts
MOVE  src/shared/lib/field-options.ts → src/logic/entities/field-options.ts
```

**Note:** `relations.ts` still imports from data layer (fs operations).
This is acceptable temporarily — will be fixed when adapter is used.

**Test:** `npm run check` passes.

### Step 7.3: Move git-meta to data layer

```
MOVE  src/shared/lib/git-meta.ts → src/data/adapters/git-meta.ts
```

**Test:** `npm run check` passes.

---

## Phase 8 — Split oversized components (2 hr)

Bring all files under 200 LOC.

### Step 8.1: Split AppShell (was DashboardLayout, 290 LOC)

```
src/presentation/panels/AppShell.tsx (290 LOC)
  → src/presentation/panels/AppShell.tsx        (~80 LOC)  layout skeleton
  → src/presentation/widgets/TreeNav.tsx        (~100 LOC) sidebar tree
  → src/presentation/widgets/SearchBox.tsx      (~60 LOC)  search input
  → src/logic/hooks/useFolderTree.ts            (~40 LOC)  fetch folder tree
```

**Test:** `npm run check` passes. Sidebar and search work as before.

### Step 8.2: Split FileGrid (290 LOC)

```
src/features/folders/FileGrid.tsx (290 LOC)
  → src/presentation/widgets/DataGrid.tsx       (~150 LOC) pure table rendering
  → src/logic/hooks/useDataGrid.ts              (~80 LOC)  column config + mutations
  → src/presentation/widgets/GridToolbar.tsx    (~50 LOC)  action buttons
```

**Test:** `npm run check` passes. Grid renders, editing works.

### Step 8.3: Split CsvGrid (310 LOC)

```
src/features/csv/CsvGrid.tsx (310 LOC)
  → src/presentation/widgets/CsvGrid.tsx        (~150 LOC) pure table rendering
  → src/logic/hooks/useCsvData.ts               (~60 LOC)  fetch + save
  → src/logic/entities/formulas.ts              (~80 LOC)  formula evaluation
```

**Test:** `npm run check` passes. CSV editing + formulas work.

### Step 8.4: Simplify page.tsx (190 LOC)

```
src/app/[[...slug]]/page.tsx (190 LOC)
  → src/app/[[...slug]]/page.tsx                (~50 LOC)  thin composition
  → src/presentation/screens/MainScreen.tsx     (~100 LOC) FolderView + SearchView
```

**Test:** `npm run check` passes. All navigation works.

---

## Phase 9 — Validation layer (1 hr)

### Step 9.1: Create Zod config schema

```
CREATE  src/config/schema.ts  ← Zod schema for .muimark.yaml
```

Validates the config at load time. Provides clear error messages for
invalid YAML.

**Test:** Write test with valid + invalid configs. `npm run check` passes.

### Step 9.2: Create rule engine

```
CREATE  src/logic/validation/rules.ts        ← required, pattern, range, unique
CREATE  src/logic/validation/transitions.ts  ← state machine from config
```

**Test:** Unit tests for each rule type. Transition checker tested with
known-good and known-bad transitions. `npm run check` passes.

### Step 9.3: Wire rules into update flow

Update the `beforeChange` step in the file save API route to run rules
before writing.

**Test:** Try invalid transition via UI → blocked with error message.
Valid transitions still work.

---

## Phase 10 — Docker standalone (30 min)

### Step 10.1: Add output: standalone to next.config.ts

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: 'standalone',
  // ... existing config
};
```

**Test:** `npm run build` produces `.next/standalone/`.

### Step 10.2: Update Dockerfile

Use the standalone output (no `node_modules` copy needed).

```
UPDATE  Dockerfile  ← copy .next/standalone, .next/static, public
CREATE  docker-compose.yaml
CREATE  .dockerignore
```

**Test:** `docker build . && docker run -v ./data/demo:/data -p 3000:3000`
opens the app with demo data.

---

## Phase 11 — Entity abstraction (2 hr)

### Step 11.1: Create resolveEntity

```
CREATE  src/logic/entities/resolveEntity.ts
```

Takes a folder config and returns a runtime Entity object with:
- Typed attributes
- Resolved adapter (markdown/csv/sqlite)
- Bound rules
- Hook references

**Test:** Unit test: pass config → get Entity with correct adapter type.

### Step 11.2: Create useEntity hook

```
CREATE  src/logic/hooks/useEntity.ts
```

Generic hook that replaces ad-hoc TanStack Query usage in components:

```typescript
const { records, isLoading, create, update, remove } = useEntity('incidents');
```

**Test:** Unit test with mocked adapter. Hook returns records, mutations work.

### Step 11.3: Refactor DataGrid to use useEntity

Replace direct `fetch('/api/folders/...')` calls in grid with `useEntity`.

**Test:** Grid still works. `npm run check` passes.

---

## Phase 12 — SQLite index (optional, 2 hr)

Only needed for server/enterprise tier with >500 files.

### Step 12.1: Create indexer

```
CREATE  src/data/index/indexer.ts  ← scan all files, populate SQLite
```

**Test:** Run indexer on demo data → creates `.muimark/index.db`.

### Step 12.2: Create search via FTS5

```
CREATE  src/data/index/search.ts  ← FTS5 queries
```

**Test:** Index demo data, search "disk full" → returns correct results.

### Step 12.3: Wire into search API route

Update `/api/search/route.ts` to use index when available, fall back to
file scan when not.

**Test:** Search works with and without index. `npm run check` passes.

---

## Phase 13 — Lifecycle hooks (2 hr)

### Step 13.1: Create hook executor

```
CREATE  src/logic/entities/lifecycle.ts
```

Loads hook files from paths in config, executes them at the right points.

**Test:** Unit test with mock hooks that track execution order.

### Step 13.2: Wire into adapter calls

Update the Action executor (API routes) to call hooks before/after
adapter operations.

```
beforeValidate → beforeCreate → adapter.create() → afterCreate
```

**Test:** Create a test hook that writes to a log file. Create a record →
log file gets written. `npm run check` passes.

### Step 13.3: Document hook API for users

```
CREATE  hooks/README.md  ← how to write hooks
```

**Test:** Follow your own docs to create a working hook. It fires.

---

## Summary

| Phase | Steps | Effort | Risk | Result |
|-------|-------|--------|------|--------|
| 1 | 2 | 30 min | None | Dead code gone |
| 2 | 1 | 15 min | None | Target dirs exist |
| 3 | 4 | 30 min | Low | State hooks in logic/ |
| 4 | 4 | 45 min | Low | Config layer clean |
| 5 | 5 | 1 hr | Medium | DataAdapter interface |
| 6 | 4 | 1 hr | Low | Presentation layer populated |
| 7 | 3 | 45 min | Low | Logic layer populated |
| 8 | 4 | 2 hr | Medium | All files < 200 LOC |
| 9 | 3 | 1 hr | Medium | Validation active |
| 10 | 2 | 30 min | Low | Docker works |
| 11 | 3 | 2 hr | Medium | Entity abstraction |
| 12 | 3 | 2 hr | Low | SQLite search (optional) |
| 13 | 3 | 2 hr | Low | Lifecycle hooks (optional) |

**Total: ~14.5 hours** across 41 atomic commits.

---

## Verification Checklist (per step)

- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] App loads in browser
- [ ] Can navigate folders
- [ ] Can edit a record
- [ ] Can save (auto-save triggers)
- [ ] No console errors

---

## Phase Dependency Graph

```
Phase 1 (cleanup)
    │
    ▼
Phase 2 (dirs)
    │
    ├──────────────────┐
    ▼                  ▼
Phase 3 (hooks)    Phase 4 (config)
    │                  │
    └────────┬─────────┘
             ▼
         Phase 5 (adapter) ←── architectural pivot
             │
    ┌────────┼─────────┐
    ▼        ▼         ▼
Phase 6   Phase 7   Phase 9
(pres)    (logic)   (validation)
    │        │
    └────┬───┘
         ▼
     Phase 8 (split files)
         │
         ▼
     Phase 10 (Docker)
         │
         ▼
     Phase 11 (entity)
         │
    ┌────┴────┐
    ▼         ▼
Phase 12   Phase 13
(sqlite)   (hooks)
```

Phases 12 and 13 are independent and optional — implement when needed.
