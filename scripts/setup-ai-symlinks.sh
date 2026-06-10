#!/usr/bin/env bash
#
# setup-ai-symlinks.sh
#
# Compatibility wrapper. The canonical implementation is setup-ai-harness.sh;
# this shim is kept so older references / muscle memory keep working.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/setup-ai-harness.sh" "$@"
