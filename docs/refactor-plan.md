# Muimark Refactor Plan — Clean Architecture

## Goal

Refactor muimark into a clean, testable, config-driven app with:
- Stateless presentational components (reusable)
- Separated state management (hooks)
- Config-driven rendering (YAML → UI)
- Demo data included in repo (no iron-legion dependency for dev)
- CLI (`npx muimark`) and Docker support
- Future: auth (GitHub/Google/Microsoft/Facebook) + RBAC

## Principles

1. **No file > 100 lines** (enforced via cpm check)
2. **No folder > 10 files** (enforced via cpm check)
3. **Max 3 useState per component** — more = extract to hook
4. **Components receive data as props** — no fetch inside presentational components
5. **Each step must pass `npm run check`** before moving to the next
6. **Each step is one commit** — easy to revert

---

## Phase 1 — Demo Data & Decouple from Iron Legion

### Step 1.1: Create demo data directory
```
data/demo/
├── .muimark.yaml        # Config for demo mode
├── incidents/
│   ├── I-001-server-down.md
│   └── I-002-disk-full.md
├── changes/
│   └── SC-001-upgrade-node.md
├── runbooks/
│   └── RB-001-restart-service.md
└── README.md
```

**Test:** `npx muimark data/demo --dev` starts and shows demo content.

### Step 1.2: Update .config/itsm.yaml → data/demo/.muimark.yaml
Move the iron-legion specific config out. The app should work purely from the
data directory's `.muimark.yaml`.

**Test:** `npm run dev` with `MUIMARK_DATA_DIR=./data/demo` works.

---

## Phase 2 — Extract State Hooks

### Step 2.1: Extract `useRouterState` hook
Move URL parsing, navigation, history sync from `page.tsx` into:
```
src/state/useRouterState.ts
```
Exports: `{ selectedFolder, selectedFile, navigateTo, goHome }`

**Test:** Unit test the hook with mock window.location.

### Step 2.2: Extract `useAutoSave` hook
Move debounced save logic from `DetailPanel` into:
```
src/state/useAutoSave.ts
```
Exports: `{ content, setContent, saveStatus, saveNow }`

**Test:** Unit test with fake timers.

### Step 2.3: Extract `useFolderData` hook
Move folder/file fetching and selection logic into:
```
src/state/useFolderData.ts
```
Exports: `{ folder, files, selectedFile, selectFile, selectFolder }`

**Test:** Unit test with msw or mocked fetch.

---

## Phase 3 — Stateless Presentational Components

### Step 3.1: Refactor `MarkdownEditor`
Current: fetches nothing, but has theme detection + click handler logic.
Target: Pure `content` in, `onChange` out. No refs for sync hacks.

```tsx
// Clean interface
interface MarkdownViewerProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}
```

**Fix the render loop permanently** — no `setMarkdown` + `onChange` dance.

### Step 3.2: Refactor `FileGrid` → `DataGrid`
Extract the table rendering into a generic component:
```tsx
interface DataGridProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  selectedRow?: string;
  onSelectRow: (id: string) => void;
  onCellEdit?: (rowId: string, field: string, value: string) => void;
}
```
Move mutation logic to parent via callbacks.

### Step 3.3: Refactor `DashboardLayout` → `AppShell`
Split into:
- `AppShell` — pure layout (sidebar slot, content slot, appbar slot)
- `SidebarTree` — renders tree from data prop
- `AppToolbar` — search + theme toggle

No data fetching inside these.

### Step 3.4: Simplify `page.tsx`
After hooks + presentational split, page.tsx becomes:
```tsx
export default function Home() {
  const { folder, file, navigateTo, goHome } = useRouterState();
  const { folderData, files } = useFolderData(folder);
  const { content, setContent, saveStatus } = useAutoSave(folder, file);

  return (
    <AppShell
      sidebar={<SidebarTree selected={folder} onSelect={navigateTo} />}
      toolbar={<AppToolbar onHome={goHome} />}
    >
      {file ? (
        <MarkdownEditor content={content} onChange={setContent} />
      ) : (
        <DataGrid data={files} onSelectRow={(id) => navigateTo(folder, id)} />
      )}
    </AppShell>
  );
}
```

