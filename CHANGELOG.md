# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.0]: https://github.com/funnelflux/funnelflux-open-ui/releases/tag/v1.0.0
