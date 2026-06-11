#!/usr/bin/env bash
#
# setup-ai-symlinks.sh
#
# Ensure Claude Code can read the canonical AGENTS.md project guide.

if [ -n "${POSIXLY_CORRECT:-}" ] || [ -z "${BASH_VERSION:-}" ]; then
    exec bash "$0" "$@"
fi

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${AI_SYMLINK_ROOT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
MODE="${1:-install}"
AGENTS_PATH="$ROOT_DIR/AGENTS.md"
CLAUDE_PATH="$ROOT_DIR/CLAUDE.md"

is_managed_link() {
  [ -L "$CLAUDE_PATH" ] && [ "$(readlink "$CLAUDE_PATH")" = "AGENTS.md" ]
}

status() {
  if is_managed_link; then
    echo "CLAUDE.md -> AGENTS.md"
  elif [ -e "$CLAUDE_PATH" ] || [ -L "$CLAUDE_PATH" ]; then
    echo "CLAUDE.md exists and is not managed by this script"
    return 1
  else
    echo "CLAUDE.md is missing"
    return 1
  fi
}

install() {
  if [ ! -f "$AGENTS_PATH" ]; then
    echo "error: AGENTS.md not found at $AGENTS_PATH" >&2
    exit 1
  fi

  if is_managed_link; then
    echo "ok     CLAUDE.md -> AGENTS.md"
    return
  fi

  if [ -e "$CLAUDE_PATH" ] || [ -L "$CLAUDE_PATH" ]; then
    echo "error: CLAUDE.md exists and is not a managed AGENTS.md symlink" >&2
    exit 1
  fi

  ln -s "AGENTS.md" "$CLAUDE_PATH"
  echo "link   CLAUDE.md -> AGENTS.md"
}

case "$MODE" in
  install|repair)
    install
    ;;
  status)
    status
    ;;
  *)
    echo "Usage: $0 {install|repair|status}" >&2
    exit 1
    ;;
esac
