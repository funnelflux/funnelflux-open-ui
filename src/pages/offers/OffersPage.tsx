import { PageEntitiesPage } from '@/pages/PageEntitiesPage'

const OFFER_CSV_FIELDS = [
  { value: 'pageName', label: 'Name' },
  { value: 'url', label: 'URL' },
  { value: 'redirectType', label: 'Redirect Type' },
  { value: 'idOfferSource', label: 'Offer Source ID' },
  { value: 'payout', label: 'Payout' },
  { value: 'tags', label: 'Tags' },
  { value: 'notes', label: 'Notes' },
] as const

function buildOfferImportPayload(row: Record<string, string>) {
  return {
    pageType: 'offer',
    pageName: row.pageName ?? row.name ?? '',
    url: row.url ?? '',
    redirectType: row.redirectType ?? '307',
    tags: row.tags ? row.tags.split('|').map((tag) => tag.trim()).filter(Boolean) : [],
    notes: row.notes ?? '',
    offerParams: {
      idOfferSource: row.idOfferSource ?? '',
      payout: Number(row.payout ?? 0),
    },
  }
}

export function OffersPage() {
  return (
    <PageEntitiesPage
      pageType="offer"
      tableConfigKey="offers"
      title="Offers"
      singularLabel="Offer"
      groupBy="Element: Offer"
      hideScope="lander"
      csvFieldOptions={[...OFFER_CSV_FIELDS]}
      buildImportPayload={buildOfferImportPayload}
    />
  )
}
