#!/usr/bin/env bash
set -euo pipefail

canonical_upstream='https://github.com/funnelflux/funnelflux-open-ui.git'
expected_upstream="$canonical_upstream"
push_origin=false

usage() {
  printf '%s\n' \
    'Usage: bash scripts/sync-upstream-master.sh [--push-origin] [--upstream-url URL]' \
    '' \
    'Fast-forwards a clean local master branch from upstream/master.' \
    'It never stashes, resets, force-pushes, or merges a customization branch.'
}

while (($# > 0)); do
  case "$1" in
    --push-origin)
      push_origin=true
      shift
      ;;
    --upstream-url)
      if (($# < 2)); then
        echo 'Missing value for --upstream-url.' >&2
        exit 2
      fi
      expected_upstream="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  echo 'Run this helper inside a FunnelFlux Open UI git worktree.' >&2
  exit 1
}

current_branch=$(git symbolic-ref --quiet --short HEAD) || {
  echo 'Detached HEAD detected. Switch to master before syncing.' >&2
  exit 1
}

if [[ "$current_branch" != 'master' ]]; then
  echo "Current branch is '$current_branch'. Commit or stash work manually, then switch to master." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
  cat >&2 <<'EOF'
The worktree is not clean. No update was attempted.
Choose one: commit the work on a custom branch; stash it manually with
`git stash push --include-untracked`; or move the customization to your fork.
EOF
  exit 1
fi

git remote get-url upstream >/dev/null 2>&1 || {
  echo "Missing 'upstream' remote. See docs/UPDATING.md for fork setup." >&2
  exit 1
}

actual_upstream=$(git remote get-url upstream)
if [[ "$actual_upstream" != "$expected_upstream" ]]; then
  echo "Refusing unexpected upstream URL: $actual_upstream" >&2
  echo "Expected: $expected_upstream" >&2
  exit 1
fi

git fetch upstream --prune --tags
git show-ref --verify --quiet refs/remotes/upstream/master || {
  echo 'upstream/master does not exist.' >&2
  exit 1
}

if ! git merge-base --is-ancestor master upstream/master; then
  echo 'Local master has diverged from or is ahead of upstream/master; refusing a non-fast-forward update.' >&2
  exit 1
fi

git merge --ff-only upstream/master

if [[ "$push_origin" == true ]]; then
  git remote get-url origin >/dev/null 2>&1 || {
    echo "--push-origin requested, but no 'origin' remote exists." >&2
    exit 1
  }
  git push origin master
fi

echo 'Local master is synchronized with upstream/master.'
