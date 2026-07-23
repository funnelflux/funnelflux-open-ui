#!/usr/bin/env bash
#
# setup-ai-symlinks.sh
#
# Compatibility wrapper for the canonical AI harness installer.

if [ -n "${POSIXLY_CORRECT:-}" ] || [ -z "${BASH_VERSION:-}" ]; then
    exec bash "$0" "$@"
fi

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/setup-ai-harness.sh" "$@"
