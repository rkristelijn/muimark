#!/usr/bin/env bash
# check-feature-coverage.sh — Report which features have source markers AND test coverage.
#
# Usage: ./checks/check-feature-coverage.sh
#
# Markers:
#   Source:  // @feature F-001
#   Tests:   // @covers F-001   (or in test description: "F-001:")
#
# Exit 0 = all must-have features covered, exit 1 = gaps found.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/src"
TESTS_UNIT="$ROOT/src"
TESTS_E2E="$ROOT/e2e"
FEATURES_FILE="$ROOT/src/shared/features.ts"

if [ ! -f "$FEATURES_FILE" ]; then
  echo "ERROR: $FEATURES_FILE not found"
  exit 1
fi

# Extract feature IDs and priorities from the registry
FEATURES=$(grep -oP "id: '(F-\d+)'.*priority: '(\w+)'" "$FEATURES_FILE" | \
  sed "s/id: '//;s/'.*priority: '/:/;s/'//")

# Count markers in source and tests
declare -A SRC_FILES
declare -A TEST_FILES

# Scan source for @feature markers
while IFS=: read -r file marker; do
  fid=$(echo "$marker" | grep -oP 'F-\d+')
  [ -n "$fid" ] && SRC_FILES[$fid]="${SRC_FILES[$fid]:-} $file"
done < <(grep -rn '@feature F-' "$SRC" --include="*.ts" --include="*.tsx" 2>/dev/null || true)

# Scan tests for @covers markers and F-XXX in test names
while IFS=: read -r file marker; do
  fid=$(echo "$marker" | grep -oP 'F-\d+')
  [ -n "$fid" ] && TEST_FILES[$fid]="${TEST_FILES[$fid]:-} $file"
done < <(grep -rn '@covers F-\|F-[0-9]\{3\}' "$TESTS_UNIT" "$TESTS_E2E" \
  --include="*.test.ts" --include="*.test.tsx" --include="*.spec.ts" 2>/dev/null || true)

# Report
echo ""
echo "Feature Coverage Report"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
printf "  %-8s %-6s %-8s %-8s %s\n" "Feature" "Prio" "Source" "Test" "Name"
echo "  ─────────────────────────────────────────────────────────────────────────"

TOTAL=0; COVERED=0; MUST_MISS=0

while IFS=: read -r fid priority; do
  TOTAL=$((TOTAL + 1))

  # Get feature name from registry
  name=$(grep "id: '$fid'" "$FEATURES_FILE" | grep -oP "name: '[^']+'" | sed "s/name: '//;s/'//")

  has_src="✗"
  has_test="✗"
  [ -n "${SRC_FILES[$fid]:-}" ] && has_src="✓"
  [ -n "${TEST_FILES[$fid]:-}" ] && has_test="✓"

  if [ "$has_src" = "✓" ] && [ "$has_test" = "✓" ]; then
    COVERED=$((COVERED + 1))
    printf "  %-8s %-6s \033[32m%-8s\033[0m \033[32m%-8s\033[0m %s\n" "$fid" "$priority" "$has_src" "$has_test" "$name"
  elif [ "$has_src" = "✓" ]; then
    printf "  %-8s %-6s \033[32m%-8s\033[0m \033[31m%-8s\033[0m %s\n" "$fid" "$priority" "$has_src" "$has_test" "$name"
    [ "$priority" = "must" ] && MUST_MISS=$((MUST_MISS + 1))
  elif [ "$has_test" = "✓" ]; then
    printf "  %-8s %-6s \033[31m%-8s\033[0m \033[32m%-8s\033[0m %s\n" "$fid" "$priority" "$has_src" "$has_test" "$name"
  else
    printf "  %-8s %-6s \033[31m%-8s\033[0m \033[31m%-8s\033[0m %s\n" "$fid" "$priority" "$has_src" "$has_test" "$name"
    [ "$priority" = "must" ] && MUST_MISS=$((MUST_MISS + 1))
  fi
done <<< "$FEATURES"

echo ""
PCT=$((COVERED * 100 / TOTAL))
echo "  Coverage: $COVERED/$TOTAL features ($PCT%)"
echo "  Must-have gaps: $MUST_MISS"
echo ""

if [ "$MUST_MISS" -gt 0 ]; then
  echo "  ⚠️  $MUST_MISS must-have features without full coverage"
  exit 1
fi

echo "  ✅ All must-have features have source markers and test coverage"
exit 0
