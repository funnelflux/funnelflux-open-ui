---
name: pr-review
description: Use when the user asks to review a GitHub PR, inspect unresolved comments, address review feedback, or prepare a PR review fix pass.
---

# PR Review

Review and resolve PR feedback with traceable evidence.

## Workflow

1. Confirm `gh auth status` and repo context.
2. Fetch PR metadata, changed files, comments, and unresolved review threads.
3. Categorize feedback by severity and ownership.
4. Implement approved fixes with scoped edits.
5. Run relevant validation.
6. Summarize what was fixed and what remains.

Do not resolve threads unless the user has asked for that workflow or repo norms
allow it.
