---
name: code-review
description: Use when reviewing an uncommitted diff or patch for production risk, including bugs, security, wiring, resource leaks, missing tests, or behavioral regressions.
---

# Code Review

Review changes for real defects, not style churn.

## Workflow

1. Read `AGENTS.md` and relevant `.ai/skills/` or `.ai/rules/` files.
2. Inspect `git status --short` and `git diff`.
3. Trace changed execution paths far enough to verify reachability and callers.
4. Prioritize correctness, security, data loss, concurrency, resource handling,
   migrations, and missing regression tests.
5. Report findings first, ordered by severity, with file and line references.

If no findings are found, say so and note any checks not run.
