import { useCallback } from 'react'
import { Drawer, Segmented, Switch } from '@/components/ui-kit'
import { useDrilldownToolbarContext } from '@/components/drilldown/DrilldownToolbar/useDrilldownToolbarContext'
import { TIME_ATTRIBUTION_OPTIONS } from '@/components/drilldown/DrilldownToolbar/types'

export function DrilldownSettingsDrawer() {
  const {
    settingsDrawerOpen,
    closeSettingsDrawer,
    timeAttribution,
    setTimeAttribution,
    showFilteredTraffic,
    setShowFilteredTraffic,
    showWinners,
    setShowWinners,
  } = useDrilldownToolbarContext()

  const handleTimeAttributionChange = useCallback(
    (value: string | number) => {
      setTimeAttribution(value === 'event' ? 'event' : 'entrance')
    },
    [setTimeAttribution],
  )

  const handleShowFilteredTrafficChange = useCallback(
    (checked: boolean) => {
      setShowFilteredTraffic(checked)
    },
    [setShowFilteredTraffic],
  )

  const handleShowWinnersChange = useCallback(
    (checked: boolean) => {
      setShowWinners(checked)
    },
    [setShowWinners],
  )

  return (
    <Drawer
      title="Report settings"
      placement="right"
      width={420}
      open={settingsDrawerOpen}
      onClose={closeSettingsDrawer}
      destroyOnClose={false}
    >
      <div className="flex flex-col gap-5">
        <div className="space-y-2">
          <div className="text-sm font-medium">Attribution</div>
          <p className="text-xs text-muted-foreground">
            Choose whether the selected date range is matched against the entrance timestamp or the event timestamp.
          </p>
          <Segmented
            block
            value={timeAttribution}
            options={[...TIME_ATTRIBUTION_OPTIONS]}
            onChange={handleTimeAttributionChange}
          />
        </div>

        <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">Show filtered traffic</div>
            <p className="text-xs text-muted-foreground">
              Include traffic that was filtered out by rules or bot filtering in the report query.
            </p>
          </div>
          <Switch checked={showFilteredTraffic} onChange={handleShowFilteredTrafficChange} />
        </div>

        <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">Show winners</div>
            <p className="text-xs text-muted-foreground">
              Request CTR, CVR, and EPV winner confidence data. Table highlighting can be added on top of this data later.
            </p>
          </div>
          <Switch checked={showWinners} onChange={handleShowWinnersChange} />
        </div>
      </div>
    </Drawer>
  )
}