---

## Phase 4 — Quality Checks (cpm integration)

### Step 4.1: Add project-specific checks to cpm.toml
```toml
[limits]
file-lines = 100
files-per-dir = 10
function-params = 4

[checks]
code-typescript-syntax-format = true
code-typescript-complexity-measure = true
check-no-fetch-in-components = true   # Custom: no fetch() in src/components/
check-max-usestate = true             # Custom: max 3 useState per component
```

### Step 4.2: Write custom check scripts
```
checks/
├── check-no-fetch-in-components.sh   # grep -r "fetch(" src/components/ → fail
├── check-max-usestate.sh             # count useState per file → fail if > 3
├── check-component-size.sh           # wc -l on src/components/**/*.tsx → fail if > 100
└── check-no-barrel-reexport.sh       # Prevent deep re-export chains
```

### Step 4.3: Add to Makefile / CI
```makefile
check: lint test typecheck cpm-check
cpm-check:
	./node_modules/.bin/cpm check || (cd checks && bash run-all.sh)
```

---

## Phase 5 — Docker & npx

### Step 5.1: Fix Docker for standalone mode
Update Dockerfile to use Next.js standalone output:
```dockerfile
# next.config.ts: output: 'standalone'
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
CMD ["node", "server.js"]
```

### Step 5.2: Validate npx muimark flow
```bash
# From any directory with markdown:
npx muimark .
npx muimark ~/git/hub/iron-legion --config ~/git/hub/itsm/.config/itsm.yaml
npx muimark --port 4000
```

### Step 5.3: Docker with volume mount
```bash
docker run -v ~/git/hub/iron-legion:/data -p 3000:3000 muimark
```

---

## Phase 6 — Auth & RBAC (Future)

### Step 6.1: NextAuth.js integration
```
src/auth/
├── auth.config.ts       # Providers: GitHub, Google, Microsoft, Facebook
├── middleware.ts        # Protect routes
└── session.ts           # Server-side session helpers
```

### Step 6.2: User management
```yaml
# .muimark.yaml
auth:
  enabled: true
  providers: [github, google, microsoft]
  roles:
    admin: [gius@example.com]
    editor: ["*@company.com"]
    viewer: ["*"]
  permissions:
    admin: [read, write, delete, manage-users]
    editor: [read, write]
    viewer: [read]
```

### Step 6.3: RBAC middleware
- Folders can have `access: [admin, editor]` in config
- API routes check session + role before allowing mutations
- Viewer role = read-only mode (no edit buttons shown)

---

## Execution Order

| # | Step | Effort | Risk |
|---|------|--------|------|
| 1 | Demo data + decouple | 30 min | Low |
| 2 | Extract useRouterState | 1 hour | Medium (breaks if wrong) |
| 3 | Extract useAutoSave | 30 min | Low |
| 4 | Extract useFolderData | 1 hour | Medium |
| 5 | Refactor MarkdownEditor (fix loop) | 1 hour | High (MDXEditor quirks) |
| 6 | Refactor FileGrid → DataGrid | 1 hour | Medium |
| 7 | Refactor DashboardLayout → AppShell | 1 hour | Medium |
| 8 | Simplify page.tsx | 30 min | Low (just wiring) |
| 9 | Custom cpm checks | 30 min | Low |
| 10 | Docker standalone | 30 min | Low |
| 11 | Auth + RBAC | 2-3 hours | Medium |

**Total estimate:** ~10 hours spread over multiple sessions.

---

## Definition of Done (per step)

- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] `npx muimark data/demo` works
- [ ] No file > 100 lines (checked)
- [ ] No folder > 10 files (checked)
- [ ] Commit is atomic and revertable
