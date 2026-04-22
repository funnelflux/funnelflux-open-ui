# Contributing to FunnelFlux Open UI

Thank you for your interest in contributing. This guide covers the development setup, project conventions, and patterns you should follow.

## Development Setup

1. **Prerequisites**: Node.js 22+, npm 10+
2. Clone the repository and install dependencies:

```bash
git clone https://github.com/nicosistemas/funnelflux-open-ui.git
cd funnelflux-open-ui
npm install
```

3. Copy `.env.example` to `.env` and configure as needed.
4. Start the dev server:

```bash
npm run dev
```

The Vite dev server runs on `http://localhost:5173` and proxies API requests (`/admin/api/v2`) to `http://localhost:8080`. You need the FunnelFlux backend running locally for the UI to function.

## Directory Structure

| Directory | Purpose |
|-----------|---------|
| `src/api/` | API client (`client.ts`), query keys, and React Query hooks |
| `src/api/hooks/` | One hook file per entity (e.g., `useCampaigns.ts`, `useFunnels.ts`) |
| `src/components/ui/` | Design system primitives (buttons, dialogs, inputs, etc.) |
| `src/components/shared/` | Composed components used across pages (DataTable, PageHeader, DateRangePicker, etc.) |
| `src/components/forms/` | Entity-specific form components |
| `src/components/funnel-builder/` | Visual funnel canvas, nodes, edges, and context menus |
| `src/components/layout/` | App shell and navigation |
| `src/components/dashboard/` | Dashboard-specific components |
| `src/components/drilldown/` | Drilldown reporting components |
| `src/pages/` | Page-level components, one directory per section |
| `src/store/` | Zustand stores (auth, dashboard, drilldown, funnelEditor) |
| `src/schemas/` | Zod validation schemas, one per entity |
| `src/types/` | TypeScript type definitions (api, entities, funnel, stats, ui) |
| `src/hooks/` | Custom React hooks (useAuth, useNotifications) |
| `src/lib/` | Utilities (antd-theme, date-presets, id-generator, utils) |
| `docs/` | Specs, API guides, architecture docs |
| `docs/api-specs/` | OpenAPI YAML specs (data-api, stats-api, ui-api) |

## Patterns to Follow

### State Management

- **Server data**: Use **TanStack React Query** for all data fetched from the API. This handles caching, background refetching, and loading/error states.
- **UI-only state**: Use **Zustand** stores for client-side state that does not come from the server (e.g., auth status, theme preferences, funnel editor canvas state, drilldown filters).
- Do not use React Query for state that is purely local to the UI, and do not use Zustand for server-fetched data.

### UI Components

- Use components from `@/components/ui/` for design system primitives (Button, Dialog, Input, etc.).
- Use components from `@/components/shared/` for composed, reusable pieces (DataTable, PageHeader, ConfirmDialog, SearchInput, etc.).
- The UI primitives are based on **Ant Design**. Do not introduce shadcn/ui, Material UI, or other component libraries.

### Styling

- Use **Tailwind CSS** utility classes for layout and styling.
- Use design tokens from `src/styles/design-tokens.css` for colors and spacing when available. Do not hardcode hex color values outside of token files.
- Use `clsx` or `tailwind-merge` for conditional class composition.

### Date Handling

- Use **date-fns** for all date manipulation (formatting, parsing, comparison, arithmetic).
- `dayjs` exists in the dependency tree only because Ant Design's DatePicker uses it internally. Do not use dayjs directly in application code.

### New Entity Pages

Follow the existing entity page pattern. Reference `src/pages/campaigns/CampaignsPage.tsx` as the canonical example:

1. Create a directory under `src/pages/` for the entity.
2. The main page component handles data fetching via React Query hooks, renders a data table, and provides CRUD actions through modals/drawers.
3. Add Zod schemas in `src/schemas/` for form validation.
4. Add TypeScript types in `src/types/entities.ts`.

### New API Hooks

Each entity gets its own hook file in `src/api/hooks/`. Follow the existing pattern in files like `useCampaigns.ts`:

- Export query hooks (`useQuery`-based) for fetching data.
- Export mutation hooks (`useMutation`-based) for create, update, delete, and clone operations.
- Use the shared API client from `@/api/client.ts`.
- Re-export from `src/api/hooks/index.ts`.

### Import Aliases

Always use the `@/` import alias for imports within `src/`. This is configured in both `vite.config.ts` and `tsconfig.json`.

```tsx
// Correct
import { Button } from '@/components/ui/button'

// Wrong
import { Button } from '../../../components/ui/button'
```

## Component Directory Guide

### `src/components/ui/`

Design system primitives -- low-level building blocks like Button, Dialog, Input, Select, Tabs, Tooltip. These wrap or extend Ant Design components with project-specific defaults. Changes here affect the entire application.

### `src/components/shared/`

Composed components that combine multiple primitives and are reused across different pages. Examples: DataTable (data grid wrapper), PageHeader (page title + actions), DateRangePicker, ConfirmDialog, SearchInput. If you are building something that will be used on more than one page, it belongs here.

### `src/components/forms/`

Entity-specific form components. Each form is tightly coupled to a single entity type and its Zod schema. Examples: PageForm, TrafficSourceForm. These use react-hook-form with Zod resolvers.

### `src/components/funnel-builder/`

Everything related to the visual funnel canvas: the canvas itself (FunnelCanvas), custom nodes, custom edges, context menus, condition editors, and the entity picker dialog. Built on @xyflow/react.

## Performance Rules

Tables in this application can render thousands of rows. Unstable references in hooks and effects cause cascading re-renders and can freeze the UI. These rules are mandatory:

1. **Memoize column definitions** -- always wrap `columnDefs` arrays in `useMemo` with stable dependencies.
2. **Use refs for callbacks in memoized values** -- action handlers that reference mutations or toast functions change identity every render. Use `useRef` to hold the latest callback and reference the ref in memoized values.
3. **Never put derived arrays/objects in `useEffect` dependencies** -- `.filter()`, `.map()`, and spread operators create new references every render.
4. **Guard expensive API calls in effects** -- if a `useEffect` calls grid APIs or writes to localStorage, diff previous vs. current state and only act on actual changes.

See the "Performance Rules for Hooks & Effects" section in `CLAUDE.md` for detailed examples.

## Running Tests

```bash
npm test            # run test suite
npm run test:watch  # run tests in watch mode
```

## Pull Request Checklist

Before submitting a pull request, verify:

- [ ] `npm run build` passes with no errors
- [ ] `npm run lint` passes with no warnings or errors
- [ ] No TODO placeholders remain in completed code
- [ ] Changes are scoped to what was requested
- [ ] New components follow existing patterns (check similar pages/components)
- [ ] Design tokens used for colors/spacing -- no hardcoded hex values outside token files
- [ ] No unstable references in `useEffect` dependencies (no inline `.filter()`, `.map()`, object literals)
- [ ] `columnDefs` and expensive computations wrapped in `useMemo` with stable dependencies
- [ ] Action handlers in memoized column definitions use the `useRef` pattern
- [ ] Import alias `@/` used for all `src/` imports
