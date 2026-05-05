import { describe, expect, it } from 'vitest'
import {
  apiMetricNameForColumnId,
  apiMetricNamesForColumnIds,
  defaultApiMetricNames,
} from '@/lib/drilldownMetrics'

describe('drilldown metric mapping', () => {
  it('maps registry ids to backend metric names', () => {
    expect(apiMetricNameForColumnId('visits')).toBe('Entrances')
    expect(apiMetricNameForColumnId('profitAndLoss')).toBe('P/L')
    expect(apiMetricNameForColumnId('returnOnInvestment')).toBe('ROI')
  })

  it('maps ordered selected ids and ignores non-metric columns', () => {
    expect(apiMetricNamesForColumnIds(['name', 'select', 'visits', 'revenue', 'returnOnInvestment'])).toEqual([
      'Entrances',
      'Revenue',
      'ROI',
    ])
  })

  it('dedupes metrics while preserving first-seen order', () => {
    expect(apiMetricNamesForColumnIds(['revenue', 'visits', 'revenue'])).toEqual([
      'Revenue',
      'Entrances',
    ])
  })

  it('returns undefined for a known but unmapped metric column', () => {
    expect(apiMetricNamesForColumnIds(['visits', 'offerURL'])).toBeUndefined()
  })

  it('has a usable default metric set', () => {
    expect(defaultApiMetricNames()).toContain('Entrances')
    expect(defaultApiMetricNames()).toContain('Revenue')
  })
})
