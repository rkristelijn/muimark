#!/usr/bin/env bash
# check-no-fetch-in-components.sh — Presentational components must not call fetch().
# Checks src/plugins/ and src/shared/ui/ for direct fetch usage.
# Data fetching should live in hooks (src/state/) or API routes.
set -euo pipefail

FAILED=0
DIRS="src/plugins src/shared/ui"

for dir in $DIRS; do
  [ -d "$dir" ] || continue
  while IFS= read -r file; do
    if grep -qn 'fetch(' "$file" 2>/dev/null; then
      line=$(grep -n 'fetch(' "$file" | head -1)
      echo "FAIL: $file — fetch() not allowed in presentational components"
      echo "      $line"
      FAILED=1
    fi
  done < <(find "$dir" -name '*.tsx' -o -name '*.ts' | grep -v '.test.' | sort)
done

if [ "$FAILED" -eq 0 ]; then
  echo "OK: No fetch() in presentational components"
fi

exit $FAILED
