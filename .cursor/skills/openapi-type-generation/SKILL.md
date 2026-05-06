---
name: openapi-type-generation
description: >-
  Regenerate TypeScript types from committed OpenAPI YAML in docs/api-specs/
  after contract changes. Use when editing admin/api/v2/*/definition.yaml (then
  sync into docs/api-specs), src/types/, or when the user mentions generate
  types or OpenAPI in funnelflux-open-ui.
---

# OpenAPI type generation

## When to use

- Editing OpenAPI specs: canonical PHP sources `admin/api/v2/*/definition.yaml`; committed inputs for the UI package are `docs/api-specs/*-api.yaml` (keep them in sync when the backend contract changes)
- Working on types in `src/types/`
- Adding a new API endpoint or model
- The user mentions generate types, update types, definition.yaml, or OpenAPI

## Instructions

### After modifying API YAML

1. **Sync** `admin/api/v2/{data,stats,ui,system}/definition.yaml` into `docs/api-specs/{data,stats,ui,system}-api.yaml` (or edit the docs copies directly when the backend PR lands together).
2. **Run** the generator:

   ```bash
   pnpm run generate-types
   ```

3. **Verify** the output in `src/types/generated/` matches expectations; optional: `pnpm run check-generated-types` (must pass with a clean index after you stage the regenerated files).
4. **Update wrapper re-exports** if new types were added:
   - Entity types → `src/types/entities.ts`
   - Stats/report types → `src/types/stats.ts`
   - UI/settings types → `src/types/ui.ts`
   - Auth/permissions types → `src/types/api.ts`
5. **Run** `pnpm tsc -b --noEmit` to check for downstream type errors.

### When adding a new definition

1. Add the definition to the appropriate file under `docs/api-specs/` (and the PHP `definition.yaml` if applicable).
2. Follow the steps above.
3. Add the new type to the corresponding wrapper file's re-export list.

### Conventions

- **Never edit** auto-generated `data.ts`, `stats.ts`, `ui.ts`, `system.ts`, or `index.ts` — they are overwritten on each run. One-off TypeScript fixes go in `src/types/generated/_overrides.ts` or wrapper modules.
- **All entity IDs** (`integer/int64`) become `string` in TypeScript.
- **Hand-written types** belong in the wrapper files, not in `generated/`.
- **Always use pnpm**, not npm or yarn, in this package directory.
- Script location: `scripts/generate-types.mjs`.
- See `.cursor/rules/open-ui-type-generation.mdc` for full mapping rules.

### Architecture

```
docs/api-specs/data-api.yaml     ─┐
docs/api-specs/stats-api.yaml    ─┤
docs/api-specs/ui-api.yaml       ─┼──▶ scripts/generate-types.mjs
docs/api-specs/system-api.yaml   ─┘         │
                                                ▼
                                   src/types/generated/
                                   ├── data.ts
                                   ├── stats.ts
                                   ├── ui.ts
                                   ├── system.ts
                                   └── index.ts
                                                │
                                                ▼
                              src/types/ (wrapper files)
                              ├── entities.ts  (re-exports from data.ts + hand-written)
                              ├── stats.ts     (re-exports from stats.ts + helpers)
                              ├── ui.ts        (re-exports from ui.ts + hand-written)
                              └── api.ts       (re-exports from ui.ts + hand-written)
```
