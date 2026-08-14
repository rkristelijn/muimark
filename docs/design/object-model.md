# Object Model

The muimark architecture separates concerns into 4 layers. Each layer has
its own object types. Config (YAML) connects them.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                              │
│  What the user sees and interacts with                           │
│                                                                  │
│  Screen → Panel → Widget → Control                               │
└────────────────────────────┬────────────────────────────────────┘
                             │ binds to
┌────────────────────────────▼────────────────────────────────────┐
│  LOGIC LAYER                                                     │
│  Business rules, validation, behavior                            │
│                                                                  │
│  Entity → Attribute → Rule → Action → Relation                   │
└────────────────────────────┬────────────────────────────────────┘
                             │ reads/writes via
┌────────────────────────────▼────────────────────────────────────┐
│  DATA LAYER                                                      │
│  Physical storage and indexing                                   │
│                                                                  │
│  Source → Collection → Field → Index → Adapter                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  CONFIG LAYER (cross-cutting)                                    │
│  YAML metadata driving all layers                                │
│                                                                  │
│  .muimark.yaml → Schema + Binding + Layout + Theme               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Presentation Layer

Defines what the user sees. Pure rendering, no data knowledge.

| Object | Description | Implementation |
|--------|-------------|----------------|
| **Screen** | Top-level page, maps to a route | Next.js App Router page |
| **Panel** | A visual area within a Screen | React layout component |
| **Widget** | Reusable UI block bound to one Entity | React component with props |
| **Control** | Atomic input/output element | MUI component |

### Screen

The full page determined by URL + config. One Screen per route.

```
Screen "/incidents"
├── Panel "Sidebar"     → TreeNav widget
├── Panel "Grid"        → DataGrid widget
└── Panel "Detail"      → RecordEditor widget
```

### Panel Types

| Type | Purpose |
|------|---------|
| `sidebar` | Navigation tree |
| `grid` | Table/list of records |
| `detail` | Single record view/edit |
| `kanban` | Cards grouped by field |
| `dashboard` | KPI cards + charts |
| `form` | Create/edit form |

### Widget Types

| Widget | Bound to | Renders via |
|--------|----------|-------------|
| `DataGrid` | Entity (list) | TanStack Table + MUI Table |
| `RecordEditor` | Entity (single) | MDXEditor |
| `KanbanBoard` | Entity (grouped) | MUI Cards |
| `TreeNav` | Config (folders) | MUI TreeView |
| `SearchBox` | Index | MUI Autocomplete |
| `StatCard` | Entity (aggregate) | MUI Card |

### Control Types

| Control | For Attribute type | MUI component |
|---------|-------------------|---------------|
| `TextInput` | text | TextField |
| `SelectPicker` | select | Autocomplete / Select |
| `DatePicker` | date | DatePicker |
| `NumberInput` | number | TextField type=number |
| `Chip` | select (read-only) | Chip with color |
| `RelationLink` | relation | Link + Tooltip |
| `Toggle` | boolean | Switch |
| `UrlLink` | url | Link |

---

## Logic Layer

Defines what data means and how it behaves. Independent of UI and storage.

| Object | Description | Implementation |
|--------|-------------|----------------|
| **Entity** | Logical data unit | TanStack Query key + hook |
| **Attribute** | One property of an Entity | ColumnDef + accessor |
| **Rule** | Validation, constraint, computation | Zod schema + functions |
| **Action** | State-changing operation | TanStack Mutation |
| **Relation** | Link between Entities | Cross-reference index |

### Entity

A logical group of data. Not tied to storage format.

```typescript
interface EntityConfig {
  id: string;                // "incidents"
  label: string;             // "Incidents"
  attributes: AttributeConfig[];
  rules: RuleConfig[];
  relations: RelationConfig[];
  hooks: HookConfig;         // lifecycle hooks
  template?: string;         // template for new records
  idPattern?: string;        // regex to extract ID from filename
}
```

### Attribute

One property of an Entity. Defines type, label, validation.

```typescript
interface AttributeConfig {
  name: string;              // "status"
  label: string;             // "Status"
  type: 'text' | 'select' | 'date' | 'number' | 'relation' | 'boolean' | 'url';
  required?: boolean;
  defaultValue?: string;
  options?: OptionConfig[];  // for select type
  bounded?: boolean;         // true = no free input
  computed?: string;         // expression for computed fields
  aliases?: string[];        // alternative frontmatter keys
  hooks?: FieldHookConfig;   // field-level hooks
}
```

