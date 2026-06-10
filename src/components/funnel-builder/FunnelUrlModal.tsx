import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui-kit/icons'
import {
  Button,
  Input,
  Select,
  Switch,
  FormModal,
  FormModalBody,
  FormModalFooter,
  FormModalHeader,
  useToastApi,
  type SelectOption,
} from '@/components/ui-kit'
import {
  useSystemLinksData,
  useFunnel,
  useGenerateEntranceLink,
  useGenerateEntranceBundle,
  type TrafficSourceOption,
} from '@/api/hooks'
import type { Funnel, FunnelNode } from '@/types/entities'
import type { Domain, EntranceLinkBundle } from '@/types/ui'
import { NODE_TYPE_LABELS, NODE_TYPES, type NodeTypeKey } from '@/types/funnel'
import { funnelNodeSupportsDirectTracking } from '@/lib/directTracking'
import { DirectTrackingLinkFields } from '@/components/links/DirectTrackingLinkFields'
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
  contextSupportsDirectTracking: boolean
  campaignName: string
  funnelName: string
  nodeDisplay: string
  trafficSourceOptions: SelectOption[]
  domainOptions: SelectOption[]
  domains: Domain[]
  trafficSources: TrafficSourceOption[]
  funnelDetail: Funnel | undefined
}

