import { describe, expect, it } from 'vitest'
import { buildOfferSourceCloneDraft } from './offerSourceCloneDraft'
import type { OfferSource } from '@/types/entities'

describe('buildOfferSourceCloneDraft', () => {
  it('assigns a new id and copy suffix', () => {
    const source = {
      idOfferSource: 'old',
      offerSourceName: 'Network A',
      subId: 'sub',
      querySeparator: '&',
      isArchived: false,
    } as OfferSource
    const draft = buildOfferSourceCloneDraft(source)
    expect(draft.idOfferSource).not.toBe('old')
    expect(draft.offerSourceName).toBe('Network A (copy)')
  })
})
