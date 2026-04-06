# Architecture Overview

## System Context

This is the `funnelflux-open-ui` submodule — a React SPA that replaces the legacy PHP/jQuery admin at `/admin`. It builds to `dist/` and is served at `/v2-ui/` by the parent FunnelFlux installation. All data comes from the V2 REST API at `/admin/api/v2/`.

## Application Layers

```
App.tsx (root)
├── ConfigProvider (Ant Design theme — light/dark via useThemeStore)
├── QueryClientProvider (react-query — server state cache)
├── ToastProvider (notification system)
├── BrowserRouter (basename: /v2-ui)
│   ├── AuthGate (session check → LoginPage or children)
│   └── AppLayout (nav + Outlet)
│       └── Routes → Page components
└── DesignSystemPage (dev-only, lazy-loaded)
```

## Routing

- `react-router-dom` v7 with `<BrowserRouter basename="/v2-ui">`
- Routes defined in `src/App.tsx` inside `AppRoutes()`
- Permission-guarded routes use `PermissionGuard` wrapper
- Funnel editor: `/campaigns/:campaignId/funnels/:funnelId`

## State Management

| Store | File | Purpose |
|-------|------|---------|
| Auth | `src/store/auth.ts` | User session, permissions, API key |
| Theme | `src/store/theme.ts` | Light/dark mode toggle, persists to localStorage |
| Dashboard | `src/store/dashboard.ts` | Dashboard widget state |
| Drilldown | `src/store/drilldown.ts` | Report filters, groupings, saved views |
| Funnel Editor | `src/store/funnelEditor.ts` | Canvas state (nodes, edges, selection) |

Server state (entity lists, report data) is managed by react-query, not Zustand.

## API Layer

```
src/api/
├── client.ts        # Fetch wrapper — base URL, auth, error handling
├── queryKeys.ts     # Query key factory for cache management
└── hooks/           # One file per entity (22 hook files)
    ├── useCampaigns.ts
    ├── useDrilldown.ts
    └── ...
```

- All API calls go through `src/api/client.ts`
- Auth: `apiKey` query parameter on every request
- Dev proxy: Vite forwards `/admin/api/v2` to `localhost:8080`

## Component Architecture

### UI Kit (`src/components/ui-kit/`)

Design system components — the preferred building blocks:

| Component | Purpose |
|-----------|---------|
| `PageShell` | Standard page wrapper (title, breadcrumbs, actions) |
| `DataGrid` | AG Grid wrapper with FunnelFlux theme + column helpers |
| `TreeDataGrid` | AG Grid with tree/hierarchy support |
| `FormField` | Consistent form field layout (label, input, error) |
| `SearchToolbar` | Filter/search bar for entity lists |
| `StatCard` | Metric card for dashboards |
| `EmptyState` | Empty list placeholder |
| `ConfirmModal` | Destructive action confirmation dialog |
| `toast` | Toast notification API |

### Funnel Builder (`src/components/funnel-builder/`)

Visual funnel editor built on @xyflow/react:

- 9 node types in `nodes/` (Root, Lander, Offer, Rotator, Condition, JsCode, PhpCode, ExternalUrl, VisitorTag)
- 4 edge types in `edges/` (Action, Code, Weighted, Condition)
- Context menus for nodes, edges, and canvas
- Condition editor for rule-based routing
- Heatmap overlay for stats visualization

## Design Token System

```
src/styles/design-tokens.css   → CSS custom properties (single source of truth)
src/lib/antd-theme.ts          → Ant Design JS tokens (hex duplicates of CSS vars)
src/lib/chart-theme.ts         → Recharts color palette + tooltip/grid/axis styles
src/styles/ag-grid-theme.css   → AG Grid CSS overrides using token vars
```

Dark mode: `useThemeStore` toggles `.dark` class on `<html>`, CSS vars swap values, Ant Design switches to `darkAlgorithm`.

## Build & Deploy

- Vite builds to `dist/` with `base: '/v2-ui/'`
- Parent project copies `dist/` to its `v2-ui/` directory via `build-ui.sh`
- No SSR — pure client-side SPA
