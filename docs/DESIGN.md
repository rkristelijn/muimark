# Muimark — Master Design Document

> Config-driven markdown management UI.
> Point it at any folder, get a full-featured dashboard.

---

## 1. Drivers

| Driver | Description |
|--------|-------------|
| **Vendor lock-in** | Toolpad abandoned, MUI DataGrid Pro paid, Siebel proprietary |
| **Data ownership** | Files in git, readable without tool, no database required |
| **Flexibility** | One tool for ITSM, CRM, project tracking, CMDB — config only |
| **Developer workflow** | `npx muimark` from any directory, zero setup |
| **Scale spectrum** | Same codebase: local laptop → server → enterprise multi-user |

---

## 2. Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|------------|----------|
| FR-01 | Render UI entirely from YAML config + filesystem | Must |
| FR-02 | Support markdown files with YAML frontmatter | Must |
| FR-03 | Support CSV files as data source | Must |
| FR-04 | Support SQLite tables for large datasets | Should |
| FR-05 | Auto-discover folders without explicit config | Must |
| FR-06 | Editable grid cells sync with frontmatter | Must |
| FR-07 | WYSIWYG + source mode markdown editor | Must |
| FR-08 | Cross-reference links between records (I-012 → SC-003) | Must |
| FR-09 | Full-text search across all records | Must |
| FR-10 | Auto-numbering of new records (I-001, SC-042) | Should |
| FR-11 | Status transition rules (state machine) | Should |
| FR-12 | Kanban view grouped by field value | Should |
| FR-13 | Templates for new records | Should |
| FR-14 | Column visibility/ordering persisted per folder | Should |
| FR-15 | Dark/light theme switching | Must |
| FR-16 | Keyboard-first navigation | Should |
| FR-17 | `npx muimark` works from any directory | Must |
| FR-18 | Docker deployment with volume mount | Must |
| FR-19 | Multi-user auth (GitHub/Google/Microsoft) | Could |
| FR-20 | RBAC per folder (viewer/editor/admin) | Could |
| FR-21 | Git auto-commit on save with user attribution | Could |
| FR-22 | Audit trail (who changed what when) | Could |
| FR-23 | Lifecycle hooks (before/after CRUD operations) | Could |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|------------|--------|
| NFR-01 | Page load (local, <100 files) | < 500ms |
| NFR-02 | Page load (server, <10k files) | < 2s |
| NFR-03 | File save latency | < 200ms |
| NFR-04 | Bundle size (client JS) | < 500KB gzipped |
| NFR-05 | Max file size per component | 200 lines (CPM enforced) |
| NFR-06 | Max files per directory | 12 (CPM enforced) |
| NFR-07 | Zero runtime dependencies beyond npm install | Yes |
| NFR-08 | Works offline (no external API calls) | Yes |
| NFR-09 | Data readable without muimark | Yes (plain files) |
| NFR-10 | Accessibility (WCAG 2.1 AA) | Must |

---

## 3. Design Principles

| # | Principle | Implication |
|---|-----------|-------------|
| 1 | **Files are the database** | No SQLite/Postgres for primary storage |
| 2 | **Config over code** | New entity = YAML, not TypeScript |
| 3 | **Layers never skip** | Presentation → Logic → Data, always |
| 4 | **Index is disposable** | Delete SQLite → rebuilt on startup |
| 5 | **Progressive enhancement** | Local works without SQLite/auth/git |
| 6 | **Zero lock-in** | Data readable without muimark running |
| 7 | **Keyboard-first** | Every action reachable without mouse |
| 8 | **RTFM** | Read framework docs before writing code |
| 9 | **Small files** | Max 200 LOC, extract when growing |
| 10 | **Explicit over magic** | No hidden behavior, config is declarative |

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER          Screen → Panel → Widget → Control   │
└────────────────────────────────┬────────────────────────────────┘
                                 │ binds to
┌────────────────────────────────▼────────────────────────────────┐
│  LOGIC LAYER                   Entity → Attribute → Rule → Action│
└────────────────────────────────┬────────────────────────────────┘
                                 │ reads/writes via
┌────────────────────────────────▼────────────────────────────────┐
│  DATA LAYER                    Source → Collection → Adapter     │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  CONFIG LAYER (cross-cutting)  .muimark.yaml drives all layers   │
└─────────────────────────────────────────────────────────────────┘
```

Detailed documentation in sub-documents:

| Document | Contents |
|----------|----------|
| [design/object-model.md](design/object-model.md) | Full 4-layer object model with all object types |
| [design/deployment.md](design/deployment.md) | Deployment tiers, tech stack, Docker, npx |
| [design/config-schema.md](design/config-schema.md) | Complete YAML config reference |
| [design/quality.md](design/quality.md) | RTFM, CPM rules, directory structure, layer deps |
| [design/data-flow.md](design/data-flow.md) | Read/write/search flows across layers |
| [design/lifecycle-hooks.md](design/lifecycle-hooks.md) | Before/after hooks on CRUD operations |
| [design/gap-analysis.md](design/gap-analysis.md) | Current vs target code mapping + migration gaps |
| [design/migration-plan.md](design/migration-plan.md) | Step-by-step refactoring plan (41 commits, 13 phases) |

---

## 5. Migration Path

See [refactor-plan.md](refactor-plan.md) for detailed steps. Summary:

| Phase | Goal | Effort |
|-------|------|--------|
| 1 | Demo data + decouple from iron-legion | 30 min |
| 2 | Extract state hooks | 2.5 hr |
| 3 | Stateless presentational components | 4 hr |
| 4 | Layer separation (presentation/logic/data) | 2 hr |
| 5 | DataAdapter interface + MarkdownAdapter | 1 hr |
| 6 | Config schema validation (Zod) | 1 hr |
| 7 | CPM level 3 + custom checks | 30 min |
| 8 | Docker standalone build | 30 min |
| 9 | SQLite index (optional tier 2) | 2 hr |
| 10 | Auth + RBAC (optional tier 3) | 3 hr |
| 11 | Lifecycle hooks system | 2 hr |

**Total: ~19 hours** spread over multiple sessions.

---

## 6. Decision Log

| Date | Decision | Rationale | ADR |
|------|----------|-----------|-----|
| 2026-07-19 | MUI + custom layout (no Toolpad) | Toolpad abandoned | ADR-001 |
| 2026-07-19 | TanStack Table (no DataGrid Pro) | Free, headless, MIT | ADR-002 |
| 2026-08-14 | Layered object model (4 layers) | Separation of concerns | This doc |
| 2026-08-14 | Config-driven UI (no code per entity) | Scalability, flexibility | This doc |
| 2026-08-14 | SQLite as disposable index only | Files = source of truth | This doc |
| 2026-08-14 | 3 deployment tiers (local/server/enterprise) | Same codebase, progressive | This doc |
| 2026-08-14 | Lifecycle hooks (Payload CMS pattern) | Extensibility without core changes | This doc |
