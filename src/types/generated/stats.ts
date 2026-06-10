// Auto-generated from api-specs/stats-api.yaml -- do not edit manually

import type { ApiDate, ApiTime, KeyValuePair } from './data';
export type { ApiDate, ApiTime, KeyValuePair } from './data';

export interface CostSegment {
  cost: number;
  costType?: 'costForWholeSegment' | 'costPerEntrance';
  applyToFilteredTraffic?: boolean;
  restrictToCountryCode?: string | null;
  restrictToTrackingFields?: KeyValuePair[];
}

export interface CostUpload {
  idFunnel?: string;
  idTrafficSource: string;
  timeRange: ApiDateTimeRange;
  timeZone: ApiTimeZone;
  costSegments: CostSegment[];
  notificationWhenComplete?: boolean;
}

export interface ResetHits {
  timeRange: ApiDateTimeRange;
  timeZone: ApiTimeZone;
  restrictToFunnelId?: string | null;
  restrictToTrafficSourceId?: string | null;
  restrictToVisitorId?: string | null;
  restrictToTrackingFields?: Record<string, unknown>;
}

export interface ConvertedHit {
  idHit: string;
  transaction?: string;
  payout?: number;
}

export interface ConversionsUpload {
  hits: ConvertedHit[];
  postbackCalls?: 'none' | 'onlyOnce' | 'all';
  notificationWhenComplete?: boolean;
}

export interface ApiTimeZone {
  name?: string;
  offset?: number;
}

export interface Grouping {
  groupBy: string;
  whitelistFilters?: string[];
  blacklistFilters?: string[];
}

export interface MetricNames {
  names?: string;
}

export interface RequestPaging {
  start?: number;
  length?: number;
  offset?: number;
  limit?: number;
  rowsCount?: number;
}

export interface FilterColumn {
  columnName: string;
  filter: string;
}

export interface RequestColumnFilters {
  filterColumns?: FilterColumn[];
}

export interface SortingColumn {
  columnName?: string;
  order?: 'desc' | 'asc';
}

export interface RequestSorting {
  sortingColumns?: SortingColumn[];
}

export interface RequestOptions {
  viewType?: 'flat' | 'tree' | 'mixed';
  showArchivedAssets?: boolean;
  includeMissingAssets?: boolean;
  assetStatus?: 'active' | 'archived' | 'all';
  showUnknown?: boolean;
  showFilteredTraffic?: boolean;
  onlyConvertedHits?: boolean;
  computeCTRConfidenceRate?: boolean;
  computeCVRConfidenceRate?: boolean;
  computeEPVConfidenceRate?: boolean;
  confidenceRateIncludeAll?: boolean;
  timeAttribution?: 'entrance' | 'event';
  idCampaignFilter?: string | null;
  idFunnelFilter?: string | null;
  idTrafficSourceFilter?: string | null;
  flattened?: boolean;
}

export interface DrilldownRequest {
  timeRange: ApiDateTimeRange;
  timeZone: ApiTimeZone;
  groupings?: Grouping[];
  topLevelFilters?: Grouping[];
  columnFilters?: RequestColumnFilters;
  paging?: RequestPaging;
  sorting?: RequestSorting;
  options?: RequestOptions;
  trackingFieldMappings?: Record<string, unknown>;
  metrics?: string[];
  responseFormat?: 'standard' | 'compact-v1';
}

export interface ConfidenceRate {
  rate?: number;
}

export interface ReportColumn {
  name: string;
  type: 'grouping' | 'metric';
  description?: string;
}

export interface ReportCell {
  formatted: string;
  raw: unknown;
}

export interface ReportRow {
  cells: ReportCell[];
  rowId: string;
  ctrLanderConfidenceRate?: ConfidenceRate;
  ctrOfferConfidenceRate?: ConfidenceRate;
  cvrConfidenceRate?: ConfidenceRate;
  epvConfidenceRate?: ConfidenceRate;
  children?: ReportRow[];
  parentRowId?: string;
  formatter_tree_row_group_by?: string;
}

export interface Report {
  columns: ReportColumn[];
  rows: ReportRow[];
  totals: ReportRow;
  rowsReturned: number;
  rowsTotal: number;
  sqlLog?: string[];
}

export interface ApiDateTimeRange {
  start: ApiDateTime;
  end: ApiDateTime;
}

export interface ApiDateTime {
  date: ApiDate;
  time: ApiTime;
}

export interface IntegerValue {
  value?: number;
}

export interface TrackingFieldMapping {
  id: string;
}

export interface CsvExportRequest {
  drilldownRequest: CsvDrilldownRequest;
  filename?: string;
  offset?: number;
  limit?: number;
  addHeader?: boolean;
}

export interface CsvDrilldownRequest {
  timeStart: number;
  timeEnd: number;
  timeZone?: ApiTimeZone;
  groupings?: Grouping[];
  topLevelFilters?: Grouping[];
  columnFilters?: RequestColumnFilters;
  paging?: RequestPaging;
  sorting?: RequestSorting;
  options?: RequestOptions;
  trackingFieldMappings?: Record<string, unknown>;
  metrics?: string[];
  responseFormat?: 'standard' | 'compact-v1';
}

export interface CsvExportResponse {
  success?: boolean;
  complete?: boolean;
  rowsWritten?: number;
  url?: string;
  nextOffset?: number;
}

export interface BackgroundJobResponse {
  success?: boolean;
  jobIds?: string[];
  queuedAt?: string;
}
