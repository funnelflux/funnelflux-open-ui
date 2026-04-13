import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Loader2, Plus } from 'lucide-react'
import { Button, Input, Modal, SmartSelect, useToastApi, type SmartSelectOption } from '@/components/ui-kit'
import {
  useSystemLinksData,
  useFunnel,
  useGenerateEntranceLink,
  type TrafficSourceOption,
} from '@/api/hooks'
import type { FunnelNode } from '@/types/entities'
import { NODE_TYPE_LABELS, type NodeTypeValue } from '@/types/funnel'
import { getErrorMessage } from '@/lib/utils'

function CopyIconButton({ value, disabled }: { value: string; disabled?: boolean }) {
  const toast = useToastApi()
  return (
    <Button
      htmlType="button"
      type="default"
      disabled={disabled || !value}
      title="Copy"
      icon={<Copy className="h-4 w-4" />}
      onClick={() =>
        navigator.clipboard.writeText(value).then(
          () => toast.success('Copied'),
          () => toast.error('Copy failed'),
        )
      }
    />
  )
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-foreground">{label}</span>
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
  const toast = useToastApi()
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

  const trafficSourceOptions = useMemo<SmartSelectOption[]>(
    () => trafficSources.map((ts) => ({ value: ts.id, label: ts.name })),
    [trafficSources],
  )

  const domainOptions = useMemo<SmartSelectOption[]>(
    () => [
      { value: '__default__', label: 'Default domain' },
      ...domains.map((d) => ({ value: d.domain, label: d.domain })),
    ],
    [domains],
  )

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
    <Modal
      open={open}
      onCancel={() => onOpenChange(false)}
      destroyOnClose
      width={520}
      title={
        <div className="space-y-1 pr-8">
          <div className="text-lg font-semibold text-foreground">Funnel URL</div>
          <p className="text-sm font-normal text-muted-foreground">
            Follow the steps below to get the URL of one of your funnels.
          </p>
        </div>
      }
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button htmlType="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="primary" htmlType="button" onClick={() => onOpenChange(false)}>
            OK
          </Button>
        </div>
      }
      styles={{ body: { paddingTop: 8 } }}
    >
      {!canUseWizard ? (
        <p className="text-sm text-destructive">
          Save your funnel first, then open “Send Traffic Here” again.
        </p>
      ) : loadingData ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="space-y-4 py-1">
          <ReadonlyField label="1. Campaign" value={campaignName} />
          <ReadonlyField label="2. Funnel" value={funnelName} />
          <ReadonlyField label="3. (Optional) Node" value={nodeDisplay} />

          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-foreground">
              <span className="font-medium text-primary">4.</span> Select a traffic source
            </span>
            <div className="flex gap-2">
              <SmartSelect
                className="min-h-9 flex-1"
                value={selectedTrafficSource || undefined}
                onChange={(v) => setSelectedTrafficSource(v)}
                options={trafficSourceOptions}
                placeholder="Traffic source"
              />
              <Link
                to="/traffic-sources"
                target="_blank"
                rel="noreferrer"
                title="Add traffic source"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted"
              >
                <Plus className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {selectedTrafficSource ? (
            <div className="space-y-1.5">
              <label htmlFor="funnel-url-cpc" className="block text-sm font-medium text-foreground">
                {costLabel}
              </label>
              <Input
                id="funnel-url-cpc"
                type="number"
                step={0.001}
                min={0}
                value={costCpc}
                onChange={(e) => setCostCpc(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-foreground">Domain (optional)</span>
            <SmartSelect
              className="min-h-9 w-full"
              value={selectedDomain || '__default__'}
              onChange={(v) => setSelectedDomain(v === '__default__' ? '' : v)}
              options={domainOptions}
              placeholder="Default domain"
            />
          </div>

          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-foreground">Entrance URL</span>
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
    </Modal>
  )
}
