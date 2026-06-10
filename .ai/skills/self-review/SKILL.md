---
name: self-review
description: Use when the user asks for self-review, pre-commit review, or a final local review of uncommitted changes before commit or PR.
---

# Self Review

Run validation and review the current uncommitted diff before shipping.

## Workflow

1. Read `AGENTS.md`.
2. Run the relevant validation gates from `careful-checks`.
3. Review `git diff` for production risk using the `code-review` mentality.
4. Fix issues found, then rerun affected checks.
5. Summarize commands, findings, fixes, and residual risk.
