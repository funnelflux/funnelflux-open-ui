import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui-kit/icons'
import { Button, Input, Modal, Select, useToastApi, type SelectOption } from '@/components/ui-kit'
import {
  useSystemLinksData,
  useFunnel,
  useGenerateEntranceLink,
  type TrafficSourceOption,
} from '@/api/hooks'
import type { Funnel, FunnelNode } from '@/types/entities'
import { NODE_TYPE_LABELS, NODE_TYPES, type NodeTypeKey } from '@/types/funnel'
import { getErrorMessage } from '@/lib/utils'

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])
  return debounced
}

function CopyIconButton({ value, disabled }: { value: string; disabled?: boolean }) {
  const toast = useToastApi()
  return (
    <Button
      htmlType="button"
      type="default"
      disabled={disabled || !value}
      title="Copy"
      iconName="copy"
      iconSize="sm"
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

/** Owns CPC input + debounce; remount via `key` when defaults from API / TS change. */
function CpcStep({
  suggested,
  costLabel,
  onDebouncedChange,
}: {
  suggested: string
  costLabel: string
  onDebouncedChange: (debounced: string) => void
}) {
  const [costCpc, setCostCpc] = useState(suggested)
  const debouncedCostCpc = useDebouncedValue(costCpc, 350)

  useEffect(() => {
    onDebouncedChange(debouncedCostCpc)
  }, [debouncedCostCpc, onDebouncedChange])

  return (
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
  )
}

interface WizardBodyProps {
  idCampaign: string
  idFunnel: string
  contextNodeId: string
  campaignName: string
  funnelName: string
  nodeDisplay: string
  trafficSourceOptions: SelectOption[]
  domainOptions: SelectOption[]
  trafficSources: TrafficSourceOption[]
  funnelDetail: Funnel | undefined
}

function FunnelUrlWizardBody({
  idCampaign,
  idFunnel,
  contextNodeId,
  campaignName,
  funnelName,
  nodeDisplay,
  trafficSourceOptions,
  domainOptions,
  trafficSources,
  funnelDetail,
}: WizardBodyProps) {
  const toast = useToastApi()
  const generateEntrance = useGenerateEntranceLink()

  const [selectedTrafficSource, setSelectedTrafficSource] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('')
  const [debouncedCostCpc, setDebouncedCostCpc] = useState('')
  const [entranceLink, setEntranceLink] = useState('')

  const handleDebouncedCost = useCallback((debounced: string) => {
    setDebouncedCostCpc(debounced)
  }, [])

  const selectedTs = useMemo(
    () => trafficSources.find((t) => t.id === selectedTrafficSource),
    [trafficSources, selectedTrafficSource],
  )

  const costLabel =
    selectedTs?.costType === 'cpa' ? 'Cost per action' : 'Cost per entrance'

  const suggestedCpcStr = useMemo(() => {
    if (!funnelDetail || !selectedTrafficSource) return ''
    const ts = trafficSources.find((t) => t.id === selectedTrafficSource)
    const cpc =
      funnelDetail.defaultCostPerEntrance || (ts?.defaultCostPerEntrance ?? 0)
    return String(cpc)
  }, [funnelDetail, selectedTrafficSource, trafficSources])

  const cpcResetKey = `${selectedTrafficSource}:${suggestedCpcStr}`

  /** Until CpcStep’s debounce callback runs, parent debounced state can be empty — fall back to API default. */
  const effectiveCostString = useMemo(() => {
    if (debouncedCostCpc.trim() !== '') return debouncedCostCpc
    return suggestedCpcStr
  }, [debouncedCostCpc, suggestedCpcStr])

  const canRequestEntrance = Boolean(
    idCampaign && idFunnel && selectedTrafficSource,
  )

  const displayedEntranceLink = canRequestEntrance ? entranceLink : ''

  useEffect(() => {
    if (!canRequestEntrance) return

    const costNum =
      effectiveCostString.trim() === '' ? undefined : Number(effectiveCostString)
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
  }, [
    canRequestEntrance,
    idCampaign,
    idFunnel,
    contextNodeId,
    selectedDomain,
    selectedTrafficSource,
    effectiveCostString,
    generateEntrance,
    toast,
  ])

  return (
    <div className="space-y-4 py-1">
      <ReadonlyField label="1. Campaign" value={campaignName} />
      <ReadonlyField label="2. Funnel" value={funnelName} />
      <ReadonlyField label="3. (Optional) Node" value={nodeDisplay} />

      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-foreground">
          <span className="font-medium text-primary">4.</span> Select a traffic source
        </span>
        <div className="flex gap-2">
          <Select
            className="min-h-9 flex-1"
            value={selectedTrafficSource || undefined}
            onChange={(v) => {
              setSelectedTrafficSource(v)
              setEntranceLink('')
            }}
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
            <span className="sr-only">Add traffic source</span>
            <Icon name="plus" size="sm" aria-hidden />
          </Link>
        </div>
      </div>

      {selectedTrafficSource ? (
        <CpcStep
          key={cpcResetKey}
          suggested={suggestedCpcStr}
          costLabel={costLabel}
          onDebouncedChange={handleDebouncedCost}
        />
      ) : null}

      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-foreground">Domain (optional)</span>
        <Select
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
            value={displayedEntranceLink}
            placeholder={
              selectedTrafficSource ? 'Generating…' : 'Choose a traffic source'
            }
            className="font-mono text-xs"
          />
          {generateEntrance.isPending ? (
            <span className="self-center text-muted-foreground">
              <Icon name="loader-2" size="sm" animation="spin" aria-label="Generating" />
            </span>
          ) : (
            <CopyIconButton value={displayedEntranceLink} />
          )}
        </div>
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
  const { data: linksData, isLoading: loadingData } = useSystemLinksData()

  const { data: funnelDetail } = useFunnel(idFunnel, {
    loadDependencies: true,
  })

  const nodes = useMemo<FunnelNode[]>(
    () => (funnelDetail?.nodes ?? []).filter((node) => !node.isArchived),
    [funnelDetail?.nodes],
  )

  const campaigns = useMemo(
    () => linksData?.campaigns ?? [],
    [linksData?.campaigns],
  )
  const trafficSources = useMemo(
    () => (linksData?.trafficSources ?? []) as TrafficSourceOption[],
    [linksData?.trafficSources],
  )
  const domains = useMemo(
    () => linksData?.domains ?? [],
    [linksData?.domains],
  )

  const trafficSourceOptions = useMemo<SelectOption[]>(
    () => trafficSources.map((ts) => ({ value: ts.id, label: ts.name })),
    [trafficSources],
  )

  const domainOptions = useMemo<SelectOption[]>(
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
    const typeLabel = NODE_TYPE_LABELS[NODE_TYPES[n.nodeType as NodeTypeKey]] ?? 'Node'
    const name = n.nodeName?.trim() ? ` — ${n.nodeName}` : ''
    return `${n.idNode} : ${typeLabel}${name}`
  }

  const nodeDisplay = useMemo(() => {
    if (!contextNodeId) return 'Default funnel entry'
    const n = nodes.find((x) => x.idNode === contextNodeId)
    return n ? nodeLabel(n) : contextNodeId
  }, [contextNodeId, nodes])

  const canUseWizard = Boolean(idCampaign && idFunnel)

  const wizardKey = `${idCampaign}-${idFunnel}-${contextNodeId}`

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
          <Icon name="loader-2" size="sm" animation="spin" aria-label="Loading" />
          Loading…
        </div>
      ) : funnelDetail ? (
        <FunnelUrlWizardBody
          key={wizardKey}
          idCampaign={idCampaign}
          idFunnel={idFunnel}
          contextNodeId={contextNodeId}
          campaignName={campaignName}
          funnelName={funnelName}
          nodeDisplay={nodeDisplay}
          trafficSourceOptions={trafficSourceOptions}
          domainOptions={domainOptions}
          trafficSources={trafficSources}
          funnelDetail={funnelDetail}
        />
      ) : (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Icon name="loader-2" size="sm" animation="spin" aria-label="Loading" />
          Loading funnel…
        </div>
      )}
    </Modal>
  )
}
