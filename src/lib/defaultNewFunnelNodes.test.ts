import { describe, expect, it } from 'vitest'
import { buildMinimalNewFunnelPayload } from '@/lib/defaultNewFunnelNodes'

describe('buildMinimalNewFunnelPayload', () => {
  it('returns a create-ready funnel with one root node', () => {
    const payload = buildMinimalNewFunnelPayload('camp-1', 'Test funnel')
    expect(payload.idCampaign).toBe('camp-1')
    expect(payload.funnelName).toBe('Test funnel')
    expect(payload.idFunnel).toMatch(/^\d+$/)
    expect(payload.nodes).toHaveLength(1)
    expect(payload.nodes?.[0]?.nodeType).toBe('root')
    expect(payload.nodes?.[0]?.idFunnel).toBe(payload.idFunnel)
    expect(payload.connections).toEqual([])
  })
})
