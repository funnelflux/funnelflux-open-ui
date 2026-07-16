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
})
