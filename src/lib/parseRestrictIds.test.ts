import { describe, expect, it } from 'vitest'
import {
  flattenRestrictIds,
  formatRestrictIds,
  parseRestrictIdsInput,
} from './parseRestrictIds'

describe('parseRestrictIdsInput', () => {
  it('splits comma-separated IDs', () => {
    expect(parseRestrictIdsInput('1, 2,3')).toEqual(['1', '2', '3'])
  })

  it('splits space-separated IDs', () => {
    expect(parseRestrictIdsInput('1771233115515945252 2042599472509348758')).toEqual([
      '1771233115515945252',
      '2042599472509348758',
    ])
  })

  it('keeps trailing comma segment empty out of parsed output', () => {
    expect(parseRestrictIdsInput('1,')).toEqual(['1'])
  })
})

describe('flattenRestrictIds', () => {
  it('flattens legacy merged entries', () => {
    expect(flattenRestrictIds(['1771233115515945252 2042599472509348758'])).toEqual([
      '1771233115515945252',
      '2042599472509348758',
    ])
  })
})

describe('formatRestrictIds', () => {
  it('formats with comma and space', () => {
    expect(formatRestrictIds(['1', '2'])).toBe('1, 2')
  })
})
