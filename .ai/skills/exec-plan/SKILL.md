---
name: exec-plan
description: Use when the user asks to create, revise, review, or implement an executable plan for multi-step repository work.
---

# Exec Plan

Create or maintain a self-contained implementation plan for non-trivial work.

## When to plan

Create a written plan when:
- The task touches 3 or more files
- The approach is not obvious — multiple valid strategies exist
- The task involves architectural decisions
- The work will take more than one session

Do not create a plan when:
- The task is a single-file fix with an obvious solution
- The change is well-defined and the user gave specific instructions
- It would take longer to write the plan than to do the work

## Requirements

- Explain the user-visible goal.
- Define non-obvious terms.
- Name exact files, commands, functions, and validation steps.
- Record decisions, discoveries, progress, and outcomes.
- Keep the plan updated as implementation proceeds.

Prefer `.ai/exec-plans/active/` for active plans and
`.ai/exec-plans/completed/` for finished plans.

## Plan template

```markdown
# Plan: {Title}

## Problem
{What problem does this solve? One paragraph maximum.}

## Requirements
- {Requirement 1}
- {Requirement 2}

## Approach
{How will this be implemented? Include key decisions and their rationale.}

## Tasks
- [ ] {Task 1}
- [ ] {Task 2}

## Verification
- [ ] {How to verify the work is correct}
```

## Progress tracking

- Check off tasks as they are completed
- Add notes to tasks if the approach changed during implementation
- If a task reveals unexpected complexity, update the plan before proceeding
- When all tasks are done, move the plan to `.ai/exec-plans/completed/`

Keep plans under 100 lines — they are working documents, not design docs.
