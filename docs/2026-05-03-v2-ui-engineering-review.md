# V2 UI Engineering Review

Date: 2026-05-03

Scope: high-level design and engineering review of the Vite React UI. Focus is on early architectural decisions that affect robustness, testing, side effects, and long-term extensibility. This is not a style or nitpick review.

## Executive Summary

The app is in a good early shape: React Query is used for server state, Zustand for local/editor state, funnel graph rules are moving into pure library code, and some shared entity-page patterns exist. The main risks are not visual or cosmetic. They are boundary risks: API/auth side effects live too low, graph invariants are not enforced at save time, important flows have race/clobber failure modes, and common page patterns are only partially abstracted.

The highest-value changes are:

1. Make the API client side-effect free and move session-expiry handling into an auth/query boundary.
2. Add a pure funnel graph validation layer and block invalid saves.
3. Prevent dirty funnel editor state from being overwritten by React Query refetches.
4. Make drilldown/report requests latest-response-wins.
5. Centralize route permission metadata.
6. Build a small test strategy around contracts and risky workflows, not snapshots.

## Recommended Changes

### 1. Move Auth Redirects Out Of The API Client

Files:

- `src/api/client.ts`
- `src/api/auth.ts`
- `src/hooks/useAuth.ts`
- `src/store/auth.ts`
- `src/App.tsx`

Problem:

`ApiClient` performs `window.location.href` redirects when a non-session request receives `401`. That makes the data layer mutate global browser state, bypasses React auth state, skips React Query cleanup, and makes tests awkward. It also means protected cached data can remain in memory after session expiry.

Suggested change:

- Make `ApiClient` throw typed errors such as `AuthExpiredError` / `ApiHttpError`.
- Add a single session-expired handler near `QueryClientProvider` / `AuthGate`.
- On auth expiry, clear `useAuthStore`, clear or reset React Query cache, then navigate/render login through React.
- Fix `clearAuth` so it clears `error` as well as user/loading state.
- Change request body checks from `body ? JSON.stringify(body) : undefined` to `body !== undefined ? JSON.stringify(body) : undefined`.

Why:

This keeps the API layer pure and makes session behavior deterministic, testable, and recoverable.

Also decide and document the CSRF contract. Since requests use cookie auth via `credentials: 'same-origin'`, the frontend should either inject a CSRF token/header centrally or document that backend SameSite/origin protections are the security boundary.

### 2. Add Save-Time Funnel Graph Validation

Files:

- `src/lib/funnel-graph/connectionRules.ts`
- `src/lib/funnel-graph/*`
- `src/store/funnelEditor.ts`
- `src/lib/funnelApiV2.ts`
- `src/pages/funnels/FunnelEditorPage.tsx`

Problem:

Connection rules currently protect drag interactions, but store/API paths can still create or persist invalid graph state. `addEdge`, hydration, payload building, and save do not perform final invariant validation. The app can also create a new funnel with no explicit root/entrance node.

Suggested change:

- Add `src/lib/funnel-graph/validateGraph.ts`.
- Implement pure `validateFunnelGraph(nodes, edges)` returning hard errors and warnings.
- Call it before save, and optionally after hydrate to surface backend/legacy data problems.
- Validate:
  - exactly one root/entrance node
  - no duplicate node/edge IDs
  - no dangling edges
  - no self edges
  - valid source/target node types
  - edge type matches source node policy
  - condition nodes have at most one yes and one no branch
  - visitor-tag nodes have max one exit
  - JS/PHP `onDoneNumber` exits are unique and within range
  - required node params exist before save
- Create the root node explicitly for new funnels, or document backend root creation and hydrate it immediately after first save.

Why:

The graph is core domain state. UI-only validation is not enough. A pure validation layer becomes the safety net for UI interactions, imports, hydration coercion, future node types, and tests.

### 3. Stop Funnel Refetches From Clobbering Dirty Editor State

Files:

- `src/pages/funnels/FunnelEditorPage.tsx`
- `src/store/funnelEditor.ts`
- `src/api/hooks/useFunnels.ts`

Problem:

`FunnelEditorPage` hydrates the Zustand editor store whenever `funnel` changes. React Query can refetch after staleness or focus. `hydrate()` resets nodes, edges, pending drafts, selection, and `isDirty`. A background refetch can erase unsaved editor work.

Suggested change:

- Track the currently hydrated `funnelId` plus a loaded version/hash/timestamp.
- Do not rehydrate while `isDirty` is true unless user confirms.
- Consider disabling refetch-on-focus for funnel detail while editor is open.
- Split `hydrateFromServer` from local reset/new-funnel initialization so these transitions are explicit.

Why:

This is a real data-loss class bug. It should be fixed before deeper editor work continues.

### 4. Make Report/Drilldown Requests Race-Safe

Files:

- `src/pages/reports/DrilldownFlatPage.tsx`
- `src/pages/reports/DrilldownTreePage.tsx`
- `src/api/drilldown.ts`
- `src/api/hooks/useDrilldown.ts`

Problem:

Report pages use mutation-like flows for fetching report data. If users quickly apply filters/sorts/pages, an older slower response can overwrite newer state. Lazy tree expansion has similar stale-response and error-surfacing risks.

Suggested change:

- Prefer `useQuery` keyed by the full report request where practical.
- Otherwise add request sequence IDs or `AbortController` support and ignore stale responses.
- Make lazy tree expansion state keyed by request identity.
- Surface child-load failures in the tree instead of silently leaving stale/incomplete rows.

Why:

Reports are interactive and high-latency. Latest-response-wins behavior is needed for correctness, not polish.

### 5. Centralize Route, Nav, And Permission Metadata

