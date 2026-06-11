import { describe, expect, it } from 'vitest'
import {
  buildLegacySettings,
  drilldownViewRowToSavedView,
} from '@/api/hooks/useSavedViews'

describe('Saved View URL tracking metadata', () => {
  it('includes URL tracking metadata in save settings', () => {
    expect(buildLegacySettings({
      name: 'URL fields',
      groupings: ['Element: Campaign', '__TRACKING_FIELD_1__'],
      timezone: 'UTC',
      dateRange: null,
      groupingFilters: {
        0: { whitelist: ['camp-1'], blacklist: [] },
      },
      urlTrackingFieldByLevel: {
        1: {
          fieldId: 'c1',
          trafficSourceId: 'ts-1',
          trafficSourceName: 'Traffic Source',
          index1Based: 1,
        },
      },
    })).toEqual([
      { by: 'Element: Campaign', id: 'camp-1' },
      {
        by: '__TRACKING_FIELD_1__',
        urlTrackingField: {
          fieldId: 'c1',
          trafficSourceId: 'ts-1',
          trafficSourceName: 'Traffic Source',
          index1Based: 1,
        },
      },
    ])
  })

  it('restores URL tracking metadata from loaded view rows', () => {
    const view = drilldownViewRowToSavedView({
      id: 'view-1',
      name: 'Loaded URL fields',
      groupings: [
        { groupBy: 'Element: Campaign', whitelistFilters: ['camp-1'] },
        {
          groupBy: '__TRACKING_FIELD_2__',
          urlTrackingField: {
            fieldId: 'c2',
            trafficSourceId: 'ts-1',
            trafficSourceName: 'Traffic Source',
            index1Based: 2,
          },
        },
      ],
    })

    expect(view.groupings).toEqual(['Element: Campaign', '__TRACKING_FIELD_2__'])
    expect(view.groupingFilters).toEqual({
      0: { whitelist: ['camp-1'], blacklist: [] },
      1: { whitelist: [], blacklist: [] },
    })
    expect(view.urlTrackingFieldByLevel).toEqual({
      1: {
        fieldId: 'c2',
        trafficSourceId: 'ts-1',
        trafficSourceName: 'Traffic Source',
        index1Based: 2,
      },
    })
  })
})
