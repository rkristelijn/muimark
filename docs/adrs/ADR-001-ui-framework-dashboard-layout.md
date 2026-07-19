# ADR-001: UI Framework & Dashboard Layout

**Status**: Accepted  
**Date**: 2026-07-19  
**Context**: The current itsm app uses basic MUI components with a custom Drawer sidebar. Toolpad Core (used by automater) provided a polished out-of-the-box dashboard experience but is no longer actively maintained.

## Problem

MUI Toolpad Core provided:
- **DashboardLayout** — sidebar + topbar in a single component
- **Navigation** — declarative config (segments, icons, titles)
- **PageContainer** — breadcrumbs, title, actions
- **CRUD components** — DataGrid + forms
- **AppProvider** — theme, auth, routing in one wrapper
- **Notifications & Dialogs** — via hooks (`useNotifications`, `useDialogs`)
- **Persistent State** — saving user preferences
- **Theme switching** — dark/light mode toggle out-of-the-box

The current itsm UI lacks: AppBar/TopBar, theme switching, breadcrumbs, notifications, and looks "functional but basic" compared to automater's Toolpad-based UI.

## Options Considered

### Option A: Use MUI Toolpad Core as-is

The package still exists and works.

| Pro | Con |
|-----|-----|
| Least effort, proven pattern | ⚠️ **Not actively maintained** |
| Exactly what automater does | No bugfixes or new features |
| DashboardLayout, Navigation, PageContainer out-of-the-box | Risk of incompatibility with future MUI/Next.js versions |
| | React 19 / Next.js 16 compat uncertain long-term |

**Effort**: ~2 hours  
**Risk**: High in the medium-term (6-12 months)

---

### Option B: MUI CRUD Dashboard Template (copy-paste)

MUI's officially recommended alternative. A free template with sidebar, navigation, CRUD pages that you copy and adapt.

| Pro | Con |
|-----|-----|
| Officially recommended by MUI as Toolpad replacement | Copy-paste, no npm package — you maintain it yourself |
| Uses the same MUI components we already have | Fewer features than Toolpad (no Notifications, Dialogs hooks) |
| No extra dependency | One-time snapshot, no updates |
| Full control | Layout/theming built manually (more code) |

**Effort**: ~4-8 hours  
**Risk**: Low (it's just MUI code we already know)

---

### Option C: react-admin (Marmelab)

Full-featured admin framework. 26k GitHub stars, weekly bugfixes, monthly new features. MUI-based. Enterprise-proven.

| Pro | Con |
|-----|-----|
| Most mature solution (10+ years) | **Opinionated** — wants to structure your entire app |
| CRUD, DataGrid, forms, filters, auth, RBAC, i18n | Overkill for markdown-backed ITSM? |
| Layout system (sidebar, breadcrumbs, menus) | Lock-in with their Data Provider pattern |
| Headless core (`ra-core`) if you only want hooks | SPA-first, Next.js App Router is secondary |
| `shadcn-admin-kit` variant available | Learning curve |
| Actively maintained, sustainable business model | Enterprise features (realtime, audit) are paid |

**Effort**: ~1-2 days (refactor to react-admin patterns)  
**Risk**: Medium (vendor lock-in on their abstractions)

---

### Option D: Refine.dev

React meta-framework for CRUD apps. 34.8k stars. Supports MUI, Ant Design, Chakra, Mantine.

| Pro | Con |
|-----|-----|
| MUI integration available | Another abstraction layer on top of MUI |
| CRUD-focused, data provider concept | Next.js App Router support is mediocre (Vite-first) |
| Headless core | Less mature than react-admin |
| Many templates/examples | Community-driven, no paid team behind it |

**Effort**: ~1-2 days  
**Risk**: Medium

---

### Option E: Build custom layout with MUI (improve current approach)

Improve the current custom MUI layout step by step. Add AppBar, theme switching, breadcrumbs, and notifications as custom components.

| Pro | Con |
|-----|-----|
| Maximum control, no extra dependencies | More work |
| Perfect fit for Next.js App Router | Must build each piece yourself |
| No vendor lock-in | Risk of inconsistencies if rushed |
| Educational | No "out of the box wow" moment |
| Can be done incrementally | |

**Effort**: ~6-12 hours (for full DashboardLayout equivalent)  
**Risk**: Low

---

## Decision

**Option B (MUI CRUD Dashboard Template)** as a base, supplemented with **Option E** for custom pieces.

### Rationale:

1. **MUI themselves recommend this** as a Toolpad replacement — it's the official migration path
2. **No new dependency** — we already use MUI v9, this is just more MUI
3. **Next.js App Router native** — no SPA framework fighting against App Router
4. **Copy-paste = full control** — we take the layout/navigation part and leave the rest
5. **Incremental** — we can introduce it sidebar-by-sidebar without a big-bang refactor
6. **Toolpad-like experience** without the risk of a dead project

### Why NOT react-admin or Refine:

- itsm is a **markdown-backed** tool with a file-system as "database" — react-admin/Refine expect a REST/GraphQL API with standard CRUD semantics
- We want **Next.js App Router** as routing — react-admin is SPA-first with its own router
- The app is small enough that a full framework is overkill
- We'd lose control over the architecture we just carefully feature-sliced

## Consequences

- We build ~4-6 custom layout components (AppBar, DashboardLayout, PageContainer, ThemeToggle, NotificationProvider, NavigationConfig)
- These live in `src/shared/ui/`
- The Sidebar refactors from a standalone Drawer into part of DashboardLayout
- The look & feel becomes comparable to what Toolpad provided
- No lock-in on a dead project or an opinionated framework
