#!/usr/bin/env node
/**
 * Generates TypeScript interfaces from the Swagger 2.0 definition.yaml files
 * in admin/api/v2/{data,stats,ui,system}/.
 *
 * Usage: node scripts/generate-types.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const API_ROOT = resolve(ROOT, '..', 'admin', 'api', 'v2');
const OUT_DIR = resolve(ROOT, 'src', 'types', 'generated');

const LAYERS = ['data', 'stats', 'ui', 'system'];

const HEADER = (layer) =>
  `// Auto-generated from admin/api/v2/${layer}/definition.yaml -- do not edit manually\n`;

// Rename definitions that clash with global JS types or need app-specific prefixes
const RENAME_MAP = {
  Date: 'ApiDate',
  TimeHHMM: 'ApiTime',
  DateTime: 'ApiDateTime',
  DateTimeRange: 'ApiDateTimeRange',
  TimeZone: 'ApiTimeZone',
  Error: 'ApiErrorResponse',
};

// Rename specific property names (YAML typos or conventions)
const PROPERTY_RENAME_MAP = {
  idTrafficSouce: 'idTrafficSource',
};

// Enum lists beyond this length are emitted as `string` to avoid overly strict unions
const MAX_ENUM_INLINE = 30;

// Force specific properties as required even if the YAML doesn't list them.
// Key is "DefinitionName.propertyName".
const FORCE_REQUIRED = new Set([
  'KeyValuePair.value',
]);

// Track which definition names have been emitted and in which layer,
// so shared types (KeyValuePair, Error, Date, TimeHHMM, etc.) are only
// emitted once then re-imported from the canonical layer.
const emittedIn = new Map(); // defName -> layerName

// ── Type mapping ────────────────────────────────────────────────────────────

function mapType(prop, required, allDefs) {
  if (prop.$ref) {
    return refName(prop.$ref);
  }
  const t = prop.type;
  const f = prop.format;

  if (t === 'integer' && f === 'int64') return 'string';
  if (t === 'integer') return 'number';
  if (t === 'number') return 'number';
  if (t === 'boolean') return 'boolean';

  if (t === 'string' && prop.enum) {
    if (prop.enum.length > MAX_ENUM_INLINE) return 'string';
    return prop.enum.map((v) => `'${escapeQuote(v)}'`).join(' | ');
  }
  if (t === 'string') {
    if (prop.default === null) return 'string | null';
    return 'string';
  }

  if (t === 'array') {
    const items = prop.items;
    if (!items) return 'unknown[]';
    if (items.$ref) return `${refName(items.$ref)}[]`;
    if (items.type === 'string' && items.enum) {
      if (items.enum.length > MAX_ENUM_INLINE) return 'string[]';
      return `(${items.enum.map((v) => `'${escapeQuote(v)}'`).join(' | ')})[]`;
    }
    return `${mapScalar(items)}[]`;
  }

  if (t === 'object') {
    if (prop.properties) {
      return inlineObject(prop, allDefs);
    }
    return 'Record<string, unknown>';
  }

  return 'unknown';
}

function mapScalar(item) {
  if (item.$ref) return refName(item.$ref);
  if (item.type === 'integer' && item.format === 'int64') return 'string';
  if (item.type === 'integer') return 'number';
  if (item.type === 'number') return 'number';
  if (item.type === 'boolean') return 'boolean';
  if (item.type === 'string') return 'string';
  return 'unknown';
}

function refName(ref) {
  const raw = ref.replace('#/definitions/', '');
  return RENAME_MAP[raw] || raw;
}

function escapeQuote(s) {
  return String(s).replace(/'/g, "\\'");
}

function inlineObject(schema, allDefs) {
  const reqSet = new Set(schema.required || []);
  const lines = [];
  for (const [name, prop] of Object.entries(schema.properties || {})) {
    const tsPropName = PROPERTY_RENAME_MAP[name] || name;
    const opt = reqSet.has(name) ? '' : '?';
    const tsType = mapType(prop, reqSet.has(name), allDefs);
    lines.push(`  ${tsPropName}${opt}: ${tsType};`);
  }
  return `{\n${lines.join('\n')}\n}`;
}

// ── Interface generation ────────────────────────────────────────────────────

function generateInterface(name, schema, allDefs) {
  const tsName = RENAME_MAP[name] || name;
  const reqSet = new Set(schema.required || []);
  const props = schema.properties || {};
  const lines = [`export interface ${tsName} {`];

  for (const [propName, prop] of Object.entries(props)) {
    const tsPropName = PROPERTY_RENAME_MAP[propName] || propName;
    const isReq = reqSet.has(propName) || FORCE_REQUIRED.has(`${name}.${propName}`);
    const opt = isReq ? '' : '?';
    const tsType = mapType(prop, isReq, allDefs);
    lines.push(`  ${tsPropName}${opt}: ${tsType};`);
  }

  lines.push('}');
  return lines.join('\n');
}

// ── Per-layer generation ────────────────────────────────────────────────────

function generateLayer(layer) {
  const yamlPath = resolve(API_ROOT, layer, 'definition.yaml');
  let content;
  try {
    content = readFileSync(yamlPath, 'utf-8');
  } catch {
    console.warn(`⚠ Skipping ${layer}: ${yamlPath} not found`);
    return null;
  }

  const spec = parseYaml(content);
  const defs = spec.definitions || {};
  const defNames = Object.keys(defs);
  if (defNames.length === 0) return null;

  const imports = new Map(); // layer -> Set<name>
  const blocks = [];

  for (const name of defNames) {
    const tsName = RENAME_MAP[name] || name;

    // If already emitted in another layer, plan an import
    if (emittedIn.has(name)) {
      const srcLayer = emittedIn.get(name);
      if (srcLayer !== layer) {
        if (!imports.has(srcLayer)) imports.set(srcLayer, new Set());
        imports.get(srcLayer).add(tsName);
      }
      continue;
    }

    const schema = defs[name];
    if (!schema || (!schema.properties && !schema.type)) continue;

    if (schema.type === 'object' || schema.properties) {
      blocks.push(generateInterface(name, schema, defs));
    }

    emittedIn.set(name, layer);
  }

  // Build file content
  let out = HEADER(layer) + '\n';

  // Collect which imported names are actually referenced in the emitted blocks
  const blocksText = blocks.join('\n');
  const usedImports = new Map(); // layer -> Set<name>

  for (const [srcLayer, names] of imports) {
    for (const n of names) {
      // Check if this type name is actually used in any generated interface
      const regex = new RegExp(`\\b${n}\\b`);
      if (regex.test(blocksText)) {
        if (!usedImports.has(srcLayer)) usedImports.set(srcLayer, new Set());
        usedImports.get(srcLayer).add(n);
      }
    }
  }

  // Import and re-export only actually-used shared types
  for (const [srcLayer, names] of usedImports) {
    const sorted = [...names].sort();
    out += `import type { ${sorted.join(', ')} } from './${srcLayer}';\n`;
    out += `export type { ${sorted.join(', ')} } from './${srcLayer}';\n`;
  }
  if (usedImports.size > 0) out += '\n';

  out += blocks.join('\n\n') + '\n';
  return out;
}

// ── Main ────────────────────────────────────────────────────────────────────

mkdirSync(OUT_DIR, { recursive: true });

const generatedLayers = [];

for (const layer of LAYERS) {
  const content = generateLayer(layer);
  if (content) {
    const outPath = resolve(OUT_DIR, `${layer}.ts`);
    writeFileSync(outPath, content);
    generatedLayers.push(layer);
    console.log(`✓ ${layer}.ts`);
  }
}

// Barrel index
const barrel =
  '// Auto-generated barrel -- do not edit manually\n\n' +
  generatedLayers.map((l) => `export * from './${l}';`).join('\n') +
  '\n';

writeFileSync(resolve(OUT_DIR, 'index.ts'), barrel);
console.log('✓ index.ts');
console.log(`\nGenerated ${generatedLayers.length} type files in src/types/generated/`);