Files:

- `src/App.tsx`
- `src/components/layout/Navbar.tsx`
- `src/lib/routeAccess.ts`

Problem:

Permission checks are split between routes, nav visibility, and fallback/default-route logic. Some authenticated routes are currently unguarded in routes, including `settings/tags`, `settings/conditions`, and `inbox`. This invites drift as pages are added.

Suggested change:

- Create a typed route registry with:
  - path
  - lazy component loader
  - permission check
  - nav metadata
  - default-route priority
  - layout/auth requirements
- Generate route elements and nav items from that registry.
- Add a route permission matrix test that verifies every protected route has an explicit policy.

Why:

Security-related UI logic should have one source of truth. It also makes new-page additions harder to get wrong.

### 6. Clarify Cache Invalidation Ownership

Files:

- `src/api/hooks/*`
- `src/pages/PageEntitiesPage.tsx`
- `src/pages/traffic-sources/TrafficSourcesPage.tsx`
- `src/pages/offer-sources/OfferSourcesPage.tsx`
- `src/api/queryKeys.ts`
- `src/api/hooks/useGroupingFilterAssetOptions.ts`

Problem:

Mutation hooks invalidate some caches, but pages also call `reload()` after mutation success. Some bulk flows bypass hooks and call `api` directly. Related derived caches, such as grouping filter asset options, may remain stale after entity changes.

Suggested change:

- Make mutation hooks own invalidation.
- Make pages own only UI side effects: toast, modal close, selection reset.
- Add domain invalidation helpers, for example `invalidatePageData(qc)` invalidates `pages.all` and relevant grouping filter asset keys.
- Move bulk archive/delete/category assignment/import into mutation hooks with partial-failure handling.

Why:

Freshness rules become predictable and testable. It also reduces duplicate refetches and one-off page behavior.

### 7. Make Entity Pages A Configured Workflow, Not Repeated Wiring

Files:

- `src/hooks/useEntityPage.ts`
- `src/pages/PageEntitiesPage.tsx`
- `src/pages/traffic-sources/TrafficSourcesPage.tsx`
- `src/pages/offer-sources/OfferSourcesPage.tsx`
- `src/components/ui-kit/data-table/DataTable.tsx`

Problem:

There is a partial abstraction for entity-page state, but pages still repeat operation wiring, categories, bulk actions, modals, table behavior, columns, toasts, and error handling. `PageEntitiesPage` is already large and mixes workflow, API calls, table config, and UI state.

Suggested change:

- Introduce an entity-page config layer:
  - entity name/labels
  - endpoints or mutation hooks
  - columns
  - category support
  - archive mode
  - import support
  - form component
  - permissions/actions
- Keep escape hatches for pages that are structurally different, such as campaigns/tree pages.
- Standardize loading/error/empty/retry states in `PageShell` or the entity-page abstraction.

Why:

This avoids near-duplicate pages growing in different directions. It also gives tests one workflow surface to cover.

### 8. Make API Runtime Contracts Defensive

Files:

- `src/lib/funnelApiV2.ts`
- `src/types/api.ts`
- `src/types/entities.ts`
- `src/types/generated/*`
- `src/schemas/*`
- `scripts/generate-types.mjs`

Problem:

Some API normalization silently coerces unknown values. Unknown funnel node types can become root nodes. Generated types are patched locally, and type generation depends on a sibling app path. This is workable during early development but risky as the API evolves.

Suggested change:

- For critical domain payloads, fail closed on unknown node/edge types instead of coercing to root/default.
- Use Zod or focused parsers at API boundaries for high-risk payloads: auth profile, funnel detail, report response, user permissions.
- Make type generation hermetic from committed specs, or document the required sibling repo and add CI that runs generation and asserts a clean diff.
- Track local generated-type overrides explicitly in one file.

Why:

Bad backend data should surface as a clear contract error, not become corrupted UI state that later saves back.

### 9. Establish A Risk-Based Test Baseline

Current state:

There are unit tests for several pure `src/lib` utilities, but no meaningful page/form/auth/table integration coverage yet.

Suggested first test tranche:

1. `ApiClient` and auth:
   - URL/params/body handling
   - empty response
   - API error shape
   - `401` typed error
   - `bootstrapAuth` authenticated/unauthenticated/error paths
2. Funnel graph:
   - `validateFunnelGraph` invariant tests
   - unknown node/edge type normalization failures
   - new funnel initializes exactly one root
   - dirty editor refetch does not wipe local edits
3. Reports:
   - latest request wins when earlier response resolves last
   - tree expansion failure state
4. Permissions:
   - route registry/nav/default-route matrix
5. Entity pages:
   - loading/error/empty states
   - mutation success/failure
   - bulk partial failure
6. `DataTable` contract:
   - sorting
   - row selection
   - manual pagination
   - tree expand
   - pinned totals
   - persisted column/sort behavior

Why:

These tests cover behavior that will break users or slow development. Avoid snapshot-heavy tests until contracts are stable.

## Suggested Order Of Work

1. Fix dirty editor rehydrate and add graph validation before save.
2. Move auth redirects out of `ApiClient` and add auth/session tests.
3. Make drilldown request flows race-safe.
4. Centralize route permissions and add route matrix tests.
5. Normalize mutation invalidation and bulk action handling.
6. Refactor entity-page workflow around a config layer.
7. Harden typegen/API runtime contracts.
8. Add `DataTable` contract tests before further expanding table features.

## Non-Goals For Now

- Do not rewrite the UI kit.
- Do not replace React Query or Zustand.
- Do not do broad cosmetic refactors.
- Do not chase 100% test coverage. Cover risky contracts first.

