export { DataTable } from './DataTable'
export { DataTablePagination, buildDataTablePageTokens } from './DataTablePagination'

export function entityRowId<T extends { id: string }>(row: T): string {
  return row.id
}
export type {
  DataTableProps,
  DataTablePaginationPosition,
  ColumnDef,
  SortingState,
  VisibilityState,
  RowSelectionState,
  PaginationState,
  ExpandedState,
  Row,
  Table,
} from './types'
export {
  cellRaw,
  cellFmt,
  nameColumn,
  idColumn,
  visitsColumn,
  clicksColumn,
  ctrColumn,
  convColumn,
  revenueColumn,
  costColumn,
  plColumn,
  roiColumn,
  actionsColumn,
  selectionColumn,
  editBtnColumn,
  cloneBtnColumn,
  deleteBtnColumn,
  archiveBtnColumn,
  addFunnelBtnColumn,
  addFunnelOrMoveColumn,
  moveBtnColumn,
  resetStatsBtnColumn,
  enableBtnColumn,
  disableBtnColumn,
  registryStatColumn,
  buildColumnsFromReport,
  countLeadingGroupingColumns,
  resolveApiColumnId,
} from './columnDefs'

export {
  ALL_COLUMN_GROUPS,
  getColumnMeta,
  getDefaultVisibleIds,
  COLUMN_CHOOSER_OTHER_GROUP,
  buildChooserGroupsForPage,
  filterColumnGroupsByScope,
} from './columnRegistry'

export type { ColumnAlign } from './columnDefs'
export type { ColumnGroupDef, ColumnMeta, MetricScope } from './columnRegistry'
