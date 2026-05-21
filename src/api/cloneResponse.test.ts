import { describe, expect, it } from 'vitest'
import { idNamePairFromCloneWire } from '@/api/cloneResponse'

describe('idNamePairFromCloneWire', () => {
  it('maps entity-specific funnel clone keys', () => {
    expect(
      idNamePairFromCloneWire(
        { idFunnel: '123', funnelName: 'My Funnel - 1710000000.1' },
        'idFunnel',
        'funnelName',
      ),
    ).toEqual({ id: '123', name: 'My Funnel - 1710000000.1' })
  })

  it('falls back to OpenAPI id/name when present', () => {
    expect(idNamePairFromCloneWire({ id: '9', name: 'X' }, 'idFunnel', 'funnelName')).toEqual({
      id: '9',
      name: 'X',
    })
  })
})
