import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Loader2, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/shared/Toaster'
import {
  useSystemLinksData,
  useFunnel,
  useGenerateEntranceLink,
  type TrafficSourceOption,
} from '@/api/hooks'
import type { FunnelNode } from '@/types/entities'
import { NODE_TYPE_LABELS, type NodeTypeValue } from '@/types/funnel'
import { cn, getErrorMessage } from '@/lib/utils'

function CopyIconButton({ value, disabled }: { value: string; disabled?: boolean }) {
  const toast = useToast()
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      disabled={disabled || !value}
      title="Copy"
      onClick={() =>
        navigator.clipboard.writeText(value).then(
          () => toast.success('Copied'),
          () => toast.error('Copy failed'),
        )
      }
    >
      <Copy className="h-4 w-4" />
    </Button>
  )
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-foreground">
        {value || '—'}
      </div>
    </div>
  )
}

export interface FunnelUrlModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Campaign id for this funnel (from editor meta). */
  idCampaign: string
  /** Saved funnel id (from editor meta). */
  idFunnel: string
  /** Node that was right-clicked — used as default “send to this node”. */
  contextNodeId: string
}

/**
 * Mirrors legacy admin “Send Traffic Here” → System Links “Funnel URL” wizard.
 * Campaign / funnel / node are fixed from the editor; user picks traffic source, domain, and CPC.
 */
export function FunnelUrlModal({
  open,
  onOpenChange,
  idCampaign,
  idFunnel,
  contextNodeId,
}: FunnelUrlModalProps) {
  const toast = useToast()
  const { data: linksData, isLoading: loadingData } = useSystemLinksData()
  const generateEntrance = useGenerateEntranceLink()

  const [selectedTrafficSource, setSelectedTrafficSource] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('')
  const [costCpc, setCostCpc] = useState('')
  const [debouncedCostCpc, setDebouncedCostCpc] = useState('')
  const [entranceLink, setEntranceLink] = useState('')

  const { data: funnelDetail } = useFunnel(idFunnel, {
    loadDependencies: true,
  })

  const nodes = useMemo<FunnelNode[]>(
    () => (funnelDetail?.nodes ?? []).filter((node) => !node.isArchived),
    [funnelDetail?.nodes],
  )

  const campaigns = linksData?.campaigns ?? []
  const trafficSources = (linksData?.trafficSources ?? []) as TrafficSourceOption[]
  const domains = linksData?.domains ?? []

  const campaignName = useMemo(() => {
    const row = campaigns.find((c) => c.id === idCampaign)
    return row?.name ?? idCampaign
  }, [campaigns, idCampaign])

  const funnelName = funnelDetail?.funnelName ?? idFunnel

  const nodeLabel = (n: FunnelNode) => {
    const typeLabel = NODE_TYPE_LABELS[n.nodeType as NodeTypeValue] ?? 'Node'
    const name = n.nodeName?.trim() ? ` — ${n.nodeName}` : ''
    return `${n.idNode} : ${typeLabel}${name}`
  }

  const nodeDisplay = useMemo(() => {
    if (!contextNodeId) return 'Default funnel entry'
    const n = nodes.find((x) => x.idNode === contextNodeId)
    return n ? nodeLabel(n) : contextNodeId
  }, [contextNodeId, nodes])

  const selectedTs = useMemo(
    () => trafficSources.find((t) => t.id === selectedTrafficSource),
    [trafficSources, selectedTrafficSource],
  )

  const costLabel =
    selectedTs?.costType === 'cpa' ? 'Cost per action' : 'Cost per entrance'

  useEffect(() => {
    if (!open) return
    setSelectedTrafficSource('')
    setSelectedDomain('')
    setCostCpc('')
    setDebouncedCostCpc('')
    setEntranceLink('')
  }, [open, idCampaign, idFunnel, contextNodeId])

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedCostCpc(costCpc), 350)
    return () => window.clearTimeout(id)
  }, [costCpc])

  useEffect(() => {
    if (!open || !selectedTrafficSource || !funnelDetail) return
    const ts = trafficSources.find((t) => t.id === selectedTrafficSource)
    const cpc =
      funnelDetail.defaultCostPerEntrance ||
      (ts?.defaultCostPerEntrance ?? 0)
    const s = String(cpc)
    setCostCpc(s)
    setDebouncedCostCpc(s)
  }, [open, selectedTrafficSource, funnelDetail, trafficSources])

  useEffect(() => {
    if (!open) return
    if (!idCampaign || !idFunnel || !selectedTrafficSource) {
      setEntranceLink('')
      return
    }

    const costNum = debouncedCostCpc.trim() === '' ? undefined : Number(debouncedCostCpc)
    const cost =
      costNum === undefined || Number.isNaN(costNum) ? undefined : costNum

    const request = {
      idCampaign,
      idFunnel,
      idNode: contextNodeId || undefined,
      idTrafficSource: selectedTrafficSource,
      domain: selectedDomain || undefined,
      ...(cost !== undefined ? { cost } : {}),
    }

    generateEntrance.mutate(request, {
      onSuccess: (data) => setEntranceLink(data || ''),
      onError: (error) => toast.error(getErrorMessage(error)),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- regenerate when selections / cost change
  }, [
    open,
    idCampaign,
    idFunnel,
    contextNodeId,
    selectedDomain,
    selectedTrafficSource,
    debouncedCostCpc,
  ])

  const canUseWizard = Boolean(idCampaign && idFunnel)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Funnel URL</DialogTitle>
          <DialogDescription>
            Follow the steps below to get the URL of one of your funnels.
          </DialogDescription>
        </DialogHeader>

        {!canUseWizard ? (
          <p className="text-sm text-destructive">
            Save your funnel first, then open “Send Traffic Here” again.
          </p>
        ) : loadingData ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <div className="space-y-4 py-1">
            <ReadonlyField label="1. Campaign" value={campaignName} />
            <ReadonlyField label="2. Funnel" value={funnelName} />
            <ReadonlyField label="3. (Optional) Node" value={nodeDisplay} />

            <div className="space-y-1.5">
              <Label>
                <span className="text-primary font-medium">4.</span> Select a traffic source
              </Label>
              <div className="flex gap-2">
                <Select value={selectedTrafficSource} onValueChange={setSelectedTrafficSource}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Traffic source" />
                  </SelectTrigger>
                  <SelectContent>
                    {trafficSources.map((ts) => (
                      <SelectItem key={ts.id} value={ts.id}>
                        {ts.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Link
                  to="/traffic-sources"
                  target="_blank"
                  rel="noreferrer"
                  title="Add traffic source"
                  className={cn(buttonVariants({ variant: 'secondary', size: 'icon' }))}
                >
                  <Plus className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {selectedTrafficSource ? (
              <div className="space-y-1.5">
                <Label htmlFor="funnel-url-cpc">{costLabel}</Label>
                <Input
                  id="funnel-url-cpc"
                  type="number"
                  step="0.001"
                  min={0}
                  value={costCpc}
                  onChange={(e) => setCostCpc(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label>Domain (optional)</Label>
              <Select
                value={selectedDomain || '__default__'}
                onValueChange={(v) => setSelectedDomain(v === '__default__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Default domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">Default domain</SelectItem>
                  {domains.map((d) => (
                    <SelectItem key={d.id} value={d.domain}>
                      {d.domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Entrance URL</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={entranceLink}
                  placeholder={
                    selectedTrafficSource ? 'Generating…' : 'Choose a traffic source'
                  }
                  className="font-mono text-xs"
                />
                {generateEntrance.isPending ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin self-center text-muted-foreground" />
                ) : (
                  <CopyIconButton value={entranceLink} />
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
