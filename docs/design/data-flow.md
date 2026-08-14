# Data Flow

How data moves through the layers for each operation type.

---

## Read Flow (opening a folder)

```
User clicks "Incidents" in sidebar
    │
    ▼
[Presentation] TreeNav fires onSelect("incidents")
    │
    ▼
[Logic] useEntity("incidents") → TanStack Query
    │ calls
    ▼
[Logic] Hook: beforeRead (optional — can filter/redact)
    │
    ▼
[Data] MarkdownAdapter.list("incidents")
    │ reads
    ▼
[Filesystem] data/incidents/*.md → gray-matter parse
    │ returns
    ▼
[Logic] Hook: afterRead (optional — side effects)
    │
    ▼
[Logic] Entity records with typed Attributes
    │ returns
    ▼
[Presentation] DataGrid renders with ColumnDefs from config
```

---

## Write Flow (editing a cell)

```
User changes status from "Open" to "Investigating"
    │
    ▼
[Presentation] DataGrid fires onCellEdit(id, "status", "Investigating")
    │
    ▼
[Logic] Hook: beforeValidate (can transform data)
    │
    ▼
[Logic] Rule check: transition allowed? Open → Investigating ✅
    │
    ▼
[Logic] Hook: beforeChange (can modify or abort)
    │
    ▼
[Logic] Action "update" → TanStack Mutation
    │ calls
    ▼
[Data] MarkdownAdapter.update("incidents", id, { status: "Investigating" })
    │ writes
    ▼
[Filesystem] Update frontmatter in .md file
    │
    ▼
[Logic] Hook: afterChange (side effects: git commit, notifications)
    │ invalidates
    ▼
[Logic] TanStack Query cache invalidation → re-render
```

---

## Create Flow (new record)

```
User clicks "New Incident"
    │
    ▼
[Presentation] Form/dialog opens with template defaults
    │
    ▼
[Logic] Hook: beforeValidate (normalize input)
    │
    ▼
[Logic] Rule check: required fields present? ✅
    │
    ▼
[Logic] Hook: beforeCreate (auto-assign ID, set created_by, enrich)
    │
    ▼
[Data] MarkdownAdapter.create("incidents", data)
    │ writes
    ▼
[Filesystem] Create new .md file from template
    │
    ▼
[Logic] Hook: afterCreate (notify, index, git commit)
    │ invalidates
    ▼
[Logic] TanStack Query cache invalidation → grid updates
```

---

## Delete Flow

```
User clicks "Delete" + confirms
    │
    ▼
[Logic] Hook: beforeDelete (can abort — e.g. "only closed items")
    │
    ▼
[Data] MarkdownAdapter.delete("incidents", id)
    │ removes
    ▼
[Filesystem] Delete .md file (or move to .trash/)
    │
    ▼
[Logic] Hook: afterDelete (cleanup relations, git commit)
    │ invalidates
    ▼
[Logic] TanStack Query cache invalidation → grid updates
```

---

## Search Flow

```
User types "disk full" in search box
    │
    ▼
[Presentation] SearchBox fires onSearch("disk full")
    │
    ▼
[Logic] useSearch("disk full") → TanStack Query
    │ calls
    ▼
[Data] Index.search("disk full") → SQLite FTS5 query
    │ returns
    ▼
[Presentation] SearchResults renders matches with highlights
```

---

## Hook Execution Order (per operation)

| Operation | Hook sequence |
|-----------|--------------|
| **Create** | beforeValidate → beforeCreate → *write* → afterCreate |
| **Update** | beforeValidate → beforeChange → *write* → afterChange |
| **Delete** | beforeDelete → *delete* → afterDelete |
| **Read** | beforeRead → *read* → afterRead |

- `before*` hooks can **modify data** or **throw to abort**
- `after*` hooks are **fire-and-forget** side effects
- Hooks at the same stage run in **series** (array order)
- If a before-hook throws, the operation is cancelled and error returned
