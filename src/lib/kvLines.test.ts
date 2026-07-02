import { describe, expect, it } from 'vitest'
import { kvToLines, linesToKv } from '@/lib/kvLines'

describe('kvToLines', () => {
  it('returns empty string for undefined or empty input', () => {
    expect(kvToLines(undefined)).toBe('')
    expect(kvToLines([])).toBe('')
  })

  it('serializes rows to key=value lines', () => {
    expect(
      kvToLines([
        { key: 'token1', value: 'value_one' },
        { key: 'token2', value: 'value_two' },
      ]),
    ).toBe('token1=value_one\ntoken2=value_two')
  })
})

describe('linesToKv', () => {
  it('round-trips rows produced by kvToLines', () => {
    const rows = [
      { key: 'a', value: '1' },
      { key: 'b', value: '2' },
    ]
    expect(linesToKv(kvToLines(rows))).toEqual(rows)
  })

  it('treats a line without "=" as a key with empty value', () => {
    expect(linesToKv('plainkey')).toEqual([{ key: 'plainkey', value: '' }])
  })

  it('keeps a "=value" line as an empty-key row (rejected later by schema validation)', () => {
    expect(linesToKv('=orphan')).toEqual([{ key: '', value: 'orphan' }])
  })

  it('drops blank lines', () => {
    expect(linesToKv('a=1\n\n  \nb=2')).toEqual([
      { key: 'a', value: '1' },
      { key: 'b', value: '2' },
    ])
  })

  it('splits on the first "=" and trims key and value', () => {
    expect(linesToKv(' key = a=b ')).toEqual([{ key: 'key', value: 'a=b' }])
  })
})
