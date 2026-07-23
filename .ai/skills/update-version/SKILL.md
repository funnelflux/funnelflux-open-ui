---
name: update-version
description: Use when preparing a FunnelFlux Open UI release, choosing a semantic version, updating release metadata, or promoting develop to master.
---

# Update Version

This repository does not calculate or increment versions automatically. Prepare
the version on `develop`; the merged release workflow publishes that exact
version.

## Choose the version

Use stable `MAJOR.MINOR.PATCH` SemVer only:

- `PATCH` for backward-compatible fixes and packaging corrections.
- `MINOR` for backward-compatible features.
- `MAJOR` for breaking customer-facing or integration changes.

Never reuse, move, or replace an existing `vX.Y.Z` tag. A correction receives a
new version.

## Prepare `develop`

Update the same version in:

1. `package.json`
2. `.release-please-manifest.json`
3. A new dated `## [X.Y.Z]` section and release link in `CHANGELOG.md`

Review the full release diff, then run:

```bash
pnpm run check-generated-types:committed
pnpm run lint
pnpm run build:ci
pnpm test
pnpm audit --prod --audit-level high
git diff --check
```

Commit and push only with explicit authorization. Use a release-preparation
commit such as `chore(release): prepare v1.2.0`.

## Promote and publish

1. Open the canonical `develop -> master` PR.
2. Require CI, staging approval, and a merge commit. Do not squash or rebase.
3. Merge the PR. Do not create the tag manually.
4. `publish-release.yml` verifies provenance and metadata, rebuilds the merge
   commit, and publishes:
   - `funnelflux-open-ui-vX.Y.Z.tar.gz`
   - `funnelflux-open-ui-vX.Y.Z.tar.gz.sha256`
   - `THIRD_PARTY_NOTICES.json`
5. Verify the GitHub release, tag commit, three assets, and successful checksum.
6. Open and merge a `master -> develop` synchronization PR before staging
   resumes.

The bundle must have `index.html`, `assets/`, and `release.json` at its root.
Packaging fails on PHP, sourcemap, environment, symlink, hard-link, absolute, or
path-traversal entries. Never bypass a failed release gate.
