---
name: create-worktree
description: Use when creating or preparing a git worktree and ensuring repo-local AI symlinks, environment files, and setup commands are handled consistently.
---

# Create Worktree

Create a worktree using the repository's own conventions.

## Workflow

1. Read `AGENTS.md` for worktree rules.
2. Inspect existing worktree directories and branch naming.
3. Create the worktree from the requested base branch.
4. Copy only repo-approved local files such as `.env.local` or data fixtures
   when guidance says to do so.
5. Run `scripts/setup-ai-symlinks.sh install` if present.
6. Run repo-specific setup such as submodules, package installs, or bootstrap
   scripts only when documented or requested.

Never guess secret files to copy. Ask or inspect repo guidance.
