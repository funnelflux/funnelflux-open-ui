# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2026-07-23

### Added

- Installer-compatible compiled release bundles with SHA-256 checksums,
  source-commit metadata, dependency notices, and archive safety validation
- Repository-local release-version guidance for maintainers

### Fixed

- Corrected Vite 8 code-splitting configuration and production artifact-base
  validation
- Hardened license revalidation cancellation, authenticated bootstrap failures,
  archived offer-source selection, dashboard ROI parsing, and bulk-action
  concurrency
- Improved required-field semantics, error controls, license-lock decoration,
  modal reset behavior, and lazy editor consistency
- Added safe default OpenAPI error responses for licensing endpoints

## [1.1.0] - 2026-07-23

### Added

- Backend-authoritative license-state handling with a full-page lock screen,
  outage-grace warning, manual revalidation, and automatic refresh on timers,
  focus, reconnect, and visibility changes
- Protected-query and client-state cleanup when licensing locks or the
  authenticated user changes, without discarding the login session
- Public-repository contribution guidance, upstream-sync tooling, branch-policy
  checks, immutable release publishing, and managed local Git quality gates
- Retryable error states across product pages, drilldown URL-state sharing, and
  accessible funnel context menus and data-table actions

### Changed

- Improved dashboard refresh behavior, report tooling, form validation,
  notification caching, and post-mutation stats invalidation
- Lazy-loaded CodeMirror and refined vendor chunking to reduce startup coupling
- Navbar dropdowns now open on hover

### Fixed

- Prevented the production boot failure caused by circular vendor-chunk imports
- Removed the unnecessary PHP wrapper from the static V2 UI build
- Corrected pinned GitHub Action commits used by CI and release workflows

### Security

- Recognize backend `423 LICENSE_LOCKED` responses across standard, mutation,
  multipart, upload, download, and blob requests
- Keep product routes behind authentication and backend licensing state while
  leaving only design-system/demo routes public

## [1.0.0] - 2026-06-21

First public release of **FunnelFlux Open UI** — the modern React admin interface
for [FunnelFlux](https://funnelflux.com) self-hosted. It replaces the legacy jQuery
admin for day-to-day workflows and is served by the PHP application at `/v2-ui/`,
using the existing admin session and V2 REST API (`/admin/api/v2/`).

### Added

#### Core platform

- React 19 + TypeScript + Vite 8 application with lazy-loaded routes and a shared UI kit
- Session-based authentication via the FunnelFlux admin login (no separate credentials)
- Permission-aware navigation and route guards aligned with backend entitlements
- Light/dark theme with design tokens and Ant Design 6 primitives
- TanStack React Query for server state; Zustand for client UI state
- OpenAPI-driven type generation from bundled V2 API specs

#### Dashboard & reporting

- Dashboard with summary stats and top-performers table
- Drilldown reports (tree and flat views) with grouping, filters, saved views, and CSV export
- QuickView reporting page
- Funnel quick stats modal with timezone-aware date ranges

#### Campaigns & funnel builder

- Campaign list with search, category strips, column chooser, and bulk actions
- Visual funnel builder (React Flow) with lander, offer, condition, rotator, code, and visitor-tag nodes
- Funnel heatmap overlay, entrance-link generation, and advanced funnel settings
- Global and per-node condition editors

#### Entity management

- Traffic sources and offer sources (templates, forms, CRUD)
- Offers and landers (shared entity-table architecture with category management)
- System link generator and stored links

#### Settings & administration

- System settings, traffic filters, visitor tags, and global conditions
- User management with role/permission editing and `restrictTo` scoping
- Access log (admin), account settings, and inbox
- Data updates: conversion uploads, cost updates, and stats reset (when enabled)

#### Developer experience

- Vite dev server with `/admin` proxy for local development against a running backend
- Vitest unit tests, ESLint flat config, and CI workflow (lint, build, test)
- Release automation via release-please

### Install

Pin this version inside a FunnelFlux self-hosted install:

```bash
cd funnelflux-open-ui
git fetch --tags
git checkout v1.0.0
cd ..
./scripts/build-v2-ui.sh
```

Then open `https://<your-host>/v2-ui/`.

See [README.md](./README.md) for development setup, subfolder installs, and contribution guidelines.

[1.1.1]: https://github.com/funnelflux/funnelflux-open-ui/releases/tag/v1.1.1
[1.1.0]: https://github.com/funnelflux/funnelflux-open-ui/releases/tag/v1.1.0
[1.0.0]: https://github.com/funnelflux/funnelflux-open-ui/releases/tag/v1.0.0
