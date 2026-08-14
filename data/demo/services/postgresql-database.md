---
status: Active
host: db-server-01
port: 5432
url: postgresql://db-server-01:5432/production
---

# PostgreSQL Database

Primary relational database for the web application.

## Configuration

- Version: PostgreSQL 16
- Max connections: 200
- Shared buffers: 4GB
- WAL archiving: enabled

## Backup Schedule

- Full backup: daily at 02:00 UTC
- WAL archiving: continuous
- Retention: 30 days

## Health Check

```bash
pg_isready -h db-server-01 -p 5432
```

## Common Issues

- Connection pool exhausted → check idle connections
- Replication lag → check `pg_stat_replication`
- Slow queries → check `pg_stat_activity`
