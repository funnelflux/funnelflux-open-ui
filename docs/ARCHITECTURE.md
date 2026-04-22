# Architecture

This document explains the key architectural decisions in FunnelFlux Open UI and the reasoning behind them.

## State Management: Zustand + React Query

The application uses two complementary state management solutions:

**TanStack React Query** handles all server state -- data fetched from the FunnelFlux API. React Query provides automatic caching, background refetching, optimistic updates, and stale-while-revalidate semantics. Every entity (campaigns, funnels, pages, offers, traffic sources, etc.) has dedicated hooks in `src/api/hooks/` that wrap React Query's `useQuery` and `useMutation`.

**Zustand** handles UI-only state that has no server-side representation:

- `src/store/auth.ts` -- authentication status and user session
- `src/store/dashboard.ts` -- dashboard layout preferences and filter state
- `src/store/drilldown.ts` -- drilldown report configuration (selected dimensions, date ranges, sorting)
- `src/store/funnelEditor.ts` -- funnel builder canvas state (selected nodes, zoom level, undo/redo history)

**Why two solutions?** Server state and UI state have fundamentally different lifecycles. Server state is shared, asynchronous, and needs cache invalidation. UI state is local, synchronous, and ephemeral. Trying to force both into one system (e.g., Redux for everything) creates unnecessary complexity. React Query is purpose-built for server state; Zustand is minimal and ergonomic for the rest.

**Why Zustand over Redux/Jotai/Recoil?** Zustand has minimal boilerplate, no providers or context wrappers, a tiny bundle size, and works naturally with React's concurrent features. The stores in this project are small and focused -- Zustand's simplicity is a good fit.

## UI Library: Ant Design

The application uses **Ant Design 6** as its component library.

**Why not shadcn/ui?** shadcn provides unstyled primitives that require significant custom styling work. FunnelFlux is a data-heavy enterprise application with complex tables, forms, date pickers, and tree structures. Ant Design ships production-ready versions of all these components with consistent behavior, accessibility, and theming. The time saved on not building and maintaining custom implementations of complex components (cascading selects, tree tables, transfer lists, etc.) is substantial.

**Why not Material UI?** MUI's design language is opinionated toward Google's Material Design aesthetic. Ant Design's visual style is more neutral and enterprise-oriented, which fits a tracking/analytics platform better. Ant Design also has better support for complex data display components that are central to this application.

The `src/components/ui/` directory contains thin wrappers around primitive components (Button, Dialog, Input, etc.) that add project-specific defaults. The `src/components/shared/` directory contains higher-level composed components (DataTable, PageHeader, DateRangePicker) that combine multiple primitives.

## Entity Page Pattern

Every entity in the system (campaigns, funnels, pages, offers, traffic sources, etc.) follows a consistent page structure. The canonical example is `src/pages/campaigns/CampaignsPage.tsx`.

The pattern:

1. **API hooks** (`src/api/hooks/use<Entity>.ts`) -- export query hooks for fetching data and mutation hooks for CRUD operations. These use the shared API client from `src/api/client.ts`.
2. **Zod schema** (`src/schemas/<entity>.ts`) -- defines the validation schema for the entity's form, used with react-hook-form's Zod resolver.
3. **Types** (`src/types/entities.ts`) -- TypeScript interfaces for the entity's API shape.
4. **Page component** (`src/pages/<entity>/<Entity>Page.tsx`) -- the main page that ties everything together:
   - Fetches data via React Query hooks
   - Renders a data table (DataTable or TreeDataTable from `src/components/shared/`)
   - Provides search, filtering, and date range controls
   - Handles create/edit via modal forms
   - Handles delete with confirmation dialogs
   - Handles clone operations
5. **Form component** (either inline in the page or in `src/components/forms/`) -- the create/edit form using react-hook-form with Zod validation.

When adding a new entity, follow this same structure. Do not invent a new pattern.

## Date Library Strategy

The application uses **date-fns** as its primary date library. All date formatting, parsing, comparison, and arithmetic throughout the codebase should use date-fns functions.

**dayjs** is present in the dependency tree only because Ant Design's DatePicker component uses it internally. dayjs is not used directly in application code -- it is isolated to the Ant Design DatePicker wrapper layer.

**Why date-fns over dayjs/Luxon/Moment?** date-fns is tree-shakeable (import only what you use), immutable by default, and works with native JavaScript Date objects rather than wrapping them. This keeps the bundle size small and avoids the cognitive overhead of converting between wrapper types.

Date presets for common ranges (today, last 7 days, last 30 days, etc.) are defined in `src/lib/date-presets.ts`.

## Pagination Mode Toggle

The application supports two pagination modes:

- **Client-side pagination** (default): all rows are fetched from the API and pagination/sorting/filtering happens in the browser. This is suitable for most entity tables where the total row count is manageable (up to a few thousand).
- **Server-side pagination** (optional): pagination, sorting, and filtering are delegated to the API. This is enabled per entity page via a `localStorage` flag.

The default is client-side pagination because it provides a snappier user experience for typical data volumes -- instant sorting and filtering without network round-trips. Server-side pagination is available as an escape hatch for accounts with very large datasets.

## Component Boundaries

### `src/components/ui/`

These are design system **primitives** -- the lowest-level building blocks. Each file exports a single component that wraps or extends a base component (typically from Ant Design) with project-specific defaults (sizing, color tokens, accessibility attributes).

Examples: Button, Dialog, Input, Select, Tabs, Tooltip, Badge, Switch.

**Rule**: These components should have no business logic and no knowledge of specific entities or pages. They are purely presentational.

### `src/components/shared/`

These are **composed** components that combine multiple primitives and/or add behavior that is reused across multiple pages. They may contain moderate logic (e.g., DataTable manages column visibility and pagination state) but should not be coupled to a specific entity.

Examples: DataTable, TreeDataTable, PageHeader, DateRangePicker, SearchInput, ConfirmDialog, EmptyState, RowActionsMenu, TimezoneSelector.

**Rule**: If a component is used on more than one page, it belongs in `shared/`. If it is used on exactly one page, keep it co-located with that page. If it is a bare primitive with no composed behavior, it belongs in `ui/`.

### `src/components/forms/`

Entity-specific form components that are tightly coupled to a Zod schema and a particular entity type. These use react-hook-form with the Zod resolver.

### `src/components/funnel-builder/`

Everything related to the visual funnel canvas, built on @xyflow/react. This is a self-contained subsystem with its own nodes, edges, context menus, and state management (via the `funnelEditor` Zustand store).
