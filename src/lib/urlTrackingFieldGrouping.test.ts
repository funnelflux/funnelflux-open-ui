import { describe, expect, it } from 'vitest'
import { buildTrackingFieldMappingsForRequest } from '@/lib/urlTrackingFieldGrouping'

describe('buildTrackingFieldMappingsForRequest', () => {
  it('rebuilds tracking field mappings from restored level metadata', () => {
    expect(buildTrackingFieldMappingsForRequest(
      ['Element: Campaign', '__TRACKING_FIELD_2__'],
      {
        1: {
          fieldId: 'c2',
          trafficSourceId: 'ts-1',
          trafficSourceName: 'Traffic Source',
          index1Based: 2,
        },
      },
    )).toEqual({
      __TRACKING_FIELD_2__: { id: 'c2' },
    })
  })
})
