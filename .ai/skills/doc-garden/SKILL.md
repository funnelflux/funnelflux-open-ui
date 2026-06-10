---
name: doc-garden
description: Use when the user asks to audit, refresh, prune, or improve AI guidance docs, AGENTS.md/CLAUDE.md symlinks, .ai skills/rules, or harness health.
---

# Doc Garden

Keep AI guidance accurate, compact, and repo-specific.

## Scope

- `AGENTS.md` and nested guidance files
- `CLAUDE.md` symlinks
- `.ai/skills/*/SKILL.md`
- `.ai/rules/*.mdc`
- `.ai/agents/*.toml`
- `.ai/exec-plans/*`
- `scripts/setup-ai-harness.sh`

## Workflow

1. Run `scripts/setup-ai-harness.sh status` if present.
2. Check guidance paths and commands against the actual repo.
3. h5i hygiene (when the repo uses h5i): compact the reasoning trace with `h5i
   context pack` (lossless — keeps THINK/ACT/NOTE), drop stale facts with `h5i
   claims prune`, and move resolved memory to archive docs. Checkpointing rides
   on `h5i commit` (per-SHA snapshot), not per-session Stop.
4. Keep root guidance short; move detail to just-in-time skills and rules under `.ai/`.
5. Do not edit production code as part of doc-garden.
