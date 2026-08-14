---
status: Resolved
severity: High
date: '2026-08-10T00:00:00.000Z'
duration: 2h 15m
impact: All users unable to access web services
_outgoingRefs:
  - SC-001
---
# I-001 Web Server Unreachable

## Summary

The primary web server (app-server-01) became unreachable at 14:32 UTC.
All HTTP/HTTPS traffic returned connection timeout errors.

## Timeline

| Time  | Event                                              |
| ----- | -------------------------------------------------- |
| 14:32 | Monitoring alert: app-server-01 HTTP check failed  |
| 14:35 | On-call engineer acknowledged                      |
| 14:40 | SSH access confirmed down — IPMI console used      |
| 14:45 | Root cause identified: OOM killer terminated nginx |
| 14:50 | Nginx restarted, memory limits adjusted            |
| 15:00 | All services confirmed operational                 |
| 16:47 | Post-incident review completed                     |

## Root Cause

A memory leak in the application caused RAM usage to exceed 95%.
The Linux OOM killer terminated nginx (highest memory consumer after the app).

## Resolution

1. Restarted nginx via IPMI console
2. Restarted the leaking application service
3. Added `MemoryMax=4G` to the systemd unit file
4. Deployed application fix for the memory leak (see #SC-001)

## Lessons Learned

* Need memory alerting at 80% threshold (before OOM)
* Application needs memory profiling in staging
