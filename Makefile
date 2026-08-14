# Muimark — Makefile
# Run 'make check' for full quality gate.

.PHONY: dev build check lint test typecheck quality-checks clean

# --- Development ---
dev:
	MUIMARK_DATA_DIR=./data/demo pnpm dev 2>&1 | tee .tmp/dev.log

dev-iron:
	pnpm dev 2>&1 | tee .tmp/dev.log

# --- Build ---
build:
	npm run build

# --- Full quality gate ---
check: typecheck lint test quality-checks
	@echo "\n✓ All checks passed"

# --- Individual checks ---
typecheck:
	npm run typecheck

lint:
	npm run lint

test:
	npm run test

# --- Custom quality checks ---
quality-checks:
	@echo "=== Component size check (max 150 lines) ==="
	@bash checks/check-component-size.sh 150
	@echo "=== useState count check (max 5 per file) ==="
	@bash checks/check-max-usestate.sh 5
	@echo "=== No fetch in presentational components ==="
	@bash checks/check-no-fetch-in-components.sh

# --- Utilities ---
clean:
	rm -rf .next dist build coverage .tmp

demo:
	MUIMARK_DATA_DIR=./data/demo npm run dev
