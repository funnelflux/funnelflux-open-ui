// Grouping for drilldown requests
export interface Grouping {
  groupBy: string
  whitelistFilters: string[]
  blacklistFilters: string[]
}

// Paging
export interface RequestPaging {
  start: number
  length: number
}

// Sorting
export interface RequestSorting {
  column?: number
  direction?: 'asc' | 'desc'
}

// Column filters
export interface RequestColumnFilters {
  filters?: Record<string, string>
}

// Options
export interface RequestOptions {
  viewType?: 'tree' | 'flat'
}

// DateTime components matching the PHP models
export interface ApiDate {
  year: string
  month: string
  day: string
}

export interface ApiTime {
  hour: number
  minutes: number
}

export interface ApiDateTime {
  date: ApiDate
  time: ApiTime
}

export interface ApiDateTimeRange {
  start: ApiDateTime
  end: ApiDateTime
}

export interface ApiTimeZone {
  name: string
  offset?: number
}

// Full drilldown request body
export interface DrilldownRequest {
  timeRange: ApiDateTimeRange
  timeZone: ApiTimeZone
  groupings: Grouping[]
  topLevelFilters?: Grouping[]
  columnFilters?: RequestColumnFilters
  paging?: RequestPaging
  sorting?: RequestSorting
  options?: RequestOptions
  trackingFieldMappings?: Record<string, string>
}

// Helper to build API date/time from JS Date
export function toApiDateTime(d: Date): ApiDateTime {
  return {
    date: {
      year: String(d.getFullYear()),
      month: String(d.getMonth() + 1),
      day: String(d.getDate()),
    },
    time: {
      hour: d.getHours(),
      minutes: d.getMinutes(),
    },
  }
}

export function toApiDateTimeRange(from: Date, to: Date): ApiDateTimeRange {
  return {
    start: toApiDateTime(from),
    end: {
      date: {
        year: String(to.getFullYear()),
        month: String(to.getMonth() + 1),
        day: String(to.getDate()),
      },
      time: { hour: 23, minutes: 59 },
    },
  }
}

// Report cell
export interface ReportCell {
  raw: number | string
  formatted: string
}

// Report column
export interface ReportColumn {
  name: string
  type: string
}

// Report row
export interface ReportRow {
  cells: ReportCell[]
  rowId?: string
  children?: ReportRow[]
  parentRowId?: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

// Full report response
export interface Report {
  columns: ReportColumn[]
  rows: ReportRow[]
  totals: {
    cells: ReportCell[]
  }
  paging?: {
    start: number
    length: number
    totalRecords: number
  }
}

// Tree grid formatted data
export interface TreeGridRow {
  id: string
  parentId?: string
  cells: ReportCell[]
  expandableInfo?: {
    groupIds: string[]
    children?: TreeGridRow[]
  }
}
