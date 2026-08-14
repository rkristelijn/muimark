---
status: Active
host: app-server-01
port: 3000
url: https://app.example.com
---

# Web Application

Primary customer-facing web application. Serves the dashboard UI
and handles API requests.

## Dependencies

- PostgreSQL database (db-server-01:5432)
- Redis cache (cache-01:6379)
- Object storage (S3-compatible)

## Health Check

```bash
curl -sS https://app.example.com/api/health
```

## Restart Procedure

```bash
sudo systemctl restart app-server
```
