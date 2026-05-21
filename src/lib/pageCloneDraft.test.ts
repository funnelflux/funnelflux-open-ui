import { describe, expect, it } from 'vitest'
import { buildPageCloneDraft } from './pageCloneDraft'
import type { Page } from '@/types/entities'

describe('buildPageCloneDraft', () => {
  it('assigns a new id and copy suffix for landers', () => {
    const source = {
      idPage: 'old',
      pageType: 'lander',
      pageName: 'My Lander',
      url: 'https://example.com',
      redirectType: '307',
    } as Page
    const draft = buildPageCloneDraft(source, 'lander')
    expect(draft.idPage).not.toBe('old')
    expect(draft.pageName).toBe('My Lander (copy)')
    expect(draft.pageType).toBe('lander')
    expect(draft.url).toBe('https://example.com')
  })
})
