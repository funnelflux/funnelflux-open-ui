import { describe, expect, it } from 'vitest'
import { parsePageCsvText } from '@/lib/parsePageCsv'
import { pageCsvTemplateUrl, pageTypeToImportCsvType } from '@/lib/pageCsvImport'

describe('pageCsvImport helpers', () => {
  it('resolves template URLs like the legacy admin UI', () => {
    expect(pageCsvTemplateUrl('offer')).toBe('/admin/templates/import-offers.csv')
    expect(pageCsvTemplateUrl('lander')).toBe('/admin/templates/import-landers.csv')
  })

  it('maps page type to API import type', () => {
    expect(pageTypeToImportCsvType('lander')).toBe('1')
    expect(pageTypeToImportCsvType('offer')).toBe('2')
  })
})

describe('parsePageCsvText', () => {
  it('parses quoted offer template rows', () => {
    const text = `"Offer Name","Category","URL","Payout","Offer Source","Redirect Type (307,301,ultimate)"
"Test Offer 1","My Test Category","http://www.offer1.com","0.0","My Squeeze Pages","301"
"Test Offer 2","My Test Category","http://www.offer2.com","20.45","Bounty","307"`

    const parsed = parsePageCsvText(text)
    expect(parsed.headers).toEqual([
      'Offer Name',
      'Category',
      'URL',
      'Payout',
      'Offer Source',
      'Redirect Type (307,301,ultimate)',
    ])
    expect(parsed.rows).toHaveLength(2)
    expect(parsed.rows[0][0]).toBe('Test Offer 1')
    expect(parsed.rows[1][4]).toBe('Bounty')
  })
})
