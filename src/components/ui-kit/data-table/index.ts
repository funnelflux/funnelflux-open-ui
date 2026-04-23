export { DataTable } from './DataTable'

export function entityRowId<T extends { id: string }>(row: T): string {
  return row.id
}
export type {
  DataTableProps,
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
  getColumnMeta,
  getDefaultVisibleIds,
  buildColumnsFromReport,
  resolveApiColumnId,
  ALL_COLUMN_GROUPS,
  buildChooserGroupsForPage,
  COLUMN_CHOOSER_OTHER_GROUP,
  filterColumnGroupsByScope,
} from './columnDefs'
export type { ColumnAlign, ColumnGroupDef, ColumnMeta, MetricScope } from './columnDefs'
