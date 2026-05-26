#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SOURCE = resolve(ROOT, '..', 'admin', 'api', 'v2', 'stats', 'definition.yaml')
const DEST = resolve(ROOT, 'docs', 'api-specs', 'stats-api.yaml')

if (!existsSync(SOURCE)) {
  console.error(
    [
      `Missing parent stats OpenAPI YAML: ${SOURCE}`,
      'Run this from inside funnelflux-self-hosted/funnelflux-open-ui so ../admin/api/v2/stats/definition.yaml exists.',
    ].join('\n'),
  )
  process.exit(1)
}

mkdirSync(dirname(DEST), { recursive: true })
copyFileSync(SOURCE, DEST)
console.log(`✓ synced ${SOURCE} -> ${DEST}`)