function FunnelUrlWizardBody({
  idCampaign,
  idFunnel,
  contextNodeId,
  contextSupportsDirectTracking,
  campaignName,
  funnelName,
  nodeDisplay,
  trafficSourceOptions,
  domainOptions,
  domains,
  trafficSources,
  funnelDetail,
}: WizardBodyProps) {
  const toast = useToastApi()
  const { mutate: requestEntranceLink, isPending: generatingEntrance } = useGenerateEntranceLink()
  const { mutate: requestEntranceBundle, isPending: generatingBundle } = useGenerateEntranceBundle()

  const [selectedTrafficSource, setSelectedTrafficSource] = useState('')
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)
  const [debouncedCostCpc, setDebouncedCostCpc] = useState('')
  const [entranceLink, setEntranceLink] = useState('')
  const [entranceBundle, setEntranceBundle] = useState<EntranceLinkBundle | null>(null)
  const [useDirectTracking, setUseDirectTracking] = useState(contextSupportsDirectTracking)
  const [embedParamsInScript, setEmbedParamsInScript] = useState(false)
  const requestTokenRef = useRef(0)

  const handleDebouncedCost = useCallback((debounced: string) => {
    setDebouncedCostCpc(debounced)
  }, [])

  const handleDirectTrackingToggle = useCallback((checked: boolean) => {
    setUseDirectTracking(checked)
    setEntranceLink('')
    setEntranceBundle(null)
  }, [])

  const handleEmbedParamsToggle = useCallback((checked: boolean) => {
    setEmbedParamsInScript(checked)
  }, [])

  const handleTrafficSourceChange = useCallback((value: string) => {
    setSelectedTrafficSource(value)
    setEntranceLink('')
    setEntranceBundle(null)
  }, [])

  const handleDomainChange = useCallback((value: string) => {
    setSelectedDomain(value)
    setEntranceLink('')
    setEntranceBundle(null)
  }, [])

  const defaultDomainHostname = useMemo(
    () => domains.find((domain) => domain.isDefault)?.domain ?? domains[0]?.domain ?? '',
    [domains],
  )

  const resolvedDomain = useMemo(() => {
    if (selectedDomain && domains.some((domain) => domain.domain === selectedDomain)) {
      return selectedDomain
    }
    return defaultDomainHostname
  }, [selectedDomain, domains, defaultDomainHostname])

  const selectedTs = useMemo(
    () => trafficSources.find((trafficSource) => trafficSource.id === selectedTrafficSource),
    [trafficSources, selectedTrafficSource],
  )

  const costLabel = selectedTs?.costType === 'cpa' ? 'Cost per action' : 'Cost per entrance'

  const suggestedCpcStr = useMemo(() => {
    if (!funnelDetail || !selectedTrafficSource) return ''
    const trafficSource = trafficSources.find((ts) => ts.id === selectedTrafficSource)
    const cpc =
      funnelDetail.defaultCostPerEntrance || (trafficSource?.defaultCostPerEntrance ?? 0)
    return String(cpc)
  }, [funnelDetail, selectedTrafficSource, trafficSources])

  const cpcResetKey = `${selectedTrafficSource}:${suggestedCpcStr}`

  const effectiveCostString = useMemo(() => {
    if (debouncedCostCpc.trim() !== '') return debouncedCostCpc
    return suggestedCpcStr
  }, [debouncedCostCpc, suggestedCpcStr])

  const canRequestLinks = Boolean(
    idCampaign && idFunnel && selectedTrafficSource && (!useDirectTracking || contextNodeId),
  )

  const displayedEntranceLink = canRequestLinks && !useDirectTracking ? entranceLink : ''
  const generating = useDirectTracking ? generatingBundle : generatingEntrance

  useEffect(() => {
    if (!canRequestLinks) return

    const costNum =
      effectiveCostString.trim() === '' ? undefined : Number(effectiveCostString)
    const cost =
      costNum === undefined || Number.isNaN(costNum) ? undefined : costNum

    const request = {
      idCampaign,
      idFunnel,
      idNode: contextNodeId || undefined,
      idTrafficSource: selectedTrafficSource,
      domain: resolvedDomain || undefined,
      ...(cost !== undefined ? { cost } : {}),
    }

    const token = ++requestTokenRef.current

    if (useDirectTracking) {
      requestEntranceBundle(request, {
        onSuccess: (data) => {
          if (requestTokenRef.current !== token) return
          setEntranceBundle(data)
        },
        onError: (error) => {
          if (requestTokenRef.current !== token) return
          toast.error(getErrorMessage(error))
        },
      })
      return
    }

    requestEntranceLink(request, {
      onSuccess: (data) => {
        if (requestTokenRef.current !== token) return
        setEntranceLink(data || '')
      },
      onError: (error) => {
        if (requestTokenRef.current !== token) return
        toast.error(getErrorMessage(error))
      },
    })
  }, [
    canRequestLinks,
    idCampaign,
    idFunnel,
    contextNodeId,
    resolvedDomain,
    selectedTrafficSource,
    effectiveCostString,
    useDirectTracking,
    requestEntranceLink,
    requestEntranceBundle,
    toast,
  ])

  return (
    <div className="space-y-4 py-1">
      <ReadonlyField label="1. Campaign" value={campaignName} />
      <ReadonlyField label="2. Funnel" value={funnelName} />
      <ReadonlyField label="3. Node" value={nodeDisplay} />

      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-foreground">
          <span className="font-medium text-primary">4.</span> Select a traffic source
        </span>
        <div className="flex gap-2">
          <Select
            className="min-h-9 flex-1"
            value={selectedTrafficSource || undefined}
            onChange={handleTrafficSourceChange}
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

      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 px-3 py-2">
        <div className="space-y-0.5">
          <span className="text-sm font-medium text-foreground">Use direct tracking</span>
          <p className="text-xs text-muted-foreground">
            Bypass the tracker redirect — use a direct page URL and universal JS snippet.
          </p>
        </div>
        <Switch
          checked={useDirectTracking}
          onChange={handleDirectTrackingToggle}
          disabled={!contextSupportsDirectTracking}
        />
      </div>

      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-foreground">Domain</span>
        <Select
          className="min-h-9 w-full"
          value={resolvedDomain || undefined}
          onChange={handleDomainChange}
          options={domainOptions}
          placeholder="Select domain"
        />
      </div>

      {useDirectTracking ? (
        <DirectTrackingLinkFields
          bundle={entranceBundle}
          embedParamsInScript={embedParamsInScript}
          onEmbedParamsInScriptChange={handleEmbedParamsToggle}
          loading={generating}
        />
      ) : (
        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-foreground">Entrance URL</span>
          <div className="flex gap-2">
            <Input
              readOnly
              value={displayedEntranceLink}
              placeholder={selectedTrafficSource ? 'Generating…' : 'Choose a traffic source'}
              className="font-mono text-xs"
            />
            {generating ? (
              <span className="self-center text-muted-foreground">
                <Icon name="loader-2" size="sm" animation="spin" aria-label="Generating" />
              </span>
            ) : (
              <CopyIconButton value={displayedEntranceLink} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export interface FunnelUrlModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  idCampaign: string
  idFunnel: string
  contextNodeId: string
}

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

  const campaigns = useMemo(() => linksData?.campaigns ?? [], [linksData?.campaigns])
  const trafficSources = useMemo(
    () => (linksData?.trafficSources ?? []) as TrafficSourceOption[],
    [linksData?.trafficSources],
  )
  const domains = useMemo(() => linksData?.domains ?? [], [linksData?.domains])

  const trafficSourceOptions = useMemo<SelectOption[]>(
    () => trafficSources.map((ts) => ({ value: ts.id, label: ts.name })),
    [trafficSources],
  )

  const domainOptions = useMemo<SelectOption[]>(
    () =>
      domains.map((domain) => ({
        value: domain.domain,
        label: domain.isDefault ? `${domain.domain} (default)` : domain.domain,
      })),
    [domains],
  )

  const campaignName = useMemo(() => {
    const row = campaigns.find((campaign) => campaign.id === idCampaign)
    return row?.name ?? idCampaign
  }, [campaigns, idCampaign])

  const funnelName = funnelDetail?.funnelName ?? idFunnel

  const contextNode = useMemo(
    () => (contextNodeId ? nodes.find((node) => node.idNode === contextNodeId) : undefined),
    [contextNodeId, nodes],
  )

  const contextSupportsDirectTracking = funnelNodeSupportsDirectTracking(contextNode)

  const nodeLabel = (node: FunnelNode) => {
    const typeLabel = NODE_TYPE_LABELS[NODE_TYPES[node.nodeType as NodeTypeKey]] ?? 'Node'
    const name = node.nodeName?.trim() ? ` — ${node.nodeName}` : ''
    return `${node.idNode} : ${typeLabel}${name}`
  }

  const nodeDisplay = useMemo(() => {
    if (!contextNodeId) return 'Default funnel entry'
    return contextNode ? nodeLabel(contextNode) : contextNodeId
  }, [contextNode, contextNodeId])

  const canUseWizard = Boolean(idCampaign && idFunnel)
  const wizardKey = `${idCampaign}-${idFunnel}-${contextNodeId}-${contextSupportsDirectTracking}`

  return (
    <FormModal open={open} onCancel={() => onOpenChange(false)} destroyOnClose width={560}>
      <FormModalHeader
        title="Funnel URL"
        description="Follow the steps below to get the URL of one of your funnels."
      />
      <FormModalBody>
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
            contextSupportsDirectTracking={contextSupportsDirectTracking}
            campaignName={campaignName}
            funnelName={funnelName}
            nodeDisplay={nodeDisplay}
            trafficSourceOptions={trafficSourceOptions}
            domainOptions={domainOptions}
            domains={domains}
            trafficSources={trafficSources}
            funnelDetail={funnelDetail}
          />
        ) : (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Icon name="loader-2" size="sm" animation="spin" aria-label="Loading" />
            Loading funnel…
          </div>
        )}
      </FormModalBody>
      <FormModalFooter>
        <Button htmlType="button" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="primary" htmlType="button" onClick={() => onOpenChange(false)}>
          OK
        </Button>
      </FormModalFooter>
    </FormModal>
  )
}
