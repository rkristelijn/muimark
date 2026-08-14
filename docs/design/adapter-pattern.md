# Adapter Pattern — Expansion Plan

## Status

| Field | Value |
|-------|-------|
| Status | Draft |
| Date | 2026-08-14 |

---

## 1. Current State

### Existing adapters

| Adapter | File | Wraps | Interface |
|---------|------|-------|-----------|
| DataAdapter (markdown) | `src/data/adapters/markdown.ts` | fs + gray-matter | `DataAdapter` |
| GitMetaAdapter | `src/data/adapters/git-meta.ts` | child_process (git) | no formal interface |
| TimeManager | `src/logic/time.ts` | dayjs | loose functions |

### Direct library imports (no adapter)

| Library | Locations | Risk |
|---------|-----------|------|
| `js-yaml` | config/loader.ts, columns/route.ts, csv.ts | 3 places to change on switch |
| `gray-matter` | markdown.ts, relations.ts | Parse/stringify logic scattered |
| `papaparse` | shared/lib/csv.ts | 1 place, but no formal interface |
| `mermaid` | plugins/mermaid/ | Already isolated as plugin |
| Image I/O | api/images/upload, api/images/[...path] | Logic in route handlers |

---

## 2. Proposed Adapters

### 2.1 ImageAdapter

**Wraps:** Filesystem image storage (now), S3/R2 (later)

```typescript
// src/data/adapters/types.ts (extend)
export interface ImageAdapter {
  /** Store an image, returns the serving URL */
  store(folderId: string, fileId: string, file: File): Promise<string>;

  /** Resolve a stored image to a readable buffer */
  resolve(folderId: string, filename: string): Promise<{ buffer: Buffer; mimeType: string } | null>;

  /** Delete all images for a given file */
  deleteByPrefix(folderId: string, fileId: string): Promise<void>;
}
```

**Implementation:** `src/data/adapters/image-fs.ts`

- Extract logic from `api/images/upload/route.ts` and `api/images/[...path]/route.ts`
- Routes become thin wrappers calling the adapter
- Later: `image-s3.ts` as alternative implementation

**Benefit:** Routes become testable without filesystem, image cleanup on file delete.

---

### 2.2 YamlAdapter

**Wraps:** `js-yaml` (parse + stringify)

```typescript
// src/data/adapters/yaml.ts
export interface YamlAdapter {
  /** Parse YAML string to object */
  parse<T = Record<string, unknown>>(input: string): T;

  /** Stringify object to YAML */
  stringify(data: unknown): string;

  /** Load and parse a YAML file */
  loadFile<T = Record<string, unknown>>(filePath: string): T | null;
}
```

**Implementation:** `src/data/adapters/yaml.ts`

- Replaces direct `import * as yaml from "js-yaml"` in 3 places
- Adds error handling (js-yaml throws cryptic errors by default)
- Later swappable to TOML, JSON5, or native YAML parser

**Benefit:** Consistent error handling, single place to adjust parsing behavior.

---

### 2.3 FrontmatterAdapter

**Wraps:** `gray-matter` (parse frontmatter + content)

```typescript
// src/data/adapters/frontmatter.ts
export interface FrontmatterResult {
  frontmatter: Record<string, unknown>;
  content: string;
  raw: string;
}

export interface FrontmatterAdapter {
  /** Parse markdown with YAML frontmatter */
  parse(raw: string): FrontmatterResult;

  /** Combine frontmatter + content back to markdown string */
  stringify(frontmatter: Record<string, unknown>, content: string): string;
}
```

**Implementation:** `src/data/adapters/frontmatter.ts`

- Replaces direct `gray-matter` imports in markdown.ts and relations.ts
- Centralizes frontmatter normalization (date parsing, null handling)
- Enables TOML frontmatter (`+++`) support later

**Benefit:** Frontmatter logic in one place, easier to test.

---

### 2.4 CsvAdapter

**Wraps:** `papaparse` (parse + generate CSV)

