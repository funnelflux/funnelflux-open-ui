import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const helper = path.resolve('scripts/sync-upstream-master.sh')

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
}

async function createRepos() {
  const root = await mkdtemp(path.join(tmpdir(), 'ff-open-ui-sync-'))
  const upstream = path.join(root, 'upstream.git')
  const origin = path.join(root, 'origin.git')
  const seed = path.join(root, 'seed')
  const customer = path.join(root, 'customer')

  execFileSync('git', ['init', '--bare', '--initial-branch=master', upstream])
  execFileSync('git', ['init', '--bare', '--initial-branch=master', origin])
  execFileSync('git', ['init', '--initial-branch=master', seed])
  git(seed, 'config', 'user.name', 'Test User')
  git(seed, 'config', 'user.email', 'test@example.com')
  await writeFile(path.join(seed, 'README.md'), 'initial\n')
  git(seed, 'add', 'README.md')
  git(seed, 'commit', '-m', 'initial')
  git(seed, 'remote', 'add', 'upstream', upstream)
  git(seed, 'push', 'upstream', 'master')

  execFileSync('git', ['clone', upstream, customer])
  git(customer, 'config', 'user.name', 'Test User')
  git(customer, 'config', 'user.email', 'test@example.com')
  git(customer, 'remote', 'rename', 'origin', 'upstream')
  git(customer, 'remote', 'add', 'origin', origin)

  return { customer, origin, seed, upstream }
}

function runHelper(cwd: string, upstream: string, ...args: string[]) {
  return spawnSync('bash', [helper, '--upstream-url', upstream, ...args], {
    cwd,
    encoding: 'utf8',
  })
}

async function addUpstreamCommit(seed: string) {
  await writeFile(path.join(seed, 'upstream.txt'), `${Date.now()}\n`)
  git(seed, 'add', 'upstream.txt')
  git(seed, 'commit', '-m', 'upstream update')
  git(seed, 'push', 'upstream', 'master')
}

describe('sync-upstream-master.sh', () => {
  it('fast-forwards clean master and optionally pushes the fork master', async () => {
    const repos = await createRepos()
    await addUpstreamCommit(repos.seed)

    const result = runHelper(repos.customer, repos.upstream, '--push-origin')

    expect(result.status).toBe(0)
    expect(git(repos.customer, 'rev-parse', 'master')).toBe(git(repos.seed, 'rev-parse', 'master'))
    expect(execFileSync('git', ['--git-dir', repos.origin, 'rev-parse', 'master'], { encoding: 'utf8' }).trim())
      .toBe(git(repos.seed, 'rev-parse', 'master'))
  })

  it('refuses tracked or untracked customer changes', async () => {
    const repos = await createRepos()
    await writeFile(path.join(repos.customer, 'customer.txt'), 'custom\n')

    const result = runHelper(repos.customer, repos.upstream)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('worktree is not clean')
  })

  it('refuses a divergent local master', async () => {
    const repos = await createRepos()
    await writeFile(path.join(repos.customer, 'local.txt'), 'local\n')
    git(repos.customer, 'add', 'local.txt')
    git(repos.customer, 'commit', '-m', 'local master change')
    await addUpstreamCommit(repos.seed)

    const result = runHelper(repos.customer, repos.upstream)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('non-fast-forward')
  })

  it('refuses a missing or unexpected upstream remote', async () => {
    const repos = await createRepos()
    git(repos.customer, 'remote', 'remove', 'upstream')
    const missing = runHelper(repos.customer, repos.upstream)
    expect(missing.status).toBe(1)
    expect(missing.stderr).toContain("Missing 'upstream' remote")

    git(repos.customer, 'remote', 'add', 'upstream', repos.origin)
    const wrong = runHelper(repos.customer, repos.upstream)
    expect(wrong.status).toBe(1)
    expect(wrong.stderr).toContain('unexpected upstream URL')
  })

  it('refuses detached HEAD and customization branches', async () => {
    const repos = await createRepos()
    git(repos.customer, 'switch', '-c', 'customer/customizations')
    const custom = runHelper(repos.customer, repos.upstream)
    expect(custom.status).toBe(1)
    expect(custom.stderr).toContain("Current branch is 'customer/customizations'")

    git(repos.customer, 'switch', '--detach')
    const detached = runHelper(repos.customer, repos.upstream)
    expect(detached.status).toBe(1)
    expect(detached.stderr).toContain('Detached HEAD')
  })
})
