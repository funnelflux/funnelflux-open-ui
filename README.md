# FunnelFlux Open UI

A modern **React 19 + TypeScript** admin UI for the
[FunnelFlux](https://funnelflux.com) self-hosted tracking platform. It provides
campaign management, a visual funnel builder, reporting, drilldown analytics, and
dashboards — and is served by the FunnelFlux self-hosted application under the
`/v2-ui/` path.

> **License:** [Elastic License 2.0](./LICENSE) (source-available). You may use,
> modify, self-host, and redistribute this software freely. You may **not** resell
> it or offer it to third parties as a hosted/managed commercial service. See
> [License](#license).

## How this repo fits FunnelFlux self-hosted

This is a standalone repository that lives as a **git submodule** at
`funnelflux-open-ui/` inside the [FunnelFlux self-hosted] application. You clone
or update it independently, build it, and the output is deployed to the parent's
`v2-ui/` folder. See [Installing & updating in your FunnelFlux install](#installing--updating-in-your-funnelflux-install).

## Tech Stack

- **React 19** + **TypeScript 5.9** — UI framework
- **Vite 8** — build tooling and dev server
- **Ant Design 6** — component library (wrapped in `src/components/ui-kit/`)
- **TanStack React Query 5** — server state and data fetching
- **Zustand 5** — client-side UI state
- **Tailwind CSS 4** + CSS design tokens — styling
- **react-hook-form 7** + **Zod 4** — forms and validation
- **@xyflow/react 12** — visual funnel builder canvas
- **Recharts 3** — charts
- **date-fns 4** — date manipulation

## Prerequisites

- **Node.js 22+**
- **pnpm** (this project is pinned to a specific pnpm version via
  `package.json#packageManager`). Install with `corepack enable` or see
  [pnpm.io/installation](https://pnpm.io/installation). Do **not** use `npm` or `yarn`.
- A running FunnelFlux self-hosted backend (default `http://localhost:8080`) for development.

## Quick Start (development)

```bash
git clone https://github.com/funnelflux/funnelflux-open-ui.git
cd funnelflux-open-ui
pnpm install
cp .env.example .env     # configure API endpoint / base path if needed
pnpm run dev             # Vite dev server on http://localhost:5173
```

The dev server proxies `/admin/*` (PHP login + V2 API) to your backend so session
cookies share an origin. Configure the target via `VITE_DEV_API_TARGET` (see
`.env.example`).

## Common Scripts

```bash
pnpm run dev        # dev server (port 5173)
pnpm run build      # tsc -b && vite build → dist/
pnpm run preview    # serve the built dist/
pnpm run lint       # ESLint
pnpm test           # vitest (single pass)
pnpm run test:watch # vitest watch mode
```

## Project Layout & Conventions

The full architecture, directory map, state-management rules, performance rules,
and coding conventions live in **[`AGENTS.md`](./AGENTS.md)**. `AGENTS.md` is the
canonical project guide; contributors who use Claude Code can mirror it with:

```bash
./scripts/setup-ai-symlinks.sh install
```

## Installing & updating in your FunnelFlux install

The UI ships as a submodule of FunnelFlux self-hosted. You can either **track the
latest** code or **pin to a released version** (recommended for production).

### Option A — Pin to a released version (recommended)

Releases are tagged using [semantic versioning](https://semver.org/) (`vMAJOR.MINOR.PATCH`).
Pinning to a tag gives you a stable, reproducible build:

```bash
cd funnelflux-open-ui
git fetch --tags
git checkout v1.2.0          # replace with the version you want
```

### Option B — Track the latest

```bash
cd funnelflux-open-ui
git checkout master
git pull origin master       # latest reviewed code on the default branch
```

> Browse available versions on the
> [Releases page](https://github.com/funnelflux/funnelflux-open-ui/releases) or with
> `git tag --list`.

### Build & deploy into the parent

From the **FunnelFlux self-hosted root**, run the bundled build script, which
builds this UI and deploys the output into `v2-ui/`:

```bash
./scripts/build-v2-ui.sh
```

Or build manually from this directory (output lands in `dist/`, which the parent
serves under `/v2-ui/`):

```bash
cd funnelflux-open-ui
pnpm install
pnpm run build
```

After deploying, clear OPcache on the backend if your install requires it
(`curl http://<your-host>/admin/clear-opcache.php`).

## Contributing

Contributions are welcome via **fork & pull request** — see
[CONTRIBUTING.md](./CONTRIBUTING.md). Please open an
[issue](https://github.com/funnelflux/funnelflux-open-ui/issues) or a
[discussion](https://github.com/funnelflux/funnelflux-open-ui/discussions) first
for anything non-trivial.

## Security

Found a vulnerability? Please report it privately — see [SECURITY.md](./SECURITY.md).
Do not open a public issue for security problems.

## License

Distributed under the **[Elastic License 2.0](./LICENSE)**. In short: free to use,
modify, self-host, and redistribute — but you may not resell the software or offer
it to others as a hosted/managed commercial service. This is a *source-available*
license, not an OSI-approved open-source license.

[FunnelFlux self-hosted]: https://funnelflux.com
