#!/usr/bin/env bash
#
# Compatibility wrapper. The canonical implementation is setup-ai-harness.sh;
# run that script directly for install/repair/status.
#
if [ -n "${POSIXLY_CORRECT:-}" ] || [ -z "${BASH_VERSION:-}" ]; then
    exec bash "$0" "$@"
fi

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/setup-ai-harness.sh" "$@"
