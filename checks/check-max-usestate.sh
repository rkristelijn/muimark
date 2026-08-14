#!/usr/bin/env bash
# check-max-usestate.sh — Ensure no component has more than N useState calls.
# Usage: ./checks/check-max-usestate.sh [max-count]
set -euo pipefail

MAX_COUNT="${1:-5}"
FAILED=0

while IFS= read -r file; do
  count=$(grep -c 'useState' "$file" || true)
  if [ "$count" -gt "$MAX_COUNT" ]; then
    echo "FAIL: $file ($count useState calls > $MAX_COUNT)"
    FAILED=1
  fi
done < <(find src -type f \( -name '*.tsx' -o -name '*.ts' \) ! -path '*/node_modules/*' ! -name '*.test.*' | sort)

if [ "$FAILED" -eq 0 ]; then
  echo "OK: All files ≤ $MAX_COUNT useState calls"
fi

exit $FAILED
