import { PageEntitiesPage } from '@/pages/PageEntitiesPage'

export function LandersPage() {
  return (
    <PageEntitiesPage
      pageType="lander"
      tableConfigKey="landers"
      title="Landers"
      singularLabel="Lander"
      groupBy="Element: Lander"
      hideScope="offer"
    />
  )
}
