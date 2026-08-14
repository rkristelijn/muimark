# Markdown Rendering — Gap Analysis & Implementation Plan

## Status

| Field | Value |
|-------|-------|
| Status | Implemented (Phase 1-3) |
| Date | 2026-08-14 |
| Priority | Image paste (#1), then incremental GFM parity |

---

## 1. Goal

GitHub/GitLab-level markdown rendering in WYSIWYG mode via MDXEditor.
All standard GFM features should work in the editor, with **image paste/drop** as the highest priority.

---

## 2. Current State (after implementation)

### Active MDXEditor Plugins

```typescript
plugins={[
  headingsPlugin(),
  listsPlugin(),
  quotePlugin(),
  markdownShortcutPlugin(),
  thematicBreakPlugin(),
  linkPlugin(),
  tablePlugin(),
  imagePlugin({ imageUploadHandler }),
  codeBlockPlugin({ defaultCodeBlockLanguage: 'text' }),
  codeMirrorPlugin({ codeBlockLanguages: { /* 20 languages */ } }),
  directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
  diffSourcePlugin({ viewMode: 'rich-text' }),
  toolbarPlugin({ ... }),
]}
```

### What works ✅

| Feature | Plugin |
|---------|--------|
| Headings (H1-H6) | `headingsPlugin` |
| Bold / Italic / Underline | built-in |
| Blockquotes | `quotePlugin` |
| Ordered/unordered lists | `listsPlugin` |
| Task lists (checkboxes) | `listsPlugin` |
| Links | `linkPlugin` |
| Tables | `tablePlugin` |
| Code blocks (20 languages) | `codeBlockPlugin` + `codeMirrorPlugin` |
| Thematic breaks | `thematicBreakPlugin` |
| Images (paste/drop/insert) | `imagePlugin` |
| Source/WYSIWYG toggle | `diffSourcePlugin` |
| Admonitions (:::note etc.) | `directivesPlugin` |
| Mermaid (standalone editor) | custom `MermaidEditor` component |

---

## 3. Gap Analysis — Remaining Features

### Priority 1 — Must Have (GitHub/GitLab baseline)

| # | Feature | GitHub | GitLab | Status | Effort |
|---|---------|--------|--------|--------|--------|
| **G1** | **Images (paste/drop/insert)** | ✅ | ✅ | ✅ Done | — |
| G2 | Strikethrough (`~~text~~`) | ✅ | ✅ | ❌ Custom Lexical node needed | M |
| G3 | Autolink URLs | ✅ | ✅ | ❌ `linkPlugin` config | S |
| G4 | Syntax highlighting (all languages) | ✅ | ✅ | ✅ Done (20 languages) | — |
| G5 | Source/WYSIWYG toggle | ✅ | ✅ | ✅ Done | — |

### Priority 2 — Should Have (extended GFM)

| # | Feature | GitHub | GitLab | Status | Effort |
|---|---------|--------|--------|--------|--------|
| G6 | Alerts/Admonitions (`> [!NOTE]`) | ✅ | ✅ (`:::note`) | ✅ Done | — |
| G7 | Footnotes (`[^1]`) | ✅ | ✅ | ❌ Custom plugin needed | L |
| G8 | Mermaid inline in document | ✅ | ✅ | ❌ Custom codeBlock renderer | L |
| G9 | Collapsed sections (`<details>`) | ✅ | ✅ | ❌ Requires HTML support | M |
| G10 | Inline HTML (subset) | ✅ | ✅ | Partial (suppressHtmlProcessing removed) | S |

### Priority 3 — Nice to Have

| # | Feature | GitHub | GitLab | Approach | Effort |
|---|---------|--------|--------|----------|--------|
| G11 | Math/LaTeX (`$...$`) | ✅ | ✅ | Custom plugin + KaTeX | L |
| G12 | Emoji shortcodes (`:rocket:`) | ✅ | ✅ | Custom autocomplete plugin | M |
| G13 | Table of Contents | ✅ | ✅ | UI feature (not editor-internal) | M |
| G14 | Diff code blocks (` ```diff `) | ✅ | ✅ | ✅ Done (CodeMirror diff language) | — |

---

## 4. Image Paste Architecture (G1) — Implemented

### 4.1 Storage Strategy

Images are stored alongside the markdown file using the fileId as prefix:

```
incidents/
├── I-012-keyboard-fix.md
├── I-012-keyboard-fix.screenshot-a3f7.png
├── I-012-keyboard-fix.diagram-bc12.jpg
└── I-013-network-timeout.md
```

Benefits:
- Everything stays together — `git rm incidents/I-012*` cleans up all assets
- No separate `.assets/` directory
- Works standalone (relative paths, no API URL dependency)

### 4.2 Upload Flow

```
User pastes/drops image in editor
    │
    ▼
imagePlugin({ imageUploadHandler }) → createImageUploadHandler(folderId, fileId)
    │
    │  FormData: image + folderId + fileId
    ▼
POST /api/images/upload
    │
    │  Saves to: <folderPath>/<fileId>.<sanitized-name>-<4char-uuid>.<ext>
    ▼
Returns URL: /api/images/<folderId>/<imageFilename>
    │
    ▼
Markdown: ![alt](/api/images/incidents/I-012-keyboard-fix.screenshot-a3f7.png)
```

### 4.3 Serving

`GET /api/images/<folderId>/<filename>` resolves via `getFolderDef()` → serves with correct MIME type, immutable cache headers, and directory traversal protection.

### 4.4 Security

- Allowed types: PNG, JPEG, GIF, WebP, SVG only
- Max size: 10MB
- Filename sanitization (special chars → underscore)
- Directory traversal blocked (path must stay within folder)
- Only image extensions served (rejects .md, .ts, etc.)

---

## 5. Implementation Phases

### Phase 1: Images ✅ Done

- Upload API route with folderId/fileId context
- Serving API route with folder resolution
- `imagePlugin` activated with upload handler
- `InsertImage` in toolbar
- 19 unit tests + e2e test

### Phase 2: Quick Wins ✅ Done

- Source/WYSIWYG toggle (`diffSourcePlugin`)
- 20 languages syntax highlighting
- Removed `suppressHtmlProcessing`

### Phase 3: Admonitions ✅ Done

- `directivesPlugin` + `AdmonitionDirectiveDescriptor`
- Slash commands updated to `:::note` syntax

### Phase 4: Mermaid Inline (backlog)

| Step | Task | Approach |
|------|------|----------|
| 4.1 | Custom CodeBlock renderer for mermaid | Detect ` ```mermaid ` → render SVG inline |
| 4.2 | Toggle: rendered diagram vs code editor | Click-to-edit pattern |
| 4.3 | Remove separate mermaid route (optional) | Or keep as standalone tool |

### Phase 5: Advanced (backlog)

| Feature | Approach |
|---------|----------|
| Footnotes (G7) | Custom MDXEditor plugin with remark-footnotes |
| Math/LaTeX (G11) | Custom plugin + KaTeX rendering |
| Emoji autocomplete (G12) | Lexical autocomplete node |
| Collapsed sections (G9) | HTML `<details>` support |
| Strikethrough (G2) | Custom Lexical TextFormatType or DecoratorNode |

---

## 6. MDXEditor Plugin Architecture

MDXEditor is built on Lexical (Facebook's editor framework). Each plugin registers:
- **Markdown import/export visitors** — markdown AST ↔ Lexical nodes
- **Lexical nodes** — custom DOM representations
- **Toolbar components** — UI controls

```
┌─────────────────────────────────────────────────┐
│  MDXEditor                                      │
│  ┌───────────────────────────────────────────┐  │
│  │  Lexical Editor (contentEditable)         │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │  │
│  │  │Image│ │Table│ │Code │ │Admon│ ...     │  │
│  │  │Node │ │Node │ │Node │ │Node │         │  │
│  │  └─────┘ └─────┘ └─────┘ └─────┘        │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  Toolbar                                  │  │
│  │  [B] [I] [U] [🔗] [📷] [📊] [≡] [</>]   │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  Plugin Registry                          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────┐  │  │
│  │  │ remark   │  │ Lexical  │  │Toolbar │  │  │
│  │  │ visitors │  │ nodes    │  │ items  │  │  │
│  │  └──────────┘  └──────────┘  └────────┘  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

Custom plugins require knowledge of three frameworks simultaneously:
1. Lexical node model
2. mdast (markdown AST)
3. Gurx (MDXEditor's state management)

The `diffSourcePlugin` (source mode) serves as an escape hatch for any markdown syntax that doesn't have a WYSIWYG implementation yet.

---

## 7. Conclusion: Is MDXEditor the right choice?

**Yes, for WYSIWYG editing MDXEditor is the right library.**

| Criterion | Assessment |
|-----------|------------|
| WYSIWYG markdown editing | ✅ Core functionality |
| Image paste/drop | ✅ Built-in via `imagePlugin` |
| Plugin architecture | ✅ Extensible (Lexical-based) |
| Tables, code, lists | ✅ Complete |
| Admonitions/Callouts | ✅ Via `directivesPlugin` |
| Source mode fallback | ✅ Via `diffSourcePlugin` |
| Actively maintained | ✅ v4.x, regular releases |
| React 19 compatible | ✅ |
| Strikethrough/Footnotes/Math | ⚠️ Custom plugins needed |

The remaining gaps (strikethrough, footnotes, math) are edge cases solvable via custom plugins or the source-mode fallback. For 95% of use cases (including image paste), MDXEditor covers everything with built-in plugins.

**No library switch needed.** Source mode catches everything that doesn't render in WYSIWYG — exactly like GitHub's own editor has two modes.

---

## 8. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Image folder clutter | Low | fileId prefix keeps them grouped, gitignore if needed |
| Image URLs break on dataDir move | Low | Relative paths within folder |
| Strikethrough not native in MDXEditor | Low | Source mode as fallback |
| Performance with large markdown files | Medium | Lazy loading, virtualized editor |
| MDXEditor breaking changes (major) | Low | Pin version, test on upgrade |
