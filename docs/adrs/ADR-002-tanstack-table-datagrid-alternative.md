# ADR-002: TanStack Table + MUI as Free DataGrid Pro Alternative

**Status**: Accepted  
**Date**: 2026-07-19  
**Supersedes**: N/A  
**Related**: ADR-001 (UI Framework & Dashboard Layout)

## Context

The itsm app needs a data grid with:
- Column reordering (user-defined column order)
- Column visibility (show/hide columns)
- Sorting (multi-column)
- Filtering (global search)
- Persistence (save column config to `itsm.yaml`)

MUI X DataGrid Pro ($180/dev/year) provides all of these out-of-the-box. The free DataGrid Community edition lacks column reordering and some filtering features.

Previous experiment: [`rkristelijn/next-mui-data-grid-persistence`](https://github.com/rkristelijn/next-mui-data-grid-persistence) (archived) demonstrated DataGrid Pro persistence — but required a paid license.

## Decision

Use **TanStack Table** (headless, MIT licensed) as the data engine, rendering with **MUI Table components** for styling. This provides all DataGrid Pro features for free.

## Architecture

```
┌─────────────────────────────────────────────┐
│  TanStack Table (headless engine)           │
│  - columnOrder state                        │
│  - columnVisibility state                   │
│  - sorting state                            │
│  - filtering                                │
│  - pagination                               │
├─────────────────────────────────────────────┤
│  MUI Table (rendering layer)                │
│  - <Table>, <TableHead>, <TableBody>        │
│  - <TableRow>, <TableCell>                  │
│  - <TableSortLabel>                         │
│  - <Chip> for status fields                 │
├─────────────────────────────────────────────┤
│  Column Config UI                           │
│  - Dialog with checkboxes (visibility)      │
│  - Up/down arrows (ordering)               │
│  - Persisted to .config/itsm.yaml          │
└─────────────────────────────────────────────┘
```

## Comparison: DataGrid Pro vs TanStack Table + MUI

| Feature | DataGrid Pro (paid) | TanStack Table + MUI (free) |
|---------|:------------------:|:--------------------------:|
| Column ordering | ✅ drag & drop | ✅ via config UI + state |
| Column visibility | ✅ built-in panel | ✅ via config UI + state |
| Multi-column sort | ✅ | ✅ |
| Filtering | ✅ per-column + multi | ✅ global + per-column |
| Pagination | ✅ | ✅ |
| Column resizing | ✅ | ✅ |
| Column pinning | ✅ | ✅ |
| Virtualization (100k+ rows) | ✅ | ✅ (add @tanstack/react-virtual) |
| Inline cell editing | ✅ | 🔨 manual |
| Row grouping | ✅ | 🔨 manual |
| Excel export | ✅ | ❌ |
| Drag & drop in header | ✅ native | 🔨 needs @dnd-kit |
| License cost | $180/dev/year | $0 |
| Bundle size | ~150KB | ~15KB (headless) + MUI Table |

## Why This Works for ITSM

- **Small datasets** (~10-100 items per folder) — no virtualization needed
- **No inline editing** — we edit via the DetailPanel (markdown editor)
- **No Excel export** — markdown is our export format
- **Column reorder via config dialog** is sufficient — drag & drop in headers is nice-to-have, not essential
- **Already in use** — TanStack Table was the original implementation before the DataGrid experiment

## Persistence Model

Column configuration is saved per folder in `.config/itsm.yaml`:

```yaml
columnConfig:
  incidents:
    - { field: id, visible: true }
    - { field: title, visible: true }
    - { field: status, visible: true }
    - { field: severity, visible: true }
    - { field: date, visible: true }
    - { field: duration, visible: false }
    - { field: impact, visible: false }
  changes:
    - { field: id, visible: true }
    - { field: title, visible: true }
    - { field: status, visible: true }
    - { field: priority, visible: true }
```

API endpoints:
- `GET /api/columns/[folderId]` — read column config
- `PUT /api/columns/[folderId]` — save column config

## Consequences

- Remove `@mui/x-data-grid` dependency (saves ~150KB bundle)
- Keep `@tanstack/react-table` (already installed, ~15KB)
- FileGrid uses TanStack Table with `columnOrder` and `columnVisibility` state
- MUI Table components provide consistent Material Design look
- Column config dialog allows users to customize without paid licenses
- Future: can add `@dnd-kit` for drag & drop column reorder if desired
