# Going-Public Checklist (maintainer)

A do-in-order list to finalize this repo as a source-available public project.
This is a working doc for the owner — delete it once you've finished, or keep it
for the next major release. It is **not** included in the scaffolding commit
recipe, so it won't accidentally ship public unless you `git add` it yourself.

Repo: `funnelflux/funnelflux-open-ui` · License: Elastic License 2.0 ·
Default branch (public): `master`

---

## 0. Already done (by the scaffolding work, on `develop`)

- [x] `LICENSE` — Elastic License 2.0
- [x] `README.md` + `CONTRIBUTING.md` — rewritten (pnpm, ELv2, fork/PR flow, Conventional Commits, DCO)
- [x] `CODE_OF_CONDUCT.md` + `SECURITY.md` — contact = `support@funnelflux.com`
- [x] `.github/` — CODEOWNERS, PR template, issue templates (bug/feature/config)
- [x] CI workflow (`ci.yml`) + release automation (`release-please`)
- [x] AI harness: `AGENTS.md` + `.ai/` canonical, tool dirs git-ignored, `scripts/sync-ai-config.sh`
- [x] History secret scan — clean; no history rewrite needed

---

## 1. Review before committing

- [ ] Add co-owner GitHub handles to `.github/CODEOWNERS` (currently just `@ff-zeno`).
- [ ] Skim `.ai/context/*.md` (old Serena memories) — confirm nothing in there is private; it becomes public.
- [ ] (Optional) `pnpm install && pnpm run lint && pnpm run build && pnpm test` to confirm green.

## 2. Commit the scaffolding to `develop`

> Use explicit paths — **do not** `git add -A` (it would sweep in unrelated in-progress `src/` work).

```bash
git add LICENSE CODE_OF_CONDUCT.md SECURITY.md CONTRIBUTING.md README.md \
        AGENTS.md .ai .github .gitignore \
        release-please-config.json .release-please-manifest.json \
        scripts/sync-ai-config.sh
git status                       # review — should be only scaffolding/harness
git commit -s -m "chore: add open-source scaffolding, CI, releases, and AI harness"
git push origin develop
```

## 3. Repo settings (via `gh`, you're authed as `ff-zeno`)

```bash
R=funnelflux/funnelflux-open-ui

# Allow release-please to open its release PR
gh api -X PUT repos/$R/actions/permissions/workflow \
  -F default_workflow_permissions=write \
  -F can_approve_pull_request_reviews=true

# Enable Discussions (community Q&A) + private vulnerability reporting
gh api -X PATCH repos/$R -F has_discussions=true
gh api -X PUT  repos/$R/private-vulnerability-reporting
```

- [ ] Actions → PR permission enabled
- [ ] Discussions enabled
- [ ] Private vulnerability reporting enabled

## 4. Promote `master` (do when ready to release)

`master` is currently behind `develop`; the release workflow only fires on
`master`.

```bash
git checkout master
git merge --ff-only develop   # or a normal merge / PR develop -> master
git push origin master
```

- [ ] `master` holds the current code

## 5. First release (optional version pin)

- [ ] To force the first tag to `v1.0.0`, include `Release-As: 1.0.0` in the
      body of a commit that lands on `master`. Otherwise release-please
      auto-versions from `0.0.0`.
- [ ] After the push, merge the auto-opened **release PR** to cut the tag +
      GitHub Release + `CHANGELOG.md`.

## 6. Branch protection on `master`

Run after the first CI run so the status-check name exists. Verify the exact
check name first (`gh api repos/$R/commits/master/check-runs`); the workflow job
is named **"Lint, build & test"**.

```bash
R=funnelflux/funnelflux-open-ui
gh api -X PUT repos/$R/branches/master/protection --input - <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["Lint, build & test"] },
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 1 },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

- [ ] PRs required, ≥1 approval, CI must pass, no force-push/deletion

> Note: classic branch protection on a **private** repo needs a paid plan. If
> the org isn't on one, do this step right after going public (step 7).

## 7. Go public (do last, deliberately)

```bash
gh repo edit funnelflux/funnelflux-open-ui \
  --visibility public --accept-visibility-change-consequences
```

- [ ] Repo is public

## 8. Post-public verification

- [ ] Open an incognito window → repo loads, README/license render, GitHub shows
      "Elastic License 2.0".
- [ ] Fork from a non-owner account → confirm you can open a PR but **cannot**
      push to `master`.
- [ ] Issue templates appear under "New issue"; Discussions tab present.
- [ ] CI runs green on a test PR.
- [ ] (Optional) Delete this checklist file.

---

### Deferred / decided later
- Co-owner handles in CODEOWNERS
- `master` promotion timing
- First release version
- Actions→PR permission + branch protection (only needed once releasing/public)
