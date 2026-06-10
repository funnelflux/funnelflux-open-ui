---
name: careful-checks
description: Use when the user asks for pre-commit quality gates, validation, careful checks, or end-to-end verification in this repository.
---

# Careful Checks

Run the repository's normal build, test, lint, and formatting gates before commit
or PR work.

## Workflow

1. Read `AGENTS.md`.
2. Inspect available commands in `package.json`, `Makefile`, `justfile`,
   `Taskfile.*`, `scripts/`, and language-specific project files.
3. Prefer repo-documented commands over guesses.
4. Run the smallest sufficient focused checks first, then broad gates when the
   change crosses shared behavior or the user asks for full validation.
5. Treat failures as actionable. Diagnose and fix or report the concrete
   blocker; do not dismiss failures as unrelated.

## Report

List commands run, PASS/FAIL, and any remaining risk.
