import { describe, expect, it } from 'vitest'
import {
  mergeSaveAcknowledgement,
  offerSourceForEntityGridCache,
  pageForEntityGridCache,
  trafficSourceForEntityGridCache,
} from '@/lib/entity-table/data/saveMerge'
import type { Page } from '@/types/entities'

describe('mergeSaveAcknowledgement', () => {
  it('returns submitted unchanged when saved is empty ack', () => {
    const submitted = { idPage: '1', pageName: 'A' }
    expect(mergeSaveAcknowledgement(submitted, { success: true })).toEqual(submitted)
  })

  it('overlays entity fields from saved when present', () => {
    const submitted = { idPage: '1', pageName: 'Old' }
    expect(mergeSaveAcknowledgement(submitted, { success: true, pageName: 'New' })).toEqual({
      idPage: '1',
      pageName: 'New',
    })
  })
})

describe('pageForEntityGridCache', () => {
  it('builds Page from POST ack + submitted payload', () => {
    const submitted: Partial<Page> = {
      idPage: '99',
      pageType: 'offer',
      pageName: 'My Offer',
      url: 'https://x.test',
      categoryId: 'cat1',
    }
    const page = pageForEntityGridCache({ success: true }, submitted)
    expect(page).toMatchObject({
      idPage: '99',
      pageType: 'offer',
      pageName: 'My Offer',
      url: 'https://x.test',
      categoryId: 'cat1',
    })
  })

  it('returns null without idPage', () => {
    expect(pageForEntityGridCache({ success: true }, { pageName: 'x' })).toBeNull()
  })
})

describe('trafficSourceForEntityGridCache', () => {
  it('preserves idCategory from submitted when ack is bare', () => {
    const mergedTrafficSource = trafficSourceForEntityGridCache(
      { success: true },
      {
        idTrafficSource: 'ts1',
        trafficSourceName: 'SRC',
        costType: 'cpa',
        idCategory: 'c9',
      },
    )
    expect(mergedTrafficSource).toMatchObject({
      idTrafficSource: 'ts1',
      trafficSourceName: 'SRC',
      idCategory: 'c9',
    })
  })
})

describe('offerSourceForEntityGridCache', () => {
  it('maps form payload through bare ack', () => {
    const mergedOfferSource = offerSourceForEntityGridCache(
      { success: true },
      {
        idOfferSource: 'os1',
        offerSourceName: 'Net',
        subId: 's',
        querySeparator: '&',
        postbackSubId: '',
        postbackTxId: '',
        postbackPayout: '',
      },
    )
    expect(mergedOfferSource).toMatchObject({ idOfferSource: 'os1', offerSourceName: 'Net' })
  })
})
