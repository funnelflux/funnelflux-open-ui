# Release workflow

`develop` is the staging and contribution branch. `master` is the customer-stable branch and remains the default branch for ordinary clones.

1. Features, fixes, documentation, and dependency PRs target `develop`.
2. Before a release, update `package.json`, `.release-please-manifest.json`, and `CHANGELOG.md` on `develop` with the same version. Review that change through the normal PR process.
3. Freeze `develop` after the version-preparation change passes CI and staging approval.
4. Open the canonical repository's `develop -> master` PR. The PR-policy check rejects every other `master` head.
5. Merge that release PR with a merge commit. Do not squash or rebase it.
6. The publish workflow proves that the merged `master` tree matches the reviewed `develop` head, verifies version/manifest/changelog agreement, runs all release gates, and then creates the immutable `vX.Y.Z` tag and GitHub Release.
7. Open and merge a `master -> develop` synchronization PR before reopening staging.

Never create a customer release from `develop`, move an existing version tag, or bypass a failed release gate. A correction receives a new version.

Repository administrators must separately configure protected `master`, protected `develop`, protected `v*` tags, and required reviews/checks. Workflow files document the intended policy but cannot enforce repository settings by themselves.
