import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { link, mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { packageRelease, validateArchiveEntries } from './package-release.mjs'

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

const VALID_ARCHIVE_ENTRIES = './\n./index.html\n./assets/\n./release.json\n'

function archiveRunner(entries: string, verboseEntries = '') {
  return (_command: string, args: string[]) => (
    args.includes('-tvzf') ? verboseEntries : entries
  )
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

    const [expectedDigest, checksumName] = (
      await readFile(result.checksumPath, 'utf8')
    ).trim().split(/\s+/)
    const actualDigest = createHash('sha256')
      .update(await readFile(result.bundlePath))
      .digest('hex')
    expect(checksumName).toBe(result.bundleName)
    expect(actualDigest).toBe(expectedDigest)
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

  it.each([
    `${VALID_ARCHIVE_ENTRIES}/absolute.txt\n`,
    `${VALID_ARCHIVE_ENTRIES}../outside.txt\n`,
  ])('rejects unsafe archive paths during post-pack validation', (entries) => {
    expect(() => validateArchiveEntries(
      'release.tar.gz',
      archiveRunner(entries),
    )).toThrow('unsafe path')
  })

  it('rejects forbidden files during post-pack validation', () => {
    expect(() => validateArchiveEntries(
      'release.tar.gz',
      archiveRunner(`${VALID_ARCHIVE_ENTRIES}./assets/app.js.map\n`),
    )).toThrow('forbidden file')
  })

  it.each([
    'lrwxrwxrwx user/group 0 2026-01-01 00:00 ./assets/link -> app.js\n',
    'hrw-r--r-- user/group 0 2026-01-01 00:00 ./assets/link link to ./assets/app.js\n',
  ])('rejects link entries during post-pack validation', (verboseEntries) => {
    expect(() => validateArchiveEntries(
      'release.tar.gz',
      archiveRunner(VALID_ARCHIVE_ENTRIES, verboseEntries),
    )).toThrow('link entry')
  })

  it('reports a missing archive command without masking the process error', async () => {
    const { distDir, outputDir } = await fixture()
    const originalPath = process.env.PATH
    process.env.PATH = ''

    try {
      await expect(packageRelease({
        version: '1.2.0',
        commit: COMMIT,
        distDir,
        outputDir,
      })).rejects.toThrow('tar failed to start:')
    } finally {
      process.env.PATH = originalPath
    }
  })
})
