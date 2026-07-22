# Contributing to FunnelFlux Open UI

Thanks for your interest in improving the FunnelFlux Open UI! This guide covers
how to propose changes, set up your environment, and the conventions to follow.

> **License note:** this project is **source-available** under the
> [Elastic License 2.0](./LICENSE). Use and distribution are governed by the
> complete license terms. By contributing you agree your contributions are licensed under the
> same terms (see [Contribution licensing](#contribution-licensing)).

## Ways to Contribute

- **Report a bug** or **request a feature** —
  [open an issue](https://github.com/funnelflux/funnelflux-open-ui/issues/new/choose).
- **Ask a question / discuss an idea** —
  [Discussions](https://github.com/funnelflux/funnelflux-open-ui/discussions).
- **Submit code** — via a pull request from your fork (see below).

## Contribution Workflow (Fork & Pull Request)

You cannot push directly to this repository. Every change lands through a pull
request that a maintainer reviews and merges.

1. **Fork** the repo to your own account.
2. **Clone** your fork, fetch the canonical repository, and branch from `develop`:
   ```bash
   git clone https://github.com/<your-username>/funnelflux-open-ui.git
   cd funnelflux-open-ui
   git remote add upstream https://github.com/funnelflux/funnelflux-open-ui.git
   git fetch upstream --prune
   git switch -c feat/short-description upstream/develop
   ```
3. **Make your changes**, following the conventions below and the full guide in
   [`AGENTS.md`](./AGENTS.md).
4. **Verify locally** — CI runs these exact checks and they must pass:
   ```bash
   pnpm install --frozen-lockfile
   pnpm run check-generated-types:committed
   pnpm run lint
   pnpm run build:ci
   pnpm test
   ```
5. **Commit** using [Conventional Commits](#commit-message-convention) and sign
   off (`-s`) to certify the DCO:
   ```bash
   git commit -s -m "feat(table): add column pinning"
   ```
6. **Push** to your fork and open the pull request against `develop`:
   ```bash
   git push -u origin feat/short-description
   gh pr create --repo funnelflux/funnelflux-open-ui --base develop
   ```
   Outside contributor PRs do not target `master`; that branch only receives the
   canonical `develop -> master` release PR.
7. A maintainer reviews. Push more commits to the same branch to address
   feedback. Once approved and CI is green, a maintainer merges.

## Development Setup

- **Prerequisites:** Node.js 22+, and **pnpm** (pinned via
  `package.json#packageManager`; `corepack enable` is the easiest way to get the
  right version). Do **not** use `npm` or `yarn` — the lockfile is `pnpm-lock.yaml`.

```bash
pnpm install --frozen-lockfile
cp .env.example .env    # configure API endpoint / base path if needed
bash scripts/setup-git-hooks.sh # enable pre-commit and pre-push quality gates
pnpm run dev            # Vite dev server on http://localhost:5173
```

The dev server proxies `/admin/*` to a running FunnelFlux self-hosted backend
(default `http://localhost:8080`, configurable via `VITE_DEV_API_TARGET`). You
need that backend running for the UI to function.

### AI assistant config (optional)

If you use an AI coding assistant (Cursor, Claude Code, etc.), run the sync
script once to materialize tool-specific config from the canonical sources in
`.ai/` and `AGENTS.md`. The generated folders (`.cursor/`, `.claude/`, …) are
git-ignored:

```bash
bash scripts/setup-ai-harness.sh install
```

## Commit Message Convention

This project uses **[Conventional Commits](https://www.conventionalcommits.org/)**
to keep the contribution history consistent. Maintainers select the version and
prepare the changelog during the release process:

```
<type>(<optional scope>): <description>
```

Common types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`,
`chore`. Use `!` (e.g. `feat!:`) or a `BREAKING CHANGE:` footer to clearly mark
a breaking change.

```
feat(funnel-builder): add condition node duplication
fix(api): parse bigint metrics safely in drilldown
docs: clarify pull-latest vs pull-tag workflow
```

## Project Structure

The authoritative directory map and architecture notes live in
[`AGENTS.md`](./AGENTS.md). High level:

| Directory | Purpose |
|-----------|---------|
| `src/api/` | API client (`client.ts`), `queryKeys.ts`, and React Query hooks |
| `src/api/hooks/` | One hook file per entity (`useCampaigns.ts`, `useFunnels.ts`, …) |
| `src/components/ui-kit/` | Design-system primitives wrapping Ant Design (Button, Modal, Select, `data-table/`, …) |
| `src/components/shared/` | Composed components reused across pages |
| `src/components/forms/` | Entity-specific forms (react-hook-form + Zod) |
| `src/components/funnel-builder/` | Visual funnel canvas, nodes, edges, context menus |
| `src/components/layout/` | App shell and navigation |
| `src/components/dashboard/`, `src/components/drilldown/` | Section-specific components |
| `src/pages/` | Page-level components, one directory per section |
| `src/store/` | Zustand stores (auth, dashboard, drilldown, funnelEditor, tableConfig, theme) |
| `src/schemas/` | Zod validation schemas, one per entity |
| `src/types/` | TypeScript types (api, entities, funnel, stats, ui) |
| `src/lib/` | Utilities, theming, entity-table engine helpers |
| `api-specs/` | OpenAPI YAML specs (input for `pnpm run generate-types`) |
| `.ai/` | Canonical AI harness: rules, skills, agents, exec plans |

## Patterns to Follow

### State management
- **Server data → TanStack React Query** (hooks in `src/api/hooks/`): caching,
  refetching, loading/error states.
- **Client UI state → Zustand** (`src/store/`): auth, theme, drilldown filters,
  funnel canvas, persisted table config.
- Don't use React Query for purely local UI state, or Zustand for server data.

### UI components & styling
- Import design-system primitives from **`@/components/ui-kit`**; import
  `DataTable` and column helpers from `@/components/ui-kit/data-table`.
- These wrap **Ant Design** — do not add shadcn/ui, MUI, or other libraries.
- Use **Tailwind** utilities for layout and **CSS design tokens**
  (`src/styles/design-tokens.css`) for colors/spacing — no hardcoded hex outside
  token files. Compose classes with `clsx` / `tailwind-merge`.

### Dates
- Use **date-fns** (+ `@date-fns/tz`) for all date math. `dayjs` is present only
  transitively for Ant Design's DatePicker — do **not** import it in app code.

### Imports
- Always use the **`@/`** alias for imports within `src/` — no `../../../` chains.

### New entity pages / API hooks
- Follow `src/pages/campaigns/CampaignsPage.tsx` as the canonical entity-page
  example and the entity-table engine in `src/lib/entity-table/`.
- Add new React Query keys to `src/api/queryKeys.ts` (no ad-hoc key arrays).
- Use `api.postDrilldown(...)` for drilldown requests (bigint-safe parsing).

## Performance Rules (mandatory)

Tables render thousands of rows; unstable references cascade into UI freezes.

1. **Memoize `columnDefs`** with `useMemo` and stable deps.
2. **Use `useRef` for callbacks** referenced inside memoized values (mutations,
   toast, reload change identity every render).
3. **Never put derived arrays/objects** (`.filter()`, `.map()`, spreads) in
   `useEffect` dependencies.
4. **Guard expensive effects** — diff previous vs current state before calling
   grid APIs, localStorage, or the network.

See the "Performance Rules for Hooks & Effects" section in [`AGENTS.md`](./AGENTS.md)
for worked examples.

## Pull Request Checklist

- [ ] `pnpm run build` passes
- [ ] `pnpm run lint` passes
- [ ] `pnpm test` passes
- [ ] Commits follow Conventional Commits and are signed off (`git commit -s`)
- [ ] No TODO placeholders remain in completed code
- [ ] Changes are scoped to what was requested
- [ ] New components follow existing patterns
- [ ] Design tokens used for colors/spacing — no hardcoded hex outside token files
- [ ] No unstable references in `useEffect` deps; `columnDefs` memoized; action
      handlers use the `useRef` pattern
- [ ] `@/` import alias used for all `src/` imports
- [ ] Used `pnpm` (never `npm`/`yarn`) for any dependency changes

## Contribution Licensing

By submitting a contribution you certify the
[Developer Certificate of Origin](https://developercertificate.org/) — that you
wrote it or have the right to submit it — and you agree it is licensed under the
[Elastic License 2.0](./LICENSE). Sign off your commits with `git commit -s`.

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). By
participating you agree to uphold it.
