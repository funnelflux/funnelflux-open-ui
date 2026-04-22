import { describe, it, expect, beforeEach } from 'vitest'
import { isServerPaginated, setServerPaginated, getServerPaginationConfig } from './paginationConfig'

describe('paginationConfig', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to client-side pagination', () => {
    expect(isServerPaginated('landers')).toBe(false)
  })

  it('can enable server-side pagination', () => {
    setServerPaginated('landers', true)
    expect(isServerPaginated('landers')).toBe(true)
    expect(isServerPaginated('offers')).toBe(false)
  })

  it('returns full config', () => {
    setServerPaginated('offers', true)
    const config = getServerPaginationConfig()
    expect(config.offers).toBe(true)
    expect(config.landers).toBe(false)
  })
})
