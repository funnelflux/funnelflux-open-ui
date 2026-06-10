---
name: rca
description: Use when investigating a non-obvious bug, regression, incident, flaky test, or failure with multiple plausible causes.
---

# Root Cause Analysis

Investigate from evidence instead of assumptions.

## Workflow

1. **Reproduce** — get the exact error message, stack trace, or unexpected behavior; reproduce locally before investigating.
2. **Hypothesize** — form a specific hypothesis (not vague "something is wrong with data flow").
3. **Gather evidence** — trace execution paths, check git blame, read logs, check inputs and dependencies.
4. **Test the hypothesis** — confirm, refute, or add logging for more evidence.
5. **Fix and verify** — minimal root-cause fix, add a regression test, verify existing tests pass, check for the same pattern elsewhere.

If a test fails, diagnose it. Do not dismiss it as unrelated without proof.

## Common failure patterns

- **Nil/null dereference** — check what returns nil/null and when
- **Race condition** — check concurrent access to shared state
- **State corruption** — check mutation order and side effects
- **Configuration** — check environment variables and config files
- **Dependency failure** — check external service health and timeouts
