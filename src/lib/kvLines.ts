import type { KeyValuePair } from '@/types/entities'

/** Serialize key/value rows to `key=value` lines for textarea editing. */
export function kvToLines(rows: KeyValuePair[] | undefined): string {
  if (!rows?.length) return ''
  return rows.map((row) => `${row.key}=${row.value}`).join('\n')
}

/** Parse `key=value` lines back to rows. Blank lines are dropped; a line
 * without `=` becomes a key with an empty value. */
export function linesToKv(text: string): KeyValuePair[] {
  return text
    .split('\n')
    .map((line) => {
      const equalsIndex = line.indexOf('=')
      if (equalsIndex === -1) return { key: line.trim(), value: '' }
      return { key: line.slice(0, equalsIndex).trim(), value: line.slice(equalsIndex + 1).trim() }
    })
    .filter((row) => row.key !== '' || row.value !== '')
}
