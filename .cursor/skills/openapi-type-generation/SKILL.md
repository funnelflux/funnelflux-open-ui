# OpenAPI Type Generation Skill

## When to use

Activate this skill when:
- Editing any OpenAPI `definition.yaml` under `admin/api/v2/` (from monorepo root) or `../admin/api/v2/` (from this package directory)
- Working on types in `src/types/`
- Adding a new API endpoint or model
- The user mentions "generate types", "update types", "definition.yaml", or "OpenAPI"

## Steps

### After modifying a definition.yaml

1. **Read** the changed definition(s) in `../admin/api/v2/{data,stats,ui,system}/definition.yaml` when working from this package (or `admin/api/v2/...` from the self-hosted repo root)
2. **Run** the generator:
   ```bash
   pnpm generate-types
   ```
3. **Verify** the output in `src/types/generated/` matches expectations
4. **Update wrapper re-exports** if new types were added:
   - Entity types → `src/types/entities.ts`
   - Stats/report types → `src/types/stats.ts`
   - UI/settings types → `src/types/ui.ts`
   - Auth/permissions types → `src/types/api.ts`
5. **Run** `pnpm tsc -b --noEmit` to check for downstream type errors

### When adding a new definition

1. Add the definition to the appropriate `definition.yaml`
2. Follow steps 1-5 above
3. Add the new type to the corresponding wrapper file's re-export list

## Important conventions

- **Never edit files in `src/types/generated/`** — they are overwritten on each run
- **All entity IDs** (`integer/int64`) become `string` in TypeScript
- **Hand-written types** belong in the wrapper files, not in `generated/`
- **Always use pnpm**, not npm or yarn, in this package directory
- Script location: `scripts/generate-types.mjs`
- See `.cursor/rules/open-ui-type-generation.mdc` for full mapping rules

## Architecture

YAML paths in this diagram are relative to this package when it lives beside `admin/` (from monorepo root, omit `../`).
```
../admin/api/v2/data/definition.yaml    ─┐
../admin/api/v2/stats/definition.yaml   ─┤
../admin/api/v2/ui/definition.yaml      ─┼──▶ scripts/generate-types.mjs
../admin/api/v2/system/definition.yaml  ─┘         │
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
