# Installing and updating FunnelFlux Open UI

Production installations should use a tagged release. Following `master` is supported for users who explicitly want the latest stable code. Keep custom changes on a fork branch so vendor updates never overwrite them.

The parent FunnelFlux self-hosted application owns deployment into `v2-ui/`. These steps update only this repository.

## Production install pinned to a tag

Use the tag selected by the parent updater, for example `v1.1.0`:

```bash
git fetch origin --prune --tags
git switch --detach v1.1.0
pnpm install --frozen-lockfile
pnpm run build
```

A detached tag is intentionally immutable. Do not customize it; use the fork workflow below.

## Pristine clone following stable master

First confirm that the checkout has no tracked or untracked changes:

```bash
git status --short
git fetch origin --prune --tags
git switch master
git merge --ff-only origin/master
pnpm install --frozen-lockfile
pnpm run build
```

The optional helper applies the same conservative fast-forward policy when the canonical repository is configured as `upstream`:

```bash
bash scripts/sync-upstream-master.sh
```

The helper refuses dirty, detached, customized, ahead, or divergent branches. It never stashes or discards work. If it refuses, choose one action yourself:

- commit the work on a custom branch;
- run `git stash push --include-untracked`, sync, and later run `git stash pop`; or
- move the work to a fork using the next workflow.

## Customer fork with durable customizations

Use `origin` for your writable fork and `upstream` for the canonical FunnelFlux repository:

```bash
git clone https://github.com/CUSTOMER-ORG/funnelflux-open-ui.git
cd funnelflux-open-ui
git remote add upstream https://github.com/funnelflux/funnelflux-open-ui.git
git remote -v
git fetch upstream --prune --tags
git switch master
git merge --ff-only upstream/master
git push origin master
git switch -c customer/customizations
git push -u origin customer/customizations
```

Keep all customer changes on `customer/customizations` or smaller topic branches. Do not commit them to `master`.

### Routine fork sync

```bash
git status --short
git switch master
bash scripts/sync-upstream-master.sh --push-origin
git switch customer/customizations
git merge master
pnpm install --frozen-lockfile
pnpm run build
pnpm test
git push origin customer/customizations
```

Merging is the default because it does not rewrite a published customization branch. A one-owner branch may instead rebase, but only push it with `--force-with-lease`:

```bash
git rebase master
git push --force-with-lease origin customer/customizations
```

Never use an unqualified `--force`.

### Conflicts and recovery

Abort an unresolved operation without discarding the pre-sync branch:

```bash
git merge --abort
git rebase --abort
```

For dependency conflicts, resolve `package.json` intentionally and regenerate `pnpm-lock.yaml` with the repository's pinned pnpm version. Do not hand-edit lockfile conflict markers. A non-frozen install belongs only in the conflict-resolution commit.

For API-contract conflicts, resolve the committed files in `api-specs/`, run `pnpm run generate-types`, and stage the corresponding `src/types/generated/` output. Run lint, build, tests, and `git diff --check` before pushing. Abort and ask for help if you cannot identify which contract or dependency changes must be preserved.

The helper intentionally does not merge `master` into a customization branch, resolve conflicts, deploy the result, reset files, clean untracked files, or force-push.
