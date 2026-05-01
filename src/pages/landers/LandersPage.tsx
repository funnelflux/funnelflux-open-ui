import { PageEntitiesPage } from '@/pages/PageEntitiesPage'

const LANDER_CSV_FIELDS = [
  { value: 'pageName', label: 'Name' },
  { value: 'url', label: 'URL' },
  { value: 'redirectType', label: 'Redirect Type' },
  { value: 'tags', label: 'Tags' },
  { value: 'notes', label: 'Notes' },
] as const

function buildLanderImportPayload(row: Record<string, string>) {
  return {
    pageType: 'lander',
    pageName: row.pageName ?? row.name ?? '',
    url: row.url ?? '',
    redirectType: row.redirectType ?? '307',
    tags: row.tags ? row.tags.split('|').map((tag) => tag.trim()).filter(Boolean) : [],
    notes: row.notes ?? '',
  }
}

export function LandersPage() {
  return (
    <PageEntitiesPage
      pageType="lander"
      tableConfigKey="landers"
      title="Landers"
      singularLabel="Lander"
      groupBy="Element: Lander"
      hideScope="offer"
      csvFieldOptions={[...LANDER_CSV_FIELDS]}
      buildImportPayload={buildLanderImportPayload}
    />
  )
}
