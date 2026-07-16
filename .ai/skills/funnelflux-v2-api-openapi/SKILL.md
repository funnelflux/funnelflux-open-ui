---
name: funnelflux-v2-api-openapi
description: Use the committed OpenAPI contract before changing Open UI API calls, hooks, or generated types.
compatibility: Large Swagger 2.0 YAML files; search for the affected path or definition instead of reading whole files.
---

# Open UI API contract

The public contract inputs for this repository live in `api-specs/`:

| File | Scope |
|------|-------|
| `data-api.yaml` | Entities and CRUD |
| `stats-api.yaml` | Reporting and statistics |
| `ui-api.yaml` | UI-shaped responses |
| `system-api.yaml` | System-level endpoints |

Before changing an API call, query key, request payload, response type, or form
schema:

1. Find the endpoint path or model in the relevant committed spec.
2. Match its parameters and response shape exactly; do not infer fields from UI code.
3. If the contract input changes, run `pnpm run generate-types` and update the
   affected wrapper types and tests.

Do not hand-edit files under `src/types/generated/`.
