# Code Quality Guidelines

Project-specific conventions and patterns for the FunnelFlux React UI.

## Naming Conventions

- Components: PascalCase (`CampaignsPage.tsx`, `DataGrid.tsx`)
- Hooks: camelCase with `use` prefix (`useCampaigns.ts`, `useAuth.ts`)
- Stores: camelCase (`funnelEditor.ts`, `drilldown.ts`)
- Schemas: camelCase, named by entity (`campaign.ts`, `trafficSource.ts`)
- Types files: camelCase by domain (`api.ts`, `entities.ts`, `funnel.ts`)
- CSS files: kebab-case (`design-tokens.css`, `ag-grid-theme.css`)

## Import Conventions

- Always use `@/` alias for src-relative imports: `import { DataGrid } from '@/components/ui-kit'`
- UI kit primitives/components: import from barrel `@/components/ui-kit`
- Data table system (`DataTable`, column helpers, registry): import from `@/components/ui-kit/data-table`
- Exception: performance-critical bootstrap/layout files may import specific ui-kit modules directly (for example `@/components/ui-kit/ConfigProvider`) to avoid broad barrel coupling
- App code should use ui-kit wrappers; raw AntD imports are only for ui-kit implementation files
- Types: use `import type` for type-only imports

## Component Patterns

### Entity Pages

Follow the pattern in `src/pages/campaigns/CampaignsPage.tsx`:
- Use `PageShell` from ui-kit for consistent page layout
- Use `DataGrid` or `TreeDataGrid` for tabular data
- Use `SearchToolbar` for filtering
- Connect to API via react-query hooks from `src/api/hooks/`

### Forms

- Use react-hook-form with Zod resolver for validation
- Schemas live in `src/schemas/` — one file per entity
- Use `FormField` from ui-kit for consistent field layout
- Use `ConfirmModal` for destructive actions

### API Hooks

Follow the pattern in `src/api/hooks/useCampaigns.ts`:
- One file per entity in `src/api/hooks/`
- Export from barrel `src/api/hooks/index.ts`
- Use query key factory from `src/api/queryKeys.ts`
- Add/extend key factories in `queryKeys.ts` (including `groupingFilterAssets`) instead of ad hoc query key arrays
- Queries use `useQuery`, mutations use `useMutation` with cache invalidation
- Use `api.postDrilldown(...)` for drilldown report calls; do not rely on endpoint substring parsing

### Zustand Stores

Follow the pattern in `src/store/funnelEditor.ts`:
- One store per domain concern
- Export the hook directly: `export const useXxxStore = create<XxxState>(...)`
- Keep actions inside the store, not in components

## Theming and Styling

- Use CSS custom properties from `src/styles/design-tokens.css` — do not hardcode hex values
- Ant Design tokens are duplicated in `src/lib/antd-theme.ts` (Ant cannot read CSS vars)
- Chart colors use `src/lib/chart-theme.ts`
- AG Grid theming via `src/styles/ag-grid-theme.css`
- Dark mode: toggled via `useThemeStore`, applies `.dark` class on `<html>`
- Tailwind utilities reference design token vars (e.g. `bg-[var(--surface)]`)

## Error Handling

- Check every error return — do not discard errors silently
- Use toast notifications (via `useToastApi` from ui-kit) for user-facing errors
- API errors surface through react-query's `onError` callbacks
- Validate inputs at system boundaries (form submission, API responses)
- Do not validate between internal functions that you control

## Testing Patterns

- Test runner is Vitest (`pnpm test`)
- When tests are added, test behavior not implementation
- Prefer real dependencies over mocks when fast and deterministic

## Code Organization

- Follow the existing directory structure and module organization
- Do not create abstractions for one-time operations
- Three similar lines of code is better than a premature abstraction
- Keep changes minimal — only modify what is needed for the current task

## Common Anti-Patterns to Avoid

- Adding error handling for scenarios that cannot happen
- Creating helper utilities used only once
- Adding comments that restate what the code does
- Hardcoding colors/spacing instead of using design tokens
- Importing `DataTable` or data-table helpers from `@/components/ui-kit` instead of `@/components/ui-kit/data-table`
- Importing raw AntD components in app code instead of ui-kit wrappers
- Mixing Ant Design component props with Tailwind styling when the token system already covers it
- Reintroducing `createEntityHooks`-style local key factories that diverge from `queryKeys.ts`
- Calling `api.post('/stats/reporting/drilldown/', ...)` directly instead of `api.postDrilldown(...)`
- Persisting UI-only funnel fields such as `codeEdgeRole` in save payloads
- Over-engineering with feature flags or configuration for simple changes
- Adding backwards-compatibility shims when you can just change the code
