import { describe, expect, it } from 'vitest'
import { TZDate } from '@date-fns/tz'
import { endOfDay, startOfDay } from 'date-fns'
import {
  createDefaultEntityTableDateRange,
  dateRangeQueryKey,
  toApiDateTimeForReportingZone,
  toApiDateTimeRange,
  toApiDateTimeRangeForReporting,
} from '@/lib/statsDateRange'

describe('dateRangeQueryKey', () => {
  it('matches for the same calendar range even when Date instances differ', () => {
    const first = createDefaultEntityTableDateRange('UTC')
    const second = createDefaultEntityTableDateRange('UTC')

    expect(dateRangeQueryKey(first.from, first.to, 'UTC')).toEqual(
      dateRangeQueryKey(second.from, second.to, 'UTC'),
    )
  })

  it('uses the API timeRange shape instead of raw ISO timestamps', () => {
    const range = createDefaultEntityTableDateRange('UTC')

    expect(dateRangeQueryKey(range.from, range.to, 'UTC')).toEqual([
      'UTC',
      toApiDateTimeRange(range.from, range.to),
    ])
  })
})

describe('createDefaultEntityTableDateRange', () => {
  it('normalizes to start/end of day in the reporting timezone', () => {
    const range = createDefaultEntityTableDateRange('UTC')
    const apiRange = toApiDateTimeRange(range.from, range.to)

    expect(apiRange.start.time).toEqual({ hour: 0, minutes: 0 })
    expect(apiRange.end.time).toEqual({ hour: 23, minutes: 59 })
  })
})

describe('toApiDateTimeForReportingZone', () => {
  it('uses wall-clock calendar fields in the reporting zone, not UTC getters', () => {
    const tz = 'Asia/Tehran'
    const day = new TZDate(new Date('2026-06-07T12:00:00Z'), tz)
    const from = startOfDay(day)
    const to = endOfDay(day)

    expect(toApiDateTimeForReportingZone(from, tz)).toEqual({
      date: { year: 2026, month: 6, day: 7 },
      time: { hour: 0, minutes: 0 },
    })
    expect(toApiDateTimeForReportingZone(to, tz)).toEqual({
      date: { year: 2026, month: 6, day: 7 },
      time: { hour: 23, minutes: 59 },
    })
  })
})

describe('toApiDateTimeRangeForReporting', () => {
  it('matches per-instant reporting zone conversion for drilldown bodies', () => {
    const tz = 'Asia/Tehran'
    const day = new TZDate(new Date('2026-06-07T12:00:00Z'), tz)
    const from = startOfDay(day)
    const to = endOfDay(day)

    expect(toApiDateTimeRangeForReporting(from, to, tz)).toEqual({
      start: toApiDateTimeForReportingZone(from, tz),
      end: toApiDateTimeForReportingZone(to, tz),
    })
  })
})
