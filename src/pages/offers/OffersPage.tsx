import { PageEntitiesPage } from '@/pages/PageEntitiesPage'

export function OffersPage() {
  return (
    <PageEntitiesPage
      pageType="offer"
      tableConfigKey="offers"
      title="Offers"
      singularLabel="Offer"
      groupBy="Element: Offer"
      hideScope="lander"
    />
  )
}
