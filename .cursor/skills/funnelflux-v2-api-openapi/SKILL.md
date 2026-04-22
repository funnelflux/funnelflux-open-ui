---
name: funnelflux-v2-api-openapi
description: >-
  Requires reading the V2 OpenAPI definition.yaml specs before implementing API-related work. Use for funnelflux-open-ui (React /v2-ui), admin/api/v2 PHP endpoints, or any client of /admin/api/v2/. Trigger when the user works in funnelflux-open-ui, implements UI features, API hooks, src/api/, or mentions V2 API, definition.yaml, OpenAPI, or Swagger.
compatibility: >-
  Large Swagger 2.0 YAML files; use targeted search/read, not full-file load in one shot.
---

# FunnelFlux V2 API — OpenAPI-first context

## When to use

- **`funnelflux-open-ui/`** — New admin UI (React + Vite). Any feature that calls the backend: hooks, `src/api/client.ts`, types, pages, or components that fetch `/admin/api/v2/`.
- **`admin/api/v2/`** — PHP endpoints, tests, or OpenAPI docs.
- **Other consumers** of `/admin/api/v2/` (scripts, integrations).

## Paths on disk

- **Workspace = self-hosted monorepo root:** OpenAPI files are `admin/api/v2/...`.
- **Workspace = `funnelflux-open-ui/` package:** use `../admin/api/v2/...` (this skill lives under that package).

## Instructions

### funnelflux-open-ui (primary for UI work)

1. **Canonical contract** for request/response shapes lives in the **self-hosted repo root**, not only in the submodule’s `docs/api-specs/` copies:
   - **`admin/api/v2/ui/definition.yaml`** — start here for most UI features (BFF / aggregated endpoints).
   - **`admin/api/v2/data/definition.yaml`** — CRUD, entities (campaigns, funnels, pages, sources, …).
   - **`admin/api/v2/stats/definition.yaml`** — reporting, drilldown, stats updates.
   - **`admin/api/v2/system/definition.yaml`** — system, domains, version.

2. **Before** adding or changing hooks, query keys, or types for an endpoint: locate the path (or tag / `#/definitions/...`) in the right `definition.yaml` and align with it.

3. **Server-side changes** (PHP) are documented in `admin/api/v2/CLAUDE.md` (Toolbox, auth, errors). OpenAPI-first: keep YAML and behavior in sync.

### Before writing or changing code (all targets)

1. **Pick the API layer** (paths use `basePath: /admin/api/v2`):
   - **Data** — CRUD and entity operations → `admin/api/v2/data/definition.yaml`
   - **Stats** — reporting, analytics, aggregations → `admin/api/v2/stats/definition.yaml`
   - **UI** — BFF / view-shaped payloads → `admin/api/v2/ui/definition.yaml`
   - **System** — install/system operations → `admin/api/v2/system/definition.yaml`

2. **Load the contract for what you are changing.** These files are large (Swagger 2.0). Do **not** assume paths, query params, or response schemas from memory. Use targeted reads: search within the file for the path (e.g. `/data/campaign/...`), the **tag** name, or the `#/definitions/...` model you need.

3. **If the task spans layers or scope is unclear** — open the relevant sections in **more than one** `definition.yaml`, or scan all four for the path or definition name before implementing.

4. **PHP endpoints only** — after aligning with the YAML contract, follow `admin/api/v2/CLAUDE.md`.

### Quick map

| File | Role |
|------|------|
| `admin/api/v2/data/definition.yaml` | Data API — offers, campaigns, funnels, pages, filters, etc. |
| `admin/api/v2/stats/definition.yaml` | Stats API — reports, drilldown, updates |
| `admin/api/v2/ui/definition.yaml` | UI API — aggregated endpoints for admin UI |
| `admin/api/v2/system/definition.yaml` | System API — domains, version, system links |

### Checklist

- [ ] Identified correct `definition.yaml`(s) for the feature
- [ ] Read the paths, parameters, responses, and `#/definitions` relevant to the change
- [ ] Plan or diff keeps documented contract and code consistent (update YAML when the contract changes)
