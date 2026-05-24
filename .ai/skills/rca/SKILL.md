---
name: rca
description: Use when investigating a non-obvious bug, regression, incident, flaky test, or failure with multiple plausible causes.
---

# Root Cause Analysis

Investigate from evidence instead of assumptions.

## Workflow

1. State the symptom and known constraints.
2. Generate plausible hypotheses.
3. Trace real execution paths from entrypoints/callers.
4. Collect runtime, log, test, data, or API evidence.
5. Rule hypotheses in or out.
6. Fix the confirmed cause or present the smallest concrete fix plan.

If a test fails, diagnose it. Do not dismiss it as unrelated without proof.
