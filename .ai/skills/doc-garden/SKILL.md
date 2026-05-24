---
name: doc-garden
description: Use when the user asks to audit, refresh, prune, or improve AI guidance docs, AGENTS.md/CLAUDE.md symlinks, .ai skills, or docs/_ai_context health.
---

# Doc Garden

Keep AI guidance accurate, compact, and repo-specific.

## Scope

- `AGENTS.md` and nested guidance files
- `CLAUDE.md` symlinks
- `.ai/skills/*/SKILL.md`
- `.ai/agents/*.toml`
- `docs/_ai_context/*.md`
- `docs/exec-plans/*`
- `scripts/setup-ai-symlinks.sh`

## Workflow

1. Run `scripts/setup-ai-symlinks.sh status` if present.
2. Check guidance paths and commands against the actual repo.
3. Remove stale claims or move resolved memory to archive docs when the repo has
   that pattern.
4. Keep root guidance short; move detail to just-in-time context docs.
5. Do not edit production code as part of doc-garden.
