import { Navigate, useParams } from 'react-router-dom'
import { Icon } from '@/components/ui-kit/icons'
import { useFunnel } from '@/api/hooks'

/** Old path `/funnel-builder/:id` → canonical `/campaigns/:campaignId/funnels/:funnelId`. */
export function FunnelBuilderLegacyRedirect() {
  const { id = '' } = useParams<{ id: string }>()
  const { data: funnel, isLoading, isError } = useFunnel(id, { loadDependencies: false })

  if (!id) return <Navigate to="/campaigns" replace />

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-muted-foreground inline-flex [&>svg]:h-6 [&>svg]:w-6">
          <Icon name="loader-2" size="lg" animation="spin" />
        </span>
      </div>
    )
  }

  if (isError || !funnel?.idCampaign || !funnel.idFunnel) {
    return <Navigate to="/campaigns" replace />
  }

  return <Navigate to={`/campaigns/${funnel.idCampaign}/funnels/${funnel.idFunnel}`} replace />
}
