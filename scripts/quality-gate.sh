#!/usr/bin/env bash
# Run the repository's required local quality checks.

set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"

if [ -x node_modules/.bin/eslint ]; then
    pnpm run lint
else
    node node_modules/eslint/bin/eslint.js .
fi

if [ -x node_modules/.bin/tsc ] && [ -x node_modules/.bin/vite ]; then
    pnpm run build
else
    node node_modules/typescript/bin/tsc -b
    node node_modules/vite/bin/vite.js build
    node scripts/check-dist-artifacts.mjs
fi

if [ -x node_modules/.bin/vitest ]; then
    pnpm test
else
    node node_modules/vitest/vitest.mjs run
fi
