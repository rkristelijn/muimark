# Deployment & Tech Stack

---

## Deployment Tiers

```
┌──────────────┬──────────────────┬───────────────────────────────┐
│  LOCAL       │  SERVER          │  ENTERPRISE                   │
├──────────────┼──────────────────┼───────────────────────────────┤
│ npx muimark  │ Docker + volume  │ Docker + Auth + Git sync      │
│ fs direct    │ fs + SQLite idx  │ fs + SQLite + RBAC + audit    │
│ 1 user       │ 1 user           │ Multi-user                    │
│ < 500 files  │ < 10k files      │ < 100k files                  │
│ No auth      │ No auth          │ NextAuth (GitHub/Google/MS)   │
│ Manual git   │ Manual git       │ Auto-commit + sync            │
└──────────────┴──────────────────┴───────────────────────────────┘
```

### Local

```bash
npx muimark ~/git/my-project
npx muimark --dev                    # hot reload
npx muimark --port 4000              # custom port
npx muimark --config ./custom.yaml   # explicit config
```

### Server

```bash
docker run -v ~/git/docs:/data -p 3000:3000 ghcr.io/rkristelijn/muimark
```

### Enterprise

```yaml
# docker-compose.yaml
services:
  muimark:
    image: ghcr.io/rkristelijn/muimark:latest
    volumes:
      - ./data:/data
    environment:
      MUIMARK_MODE: enterprise
      MUIMARK_AUTH: "true"
      MUIMARK_GIT_REMOTE: git@github.com:org/docs.git
    ports:
      - "3000:3000"
    restart: unless-stopped
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 16 (App Router) | SSR + API routes + file serving |
| UI Components | MUI 9 | Material Design, accessible, themeable |
| Grid Engine | TanStack Table v8 | Headless, MIT, all DataGrid Pro features free |
| Data Fetching | TanStack Query v5 | Cache, invalidation, optimistic updates |
| Editor | MDXEditor | WYSIWYG markdown, plugin system |
| Frontmatter | gray-matter | Parse/stringify YAML frontmatter |
| Config | js-yaml | Parse .muimark.yaml |
| CSV | papaparse | Parse/stringify CSV |
| SQLite | better-sqlite3 (optional) | Index + FTS5 + audit |
| Validation | zod | Schema validation for Rules |
| Auth | NextAuth.js (optional) | Enterprise tier only |
| Diagrams | mermaid | Embedded diagram support |

### What We Do NOT Use

| Rejected | Reason |
|----------|--------|
| MUI Toolpad | Abandoned, no maintenance |
| MUI X DataGrid Pro | Paid license ($180/dev/yr) |
| react-admin / Refine | Overkill, SPA-first, vendor lock-in |
| Prisma / Drizzle | No RDBMS needed, files are the database |
| Redux / Zustand | TanStack Query handles server state |
| Tailwind | MUI provides complete design system |

---

## Docker Build (standalone)

```dockerfile
FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs
EXPOSE 3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
```

Requires `output: 'standalone'` in `next.config.ts`.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MUIMARK_DATA_DIR` | `.` | Root directory for data files |
| `MUIMARK_CONFIG` | `<dataDir>/.muimark.yaml` | Path to config file |
| `MUIMARK_MODE` | `auto` | Force deployment tier |
| `MUIMARK_AUTH` | `false` | Enable authentication |
| `MUIMARK_GIT_REMOTE` | — | Git remote for auto-sync |
| `PORT` | `3000` | HTTP port |
