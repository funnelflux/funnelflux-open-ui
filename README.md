# FunnelFlux Open UI

Open-source React UI for the [FunnelFlux](https://funnelflux.com) tracking platform. This is the v2 frontend that provides campaign management, visual funnel building, reporting, and analytics dashboards.

## Tech Stack

- **React 19** + **TypeScript 5.9** — UI framework
- **Vite 8** — build tooling and dev server
- **pnpm 10.11** — package manager (locked in `package.json`)
- **Ant Design 6** — component library (wrapped in `src/components/ui-kit/`)
- **TanStack React Query 5** — server state and data fetching
- **Zustand 5** — client-side UI state management
- **Tailwind CSS 4** — utility-first styling
- **react-hook-form 7** + **Zod 4** — form state and validation
- **@xyflow/react 12** — visual funnel builder canvas
- **Recharts 3** — charts and data visualization
- **date-fns 4** — date manipulation

## Prerequisites

- **Node.js 22+**
- **pnpm 10.11.1** (use Corepack: `corepack enable && corepack prepare pnpm@10.11.1 --activate`)
- A running FunnelFlux backend on port 8080 (for development)

## Setup

```bash
git clone https://github.com/nicosistemas/funnelflux-open-ui.git
cd funnelflux-open-ui
pnpm install
cp .env.example .env   # configure API endpoint and other settings
pnpm run dev
```

## Development

```bash
pnpm run dev       # start Vite dev server on http://localhost:5173
```

The dev server proxies `/admin/*` requests to `http://localhost:8080`, so you need the FunnelFlux backend running locally. The UI is served under the `/v2-ui/` base path.

## Build

```bash
pnpm run build     # runs tsc -b && vite build, outputs to dist/
```

The build output in `dist/` is deployed into the parent FunnelFlux application's `v2-ui/` folder.

## Testing

```bash
pnpm test
pnpm run test:watch
```

## Linting

```bash
pnpm run lint      # ESLint
```

## Key directories

| Path | Purpose |
|------|---------|
| `src/components/ui-kit/` | Design system (Ant Design wrappers) |
| `src/components/ui-kit/data-table/` | DataTable + column helpers |
| `src/components/funnel-builder/` | Visual funnel editor |
| `src/lib/entity-table/` | Shared list + drilldown stats engine |
| `src/lib/funnel-graph/` | Funnel validation and hydration helpers |
| `src/api/hooks/` | React Query hooks (one file per entity) |
| `src/pages/` | Page components and controllers |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines, directory structure, and coding patterns. For full project conventions, see [CLAUDE.md](CLAUDE.md).

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for design decisions and system architecture.

## License

MIT
