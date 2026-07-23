import { execFile } from 'node:child_process'
import { link, mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { packageRelease } from './package-release.mjs'

const execFileAsync = promisify(execFile)
const COMMIT = '0123456789abcdef0123456789abcdef01234567'

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'ff-open-ui-release-'))
  const distDir = path.join(root, 'dist')
  const outputDir = path.join(root, 'release-assets')
  await mkdir(path.join(distDir, 'assets'), { recursive: true })
  await writeFile(path.join(distDir, 'index.html'), '<html></html>')
  await writeFile(path.join(distDir, 'assets', 'app.js'), 'export {}')
  return { root, distDir, outputDir }
}

describe('packageRelease', () => {
  it('creates an installer-compatible root bundle and checksum', async () => {
    const { distDir, outputDir } = await fixture()

    const result = await packageRelease({
      version: '1.2.0',
      commit: COMMIT,
      distDir,
      outputDir,
    })

    expect(result.bundleName).toBe('funnelflux-open-ui-v1.2.0.tar.gz')
    expect(JSON.parse(await readFile(path.join(distDir, 'release.json'), 'utf8'))).toEqual({
      version: '1.2.0',
      tag: 'v1.2.0',
      commit: COMMIT,
    })

    const { stdout: entries } = await execFileAsync('tar', ['-tzf', result.bundlePath])
    expect(entries).toContain('./index.html')
    expect(entries).toContain('./assets/')
    expect(entries).toContain('./release.json')

    await expect(execFileAsync('sha256sum', ['-c', path.basename(result.checksumPath)], {
      cwd: outputDir,
    })).resolves.toMatchObject({
      stdout: expect.stringContaining('funnelflux-open-ui-v1.2.0.tar.gz: OK'),
    })
  })

  it('rejects a forbidden sourcemap before creating a bundle', async () => {
    const { distDir, outputDir } = await fixture()
    await writeFile(path.join(distDir, 'assets', 'app.js.map'), '{}')

    await expect(packageRelease({
      version: '1.2.0',
      commit: COMMIT,
      distDir,
      outputDir,
    })).rejects.toThrow('forbidden file: assets/app.js.map')
  })

  it('rejects symbolic links', async () => {
    const { root, distDir, outputDir } = await fixture()
    const target = path.join(root, 'outside.txt')
    await writeFile(target, 'outside')
    await symlink(target, path.join(distDir, 'assets', 'linked.txt'))

    await expect(packageRelease({
      version: '1.2.0',
      commit: COMMIT,
      distDir,
      outputDir,
    })).rejects.toThrow('symbolic links: assets/linked.txt')
  })

  it('rejects hard-linked files', async () => {
    const { distDir, outputDir } = await fixture()
    await link(
      path.join(distDir, 'assets', 'app.js'),
      path.join(distDir, 'assets', 'app-copy.js'),
    )

    await expect(packageRelease({
      version: '1.2.0',
      commit: COMMIT,
      distDir,
      outputDir,
    })).rejects.toThrow('hard-linked files: assets/')
  })
})
