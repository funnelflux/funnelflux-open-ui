import { useState } from 'react'
import { Space } from '@/components/ui-kit'
import { Select, SmartMultiSelect, TimezoneSelect, DateTimeRangePicker } from '@/components/ui-kit'
import type { SelectOption } from '@/components/ui-kit'

// Generate a large option list to demo virtualization
const LARGE_LIST: SelectOption[] = Array.from({ length: 1200 }, (_, i) => ({
  value: `item-${i + 1}`,
  label: `${['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet'][i % 10]} Campaign ${i + 1}`,
  searchId: `ID-${1000 + i}`,
}))

const SMALL_LIST: SelectOption[] = [
  { value: 'fb', label: 'Facebook' },
  { value: 'google', label: 'Google Ads' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'native', label: 'Native Ads' },
  { value: 'push', label: 'Push Notifications' },
  { value: 'email', label: 'Email Marketing' },
]

export function SelectsSection() {
  const [single, setSingle] = useState<string>()
  const [singleLarge, setSingleLarge] = useState<string>()
  const [multi, setMulti] = useState<string[]>(['fb', 'google', 'tiktok', 'native'])
  const [multiLarge, setMultiLarge] = useState<string[]>([])

  return (
    <section id="selects">
      <h2 className="text-xl font-semibold text-foreground mb-6">Selects & Dropdowns</h2>

      <div className="space-y-8 max-w-3xl">
        {/* Select - small list */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Single Select (small list)
          </h3>
          <p className="text-xs text-muted-foreground mb-2">
            Import: <code className="bg-muted px-1.5 py-0.5 rounded">{'import { Select } from "@/components/ui-kit"'}</code>
          </p>
          <Select
            options={SMALL_LIST}
            value={single}
            onChange={setSingle}
            placeholder="Choose traffic source"
            className="w-64"
          />
        </div>

        {/* Select - large list */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Single Select (1,200 items — capped at 200)
          </h3>
          <p className="text-xs text-muted-foreground mb-2">
            Lists over 200 items show "Type to search N more..." at the bottom. Matching items surface as you type.
            Searchable by name and ID.
          </p>
          <Select
            options={LARGE_LIST}
            value={singleLarge}
            onChange={setSingleLarge}
            placeholder="Search campaigns..."
            className="w-80"
          />
        </div>

        {/* SmartMultiSelect */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Multi Select with Capsules
          </h3>
          <p className="text-xs text-muted-foreground mb-2">
            Shows tag capsules that truncate to +N when exceeding width. <code className="bg-muted px-1.5 py-0.5 rounded">maxTagCount</code> controls this (default: 3).
          </p>
          <SmartMultiSelect
            options={SMALL_LIST}
            value={multi}
            onChange={setMulti}
            placeholder="Select sources"
            maxTagCount={3}
            className="w-80"
          />
        </div>

        {/* SmartMultiSelect - large list */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Multi Select (1,200 items)
          </h3>
          <SmartMultiSelect
            options={LARGE_LIST}
            value={multiLarge}
            onChange={setMultiLarge}
            placeholder="Search and select campaigns..."
            maxTagCount={2}
            className="w-96"
          />
        </div>

        {/* TimezoneSelect */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Timezone Selector
          </h3>
          <p className="text-xs text-muted-foreground mb-2">
            Strict-ordered (by UTC offset), searchable by city name. Persists to localStorage.
          </p>
          <TimezoneSelect />
        </div>

        {/* DateTimeRangePicker */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Date Range Picker
          </h3>
          <p className="text-xs text-muted-foreground mb-2">
            Date-only by default. <code className="bg-muted px-1.5 py-0.5 rounded">showTime</code> enables datetime with auto-advance:
            select start date → auto-moves to end date. Time defaults 00:00:00 → 23:59:59.
          </p>
          <Space orientation="vertical" size="middle">
            <DateTimeRangePicker />
            <DateTimeRangePicker showTime />
          </Space>
        </div>

        {/* Consistent height demo */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Consistent Heights (36px)
          </h3>
          <p className="text-xs text-muted-foreground mb-2">
            All single-line inputs share <code className="bg-muted px-1.5 py-0.5 rounded">controlHeight: 36</code> via antd theme. No manual sizing needed.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Select options={SMALL_LIST} placeholder="Select" className="w-48" />
            <DateTimeRangePicker />
            <TimezoneSelect />
          </div>
        </div>

        {/* Guidelines */}
        <div className="p-4 bg-muted rounded-lg border border-border text-sm text-muted-foreground space-y-2">
          <h3 className="font-medium text-foreground">Select Guidelines</h3>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>All user-asset lists (campaigns, offers, landers, etc.) must use <code>Select</code> or <code>SmartMultiSelect</code></li>
            <li>Lists are alphabetically sorted by default. Set <code>alphabetical=false</code> for strict-ordered lists (timezones, priorities)</li>
            <li>Provide <code>searchId</code> on options to enable search by entity ID</li>
            <li>The 200-item display cap prevents DOM thrash. Search always accesses the full list</li>
            <li>For grouping, use antd Select's native <code>options</code> with <code>OptGroup</code> pattern</li>
            <li><strong>Widths:</strong> Use <code>className="w-full"</code> inside grid cells (default). Use fixed widths (<code>w-48</code>, <code>w-64</code>) in toolbars. Selects expand to fill their container.</li>
            <li><strong>Heights:</strong> All 36px via theme. Never override with <code>size="small"</code> unless in a compact toolbar context.</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
