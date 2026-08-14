# Config Schema Reference

Complete `.muimark.yaml` specification.

---

## Full Schema

```yaml
# .muimark.yaml — placed in the root of your data directory

# ─── App metadata ─────────────────────────────────────
app:
  title: string              # Window/tab title
  theme: auto | light | dark # Color scheme
  locale: string             # e.g. "nl", "en"
  splash: string             # Landing page file path (relative)
  favicon: string            # Path to favicon

# ─── Deployment ───────────────────────────────────────
mode: auto | local | server | enterprise
  # auto: detects based on environment
  #   - no SQLite available → local
  #   - MUIMARK_AUTH=true → enterprise
  #   - otherwise → server

# ─── Storage config ───────────────────────────────────
storage:
  backend: fs | fs+sqlite    # fs = direct, fs+sqlite = with index
  index: string              # Path to SQLite index (default: .muimark/index.db)
  watch: boolean             # File watcher for live updates (default: true)

# ─── Git integration ─────────────────────────────────
git:
  enabled: boolean           # default: false
  autoCommit: boolean        # Commit on every save
  commitMessage: string      # Template: "{{user}}: update {{file}}"
  syncInterval: number       # Seconds between push/pull (0 = manual)
  remote: string             # Git remote name (default: origin)
  branch: string             # Branch to sync (default: main)

# ─── Auth (enterprise tier) ──────────────────────────
auth:
  enabled: boolean           # default: false
  providers: string[]        # [github, google, microsoft]
  roles:
    admin: string[]          # Email patterns: ["gius@example.com"]
    editor: string[]         # ["*@company.com"]
    viewer: string[]         # ["*"]
  permissions:
    admin: string[]          # [read, write, delete, config]
    editor: string[]         # [read, write]
    viewer: string[]         # [read]

# ─── Layout ──────────────────────────────────────────
layout:
  sidebar:
    width: number            # Pixels (default: 280)
    collapsible: boolean     # Can be collapsed (default: true)
    sections:                # Groupings in sidebar
      - label: string        # Section header text
        icon: string         # Material Icon name
        folders: string[]    # Array of folder IDs to show

# ─── Global Hooks ────────────────────────────────────
hooks:
  afterError: string         # Path to hook file
  afterChange: string        # Fires on any entity change
  afterCreate: string        # Fires on any entity create
  afterDelete: string        # Fires on any entity delete

# ─── Folders (Entity + Collection + Widget config) ───
folders:
  - id: string               # Unique identifier (used in URLs and refs)
    label: string            # Display name in UI
    path: string             # Relative path to data directory/file
    type: markdown | csv | sqlite-table  # Storage backend
    icon: string             # Material Icon name
    idPattern: string        # Regex to extract ID from filename
    defaultView: grid | kanban | timeline | cards  # Initial view
    defaultSort:
      field: string          # Field name to sort by
      dir: asc | desc        # Sort direction
    pageSize: number         # Records per page (default: 25)

    # ─── Field definitions ───────────────────────────
    fields:
      - name: string         # Key in frontmatter / CSV column / SQL column
        label: string        # Display label in grid header
        type: text | select | date | number | relation | boolean | url
        required: boolean    # Must have value (default: false)
        defaultValue: string # Value for new records
        options:             # For select type only
          - value: string    # The stored value
            color: string    # MUI palette: error|warning|info|success|default
            icon: string     # Optional Material Icon
        bounded: boolean     # true = only options allowed, no free text
        target: string       # For relation type: target folder ID
        aliases: string[]    # Alternative frontmatter keys (migration support)
        computed: string     # Expression for auto-calculated value
        hooks:               # Field-level hooks
          beforeValidate: string  # Path to hook file
          afterRead: string       # Path to hook file

    # ─── Validation rules ────────────────────────────
    rules:
      - type: required | pattern | range | unique | transition | computed | immutable
        field: string        # Which field this rule applies to
        # Additional properties per type:
        # pattern:    { regex: string, message: string }
        # range:      { min: number|string, max: number|string }
        # transition: { transitions: Record<string, string[]> }
        # computed:   { expression: string }

    # ─── Entity lifecycle hooks ──────────────────────
    hooks:
      beforeValidate: string # Path to .ts/.js file
      beforeCreate: string
      afterCreate: string
      beforeChange: string
      afterChange: string
      beforeDelete: string
      afterDelete: string
      beforeRead: string
      afterRead: string

    # ─── Template for new records ────────────────────
    template: string         # Multiline YAML string with placeholders:
                             # {{today}}, {{prefix}}, {{nextId}}, {{title}}, {{user}}

    # ─── Kanban view config ──────────────────────────
    kanban:
      groupBy: string        # Field to group cards by
      cardTitle: string      # Template: "{{id}}: {{title}}"
      cardFields: string[]   # Fields shown on card body

# ─── Cross-folder views ──────────────────────────────
views:
  - id: string               # Unique identifier
    label: string            # Display name
    icon: string             # Material Icon
    type: aggregate | timeline | chart
    sources:
      - folder: string       # Folder ID
        filter:              # Key-value filter
          field_name: string[] # Allowed values
    sort:
      field: string
      dir: asc | desc
    limit: number            # Max records to show

# ─── Plugins ─────────────────────────────────────────
plugins:
  mermaid: boolean           # Enable mermaid diagram rendering
  csv: boolean              # Enable CSV file support
  monaco: boolean           # Enable Monaco source editor (heavy)
```

---

## Minimal Config (auto-discover)

A `.muimark.yaml` with zero folders still works — muimark auto-discovers
all directories containing `.md` files:

```yaml
app:
  title: My Project
```

---

## Example: ITSM Config

```yaml
app:
  title: "Iron Legion ITSM"
  theme: auto
  locale: en

layout:
  sidebar:
    sections:
      - label: Operations
        icon: support_agent
        folders: [incidents, changes, runbooks]
      - label: Infrastructure
        icon: dns
        folders: [hosts, services]

folders:
  - id: incidents
    label: Incidents
    path: docs/itsm/incidents
    icon: warning
    idPattern: "^(I-\\d+)"
    defaultSort: { field: date, dir: desc }
    fields:
      - name: status
        label: Status
        type: select
        required: true
        options:
          - { value: Open, color: warning }
          - { value: Investigating, color: info }
          - { value: Resolved, color: success }
          - { value: Closed, color: success }
      - name: severity
        label: Severity
        type: select
        bounded: true
        options:
          - { value: Critical, color: error }
          - { value: High, color: warning }
          - { value: Medium, color: info }
          - { value: Low, color: success }
      - name: date
        label: Date
        type: date
        defaultValue: today
    rules:
      - type: transition
        field: status
        transitions:
          Open: [Investigating, Closed]
          Investigating: [Resolved, Open]
          Resolved: [Closed, Open]
          Closed: []
    hooks:
      afterCreate: hooks/incidents/notify-slack.ts
    template: |
      ---
      status: Open
      severity: Medium
      date: {{today}}
      ---
      # {{prefix}}{{nextId}}: {{title}}

      ## Impact

      ## Timeline
```
