#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createReadStream } from 'node:fs'
import {
  lstat,
  mkdir,
  readdir,
  realpath,
  stat,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/
const COMMIT_PATTERN = /^[0-9a-fA-F]{7,64}$/

function isForbiddenFile(relativePath) {
  const lowerPath = relativePath.toLowerCase()
  const basename = path.posix.basename(lowerPath)
  return lowerPath.endsWith('.php')
    || lowerPath.endsWith('.map')
    || basename === '.env'
    || basename.startsWith('.env.')
}

async function inspectTree(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name)
    const relativePath = path.relative(root, absolutePath).replaceAll(path.sep, '/')
    const metadata = await lstat(absolutePath)

    if (metadata.isSymbolicLink()) {
      throw new Error(`Release bundle cannot contain symbolic links: ${relativePath}`)
    }
    if (metadata.isDirectory()) {
      files.push(...await inspectTree(root, absolutePath))
      continue
    }
    if (!metadata.isFile()) {
      throw new Error(`Release bundle contains unsupported entry type: ${relativePath}`)
    }
    if (metadata.nlink > 1) {
      throw new Error(`Release bundle cannot contain hard-linked files: ${relativePath}`)
    }
    if (isForbiddenFile(relativePath)) {
      throw new Error(`Release bundle contains forbidden file: ${relativePath}`)
    }
    files.push(relativePath)
  }

  return files
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `exit status ${result.status}`
    throw new Error(`${command} failed: ${detail}`)
  }
  return result.stdout
}

function normalizeArchiveEntry(entry) {
  return entry.replace(/^\.\//, '').replace(/\/$/, '')
}

function validateArchiveEntries(archivePath) {
  const entries = run('tar', ['-tzf', archivePath])
    .split('\n')
    .filter(Boolean)
  const normalizedEntries = entries.map(normalizeArchiveEntry)

  for (const [index, entry] of entries.entries()) {
    const normalized = normalizedEntries[index]
    if (entry.startsWith('/') || normalized.split('/').includes('..')) {
      throw new Error(`Release archive contains unsafe path: ${entry}`)
    }
    if (normalized && isForbiddenFile(normalized)) {
      throw new Error(`Release archive contains forbidden file: ${entry}`)
    }
  }

  for (const requiredEntry of ['index.html', 'assets', 'release.json']) {
    if (!normalizedEntries.includes(requiredEntry)) {
      throw new Error(`Release archive is missing root entry: ${requiredEntry}`)
    }
  }

  const verboseEntries = run('tar', ['-tvzf', archivePath]).split('\n').filter(Boolean)
  const linkedEntry = verboseEntries.find((entry) => entry.startsWith('l') || entry.startsWith('h'))
  if (linkedEntry) {
    throw new Error(`Release archive contains a link entry: ${linkedEntry}`)
  }
}

async function sha256(filePath) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk)
  }
  return hash.digest('hex')
}

export async function packageRelease({
  version,
  commit,
  distDir = path.resolve('dist'),
  outputDir = path.resolve('release-assets'),
}) {
  if (!VERSION_PATTERN.test(version)) {
    throw new Error(`Version must use MAJOR.MINOR.PATCH format: ${version}`)
  }
  if (!COMMIT_PATTERN.test(commit)) {
    throw new Error(`Commit must be a 7-64 character hexadecimal SHA: ${commit}`)
  }

  const resolvedDistDir = await realpath(distDir)
  const resolvedOutputDir = path.resolve(outputDir)
  const relativeOutput = path.relative(resolvedDistDir, resolvedOutputDir)
  if (relativeOutput === '' || (!relativeOutput.startsWith('..') && !path.isAbsolute(relativeOutput))) {
    throw new Error('Release output directory must be outside dist')
  }

  const indexMetadata = await stat(path.join(resolvedDistDir, 'index.html'))
  const assetsMetadata = await stat(path.join(resolvedDistDir, 'assets'))
  if (!indexMetadata.isFile()) {
    throw new Error('Release bundle root index.html must be a regular file')
  }
  if (!assetsMetadata.isDirectory()) {
    throw new Error('Release bundle root assets must be a directory')
  }

  await inspectTree(resolvedDistDir)

  const tag = `v${version}`
  const releaseMetadata = { version, tag, commit }
  await writeFile(
    path.join(resolvedDistDir, 'release.json'),
    `${JSON.stringify(releaseMetadata)}\n`,
    'utf8',
  )
  await inspectTree(resolvedDistDir)

  await mkdir(resolvedOutputDir, { recursive: true })
  const bundleName = `funnelflux-open-ui-${tag}.tar.gz`
  const bundlePath = path.join(resolvedOutputDir, bundleName)
  run('tar', ['-czf', bundlePath, '-C', resolvedDistDir, '.'])
  validateArchiveEntries(bundlePath)

  const checksumPath = `${bundlePath}.sha256`
  await writeFile(checksumPath, `${await sha256(bundlePath)}  ${bundleName}\n`, 'utf8')

  return {
    bundleName,
    bundlePath,
    checksumPath,
    releaseMetadata,
  }
}

function readCliOptions(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index]
    const value = argv[index + 1]
    if (!flag?.startsWith('--') || value === undefined) {
      throw new Error('Usage: package-release.mjs --version X.Y.Z --commit SHA [--dist DIR] [--output DIR]')
    }
    options[flag.slice(2)] = value
  }
  if (!options.version || !options.commit) {
    throw new Error('Both --version and --commit are required')
  }
  return options
}

const isCli = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
if (isCli) {
  try {
    const options = readCliOptions(process.argv.slice(2))
    const result = await packageRelease({
      version: options.version,
      commit: options.commit,
      distDir: options.dist ? path.resolve(options.dist) : undefined,
      outputDir: options.output ? path.resolve(options.output) : undefined,
    })
    console.log(`Created ${result.bundlePath}`)
    console.log(`Created ${result.checksumPath}`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
