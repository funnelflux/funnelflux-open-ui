import { beforeEach, describe, expect, it } from 'vitest'
import {
  apiMetricNameForColumnId,
  apiMetricNamesForColumnIds,
  defaultApiMetricNames,
  resolveApiColumnId,
  visibleMetricColumnIdsFromHidden,
} from '@/lib/drilldownMetrics'

describe('drilldown metric mapping', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('maps registry ids to backend metric names', () => {
    expect(apiMetricNameForColumnId('visits')).toBe('Entrances')
    expect(apiMetricNameForColumnId('nodeViews')).toBe('Node Views')
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

  it('ignores non-metric and unknown column ids without aborting', () => {
    expect(apiMetricNamesForColumnIds(['visits', 'id', 'col-99', 'name'])).toEqual(['Entrances'])
  })

  it('has a usable default metric set', () => {
    expect(defaultApiMetricNames()).toContain('Entrances')
    expect(defaultApiMetricNames()).toContain('Revenue')
    expect(defaultApiMetricNames()).not.toContain('Uniqueness')
  })

  it('resolves API aliases to registry ids', () => {
    expect(resolveApiColumnId('Entrances')).toBe('visits')
    expect(resolveApiColumnId('Unique Entrances')).toBe('visitors')
    expect(resolveApiColumnId('Node Views')).toBe('nodeViews')
    expect(resolveApiColumnId('Unique CVRnv')).toBe('conversionRateNodeViewsUnique')
  })

  it('reads hidden metric ids from shared ff_columns storage', () => {
    localStorage.setItem('ff_columns_report-grid', JSON.stringify(['revenue']))

    const visible = visibleMetricColumnIdsFromHidden('report-grid', {
      defaultVisibleColumnIds: ['visits', 'revenue'],
    })

    expect(visible).toContain('visits')
    expect(visible).not.toContain('revenue')
  })
})
