#!/usr/bin/env bash
# check-component-size.sh — Ensure no component file exceeds the line limit.
# Usage: ./checks/check-component-size.sh [max-lines]
set -euo pipefail

MAX_LINES="${1:-150}"
FAILED=0

while IFS= read -r file; do
  lines=$(wc -l < "$file")
  if [ "$lines" -gt "$MAX_LINES" ]; then
    echo "FAIL: $file ($lines lines > $MAX_LINES)"
    FAILED=1
  fi
done < <(find src -type f \( -name '*.tsx' -o -name '*.ts' \) ! -path '*/node_modules/*' ! -name '*.test.*' | sort)

if [ "$FAILED" -eq 0 ]; then
  echo "OK: All source files ≤ $MAX_LINES lines"
fi

exit $FAILED
