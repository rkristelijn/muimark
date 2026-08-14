---
status: Open
severity: Medium
date: '2026-08-13T00:00:00.000Z'
duration: ongoing
impact: Backup jobs failing silently
relations:
  - SC-002
---
# I-002 Disk Space Exhaustion on Backup Server

## Summary

The backup server (backup-01) ran out of disk space on `/var/backups`.
Nightly backup jobs have been failing for 3 days without alerting.

## Timeline

| Time         | Event                           |
| ------------ | ------------------------------- |
| Aug 10 03:00 | First backup failure (no alert) |
| Aug 11 03:00 | Second failure                  |
| Aug 12 03:00 | Third failure                   |
| Aug 13 09:15 | Discovered during routine check |
| Aug 13 09:30 | Investigation started           |

## Investigation

```bash
df -h /var/backups
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/sdb1       500G  500G     0 100% /var/backups

du -sh /var/backups/* | sort -rh | head -5
# 180G  /var/backups/database
# 150G  /var/backups/media
# 120G  /var/backups/old
# 50G   /var/backups/logs
```

## Next Steps

* [ ] Remove `/var/backups/old` (contains pre-migration data)
* [ ] Implement retention policy (keep 7 daily, 4 weekly, 12 monthly)
* [ ] Add disk space alerting at 85% threshold
* [ ] Verify backup jobs resume after cleanup
