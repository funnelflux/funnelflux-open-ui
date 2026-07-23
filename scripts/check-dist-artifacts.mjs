import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

function normalizeUiBase(value) {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.replace(/\/+$/, '') || '/'
}

async function walkFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walkFiles(root, absolutePath))
    } else if (entry.isFile()) {
      files.push(path.relative(root, absolutePath).replaceAll(path.sep, '/'))
    }
  }
  return files
}

export async function checkDistArtifacts({
  distDir = path.resolve('dist'),
  expectedBase = process.env.VITE_UI_BASENAME,
} = {}) {
  const files = await walkFiles(distDir)
  const violations = files.filter((file) => {
    const basename = path.posix.basename(file)
    return file.endsWith('.php') || file.endsWith('.map') || basename === '.env' || basename.startsWith('.env.')
  })

  if (!files.includes('index.html')) {
    violations.push('missing index.html')
  } else {
    const html = await readFile(path.join(distDir, 'index.html'), 'utf8')
    const assetReferences = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
      .map((match) => match[1])
      .filter((reference) => reference.includes('/assets/'))
    if (assetReferences.length === 0) {
      violations.push('index.html has no built asset references')
    }
    const inferredBase = assetReferences[0]?.split('/assets/')[0] || '/'
    const normalizedBase = normalizeUiBase(expectedBase || inferredBase)
    const assetBase = normalizedBase === '/' ? '/assets/' : `${normalizedBase}/assets/`
    for (const reference of assetReferences) {
      if (!reference.startsWith(assetBase)) {
        violations.push(`asset reference outside ${assetBase}: ${reference}`)
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(`Unsafe dist artifact:\n- ${violations.join('\n- ')}`)
  }
  return files
}

const isCli = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
if (isCli) {
  checkDistArtifacts().then(
    (files) => console.log(`dist artifact check passed (${files.length} files)`),
    (error) => {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    },
  )
}

export const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