```typescript
// src/data/adapters/csv.ts
export interface CsvAdapter {
  /** Parse CSV string to rows */
  parse(input: string): { headers: string[]; rows: Record<string, string>[] };

  /** Generate CSV string from rows */
  stringify(headers: string[], rows: Record<string, string>[]): string;

  /** Read a CSV file */
  readFile(filePath: string): { headers: string[]; rows: Record<string, string>[] } | null;

  /** Write rows to a CSV file */
  writeFile(filePath: string, headers: string[], rows: Record<string, string>[]): void;
}
```

**Implementation:** Formalize `src/shared/lib/csv.ts` as `src/data/adapters/csv.ts`

**Benefit:** Fits the same adapter structure, testable, swappable to streaming parser for large files.

---

### 2.5 SearchAdapter

**Wraps:** Current grep-in-memory search

```typescript
// src/data/adapters/search.ts
export interface SearchAdapter {
  /** Full-text search across all content */
  search(query: string, options?: { folderId?: string; limit?: number }): SearchResult[];

  /** Index a file (for adapters that maintain an index) */
  index?(folderId: string, fileId: string, content: string): void;

  /** Remove a file from the index */
  remove?(folderId: string, fileId: string): void;
}
```

**Implementation:**
- `src/data/adapters/search-grep.ts` — current approach (scan all files)
- Later: `search-flexsearch.ts` (in-memory index) or `search-sqlite.ts` (FTS5)

**Benefit:** Improve search performance without touching the rest of the codebase.

---

## 3. Implementation Order

| # | Adapter | Effort | Impact | Reason |
|---|---------|--------|--------|--------|
| 1 | ImageAdapter | S | High | Logic currently in route handlers, needs extraction |
| 2 | FrontmatterAdapter | S | Medium | 2 locations, easy extract |
| 3 | YamlAdapter | S | Medium | 3 locations, trivial wrapper |
| 4 | CsvAdapter | S | Low | Already semi-isolated |
| 5 | SearchAdapter | M | High | Enabler for performance improvement |

---

## 4. Pattern Conventions

### File structure
```
src/data/adapters/
├── types.ts              ← all interfaces
├── markdown.ts           ← DataAdapter implementation
├── git-meta.ts           ← git metadata
├── image-fs.ts           ← ImageAdapter (filesystem)
├── frontmatter.ts        ← FrontmatterAdapter
├── yaml.ts              ← YamlAdapter
├── csv.ts               ← CsvAdapter
└── search-grep.ts       ← SearchAdapter (current)
```

### Rules
1. **Interface in types.ts** — all adapters define their contract here
2. **No direct library imports outside adapters** — only adapters import third-party libs
3. **Logic layer imports only interfaces** — never the concrete implementation
4. **1 adapter per concern** — don't mix (no YAML parsing in the markdown adapter)
5. **Testable via mock** — every adapter interface is mockable for unit tests

### Import pattern
```typescript
// ❌ Don't
import matter from "gray-matter";
import * as yaml from "js-yaml";

// ✅ Do
import { frontmatterAdapter } from "@/data/adapters/frontmatter";
import { yamlAdapter } from "@/data/adapters/yaml";
```

---

## 5. Relationship with TimeManager

TimeManager (`src/logic/time.ts`) follows the same pattern but lives in the logic layer because it does no I/O. Data adapters live in the data layer because they perform I/O (filesystem, git, network).

```
┌─────────────────────────────────────────────────┐
│  Logic Layer                                    │
│  ┌────────────┐                                │
│  │TimeManager │ ← wraps dayjs (no I/O)         │
│  └────────────┘                                │
├─────────────────────────────────────────────────┤
│  Data Layer                                     │
│  ┌──────────┐ ┌───────────┐ ┌──────────────┐  │
│  │Markdown  │ │Image (fs) │ │Search (grep) │  │
│  │Adapter   │ │Adapter    │ │Adapter       │  │
│  └──────────┘ └───────────┘ └──────────────┘  │
│  ┌──────────┐ ┌───────────┐ ┌──────────────┐  │
│  │Frontmatter│ │YAML      │ │CSV           │  │
│  │Adapter   │ │Adapter    │ │Adapter       │  │
│  └──────────┘ └───────────┘ └──────────────┘  │
├─────────────────────────────────────────────────┤
│  External                                       │
│  gray-matter │ js-yaml │ papaparse │ dayjs     │
│  fs/path     │ child_process (git) │ mermaid   │
└─────────────────────────────────────────────────┘
```
