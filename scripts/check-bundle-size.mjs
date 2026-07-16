import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const DIST_ASSETS_DIR = path.resolve(process.cwd(), 'dist/assets')

/**
 * Guardrail thresholds in KiB.
 * Keep these intentionally above current values so we catch regressions without blocking normal churn.
 */
const THRESHOLDS = [
  { name: 'entry index chunk', pattern: /^index-.*\.js$/, maxKiB: 60 },
  { name: 'data-table shared chunk', pattern: /^data-table-.*\.js$/, maxKiB: 180 },
  { name: 'antd vendor chunk', pattern: /^antd-vendor-.*\.js$/, maxKiB: 1200 },
  { name: 'codemirror wrapper chunk', pattern: /^codemirror-wrapper-vendor-.*\.js$/, maxKiB: 150 },
  { name: 'codemirror core chunk', pattern: /^codemirror-core-vendor-.*\.js$/, maxKiB: 750 },
  { name: 'codemirror parser chunk', pattern: /^codemirror-parser-vendor-.*\.js$/, maxKiB: 300 },
]

function toKiB(bytes) {
  return bytes / 1024
}

async function collectAssetSizes() {
  const entries = await readdir(DIST_ASSETS_DIR, { withFileTypes: true })
  const jsFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.js'))

  const result = []
  for (const file of jsFiles) {
    const fullPath = path.join(DIST_ASSETS_DIR, file.name)
    const fileStat = await stat(fullPath)
    result.push({
      name: file.name,
      bytes: fileStat.size,
      kiB: toKiB(fileStat.size),
    })
  }
  return result
}

async function run() {
  const assets = await collectAssetSizes()
  const failures = []

  for (const threshold of THRESHOLDS) {
    const matched = assets.filter((asset) => threshold.pattern.test(asset.name))
    if (matched.length === 0) {
      failures.push(
        `Missing expected chunk "${threshold.name}" (pattern: ${String(threshold.pattern)}).`,
      )
      continue
    }
    for (const chunk of matched) {
      if (chunk.kiB > threshold.maxKiB) {
        failures.push(
          `${threshold.name}: ${chunk.name} is ${chunk.kiB.toFixed(2)} KiB (max ${threshold.maxKiB} KiB).`,
        )
      }
    }
  }

  if (failures.length > 0) {
    console.error('\nBundle size check failed:\n')
    for (const failure of failures) {
      console.error(`- ${failure}`)
    }
    process.exit(1)
  }

  console.log('Bundle size check passed.')
}

run().catch((error) => {
  console.error('Failed to run bundle size check:', error)
  process.exit(1)
})
