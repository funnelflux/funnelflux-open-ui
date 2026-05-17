/**
 * Column ids visible on first visit for entity grids (before `ff_columns_*` localStorage).
 * Name, row selection, and action columns are always shown and are not listed here.
 */
export const defaultColIds = [
  'id',
  'visits',
  'landerViews',
  'offerViews',
  'conversions',
  'revenue',
  'cost',
  'profitAndLoss',
  'returnOnInvestment',
] as const
