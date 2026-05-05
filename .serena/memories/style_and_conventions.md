# Style And Conventions

Rules:
- Package manager is pnpm pinned to 10.11. Do not use npm/yarn or replace `pnpm-lock.yaml`.
- Do not commit or push without explicit permission.
- Build, lint, and test before committing.
- Do not leave TODO placeholders in completed code.
- Use `@/` alias for imports from `src/`; avoid deep relative `../../../` chains.
- Follow existing entity page pattern, especially `src/pages/campaigns/CampaignsPage.tsx`.
- Use shared primitives from `@/components/ui-kit`; do not add new UI libraries.

State/API:
- Server data belongs in React Query hooks under `src/api/hooks/`.
- Client UI state belongs in Zustand stores under `src/store/`.
- Add query keys in `src/api/queryKeys.ts`; avoid ad hoc literal query key arrays.
- Use `api.postDrilldown(...)` for drilldown report requests to preserve bigint-safe parsing.
- Generated API types under `src/api/generated/` or `src/types/generated/` should be regenerated, not hand-edited.

UI/styling:
- Tailwind utilities for layout.
- Use CSS variables from `src/styles/design-tokens.css` for colors/spacing; avoid hardcoded hex outside token files.
- Compose conditional classes with `clsx` or `tailwind-merge`.
- Dates: use date-fns and `@date-fns/tz`. Do not import dayjs in app code; it is only present for AntD DatePicker.

Performance:
- Memoize table `columnDefs` with `useMemo`; bare arrays in component bodies can cause grid thrash.
- Use refs to break unstable callback dependency chains inside memoized table/action values.

Linting:
- ESLint flat config for TS/TSX, react-hooks, react-refresh, jsx-a11y warnings; ignores `dist` and `.claude`.