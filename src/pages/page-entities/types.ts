import type { EntityGridRow } from '@/api/hooks/useEntityGrid'

export type PageGridRow = EntityGridRow & {
  _isCategoryHeader?: boolean
  _categoryId?: string
} & Record<string, unknown>

export interface CsvFieldOption {
  value: string
  label: string
}

export interface PageEntitiesPageProps {
  pageType: 'offer' | 'lander'
  tableConfigKey: 'offers' | 'landers'
  title: string
  singularLabel: string
  groupBy: string
  hideScope: 'offer' | 'lander'
  csvFieldOptions: CsvFieldOption[]
  buildImportPayload: (row: Record<string, string>) => Record<string, unknown>
}
