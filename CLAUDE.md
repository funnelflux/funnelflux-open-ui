# FunnelFlux Open UI

## Rules

1. Use `pnpm` for all package management — never `npm` or `yarn` (the lockfile is `pnpm-lock.yaml`)
2. Build before committing: `pnpm build`
3. Lint before committing: `pnpm lint`
4. Follow existing component patterns — check `src/pages/campaigns/CampaignsPage.tsx` for entity pages, `src/components/ui-kit/` for shared components
5. Use the `@/` import alias for all src imports (configured in vite.config.ts + tsconfig)
6. Do not commit or push without explicit permission
7. Do not leave TODO placeholders in completed code

## System Overview

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | React 19 + TypeScript 5.9 | UI components |
| Build | Vite 8 | Dev server + bundling |
| Routing | react-router-dom 7 | Client-side routing |
| State | Zustand 5 | Global stores (auth, dashboard, drilldown, funnelEditor, theme) |
| Data Fetching | @tanstack/react-query 5 | Server state + caching |
| UI Library | Ant Design 6 | Component library (buttons, forms, modals, etc.) |
| Data Tables | @tanstack/react-table 8 + @tanstack/react-virtual 3 | `DataTable` in `src/components/ui-kit/data-table/` with client/server sorting, pagination, column resizing, row selection, tree mode, and row virtualization |
| Styling | Tailwind CSS 4 + CSS design tokens | Utility-first CSS + `src/styles/design-tokens.css` |
| Forms | react-hook-form 7 + Zod 4 | Validation + form state |
| Canvas | @xyflow/react 12 | Funnel builder (nodes/edges) |
| Charts | Recharts 3 | Dashboard + reporting charts |
| Theming | Zustand + CSS vars + Ant Design | Light/dark mode via `useThemeStore` |

## Build, Test & Lint

```bash
pnpm build    # tsc -b && vite build
pnpm dev      # Vite dev server on :5173 (proxies /admin/api/v2 to :8080)
pnpm lint     # ESLint
```

## Directory Structure

| Directory | Purpose |
|-----------|---------|
| `src/api/` | API client (`client.ts`), query keys, hooks (one hook file per entity) |
| `src/api/hooks/` | React Query hooks — one file per entity (e.g. `useCampaigns.ts`) |
| `src/components/ui-kit/` | Design system components (DataTable, PageShell, FormField, etc.) |
| `src/components/ui-kit/data-table/` | TanStack-based `DataTable`, column factories, and `data-table.css` |
| `src/components/funnel-builder/` | Funnel canvas: nodes, edges, context menus, conditions |
| `src/components/forms/` | Entity-specific form components |
| `src/components/shared/` | Legacy shared components (DataTable, DateRangePicker, etc.) |
| `src/components/layout/` | App shell, navigation |
| `src/pages/` | Page-level components, one dir per section |
| `src/store/` | Zustand stores (auth, dashboard, drilldown, funnelEditor, theme) |
| `src/schemas/` | Zod validation schemas per entity |
| `src/types/` | TypeScript type definitions (api, entities, funnel, stats, ui) |
| `src/hooks/` | Custom React hooks (useAuth, useNotifications) |
| `src/lib/` | Utilities (antd-theme, chart-theme, date-presets, id-generator, utils) |
| `src/styles/` | CSS: `design-tokens.css` (color/spacing vars) |
| `docs/` | Specs, API guides, exec plans |
| `docs/api-specs/` | OpenAPI YAML specs (data-api, stats-api, ui-api) |

## Context Map

| Working on... | Read these |
|---------------|-----------|
| Active gotchas & non-obvious rules | `docs/_ai_context/hot-memory.md` |
| New entity page | `docs/REACT_UI_EXEC_PLAN.md`, `src/pages/campaigns/CampaignsPage.tsx` |
| UI kit components | `src/components/ui-kit/index.ts`, `src/components/ui-kit/CLAUDE.md`, `src/styles/design-tokens.css` |
| Data tables (`DataTable`) | `src/components/ui-kit/data-table/`, `src/components/ui-kit/CLAUDE.md` |
| API integration | `docs/FUNNEL_API_GUIDE.md`, `docs/api-specs/`, `src/api/client.ts` |
| Funnel builder | `src/store/funnelEditor.ts`, `src/components/funnel-builder/`, `src/components/funnel-builder/CLAUDE.md` |
| Reporting/stats | `src/store/drilldown.ts`, `src/api/hooks/useDrilldown.ts` |
| Theming/dark mode | `src/styles/design-tokens.css`, `src/lib/antd-theme.ts`, `src/store/theme.ts` |
| Charts | `src/lib/chart-theme.ts` |
| Hooks/effects with tables | `docs/_ai_context/performance-hooks-rules.md` |
| Code quality | `docs/_ai_context/code-quality-guidelines.md` |
| Architecture | `docs/_ai_context/architecture-overview.md` |
| Debugging | `docs/_ai_context/debugging-methodology.md` |
| Planning | `docs/_ai_context/work-planning-process.md` |
| Terminology | `docs/_ai_context/_glossary.md` |
| Authoring AI context docs | `docs/_ai_context/context-engineering-guide.md` |

## Performance Rules for Hooks & Effects

When touching `DataTable`, `useEffect`, or any `columns` / controlled-state
code, read `docs/_ai_context/performance-hooks-rules.md` first. The
verification checklist below enforces the non-negotiable rules from that doc.

## Verification Checklist

Before marking work as complete, verify:
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes
- [ ] No TODO placeholders remain in completed code
- [ ] Changes are scoped to what was requested
- [ ] New components follow existing patterns (check similar pages/components)
- [ ] Design tokens used for colors/spacing — no hardcoded hex values outside token files
- [ ] No unstable references in useEffect deps (no inline `.filter()`, `.map()`, object literals)
- [ ] `columns` arrays passed to `DataTable` are wrapped in `useMemo` with stable deps
- [ ] Action handlers inside memoized `columns` use the `useRef` pattern, not direct mutation/toast refs
- [ ] Controlled `sorting` / `rowSelection` / `pagination` / `columnVisibility` state is owned by the parent, not derived inline each render

## Hot Memory Protocol

`docs/_ai_context/hot-memory.md` is the runtime source of truth for non-obvious operational knowledge.

Mandatory update triggers:
- Root cause found for a bug/regression.
- Agent made a wrong assumption and corrected it.
- Tooling/infra trap caused avoidable failure or confusion.
- Business-logic constraint was discovered that is not obvious from code/API names.

Entry requirements:
- Add date (`YYYY-MM-DD`), scope, status (`active`, `resolved`, or `superseded`), and concrete rule/gotcha.
- Keep entries short and action-oriented; include file paths/commands when useful.
- When resolving/superseding an entry, do not delete history silently. Mark status and link replacement.

Consolidation:
- Prune stale items, merge duplicates, and move old resolved entries to `docs/_ai_context/memory-archive.md`.
- Keep hot memory lean: current truths and active risks only.
