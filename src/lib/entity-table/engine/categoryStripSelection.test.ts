import { describe, expect, it } from 'vitest'
import { syncCategoryStripRowSelection } from './categoryStripSelection'
import type { EntityGridRow } from '@/lib/entity-table/data/mergedRows'

const rows = [
  {
    id: 'campaign:10',
    name: 'Campaign 10',
    cells: [],
    _isCategoryHeader: true,
    _categoryId: '10',
    categoryId: '10',
    campaignId: '10',
  },
  { id: 'funnel-a', name: 'Funnel A', cells: [], categoryId: '10', campaignId: '10' },
  { id: 'funnel-b', name: 'Funnel B', cells: [], categoryId: '10', campaignId: '10' },
  {
    id: 'cat:20',
    name: 'Category 20',
    cells: [],
    _isCategoryHeader: true,
    _categoryId: '20',
    categoryId: '20',
  },
  { id: 'source-a', name: 'Source A', cells: [], categoryId: '20' },
] satisfies EntityGridRow[]

describe('syncCategoryStripRowSelection', () => {
  it('selects children for campaign-style category headers', () => {
    expect(syncCategoryStripRowSelection({}, { 'campaign:10': true }, rows)).toEqual({
      'campaign:10': true,
      'funnel-a': true,
      'funnel-b': true,
    })
  })

  it('deselects children for campaign-style category headers', () => {
    expect(syncCategoryStripRowSelection(
      { 'campaign:10': true, 'funnel-a': true, 'funnel-b': true },
      { 'funnel-a': true, 'funnel-b': true },
      rows,
    )).toEqual({})
  })

  it('still supports cat-prefixed category headers', () => {
    expect(syncCategoryStripRowSelection({}, { 'cat:20': true }, rows)).toEqual({
      'cat:20': true,
      'source-a': true,
    })
  })
})
