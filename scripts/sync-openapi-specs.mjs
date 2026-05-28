#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const SPECS = [
  ['data', 'data-api.yaml'],
  ['stats', 'stats-api.yaml'],
  ['system', 'system-api.yaml'],
  ['ui', 'ui-api.yaml'],
]

const missing = SPECS.map(([api]) => resolve(ROOT, '..', 'admin', 'api', 'v2', api, 'definition.yaml')).filter(
  (source) => !existsSync(source),
)

if (missing.length > 0) {
  console.error(
    [
      'Missing parent OpenAPI YAML:',
      ...missing.map((source) => `  - ${source}`),
      'Run this from inside funnelflux-self-hosted/funnelflux-open-ui so ../admin/api/v2/*/definition.yaml exists.',
    ].join('\n'),
  )
  process.exit(1)
}

for (const [api, file] of SPECS) {
  const source = resolve(ROOT, '..', 'admin', 'api', 'v2', api, 'definition.yaml')
  const dest = resolve(ROOT, 'docs', 'api-specs', file)

  mkdirSync(dirname(dest), { recursive: true })
  copyFileSync(source, dest)
  console.log(`✓ synced ${source} -> ${dest}`)
}
