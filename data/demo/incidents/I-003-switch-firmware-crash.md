---
status: Closed
severity: Critical
date: '2026-08-01T00:00:00.000Z'
duration: 45m
impact: Complete network outage for all internal services
_outgoingRefs:
  - SC-001
---
# I-003 Switch Firmware Crash

## Summary

The core network switch rebooted unexpectedly due to a firmware bug,
causing a 45-minute complete network outage.

## Root Cause

Known bug in firmware v2.1.3 — triggered by ARP table overflow when
more than 4096 entries exist simultaneously.

## Resolution

1. Switch auto-recovered after reboot (5 minutes)
2. Applied firmware patch v2.1.4 during maintenance window
3. Reduced ARP timeout from 4h to 30m to prevent table overflow

## Related

* Vendor advisory: CVE-2026-1234
* Change: #SC-001 (firmware upgrade scheduled)
