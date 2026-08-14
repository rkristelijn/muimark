#!/usr/bin/env bash
# check-nextjs-security.sh — Next.js security best practices.
# Inspired by cpm's check-nextjs-security.sh
# Checks: security headers, env exposure, powered-by header, CSP.
set -euo pipefail

REPO="${1:-.}"
FAILED=0
WARNINGS=0

error()   { printf "  \033[31merror\033[0m    %s\n" "$1"; FAILED=$((FAILED+1)); }
warning() { printf "  \033[33mwarning\033[0m  %s\n" "$1"; WARNINGS=$((WARNINGS+1)); }

# Only run for Next.js projects
[ -f "$REPO/package.json" ] && grep -q '"next"' "$REPO/package.json" || { echo "SKIP: Not a Next.js project"; exit 0; }

# Find next.config
NEXT_CFG=$(find "$REPO" -maxdepth 1 -name "next.config*" ! -path "*/node_modules/*" 2>/dev/null | head -1)

if [ -z "$NEXT_CFG" ]; then
  error "No next.config found — using all defaults (no security headers)"
else
  # poweredByHeader should be disabled
  grep -q "poweredByHeader.*false" "$NEXT_CFG" 2>/dev/null || \
    warning "poweredByHeader not disabled — leaks framework info"

  # Security headers (OWASP)
  grep -q "X-Frame-Options" "$NEXT_CFG" 2>/dev/null || \
    warning "No X-Frame-Options header — clickjacking risk"

  grep -q "X-Content-Type-Options" "$NEXT_CFG" 2>/dev/null || \
    warning "No X-Content-Type-Options header — MIME sniffing risk"

  grep -q "Referrer-Policy" "$NEXT_CFG" 2>/dev/null || \
    warning "No Referrer-Policy header — referrer leakage"

  grep -q "Content-Security-Policy" "$NEXT_CFG" 2>/dev/null || \
    warning "No Content-Security-Policy — XSS risk"

  grep -q "Permissions-Policy" "$NEXT_CFG" 2>/dev/null || \
    warning "No Permissions-Policy — browser features unrestricted"
fi

# Environment variables exposed to client (NEXT_PUBLIC_ with sensitive names)
if [ -d "$REPO/src" ]; then
  EXPOSED=$(grep -rn "NEXT_PUBLIC_.*SECRET\|NEXT_PUBLIC_.*KEY\|NEXT_PUBLIC_.*TOKEN\|NEXT_PUBLIC_.*PASSWORD" \
    "$REPO/src" --include="*.ts" --include="*.tsx" 2>/dev/null || true)
  if [ -n "$EXPOSED" ]; then
    error "Sensitive env vars exposed to client via NEXT_PUBLIC_:"
    echo "$EXPOSED" | sed 's/^/    /' | head -5
  fi
fi

# Check for dangerouslySetInnerHTML without sanitization
if [ -d "$REPO/src" ]; then
  DANGEROUS=$(grep -rn "dangerouslySetInnerHTML" "$REPO/src" \
    --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "\.test\." || true)
  if [ -n "$DANGEROUS" ]; then
    DANGEROUS_COUNT=$(echo "$DANGEROUS" | wc -l)
    warning "$DANGEROUS_COUNT uses of dangerouslySetInnerHTML — ensure input is sanitized"
  fi
fi

# Summary
echo ""
if [ "$FAILED" -gt 0 ]; then
  echo "FAIL: $FAILED errors, $WARNINGS warnings"
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo "WARN: $WARNINGS warnings (non-blocking)"
  exit 0
else
  echo "OK: Next.js security checks passed"
  exit 0
fi