### Rule Types

| Rule | Purpose | Example |
|------|---------|---------|
| `required` | Field must have value | `status`, `date` |
| `pattern` | Regex validation | email format |
| `range` | Min/max for numbers/dates | severity 1-4 |
| `unique` | Value unique within Entity | ID field |
| `transition` | Allowed state changes | Open → Investigating → Resolved |
| `computed` | Auto-calculated value | `age = daysSince(date)` |
| `immutable` | Cannot change after creation | `id`, `created_at` |

### Action Types

| Action | Purpose | Trigger |
|--------|---------|---------|
| `create` | New record from template | "New" button |
| `update` | Modify field(s) | Cell edit, form save |
| `delete` | Remove record | "Delete" button + confirm |
| `transition` | Status change with rule check | Status dropdown |
| `link` | Create relation | Relation picker |
| `duplicate` | Copy record | "Duplicate" menu item |
| `export` | Export to CSV/JSON | "Export" menu item |

### Relation Types

| Type | Cardinality | Example |
|------|-------------|---------|
| `reference` | 1:1 | incident.related_change → changes |
| `parent-child` | 1:N | problem → incidents |
| `many-to-many` | M:N | service ↔ hosts |

---

## Data Layer

Defines where and how data is physically stored. Logic Layer never touches
files/databases directly.

| Object | Description | Implementation |
|--------|-------------|----------------|
| **Source** | Physical storage medium | fs directory / csv / sqlite |
| **Collection** | Group of related records | Directory / CSV file / SQL table |
| **Field** | Physical column/key | Frontmatter key / CSV col / SQL col |
| **Index** | Search/performance cache | SQLite FTS5 / in-memory Map |
| **Adapter** | Translation layer | MarkdownAdapter / CsvAdapter / SqliteAdapter |

### Adapter Interface

```typescript
interface DataAdapter {
  list(collection: string, opts?: ListOptions): Promise<Record[]>;
  get(collection: string, id: string): Promise<Record | null>;
  create(collection: string, data: RecordData): Promise<Record>;
  update(collection: string, id: string, data: Partial<RecordData>): Promise<Record>;
  delete(collection: string, id: string): Promise<void>;
  search(query: string, opts?: SearchOptions): Promise<SearchResult[]>;
  count(collection: string, filter?: Filter): Promise<number>;
  watch?(collection: string, cb: (event: FileEvent) => void): void;
}
```

### Adapter Implementations

| Adapter | Source | Record = | Field = |
|---------|--------|----------|---------|
| `MarkdownAdapter` | fs directory | .md file | frontmatter key |
| `CsvAdapter` | .csv file | row | column header |
| `SqliteAdapter` | .db file | table row | SQL column |

### Index Strategy

```
Tier 1 (local):    No index. Scan files on each request. Fine for <500 files.
Tier 2 (server):   SQLite index rebuilt on startup + file watcher updates.
Tier 3 (enterprise): SQLite index + audit log + relation graph.
```

The index is always **rebuildable** from source files. Delete it → rebuilt on
next startup. It is a cache, never the source of truth.

---

## Config Layer

The `.muimark.yaml` file connects all layers simultaneously:

```yaml
folders:
  - id: incidents          # ← Entity ID (Logic)
    label: Incidents       # ← Widget label (Presentation)
    path: incidents        # ← Collection path (Data)
    type: markdown         # ← Adapter selection (Data)
    icon: warning          # ← Control config (Presentation)
    defaultView: grid      # ← Panel type (Presentation)
    idPattern: "^(I-\\d+)" # ← Rule: ID extraction (Logic)
    defaultSort:           # ← Widget behavior (Presentation)
      field: date
      dir: desc
    fields:                # ← Attributes (Logic) + Fields (Data) + Controls (Pres.)
      - name: status
        label: Status
        type: select
        required: true
        options:
          - { value: Open, color: warning }
          - { value: Closed, color: success }
    rules:                 # ← Rules (Logic)
      - type: transition
        field: status
        transitions:
          Open: [Investigating, Closed]
    hooks:                 # ← Lifecycle hooks (Logic)
      beforeCreate: hooks/incidents/beforeCreate.ts
      afterChange: hooks/incidents/afterChange.ts
    template: |            # ← Action config (Logic)
      ---
      status: Open
      ---
      # {{prefix}}{{nextId}}: {{title}}
```

One YAML block configures all 3 runtime layers. No code changes needed
to add a new entity.
