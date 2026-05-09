import { describe, it, expect } from 'vitest'
import { TZDate } from '@date-fns/tz'
import { startOfDay } from 'date-fns'
import {
  toApiDateTime,
  toApiDateTimeForReportingZone,
  toApiDateTimeRangeForReporting,
} from './statsDateRange'

describe('toApiDateTime', () => {
  it('uses getUTC* calendar and clock', () => {
    const d = new Date(Date.UTC(2026, 1, 5, 20, 30, 0))
    expect(toApiDateTime(d)).toEqual({
      date: { year: 2026, month: 2, day: 5 },
      time: { hour: 20, minutes: 30 },
    })
  })
})

describe('toApiDateTimeForReportingZone', () => {
  it('uses reporting-zone wall clock, not UTC (fixes cost / stats payloads vs picker)', () => {
    const start = startOfDay(new TZDate(2026, 4, 4, 'Asia/Tehran'))
    expect(toApiDateTime(start)).toEqual({
      date: { year: 2026, month: 5, day: 3 },
      time: { hour: 20, minutes: 30 },
    })
    expect(toApiDateTimeForReportingZone(start, 'Asia/Tehran')).toEqual({
      date: { year: 2026, month: 5, day: 4 },
      time: { hour: 0, minutes: 0 },
    })
  })
})

describe('toApiDateTimeRangeForReporting', () => {
  it('uses UTC calendar when reporting zone is UTC', () => {
    const from = new Date(Date.UTC(2026, 1, 6, 15, 0, 0))
    const to = new Date(Date.UTC(2026, 4, 6, 12, 0, 0))
    const r = toApiDateTimeRangeForReporting(from, to, 'UTC')
    expect(r.start).toEqual({
      date: { year: 2026, month: 2, day: 6 },
      time: { hour: 0, minutes: 0 },
    })
    expect(r.end).toEqual({
      date: { year: 2026, month: 5, day: 6 },
      time: { hour: 23, minutes: 59 },
    })
  })

  it('uses reporting IANA zone calendar (aligns with drilldown timeZone)', () => {
    const from = startOfDay(new TZDate(2026, 1, 6, 'Asia/Tehran'))
    const to = startOfDay(new TZDate(2026, 4, 6, 'Asia/Tehran'))
    const r = toApiDateTimeRangeForReporting(from, to, 'Asia/Tehran')
    expect(r.start.date).toEqual({ year: 2026, month: 2, day: 6 })
    expect(r.end.date).toEqual({ year: 2026, month: 5, day: 6 })
  })
})
