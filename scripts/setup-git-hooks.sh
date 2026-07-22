#!/usr/bin/env bash
# Enable the repository-managed Git hooks for this checkout.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "error: $ROOT_DIR is not inside a Git worktree" >&2
    exit 1
fi

CURRENT_HOOKS_PATH="$(git config --local --get core.hooksPath || true)"
case "$CURRENT_HOOKS_PATH" in
    ""|.githooks)
        git config --local core.hooksPath .githooks
        echo "Git hooks enabled: core.hooksPath=.githooks"
        ;;
    *)
        echo "error: refusing to replace existing core.hooksPath=$CURRENT_HOOKS_PATH" >&2
        echo "Set it to .githooks yourself if you want to replace that hook configuration." >&2
        exit 1
        ;;
esac
