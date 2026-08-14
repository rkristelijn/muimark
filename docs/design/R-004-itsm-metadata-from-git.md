---
status: Requested
priority: Medium
aangemaakt: "2026-07-23"
---

# R-004: Auto-populate ITSM frontmatter from git history

**Status:** Requested
**Created:** 2026-07-23

## Problem

Many markdown files in the iron-legion repo lack complete YAML frontmatter (status, priority, dates). The ITSM dashboard (`itsm.gius.nl`) shows these files without proper metadata, making sorting/filtering useless.

Additionally, the dashboard shows all subdirectories as flat folders (infra/ansible, tools/nanobot, etc.) mixed in with ITSM folders.

## Proposed Solution

### 1. Script: `scripts/itsm-metadata.sh`

For each markdown file in incidents/, changes/, problems/:

- `aangemaakt`: first git commit date of the file
- `afgerond`: last git commit date (if status contains "Resolved"/"Closed")
- `status`: infer from content (grep for keywords)
- `priority`: infer from frontmatter or filename patterns

```bash
# Pseudocode
for file in incidents/*.md changes/*.md problems/*.md; do
  CREATED=$(git log --diff-filter=A --format=%aI -- "$file" | tail -1)
  LAST_MODIFIED=$(git log -1 --format=%aI -- "$file")
  STATUS=$(grep -m1 'Status.*:' "$file" | sed 's/.*: //')
  # Inject/update frontmatter
done
```

### 2. Fix ITSM dashboard folder discovery

The app should only show folders explicitly defined in `.config/itsm.yaml`, not auto-discover every subdirectory. This is likely a config flag (`autoDiscover: false`) or a code fix in the folder scanning logic.

## Acceptance Criteria

- [ ] All incidents have `aangemaakt` date from git history
- [ ] All changes have `aangemaakt` and `afgerond` dates
- [ ] Status is correctly inferred for files that have it in the body but not frontmatter
- [ ] ITSM dashboard only shows configured folders (no infra/ansible/tools noise)
- [ ] Script is idempotent (running twice doesn't duplicate frontmatter)

## Related

- `itsm.gius.nl` — ITSM dashboard (muimark Next.js app)
- `.config/itsm.yaml` — folder configuration
- SC-020 (bulk upgrade) — created I-020 and SC-020 without all frontmatter fields
