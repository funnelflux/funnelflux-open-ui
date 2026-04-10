# AI Context Documents

This directory contains modular context files that Claude loads on-demand based on the
current task. They are referenced from the Context Map in the root `CLAUDE.md`.

## Loading Pattern

Do not read all files at once. Load only what is relevant to the current task:

| Working on... | Read these |
|---------------|-----------|
| Any code work | `code-quality-guidelines.md` |
| Architecture questions | `architecture-overview.md` |
| Debugging | `debugging-methodology.md` |
| Planning complex work | `work-planning-process.md` |
| Unfamiliar terms | `_glossary.md` |

## Best Practices

- Keep each file focused on one topic (under 100 lines ideal)
- Update docs when you discover they are wrong — do not leave inaccurate docs
- Add new docs when a topic comes up repeatedly and requires context
- Remove docs that no longer apply
- Use tables and bullet lists over prose paragraphs (survives LLM compaction better)

## File Index

| File | Purpose |
|------|---------|
| `architecture-overview.md` | App layers, routing, state, API, component architecture |
| `code-quality-guidelines.md` | Naming, imports, component patterns, theming, error handling |
| `debugging-methodology.md` | Systematic debugging steps and evidence gathering |
| `work-planning-process.md` | When and how to create execution plans |
| `_glossary.md` | FunnelFlux domain terms (campaign, funnel, node, etc.) |
| `context-engineering-guide.md` | Reference guide for AI-assistance infrastructure design |
