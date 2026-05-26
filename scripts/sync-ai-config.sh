#!/usr/bin/env bash
#
# Sync canonical AI assistant config into tool-specific locations.
#
# Canonical, tracked sources:
#   - AGENTS.md   → the single agent guide (architecture, rules, conventions)
#   - .ai/rules   → coding rules (Cursor .mdc format)
#   - .ai/skills  → reusable skills
#   - .ai/agents  → sub-agent definitions
#   - .ai/commands→ slash-command definitions
#   - .ai/context → project context notes
#
# This script materializes the per-tool files (CLAUDE.md, GEMINI.md, .cursor/,
# .claude/) as symlinks to those sources. The generated paths are git-ignored,
# so each developer regenerates them locally. Run after cloning or pulling.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f AGENTS.md || ! -d .ai ]]; then
  echo "error: must run inside a checkout containing AGENTS.md and .ai/" >&2
  exit 1
fi

link() { # link <target-relative-to-linkdir> <linkname>
  local target="$1" name="$2"
  mkdir -p "$(dirname "$name")"
  ln -sfn "$target" "$name"
  echo "  $name -> $target"
}

echo "Syncing AI config from .ai/ + AGENTS.md ..."

# Top-level entry files. Codex reads AGENTS.md natively, so no link needed there.
link AGENTS.md CLAUDE.md
link AGENTS.md GEMINI.md

# Cursor reads .cursor/rules/*.mdc and .cursor/skills/*
link ../.ai/rules  .cursor/rules
link ../.ai/skills .cursor/skills

# Claude Code project-scoped agents and commands
link ../.ai/agents   .claude/agents
link ../.ai/commands .claude/commands

echo "Done. These paths are git-ignored; re-run this script after pulling."
echo "Note: on Windows, enable Developer Mode / symlink support, or copy the"
echo "      .ai/ contents into the tool folders manually."
