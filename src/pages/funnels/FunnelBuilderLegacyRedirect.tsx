import { Navigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useFunnel } from '@/api/hooks'

/** Old path `/funnel-builder/:id` → canonical `/campaigns/:campaignId/funnels/:funnelId`. */
export function FunnelBuilderLegacyRedirect() {
  const { id = '' } = useParams<{ id: string }>()
  const { data: funnel, isLoading, isError } = useFunnel(id, { loadDependencies: false })

  if (!id) return <Navigate to="/campaigns" replace />

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !funnel?.idCampaign || !funnel.idFunnel) {
    return <Navigate to="/campaigns" replace />
  }

  return <Navigate to={`/campaigns/${funnel.idCampaign}/funnels/${funnel.idFunnel}`} replace />
}
