---
status: Active
---

# RB-002 Certificate Renewal

## When to use

When TLS certificates are expiring (alerting fires at 14 days before expiry).

## Steps

### 1. Check current certificate

```bash
echo | openssl s_client -connect <domain>:443 2>/dev/null | openssl x509 -noout -dates
```

### 2. Renew with Certbot

```bash
sudo certbot renew --cert-name <domain>
```

### 3. Verify renewal

```bash
sudo certbot certificates
echo | openssl s_client -connect <domain>:443 2>/dev/null | openssl x509 -noout -dates
```

### 4. Reload web server

```bash
sudo systemctl reload nginx
# or
sudo systemctl reload traefik
```

### 5. Verify HTTPS

```bash
curl -sS -o /dev/null -w "%{http_code}" https://<domain>/health
```

## Automation

Certbot auto-renewal runs via systemd timer. This runbook is for manual
intervention when auto-renewal fails.
