import { describe, it, expect } from 'vitest'
import { buildMergedRows, buildTotalsRow, pagesToListEntities } from './mergedRows'
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

  it('appends list-only entities (create) with zero-filled metric cells', () => {
    const entities = [
      { id: 'existing', name: 'Existing' },
      { id: 'new-id', name: 'New Asset' },
    ]
    const statsById = {
      existing: [
        { raw: 'existing', formatted: 'Existing' },
        { raw: 5, formatted: '5' },
      ],
    }
    const columns: ReportColumn[] = [
      { name: 'Name', type: 'grouping' },
      { name: 'Visits', type: 'metric' },
    ]

    const rows = buildMergedRows(entities, statsById, columns)

    expect(rows).toHaveLength(2)
    expect(rows[1].id).toBe('new-id')
    expect(rows[1].name).toBe('New Asset')
    expect(rows[1].cells[0]).toEqual({ raw: 'new-id', formatted: 'New Asset' })
    expect(rows[1].cells[1]).toEqual({ raw: 0, formatted: '0' })
  })

  it('uses list entity name over stale stats formatted name (rename)', () => {
    const entities = [{ id: '1', name: 'Renamed' }]
    const statsById = {
      '1': [
        { raw: '1', formatted: 'Old Name' },
        { raw: 10, formatted: '10' },
      ],
    }
    const columns: ReportColumn[] = [
      { name: 'Name', type: 'grouping' },
      { name: 'Visits', type: 'metric' },
    ]

    const rows = buildMergedRows(entities, statsById, columns)

    expect(rows[0].name).toBe('Renamed')
    expect(rows[0].cells[1]).toEqual({ raw: 10, formatted: '10' })
  })

  it('omits entities removed from the list (delete/archive)', () => {
    const entities = [{ id: 'remaining', name: 'Still Here' }]
    const statsById = {
      remaining: [
        { raw: 'remaining', formatted: 'Still Here' },
        { raw: 1, formatted: '1' },
      ],
      deleted: [
        { raw: 'deleted', formatted: 'Gone' },
        { raw: 99, formatted: '99' },
      ],
    }
    const columns: ReportColumn[] = [
      { name: 'Name', type: 'grouping' },
      { name: 'Visits', type: 'metric' },
    ]

    const rows = buildMergedRows(entities, statsById, columns)

    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('remaining')
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
    expect(entities[0]).toEqual({
      id: 'p1',
      name: 'Lander 1',
      isArchived: false,
      categoryId: 'cat1',
      url: 'https://example.com',
    })
  })

  it('maps offer summary URL and payout metadata', () => {
    const entities = pagesToListEntities([{
      idPage: 'p3',
      pageName: 'Offer 3',
      categoryId: 'cat3',
      url: 'https://offer.example.com',
      payout: 55,
    }])

    expect(entities[0]).toEqual({
      id: 'p3',
      name: 'Offer 3',
      isArchived: false,
      categoryId: 'cat3',
      url: 'https://offer.example.com',
      payout: 55,
    })
  })

  it('handles null categoryId', () => {
    const pages = [{ ...basePage, idPage: 'p2', pageName: 'Lander 2', isArchived: true, categoryId: undefined }]
    const entities = pagesToListEntities(pages)
    expect(entities[0].categoryId).toBeUndefined()
  })
})
