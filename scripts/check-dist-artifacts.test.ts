import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkDistArtifacts } from './check-dist-artifacts.mjs'

async function fixture(files: Record<string, string>): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'ff-open-ui-dist-'))
  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = path.join(directory, relativePath)
    await mkdir(path.dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, contents)
  }
  return directory
}

describe('checkDistArtifacts', () => {
  it('accepts a static Vite build rooted at the configured UI base', async () => {
    const distDir = await fixture({
      'index.html': '<script type="module" src="/customer/v2-ui/assets/app.js"></script>',
      'assets/app.js': 'export {}',
    })
    await expect(checkDistArtifacts({ distDir, expectedBase: '/customer/v2-ui' })).resolves.toContain('index.html')
  })

  it.each(['index.php', 'assets/app.js.map', '.env.production'])(
    'rejects forbidden artifact %s',
    async (forbiddenFile) => {
      const distDir = await fixture({
        'index.html': '<script type="module" src="/v2-ui/assets/app.js"></script>',
        'assets/app.js': 'export {}',
        [forbiddenFile]: 'forbidden',
      })
      await expect(checkDistArtifacts({ distDir })).rejects.toThrow(forbiddenFile)
    },
  )

  it('rejects an entry document whose built assets escape the configured base', async () => {
    const distDir = await fixture({
      'index.html': '<script type="module" src="/assets/app.js"></script>',
      'assets/app.js': 'export {}',
    })
    await expect(checkDistArtifacts({ distDir, expectedBase: '/v2-ui' })).rejects.toThrow(
      'asset reference outside /v2-ui/assets/',
    )
  })

  it('uses the production UI base when no override is provided', async () => {
    const distDir = await fixture({
      'index.html': '<script type="module" src="/wrong-base/assets/app.js"></script>',
      'assets/app.js': 'export {}',
    })
    const originalUiBase = process.env.VITE_UI_BASENAME
    delete process.env.VITE_UI_BASENAME

    try {
      await expect(checkDistArtifacts({ distDir })).rejects.toThrow(
        'asset reference outside /v2-ui/assets/',
      )
    } finally {
      if (originalUiBase === undefined) {
        delete process.env.VITE_UI_BASENAME
      } else {
        process.env.VITE_UI_BASENAME = originalUiBase
      }
    }
  })

  it.each([
    'https://cdn.example.com/assets/app.js',
    '//cdn.example.com/assets/app.js',
    'assets/app.js',
    '/%2f%2fevil.example/v2-ui/assets/app.js',
    '/%5c%5cevil.example/v2-ui/assets/app.js',
  ])('rejects non-local built asset reference %s', async (reference) => {
    const distDir = await fixture({
      'index.html': `<script type="module" src="${reference}"></script>`,
      'assets/app.js': 'export {}',
    })

    await expect(checkDistArtifacts({ distDir })).rejects.toThrow(
      `non-local asset reference: ${reference}`,
    )
  })

  it.each([
    '/v2-ui/assets/../outside.js',
    '/v2-ui/assets/%2e%2e/outside.js',
    '/v2-ui/assets%2f..%2foutside.js',
    '/v2-ui/assets%5c..%5coutside.js',
  ])('rejects built asset traversal reference %s', async (reference) => {
    const distDir = await fixture({
      'index.html': `<script type="module" src="${reference}"></script>`,
      'assets/app.js': 'export {}',
    })

    await expect(checkDistArtifacts({ distDir, expectedBase: '/v2-ui' })).rejects.toThrow(
      `asset reference outside /v2-ui/assets/: ${reference}`,
    )
  })
})
