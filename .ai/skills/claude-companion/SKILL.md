---
name: claude-companion
description: Use when Codex needs a Claude peer pass for code review, plan review, RCA, or implementation review.
---

# Claude Companion

Ask Claude Code for an independent reasoning pass from Codex.

## Workflow

Use `claude -p` without `--bare` so project guidance, MCP config, and local
Claude auth are available:

```bash
claude -p "<prompt>" --output-format json
```

Ask focused questions: review this diff, challenge this plan, argue alternate
root causes, or inspect a specific risk. Do not round-trip generic prompts.

If `claude` is unavailable or unauthenticated, skip and report that the
companion pass could not run.
