---
status: Degraded
host: monitor-01
port: 9090
url: 'https://grafana.example.com'
---
# Monitoring Stack

Prometheus + Grafana monitoring. Currently degraded due to high cardinality
metrics causing slow queries.

## Components

| Component     | Port | Status             |
| ------------- | ---- | ------------------ |
| Prometheus    | 9090 | Active             |
| Grafana       | 3000 | Active             |
| AlertManager  | 9093 | Active             |
| Node Exporter | 9100 | Active (all hosts) |

## Known Issues

* Dashboard load time > 5s for 30-day queries (high cardinality)
* Alert: investigating metric explosion from new service

## Health Check

```bash
curl -sS http://monitor-01:9090/-/healthy
curl -sS http://monitor-01:3000/api/health
```
