---
status: Closed
priority: High
scheduled: '2026-08-05T00:00:00.000Z'
relations:
  - I-001
  - I-003
---
# SC-001 Upgrade Node.js to v22 LTS

## Description

Upgrade all application servers from Node.js 20 to Node.js 22 LTS.
Required for security patches and performance improvements.

## Risk Assessment

| Risk                             | Mitigation                            |
| -------------------------------- | ------------------------------------- |
| Breaking changes in dependencies | Test in staging first                 |
| Downtime during upgrade          | Rolling restart, one server at a time |
| Rollback needed                  | Keep Node 20 binary available         |

## Implementation Plan

1. Update staging environment
2. Run full test suite against staging
3. Update production server 1, verify
4. Update production server 2, verify
5. Remove Node 20 binaries after 7-day soak

## Rollback Plan

```bash
# Revert symlink to Node 20
sudo ln -sf /opt/node-20/bin/node /usr/local/bin/node
sudo systemctl restart app-server
```

## Post-Implementation Review

* Completed successfully on 2026-08-05
* No issues detected in 7-day soak period
* Memory usage reduced by \~15% (V8 improvements)
