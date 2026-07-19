# ITSM

A universal markdown-powered management UI. Point it at any folder, get a full-featured dashboard with editable records, metadata grids, and cross-references — no database required.

## Vision

Any folder with markdown files becomes a management system. ITSM, CRM, project tracker, financial planner — it doesn't matter. The tool adapts to whatever structure you give it.

```text
npx itsm                    # run in any directory
npx itsm --config ./my.yaml # custom config
```

The app reads the folder tree, parses frontmatter as metadata, and presents everything in a navigable split-pane UI. You edit markdown directly — WYSIWYG or plain text — and changes write back to disk. Git handles versioning. That's it.

## How It Works

```text
┌──────────────────────────────────────────────────────────────────┐
│ Sidebar          │  Grid (top)              │                    │
│                  │  ┌────┬────────┬───────┐ │                    │
│  📁 Incidents    │  │ ID │ Status │ Date  │ │                    │
│  📁 Changes      │  ├────┼────────┼───────┤ │                    │
│  📁 Problems     │  │ 12 │ Open   │ 07-19 │ │  ← selected        │
│  📁 Runbooks     │  │ 11 │ Closed │ 07-18 │ │                    │
│  📁 CMDB         │  └────┴────────┴───────┘ │                    │
│                  │──────────────────────────│                    │
│                  │  Editor (bottom)         │                    │
│                  │                          │                    │
│                  │  # I-012: Keyboard fix   │                    │
│                  │                          │                    │
│                  │  The 'N' key stopped...  │                    │
│                  │                          │                    │
└──────────────────────────────────────────────────────────────────┘
```

### Layout

- **Sidebar** — folder tree from config. Subfolders become nested menu items.
- **Grid** (top pane) — lists all files in the selected folder. Columns come from metadata fields defined in config, with filename as fallback.
- **Editor** (bottom pane) — opens the selected file in WYSIWYG mode. Frontmatter is hidden (managed via grid columns). Switch to plain text mode anytime.

### Navigation

- Clicking a folder in the sidebar loads its contents into the grid.
- Clicking a row in the grid opens that file in the editor.
- The home/root shows `README.md` (or configured splash file) as the landing page.
- Full keyboard navigation: arrow keys in grid, tab between panes, shortcuts for save/switch mode.

## Core Concepts

### Metadata = Frontmatter

Every markdown file can have YAML frontmatter:

```markdown
---
status: Investigating
severity: High
date: 2026-07-19
---

# I-012: Keyboard unresponsive

The 'N' key stopped responding...
```

Grid columns map directly to these fields. Edit a cell in the grid → frontmatter updates. Fill in frontmatter → grid reflects it. Two-way sync.

### Column Types

| Type | Behavior |
|------|----------|
| `text` | Free text |
| `select` | Picklist from predefined values |
| `date` | Date picker |
| `number` | Numeric input |
| `relation` | Link to another numbered item (e.g., `I-012`, `SC-003`) |

**Open picklist** — values auto-discovered from existing files. Type a new value and it's added.
**Bounded picklist** — fixed set defined in config. No new values allowed.

### Auto-Numbering

Files without a number get one assigned on first edit. The number goes into the filename:

```text
keyboard-fix.md  →  I-012-keyboard-fix.md
```

Pattern is configurable per folder (e.g., `I-`, `SC-`, `P-`, `RB-`).

### Relations & Cross-References

Link to any numbered item: `I-012`, `SC-003`, `P-001`. These become clickable hyperlinks that navigate you directly to that record (highlighted in its own view).

Forward and backward navigation works like a browser. A relation indexer tracks all links so you can see "what links here" on any record.

When you navigate to a target via relation, the relationship is stored on the target too (bidirectional).

### Settings (`itsm.config.yaml`)

```yaml
dataDir: /path/to/your/markdown/repo

folders:
  - id: incidents
    label: Incidents
    path: incidents
    icon: warning
    prefix: "I-"
    fields:
      - { name: status, type: select, options: [Open, Closed] }
      - { name: severity, type: select, options: [Critical, High, Medium, Low], bounded: true }
      - { name: date, type: date }
```

Additional settings:

- `hidden` — folders to exclude from sidebar
- `icons` — custom icons per folder
- `splash` — override the default landing page
- `templates` — folder scaffolding for new projects

## Templates

Start from a template to scaffold a full system:

```bash
npx itsm init --template itsm    # Incident/Change/Problem/CMDB
npx itsm init --template crm     # Contacts/Deals/Activities
npx itsm init --template finance  # Invoices/Expenses/Budget
```

Templates create the folder structure and a matching `itsm.config.yaml`.

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) |
| UI | MUI 9, Material Icons |
| Editor | MDXEditor (WYSIWYG + source mode) |
| Grid | TanStack Table v8 |
| Data fetching | TanStack Query v5 |
| Frontmatter | gray-matter |
| Config | YAML (js-yaml) |
| Storage | Filesystem (markdown + git) |

## Development

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build
npm run lint      # eslint
```

Configure `itsm.config.yaml` to point `dataDir` at your markdown repository.

## Design Principles

1. **Files are the database** — No SQLite, no JSON blobs. Plain markdown in git.
2. **Metadata is frontmatter** — Structured data lives where it belongs.
3. **Config over code** — Customize behavior via YAML, not source modifications.
4. **Zero lock-in** — Your data is always readable without this tool.
5. **Keyboard-first** — Every action reachable without a mouse.
6. **Lightweight** — Built on existing standards. No heavy abstractions.

## Roadmap

- [ ] `npx itsm` — run from any directory without install
- [ ] Relation indexer — background process mapping all cross-references
- [ ] Search — full-text across all files + metadata filters
- [ ] Bulk operations — multi-select in grid, batch status changes
- [ ] Import/export — CSV, JSON for migration
- [ ] Themes — dark mode, custom color schemes
- [ ] Plugin system — extend with custom column types or views

## License

Private — not published.
