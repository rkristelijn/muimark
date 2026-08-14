# Muimark — Makefile
# Run 'make check' for full quality gate.

.PHONY: dev build check lint test typecheck quality-checks clean e2e e2e-docker

# --- Development ---
dev:
	MUIMARK_DATA_DIR=./data/demo pnpm dev 2>&1 | tee .tmp/dev.log

dev-iron:
	pnpm dev 2>&1 | tee .tmp/dev.log

# --- Build ---
build:
	pnpm build

# --- Full quality gate ---
check: typecheck lint test quality-checks
	@echo "\n✓ All checks passed"

# --- Individual checks ---
typecheck:
	pnpm typecheck

lint:
	pnpm lint

test:
	pnpm test

# --- E2E ---
e2e:
	pnpm exec playwright test --config .config/playwright.config.ts

e2e-docker:
	docker compose -f .config/docker-compose.test.yml up --abort-on-container-exit --exit-code-from e2e

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
	rm -rf .next dist build coverage .tmp tsconfig.tsbuildinfo
