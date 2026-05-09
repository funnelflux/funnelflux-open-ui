import { TZDate } from '@date-fns/tz'
import type { ApiDateTime, ApiDateTimeRange } from '@/types/generated/stats'

/** Build {@link ApiDateTime} from a JS `Date` using UTC calendar and clock (matches backend expectations). */
export function toApiDateTime(d: Date): ApiDateTime {
  return {
    date: {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
    },
    time: {
      hour: d.getUTCHours(),
      minutes: d.getUTCMinutes(),
    },
  }
}

export function toApiDateTimeRange(from: Date, to: Date): ApiDateTimeRange {
  return {
    start: toApiDateTime(from),
    end: {
      date: {
        year: to.getUTCFullYear(),
        month: to.getUTCMonth() + 1,
        day: to.getUTCDate(),
      },
      time: { hour: 23, minutes: 59 },
    },
  }
}

/**
 * Inclusive stats window: start 00:00 and end 23:59 on the **calendar days** of `from` / `to` in
 * `reportingTimeZone` (same IANA id as {@link DrilldownRequest.timeZone}.name). The PHP API interprets
 * `timeRange` in that zone; using UTC getters here while sending e.g. `Asia/Tehran` shifts the window
 * and can return empty rows. Use `'UTC'` when the request timezone is UTC.
 */
/**
 * Calendar + clock in {@link reportingTimeZone} for absolute instant {@link d}.
 *
 * Use for cost upload / stats bodies where `timeZone.name` is an IANA id. The PHP
 * {@code DateTime::getAsUnixTimestamp()} path applies `strtotime` on these components then subtracts
 * the zone offset — so the wire values must be **wall time in the reporting zone**, not UTC
 * (see {@link toApiDateTime}, which uses UTC getters and will not match the picker when the browser
 * or reporting zone is not UTC).
 */
export function toApiDateTimeForReportingZone(d: Date, reportingTimeZone: string): ApiDateTime {
  const z = new TZDate(d.getTime(), reportingTimeZone)
  return {
    date: {
      year: z.getFullYear(),
      month: z.getMonth() + 1,
      day: z.getDate(),
    },
    time: {
      hour: z.getHours(),
      minutes: z.getMinutes(),
    },
  }
}

export function toApiDateTimeRangeForReporting(
  from: Date,
  to: Date,
  reportingTimeZone: string,
): ApiDateTimeRange {
  const fromZ = new TZDate(from.getTime(), reportingTimeZone)
  const toZ = new TZDate(to.getTime(), reportingTimeZone)
  return {
    start: {
      date: {
        year: fromZ.getFullYear(),
        month: fromZ.getMonth() + 1,
        day: fromZ.getDate(),
      },
      time: { hour: 0, minutes: 0 },
    },
    end: {
      date: {
        year: toZ.getFullYear(),
        month: toZ.getMonth() + 1,
        day: toZ.getDate(),
      },
      time: { hour: 23, minutes: 59 },
    },
  }
}
