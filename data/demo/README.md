# Muimark Demo

Welcome to Muimark — a local-first, file-based CRUD UI for markdown files.

## What you're looking at

This is a demo dataset showing ITSM (IT Service Management) content:

- **Incidents** — Service disruptions and their resolution
- **Changes** — Planned modifications to infrastructure
- **Runbooks** — Step-by-step operational procedures
- **Services** — Service catalog with status tracking

## How it works

1. Each folder in the sidebar maps to a directory of markdown files
2. Files have YAML frontmatter for structured fields (status, severity, dates)
3. The grid shows all files with editable fields
4. Click a file to edit the markdown content
5. Changes auto-save after 1 second of inactivity

## Configuration

See `.muimark.yaml` in this directory for the folder/field configuration.
