# Project Overview

`funnelflux-open-ui` is the open-source React admin UI for FunnelFlux self-hosted. It is also used as a submodule inside `funnelflux-self-hosted`, with built output served under `/v2-ui`.

Stack:
- React 19.2 + TypeScript 5.9.
- Vite 8, pnpm 10.11, Node 22+ expected.
- React Router 7 with basename `/v2-ui`; lazy routes in `src/App.tsx`.
- Zustand 5 for client/UI state in `src/store/`.
- TanStack Query 5 for API/server state.
- Ant Design 6 wrapped by `src/components/ui-kit/`.
- Tailwind CSS 4 + CSS design tokens in `src/styles/design-tokens.css`.
- react-hook-form + Zod for forms.
- @xyflow/react for funnel builder canvas.
- Recharts for charts; date-fns for dates; dompurify for sanitization.
- Vitest + Testing Library + jsdom.

Runtime:
- Vite dev server defaults to port 5173.
- Dev server proxies `/admin/*` to backend (default `http://localhost:8080`) so session cookies share origin.
- Backend/self-hosted PHP app must be running for functional UI development.

Source layout:
- `src/main.tsx`, `src/App.tsx`, `src/index.css` are entry points.
- `src/api/`: fetch client, auth, query keys, React Query hooks, generated API types.
- `src/components/ui-kit/`: design primitives wrapping AntD.
- `src/components/funnel-builder/`: visual funnel canvas and node/edge components.
- `src/pages/`: lazy page routes; `src/pages/campaigns/CampaignsPage.tsx` is canonical entity-page pattern.
- `src/store/`: auth/dashboard/drilldown/funnelEditor/tableConfig/theme Zustand stores.
- `src/lib/`: pure helpers, theming, charts, entity grid, drilldown, funnel utilities.
- `docs/api-specs/`: OpenAPI YAML input for generated types.

Guidance:
- Root `CLAUDE.md` is primary project guidance.
- Read relevant docs from `docs/_ai_context/` before major code/debug/planning work.