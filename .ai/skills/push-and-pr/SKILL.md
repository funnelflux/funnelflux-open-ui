---
name: push-and-pr
description: Use only when the user explicitly asks to commit, push, create a pull request, or ship local changes.
---

# Push and PR

Commit, push, and open a PR after validation.

## Workflow

1. Confirm the user explicitly asked to commit/push.
2. Inspect `git status --short` and `git diff`.
3. Stage only intended files.
4. Ensure build/test/lint validation is fresh.
5. Use the repository's commit convention.
6. Push the branch and create or update the PR with `gh` when available.

Never include unrelated local changes unless the user explicitly requests it.
