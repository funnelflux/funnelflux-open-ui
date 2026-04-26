import { describe, it, expect } from 'vitest'
import { buildMergedRows, buildTotalsRow, pagesToListEntities } from './entityGridUtils'
import type { ReportColumn } from '@/types/stats'
import type { Page } from '@/types/entities'

describe('buildMergedRows', () => {
  it('merges entities with stats', () => {
    const entities = [{ id: '1', name: 'Test' }]
    const statsById = { '1': [{ raw: '1', formatted: 'Test' }, { raw: 100, formatted: '100' }] }
    const columns: ReportColumn[] = [{ name: 'Name', type: 'grouping' }, { name: 'Visits', type: 'metric' }]
    const rows = buildMergedRows(entities, statsById, columns)
    expect(rows).toHaveLength(1)
    expect(rows[0].cells).toEqual(statsById['1'])
  })

  it('fills zero cells for entities without stats', () => {
    const entities = [{ id: '2', name: 'No Stats' }]
    const columns: ReportColumn[] = [{ name: 'Name', type: 'grouping' }, { name: 'Visits', type: 'metric' }]
    const rows = buildMergedRows(entities, {}, columns)
    expect(rows).toHaveLength(1)
    expect(rows[0].cells[0]).toEqual({ raw: '2', formatted: 'No Stats' })
    expect(rows[0].cells[1]).toEqual({ raw: 0, formatted: '0' })
  })

  it('formats empty metric cells using existing report formatting samples', () => {
    const entities = [
      { id: '1', name: 'With Stats' },
      { id: '2', name: 'No Stats' },
    ]
    const statsById = {
      '1': [
        { raw: '1', formatted: 'With Stats' },
        { raw: 4.2, formatted: '4.20%' },
        { raw: 12.3, formatted: '12.30' },
      ],
    }
    const columns: ReportColumn[] = [
      { name: 'Name', type: 'grouping' },
      { name: 'ROI', type: 'metric' },
      { name: 'Revenue', type: 'metric' },
    ]

    const rows = buildMergedRows(entities, statsById, columns)

    expect(rows[1].cells[1]).toEqual({ raw: 0, formatted: '0.00%' })
    expect(rows[1].cells[2]).toEqual({ raw: 0, formatted: '0.00' })
  })

  it('falls back to column metadata when no stats rows have samples', () => {
    const entities = [{ id: '2', name: 'No Stats' }]
    const columns: ReportColumn[] = [
      { name: 'Name', type: 'grouping' },
      { name: 'ROI', type: 'metric' },
    ]

    const rows = buildMergedRows(entities, {}, columns)

    expect(rows[0].cells[1]).toEqual({ raw: 0, formatted: '0.00%' })
  })
})

describe('buildTotalsRow', () => {
  it('returns null for null input', () => {
    expect(buildTotalsRow(null)).toBeNull()
  })

  it('returns totals row', () => {
    const cells = [{ raw: 'total', formatted: 'Totals' }, { raw: 500, formatted: '500' }]
    const row = buildTotalsRow(cells)
    expect(row).toEqual({ id: '__totals__', name: 'Totals', cells })
  })
})

describe('pagesToListEntities', () => {
  const basePage: Page = {
    idPage: 'p1',
    pageType: 'lander',
    pageName: 'Lander 1',
    url: 'https://example.com',
    redirectType: '307',
    tags: [],
    notes: '',
    isArchived: false,
  }

  it('maps Page to ListEntity', () => {
    const pages = [{ ...basePage, categoryId: 'cat1' }]
    const entities = pagesToListEntities(pages)
    expect(entities[0]).toEqual({ id: 'p1', name: 'Lander 1', isArchived: false, categoryId: 'cat1' })
  })

  it('handles null categoryId', () => {
    const pages = [{ ...basePage, idPage: 'p2', pageName: 'Lander 2', isArchived: true, categoryId: undefined }]
    const entities = pagesToListEntities(pages)
    expect(entities[0].categoryId).toBeUndefined()
  })
})
