# Runtime Cheatsheet

## Guidance

- Codex loads `AGENTS.md`.
- Claude loads `CLAUDE.md`; this repo uses `CLAUDE.md -> AGENTS.md`.

## Skills

- Canonical skill bodies live under `.ai/skills/<name>/SKILL.md`.
- Runtime loader paths are generated symlinks:
  - `.agents/skills/<name>`
  - `.claude/skills/<name>`

## Codex Agents

- Canonical definitions live under `.ai/agents/*.toml`.
- `.codex/agents/*.toml` are generated symlinks.
