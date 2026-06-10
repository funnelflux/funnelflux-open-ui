import type { CategoryStripGridRow } from '@/lib/entity-table/data/mergedRows'

export type PageGridRow = CategoryStripGridRow & Record<string, unknown>

export interface PageEntitiesPageProps {
  pageType: 'offer' | 'lander'
  tableConfigKey: 'offers' | 'landers'
  title: string
  singularLabel: string
  groupBy: string
  hideScope: 'offer' | 'lander'
}
