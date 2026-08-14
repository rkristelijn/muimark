# Design: muimark (itsm) op K3s cluster

**Date:** 2026-07-22
**Status:** Geparkeerd — oppakken als weekend-project
**Context:** muimark (~/git/itsm) deployen als web UI voor iron-legion markdown bestanden

## Doel

iron-legion repo (cmdb, changes, incidents, runbooks) browsen en editen via browser op `itsm.gius.nl`.

## Architectuur

```text
Pod: muimark (namespace: infra)
├── Container: muimark (Next.js standalone, port 3000)
│   └── mount: /data/repo (shared volume, r/w)
├── Sidecar: git-sync
│   └── mount: /data/repo (shared volume)
│   └── SSH deploy key (K8s secret)
│   └── Pull elke 30s
└── Volume: emptyDir (shared between containers)
```

## Write-flow (optimistic, single-user)

```text
1. git pull --rebase
2. write file
3. git add + commit -m "web: update <file>"
4. git push
   ├── OK → done
   └── REJECT → git pull --rebase
       ├── CLEAN → push → done
       └── CONFLICT → abort, return HTTP 409
```

## Wat te bouwen

1. [ ] `output: "standalone"` in next.config.ts
2. [ ] Dockerfile (multi-stage: build → node:22-slim runtime)
3. [ ] K8s manifest (Deployment + git-sync sidecar + Service + Ingress)
4. [ ] SSH deploy key genereren + als K8s secret
5. [ ] DNS: `itsm.gius.nl` A-record → 10.0.0.210 in Cloudflare
6. [ ] Git-wrapper in muimark API (pull → write → commit → push)
7. [ ] Conflict handling: HTTP 409 + UI melding

## Referenties

- Bloomreach/Hippo CMS pattern: optimistic locking, publish workflow (overkill voor ons)
- git-sync image: `registry.k8s.io/git-sync/git-sync:v4`
- Bestaand deploy pattern: zie kb-k8s-workflow.md
