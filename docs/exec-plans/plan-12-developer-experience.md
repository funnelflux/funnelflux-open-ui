# Plan 12: Developer Experience & Open Source Readiness

**Complexity:** Small — documentation + config  
**Depends on:** All other plans (document the final state)  

## Problem

- README is still Vite template boilerplate
- No CONTRIBUTING.md
- No architecture documentation for contributors
- ESLint config is minimal (no import ordering, no unused imports rule)
- `components/shared/` vs `components/ui-kit/` boundary is undocumented

## 12A. README

### Steps

1. **Rewrite `README.md`** with:
   - Project description (what FunnelFlux Open UI is)
   - Relationship to the parent FunnelFlux application
   - Prerequisites (Node.js version, npm)
   - Setup instructions (clone, install, configure `.env`, dev server)
   - Build instructions (how to build and deploy into the parent app's `v2-ui/` folder)
   - Link to CONTRIBUTING.md
   - License

## 12B. CONTRIBUTING.md

### Steps

1. **Create `CONTRIBUTING.md`** covering:
   - How to set up a development environment
   - Where to find code (directory structure summary)
   - Patterns to follow:
     - New entity page → use `useEntityPage` hook (Plan 7)
     - New API hook → use `createEntityHooks` factory (Plan 7)
     - State management: React Query for server data, Zustand for UI-only state
     - Styling: Tailwind + design tokens, no hardcoded hex
     - Date handling: use `date-fns`, not `dayjs` (dayjs is isolated to Ant Design DatePicker wrappers)
   - Component directory guide:
     - `ui-kit/` — design system primitives (DataTable, PageShell, FormField, etc.)
     - `shared/` — composed components used across pages (CategoryManager, BulkActionsBar, etc.)
     - `forms/` — entity-specific form components
     - `funnel-builder/` — canvas/flow components
   - How to run tests
   - PR checklist (reference CLAUDE.md verification checklist)

## 12C. ESLint Improvements

### Steps

1. **Add import ordering** (keeps imports consistent across contributors):
   ```bash
   npm install -D eslint-plugin-simple-import-sort
   ```
   Configure in `eslint.config.js`:
   ```ts
   // Group: react → external → @/ internal → relative → styles
   ```

2. **Add unused imports detection:**
   ```bash
   npm install -D eslint-plugin-unused-imports
   ```

3. **Audit existing `eslint-disable` comments:**
   ```bash
   grep -rn "eslint-disable" src/ | wc -l
   ```
   Fix the underlying issues where possible and remove the disables.

4. **jsx-a11y plugin** — covered in Plan 11E, included here for completeness.

## 12D. Architecture Decision Records

Not a heavy process — just a brief `docs/ARCHITECTURE.md` that documents:
- Why Zustand for UI state + React Query for server state (not Redux, not context)
- Why Ant Design (not shadcn, not MUI)
- Why TanStack Table for custom DataTable (not AG Grid everywhere)
- Why `date-fns` primary + `dayjs` isolated
- The entity page pattern and how to add new entities
- The pagination mode toggle and when to use server-side

This helps contributors understand the "why" behind decisions so they don't re-introduce patterns the project deliberately moved away from.

## Verification

- [ ] README has setup, build, and deploy instructions
- [ ] CONTRIBUTING.md covers patterns, testing, PR checklist
- [ ] `npm run lint` passes with new rules
- [ ] Import ordering is consistent across files (auto-fixable: `npm run lint -- --fix`)
- [ ] `grep -rn "eslint-disable" src/ | wc -l` — count is reduced from current baseline
