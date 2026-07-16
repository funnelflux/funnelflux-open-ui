---
name: project-context
description: Use when orienting within this React and TypeScript administrative UI.
---

# Project Context

## System context

This repository is a React SPA. It builds to `dist/` and uses its configured API path at runtime.

## Application layers

```
App.tsx (root)
├── ConfigProvider (Ant Design theme — light/dark via useThemeStore)
├── QueryClientProvider (react-query — server state cache)
├── ToastProvider (notification system)
├── BrowserRouter (basename: /v2-ui)
│   ├── AuthGate (session check → LoginPage or children)
│   └── AppLayout (nav + Outlet)
│       └── Routes → Page components
└── Public design-system route (lazy-loaded)
```

## State management

| Store | File | Purpose |
|-------|------|---------|
| Auth | `src/store/auth.ts` | Session, profile, permissions, and backend licensing state |
| Theme | `src/store/theme.ts` | Light/dark mode toggle, persists to localStorage |
| Dashboard | `src/store/dashboard.ts` | Dashboard widget state |
| Drilldown | `src/store/drilldown.ts` | Report filters, groupings, saved views |
| Funnel Editor | `src/store/funnelEditor.ts` | Canvas state (nodes, edges, selection) |

Server state (entity lists, report data) is managed by react-query, not Zustand.

## API layer

- All API calls go through `src/api/client.ts`
- OpenAPI specs for type generation: `api-specs/*-api.yaml`

## Design token system

```
src/styles/design-tokens.css   → CSS custom properties (single source of truth)
src/lib/antd-theme.ts          → Ant Design JS tokens (hex duplicates of CSS vars)
src/lib/chart-theme.ts         → Recharts color palette + tooltip/grid/axis styles
```

Dark mode: `useThemeStore` toggles `.dark` class on `<html>`, CSS vars swap values, Ant Design switches to `darkAlgorithm`.

## Domain glossary

| Term | Definition | Used in |
|------|-----------|---------|
| Campaign | Top-level entity that owns one or more funnels and a traffic source | `src/pages/campaigns/`, `src/schemas/campaign.ts` |
| Funnel | Directed graph of nodes and connections defining a visitor's path | `src/store/funnelEditor.ts`, `src/components/funnel-builder/` |
| Node | A vertex in a funnel graph — types: Root, Lander, Offer, Rotator, Condition, JsCode, PhpCode, ExternalUrl, VisitorTag | `src/components/funnel-builder/nodes/` |
| Connection | A directed edge between two nodes, with type-specific routing params | `src/components/funnel-builder/edges/` |
| Lander | A landing page entity — the first page a visitor sees | `src/pages/landers/` |
| Offer | A monetizable destination page (affiliate offer, product, etc.) | `src/pages/offers/` |
| Traffic Source | Where traffic originates — defines tracking parameters | `src/pages/traffic-sources/`, `src/schemas/trafficSource.ts` |
| Offer Source | The affiliate network or platform hosting offers | `src/pages/offer-sources/`, `src/schemas/offerSource.ts` |
| Rotator | A node that distributes traffic among its children by weight | `src/components/funnel-builder/nodes/RotatorNode.tsx` |
| Condition | A rule set that routes traffic based on visitor attributes | `src/components/funnel-builder/ConditionEditor.tsx`, `src/schemas/condition.ts` |
| Global Condition | A condition reusable across funnels | `src/pages/settings/GlobalConditionsPage.tsx` |
| Visitor Tag | A key-value label applied to visitors for segmentation | `src/pages/settings/TagsPage.tsx` |
| Traffic Filter | Rules to block/allow traffic (bots, IPs, referrers, etc.) | `src/pages/settings/TrafficFiltersPage.tsx`, `src/schemas/trafficFilter.ts` |
| Drilldown Report | Analytics report that groups stats hierarchically | `src/pages/reports/`, `src/store/drilldown.ts` |
| QuickView | Lightweight stats overlay for quick campaign performance checks | `src/pages/quickview/` |
| Heatmap | Visual overlay on funnel canvas showing click/conversion volumes per node | `src/components/funnel-builder/HeatmapOverlay.tsx` |
| System Links | Generated tracking URLs for a campaign + traffic source combination | `src/pages/links/SystemLinksPage.tsx` |
| Stored Links | Saved/named tracking link configurations | `src/pages/links/StoredLinksPage.tsx` |
| API contract | Committed OpenAPI input for this UI | `src/api/client.ts`, `api-specs/` |
| Design Tokens | CSS custom properties in `src/styles/design-tokens.css` | `src/styles/design-tokens.css` |
| UI Kit | Shared component library at `src/components/ui-kit/` | `src/components/ui-kit/` |
