import { TZDate } from "@date-fns/tz"
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
} from "date-fns"

export interface DateRange {
  from: Date
  to: Date
}

export interface PresetOption {
  label: string
  value: string
}

export const DATE_PRESETS: PresetOption[] = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 Days", value: "last7" },
  { label: "Last 30 Days", value: "last30" },
  { label: "Last 90 Days", value: "last90" },
  { label: "This Week", value: "thisWeek" },
  { label: "Last Week", value: "lastWeek" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
]

export function getPresetRange(preset: string, timezone: string): DateRange {
  const now = new TZDate(new Date(), timezone)

  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) }
    case "yesterday": {
      const yesterday = subDays(now, 1)
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) }
    }
    case "last7":
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) }
    case "last30":
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) }
    case "last90":
      return { from: startOfDay(subDays(now, 89)), to: endOfDay(now) }
    case "thisWeek":
      return {
        from: startOfWeek(now, { weekStartsOn: 1 }),
        to: endOfDay(now),
      }
    case "lastWeek": {
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
      return {
        from: lastWeekStart,
        to: endOfWeek(lastWeekStart, { weekStartsOn: 1 }),
      }
    }
    case "thisMonth":
      return { from: startOfMonth(now), to: endOfDay(now) }
    case "lastMonth": {
      const lastMonthStart = startOfMonth(subMonths(now, 1))
      return { from: lastMonthStart, to: endOfMonth(lastMonthStart) }
    }
    default:
      return { from: startOfDay(now), to: endOfDay(now) }
  }
}

export function formatDateRange(from: Date, to: Date, preset: string | null): string {
  if (preset) {
    const found = DATE_PRESETS.find((p) => p.value === preset)
    if (found) return found.label
  }
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  return `${fmt(from)} – ${fmt(to)}`
}
