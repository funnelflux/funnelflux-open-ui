// Re-export generated types from the OpenAPI spec
import type {
  ReportRow as GeneratedReportRow,
  Report as GeneratedReport,
  DrilldownRequest as GeneratedDrilldownRequest,
} from './generated/stats';

export type {
  Grouping,
  RequestPaging,
  RequestSorting,
  RequestColumnFilters,
  RequestOptions,
  SortingColumn,
  ConfidenceRate,
  ReportColumn,
  ApiDateTimeRange,
  ApiDateTime,
  ApiTimeZone,
  FilterColumn,
  MetricNames,
  CostSegment,
  CostUpload,
  ResetHits,
  ConvertedHit,
  ConversionsUpload,
  IntegerValue,
  CsvExportRequest,
  CsvExportResponse,
  BackgroundJobResponse,
} from './generated/stats';

/** Backend accepts `trackingFieldMappings` on drilldown POST bodies even when omitted from OpenAPI. */
export type DrilldownRequest = GeneratedDrilldownRequest & {
  trackingFieldMappings?: Record<string, { id: string }>
}

export type { ApiDate, ApiTime } from './generated/data';

// Override: API spec types ReportCell.raw as `string`, but the app
// also receives/computes numeric raws. Keep the wider union.
export interface ReportCell {
  raw: number | string;
  formatted: string;
}

// ReportRow with an index signature for dynamic property access
export type ReportRow = {
  cells: ReportCell[];
  rowId: string;
  ctrLanderConfidenceRate?: GeneratedReportRow['ctrLanderConfidenceRate'];
  ctrOfferConfidenceRate?: GeneratedReportRow['ctrOfferConfidenceRate'];
  cvrConfidenceRate?: GeneratedReportRow['cvrConfidenceRate'];
  epvConfidenceRate?: GeneratedReportRow['epvConfidenceRate'];
  children?: ReportRow[];
  parentRowId?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

// Report with paging object for backward compatibility
export interface Report {
  columns: GeneratedReport['columns'];
  rows: ReportRow[];
  totals: { cells: ReportCell[] };
  rowsReturned: number;
  rowsTotal: number;
  paging?: {
    start: number;
    length: number;
    totalRecords: number;
  };
}

// App-only tree grid type for UI rendering
export interface TreeGridRow {
  id: string;
  parentId?: string;
  cells: ReportCell[];
  expandableInfo?: {
    groupIds: string[];
    children?: TreeGridRow[];
  };
}
