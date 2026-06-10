import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Card,
  CopyButton,
  Field,
  Input,
  PageShell,
  Select,
  Spin,
  Switch,
  useToastApi,
} from '@/components/ui-kit'
import type { SelectOption } from '@/components/ui-kit'
import {
  useSystemLinksData,
  useFunnels,
  useFunnel,
  useGenerateEntranceLink,
  useGenerateEntranceBundle,
} from '@/api/hooks'
import type { FunnelNode } from '@/types/entities'
import type { EntranceLinkBundle } from '@/types/ui'
import { DirectTrackingLinkFields } from '@/components/links/DirectTrackingLinkFields'
import { isDirectTrackingNodeType } from '@/lib/directTracking'
import { getErrorMessage } from '@/lib/utils'

const readonlyLinkInputClass = 'font-mono text-xs flex-1 min-w-0 !bg-surface-sunken text-muted-foreground'
const systemLinkCardClass = 'ff-analytics-panel border-border-strong'

function getDomainHost(domain: string): string {
  const trimmed = domain.trim()
  if (!trimmed) return ''

  try {
    return new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`).host
  } catch {
    return trimmed.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  }
}

function rewriteTrackingDomain(value: string, domain: string): string {
  const host = getDomainHost(domain)
  if (!value || !host) return value

  return value.replace(/https?:\/\/[^\s"'<>]+/g, (url) => {
    try {
      const parsed = new URL(url)
      parsed.host = host
      return parsed.toString()
    } catch {
      return url.replace(/^(https?:\/\/)[^/\s"'<>]+/, `$1${host}`)
    }
  })
}

function compareNodeIdsAsc(a: string, b: string): number {
  if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
    const aBig = BigInt(a)
    const bBig = BigInt(b)
    return aBig < bBig ? -1 : aBig > bBig ? 1 : 0
  }
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

export function SystemLinksPage() {
  const toast = useToastApi()
  const { data: linksData, isLoading: loadingData } = useSystemLinksData()
  const generateEntranceLink = useGenerateEntranceLink()
  const generateEntranceBundle = useGenerateEntranceBundle()

  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [selectedFunnel, setSelectedFunnel] = useState('')
  const [selectedNode, setSelectedNode] = useState('')
  const [selectedTrafficSource, setSelectedTrafficSource] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('')
  const [costInput, setCostInput] = useState('')
  const [entranceLink, setEntranceLink] = useState('')
  const [entranceBundle, setEntranceBundle] = useState<EntranceLinkBundle | null>(null)
  const [useDirectTracking, setUseDirectTracking] = useState(false)
  const [embedParamsInScript, setEmbedParamsInScript] = useState(false)
  const [iframeCode, setIframeCode] = useState('')
  const [pixelUrl, setPixelUrl] = useState('')
  const [pixelHtml, setPixelHtml] = useState('')
  const requestIdRef = useRef(0)

  const { data: funnels } = useFunnels(selectedCampaign)
  const { data: funnelDetail } = useFunnel(selectedFunnel, { loadDependencies: true })

  const selectedTrafficSourceOption = useMemo(
    () => (linksData?.trafficSources ?? []).find((source) => source.id === selectedTrafficSource),
    [linksData?.trafficSources, selectedTrafficSource],
  )

  const handleNodeChange = useCallback((value: string) => {
    requestIdRef.current += 1
    setSelectedNode(value)
    setEntranceLink('')
    setEntranceBundle(null)
  }, [])

  const handleDirectTrackingToggle = useCallback((checked: boolean) => {
    requestIdRef.current += 1
    setUseDirectTracking(checked)
    setEntranceLink('')
    setEntranceBundle(null)
  }, [])

  const handleEmbedParamsToggle = useCallback((checked: boolean) => {
    setEmbedParamsInScript(checked)
  }, [])

  const handleDomainChange = useCallback((value: string) => {
    requestIdRef.current += 1
    setSelectedDomain(value)
  }, [])

  const handleCampaignChange = useCallback((value: string) => {
    requestIdRef.current += 1
    setSelectedCampaign(value)
    setSelectedFunnel('')
    setSelectedNode('')
    setEntranceLink('')
  }, [])

  const handleFunnelChange = useCallback((value: string) => {
    requestIdRef.current += 1
    setSelectedFunnel(value)
    setSelectedNode('')
    setEntranceLink('')
  }, [])

  const handleTrafficSourceChange = useCallback((value: string) => {
    requestIdRef.current += 1
    setSelectedTrafficSource(value)
  }, [])

  const allNodes = useMemo<FunnelNode[]>(
    () =>
      (funnelDetail?.nodes ?? [])
        .filter((node) => !node.isArchived)
        .sort((a, b) => {
          if (a.nodeType === 'root' && b.nodeType !== 'root') return -1
          if (a.nodeType !== 'root' && b.nodeType === 'root') return 1
          return compareNodeIdsAsc(a.idNode, b.idNode)
        }),
    [funnelDetail?.nodes],
  )

  const nodes = useMemo(
    () =>
      useDirectTracking
        ? allNodes.filter((node) => isDirectTrackingNodeType(node.nodeType))
        : allNodes,
    [allNodes, useDirectTracking],
  )

  const resolvedDefaultCost = useMemo(() => {
    const funnelCost = (funnelDetail as { defaultCostPerEntrance?: number | string } | undefined)
      ?.defaultCostPerEntrance
    const normalizedFunnelCost = funnelCost == null || funnelCost === '' ? null : Number(funnelCost)
    if (normalizedFunnelCost != null && !Number.isNaN(normalizedFunnelCost) && normalizedFunnelCost !== 0) {
      return String(normalizedFunnelCost)
    }
    const tsCost = selectedTrafficSourceOption?.defaultCostPerEntrance
    if (tsCost == null || Number.isNaN(Number(tsCost))) return ''
    return String(tsCost)
  }, [funnelDetail, selectedTrafficSourceOption])

  useEffect(() => {
    setCostInput(resolvedDefaultCost)
  }, [resolvedDefaultCost])

  useEffect(() => {
    if (!selectedFunnel || !nodes.length) return
    if (nodes.some((node) => node.idNode === selectedNode)) return

    const defaultNode = useDirectTracking
      ? nodes[0]
      : nodes.find((node) => node.nodeType === 'root') ?? nodes[0]
    if (defaultNode) setSelectedNode(defaultNode.idNode)
  }, [nodes, selectedFunnel, selectedNode, useDirectTracking])

  useEffect(() => {
    const domains = linksData?.domains ?? []
    if (!domains.length) return

    const currentIsValid = domains.some((domain) => domain.domain === selectedDomain)
    if (selectedDomain && currentIsValid) return

    const defaultDomain = domains.find((domain) => domain.isDefault)?.domain ?? domains[0]?.domain ?? ''
    setSelectedDomain(defaultDomain)
  }, [linksData?.domains, selectedDomain])

  useEffect(() => {
    setIframeCode(rewriteTrackingDomain(linksData?.conversionIframe ?? '', selectedDomain))
    setPixelUrl(rewriteTrackingDomain(linksData?.pixelURL ?? '', selectedDomain))
    setPixelHtml(rewriteTrackingDomain(linksData?.pixelHTML ?? '', selectedDomain))
  }, [linksData?.conversionIframe, linksData?.pixelURL, linksData?.pixelHTML, selectedDomain])

  const refreshTrackingSalt = useCallback((value: string) => {
    const salt = `${Date.now()}`
    return value.replace(/(flux_pix=)[^&"']+/g, `$1${salt}`)
  }, [])

  const copyText = useCallback(
    async (value: string, successMessage: string) => {
      if (!value) return
      try {
        await navigator.clipboard.writeText(value)
        toast.success(successMessage)
      } catch {
        toast.error('Unable to copy to clipboard')
      }
    },
    [toast],
  )

  useEffect(() => {
    if (!selectedCampaign || !selectedFunnel || !selectedTrafficSource || !selectedNode) return
    if (useDirectTracking && !isDirectTrackingNodeType(
      allNodes.find((node) => node.idNode === selectedNode)?.nodeType ?? '',
    )) {
      return
    }

    const thisRequest = ++requestIdRef.current
    const parsedCost = Number(costInput)
    const request = {
      idCampaign: selectedCampaign,
      idFunnel: selectedFunnel,
      idNode: selectedNode || undefined,
      idTrafficSource: selectedTrafficSource,
      domain: selectedDomain || undefined,
      cost: Number.isNaN(parsedCost) ? undefined : parsedCost,
    }

    if (useDirectTracking) {
      generateEntranceBundle.mutate(request, {
        onSuccess: (data) => {
          if (requestIdRef.current === thisRequest) setEntranceBundle(data)
        },
        onError: (error) => {
          if (requestIdRef.current === thisRequest) toast.error(getErrorMessage(error))
        },
      })
      return
    }

    generateEntranceLink.mutate(request, {
      onSuccess: (data) => {
        if (requestIdRef.current === thisRequest) setEntranceLink(data || '')
      },
      onError: (error) => {
        if (requestIdRef.current === thisRequest) toast.error(getErrorMessage(error))
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutation object is stable (.mutate)
  }, [
    allNodes,
    costInput,
    selectedCampaign,
    selectedDomain,
    selectedFunnel,
    selectedNode,
    selectedTrafficSource,
    useDirectTracking,
  ])

  const campaignOptions: SelectOption[] = useMemo(
    () => (linksData?.campaigns ?? []).map((c) => ({ label: c.name, value: c.id, searchId: c.id })),
    [linksData?.campaigns],
  )

  const funnelOptions: SelectOption[] = useMemo(
    () => (funnels ?? []).map((f) => ({ label: f.name, value: f.id, searchId: f.id })),
    [funnels],
  )

  const trafficSourceOptions: SelectOption[] = useMemo(
    () => (linksData?.trafficSources ?? []).map((s) => ({ label: s.name, value: s.id, searchId: s.id })),
    [linksData?.trafficSources],
  )

  const domainOptions: SelectOption[] = useMemo(
    () =>
      (linksData?.domains ?? []).map((d) => ({
        label: d.isDefault ? `${d.domain} (default)` : d.domain,
        value: d.domain,
        searchId: d.id,
      })),
    [linksData?.domains],
  )

  const nodeOptions: SelectOption[] = useMemo(
    () =>
      nodes.map((node) => ({
        label: node.nodeName || node.idNode,
        value: node.idNode,
        searchId: node.idNode,
        displayLabel: (
          <span className="flex min-w-0 items-center justify-between gap-3">
            <span className="truncate">{node.nodeName || 'Unnamed node'}</span>
            <span className="shrink-0 rounded border border-border bg-surface-sunken px-1.5 py-0.5 font-mono text-[11px] leading-none text-muted-foreground">
              {node.idNode}
            </span>
          </span>
        ),
      })),
    [nodes],
  )

  const clickfunnelsWebhookURL = useMemo(() => {
    const cbUrl = rewriteTrackingDomain(linksData?.clickbankIPNURL ?? '', selectedDomain)
    return cbUrl ? cbUrl.replace('cb.php', 'clickfunnels.php') : ''
  }, [linksData?.clickbankIPNURL, selectedDomain])

  const actionURL = useMemo(
    () => rewriteTrackingDomain(linksData?.actionURL ?? '', selectedDomain),
    [linksData?.actionURL, selectedDomain],
  )
  const postbackURL = useMemo(
    () => rewriteTrackingDomain(linksData?.postbackURL ?? '', selectedDomain),
    [linksData?.postbackURL, selectedDomain],
  )
  const clickbankIPNURL = useMemo(
    () => rewriteTrackingDomain(linksData?.clickbankIPNURL ?? '', selectedDomain),
    [linksData?.clickbankIPNURL, selectedDomain],
  )

  const costLabel = selectedTrafficSourceOption?.costType === 'cpa' ? 'Cost per action' : 'Cost per entrance'

  return (
    <PageShell title="System Links" subtitle="Generate funnel links and conversion integration links.">
      <Spin spinning={loadingData} description="Loading link options…">
        <div className="grid max-w-7xl gap-3 xl:grid-cols-2">
          <Card className={`${systemLinkCardClass} xl:col-span-2`} title={<span className="text-sm font-medium">Get campaign link</span>}>
            <p className="mb-4 text-sm text-muted-foreground">
              Follow the steps below to get the URL of one of your funnels.
            </p>
            <div className="grid gap-4 lg:grid-cols-3">
              <Field title="Step 1: Select a Campaign" required htmlFor="system-links-campaign">
                <Select
                  id="system-links-campaign"
                  options={campaignOptions}
                  value={selectedCampaign || undefined}
                  onChange={handleCampaignChange}
                  placeholder="Select campaign"
                  className="w-full"
                  disabled={loadingData}
                />
              </Field>

              <Field title="Step 2: Select a Funnel" required htmlFor="system-links-funnel">
                <Select
                  id="system-links-funnel"
                  options={funnelOptions}
                  value={selectedFunnel || undefined}
                  onChange={handleFunnelChange}
                  disabled={loadingData || !selectedCampaign}
                  placeholder={selectedCampaign ? 'Select funnel' : 'Select a campaign first'}
                  className="w-full"
                />
              </Field>

              <Field
                title={useDirectTracking ? 'Step 3: Select a page node' : 'Step 3 (Optional): Select a Node'}
                htmlFor="system-links-node"
              >
                <Select
                  id="system-links-node"
                  options={nodeOptions}
                  value={selectedNode || undefined}
                  onChange={handleNodeChange}
                  disabled={loadingData || !selectedFunnel}
                  placeholder={selectedFunnel ? 'Select node' : 'Select a funnel first'}
                  className="w-full"
                  alphabetical={false}
                />
              </Field>

              <Field title="Step 4: Select a Traffic Source" required htmlFor="system-links-traffic-source">
                <Select
                  id="system-links-traffic-source"
                  options={trafficSourceOptions}
                  value={selectedTrafficSource || undefined}
                  onChange={handleTrafficSourceChange}
                  placeholder="Select traffic source"
                  className="w-full"
                  disabled={loadingData}
                />
              </Field>

              <Field title={`Step 5: ${costLabel}`} htmlFor="system-links-cost">
                <Input
                  id="system-links-cost"
                  value={costInput}
                  onChange={(event) => setCostInput(event.target.value)}
                  placeholder="0.00"
                />
              </Field>

              <Field title="Step 6: Select a Domain" htmlFor="system-links-domain">
                <Select
                  id="system-links-domain"
                  options={domainOptions}
                  value={selectedDomain || undefined}
                  onChange={handleDomainChange}
                  placeholder="Select domain"
                  className="w-full"
                  disabled={loadingData}
                />
              </Field>

              <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 px-3 py-2 lg:col-span-3">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium text-foreground">Use direct tracking</span>
                  <p className="text-xs text-muted-foreground">
                    Use a direct page URL and universal JS snippet (lander, offer, or external URL nodes only).
                  </p>
                </div>
                <Switch checked={useDirectTracking} onChange={handleDirectTrackingToggle} />
              </div>
            </div>

            <div className="mt-4">
              {useDirectTracking ? (
                <DirectTrackingLinkFields
                  bundle={entranceBundle}
                  embedParamsInScript={embedParamsInScript}
                  onEmbedParamsInScriptChange={handleEmbedParamsToggle}
                  loading={generateEntranceBundle.isPending}
                />
              ) : (
                <Field title="Step 7: Copy your link" htmlFor="system-links-url-output">
                  <div className="flex w-full min-w-0 items-center gap-2">
                    <Input
                      id="system-links-url-output"
                      value={entranceLink}
                      readOnly
                      className={readonlyLinkInputClass}
                    />
                    <Button
                      disabled={!entranceLink}
                      onClick={() => {
                        if (!entranceLink) return
                        const qr = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(entranceLink)}`
                        window.open(qr, '_blank', 'noopener,noreferrer')
                      }}
                    >
                      QR Code
                    </Button>
                    <CopyButton value={entranceLink} />
                  </div>
                </Field>
              )}
            </div>
          </Card>

          <Card className={systemLinkCardClass} title={<span className="text-sm font-medium">Action click URL</span>}>
              <p className="mb-3 text-sm text-muted-foreground">
                Copy this link and replace <code>ACTION-NUMBER</code> with a number from 1 to 64.
              </p>
              <div className="flex w-full min-w-0 items-center gap-2">
                <Input value={actionURL} readOnly className={readonlyLinkInputClass} />
                <CopyButton value={actionURL} />
              </div>
          </Card>

          <Card className={systemLinkCardClass} title={<span className="text-sm font-medium">Conversion Postback URL</span>}>
              <p className="mb-3 text-sm text-muted-foreground">
                Use this URL to register conversions from a remote server (affiliate network postbacks).
              </p>
              <div className="flex w-full min-w-0 items-center gap-2">
                <Input value={postbackURL} readOnly className={readonlyLinkInputClass} />
                <CopyButton value={postbackURL} />
              </div>
          </Card>

          <Card className={systemLinkCardClass} title={<span className="text-sm font-medium">Conversion iFrame</span>}>
              <p className="mb-3 text-sm text-muted-foreground">
                Use this iFrame on your thank-you page. Copying regenerates a fresh pixel salt.
              </p>
              <div className="flex w-full min-w-0 items-center gap-2">
                <Input value={iframeCode} readOnly className={readonlyLinkInputClass} />
                <Button
                  onClick={async () => {
                    const next = refreshTrackingSalt(iframeCode)
                    setIframeCode(next)
                    await copyText(next, 'iFrame copied')
                  }}
                >
                  Copy
                </Button>
              </div>
          </Card>

          <Card className={systemLinkCardClass} title={<span className="text-sm font-medium">Conversion Pixel</span>}>
            <p className="mb-3 text-sm text-muted-foreground">
              Pixel URL and HTML snippet. Copying regenerates a fresh pixel salt.
            </p>
            <div className="space-y-3">
              <Field title="Pixel URL" htmlFor="system-links-pixel-url">
                <div className="flex w-full min-w-0 items-center gap-2">
                  <Input id="system-links-pixel-url" value={pixelUrl} readOnly className={readonlyLinkInputClass} />
                  <Button
                    onClick={async () => {
                      const nextUrl = refreshTrackingSalt(pixelUrl)
                      const nextHtml = refreshTrackingSalt(pixelHtml)
                      setPixelUrl(nextUrl)
                      setPixelHtml(nextHtml)
                      await copyText(nextUrl, 'Pixel URL copied')
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </Field>
              <Field title="Pixel HTML" htmlFor="system-links-pixel-html">
                <div className="flex w-full min-w-0 items-center gap-2">
                  <Input id="system-links-pixel-html" value={pixelHtml} readOnly className={readonlyLinkInputClass} />
                  <Button
                    onClick={async () => {
                      const nextUrl = refreshTrackingSalt(pixelUrl)
                      const nextHtml = refreshTrackingSalt(pixelHtml)
                      setPixelUrl(nextUrl)
                      setPixelHtml(nextHtml)
                      await copyText(nextHtml, 'Pixel HTML copied')
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </Field>
            </div>
          </Card>

          <Card className={systemLinkCardClass} title={<span className="text-sm font-medium">Clickbank Instant Notifications</span>}>
            <p className="mb-3 text-sm text-muted-foreground">
              Secret key and URL for Clickbank instant sale/re-bill/refund notifications (API v6).
            </p>
            <div className="space-y-3">
              <Field title="Secret Key" htmlFor="system-links-cb-key">
                <div className="flex w-full min-w-0 items-center gap-2">
                  <Input id="system-links-cb-key" value={linksData?.clickbankIPNKey ?? ''} readOnly className={readonlyLinkInputClass} />
                  <CopyButton value={linksData?.clickbankIPNKey ?? ''} />
                </div>
              </Field>
              <Field title="Notification URL" htmlFor="system-links-cb-url">
                <div className="flex w-full min-w-0 items-center gap-2">
                  <Input id="system-links-cb-url" value={clickbankIPNURL} readOnly className={readonlyLinkInputClass} />
                  <CopyButton value={clickbankIPNURL} />
                </div>
              </Field>
            </div>
          </Card>

          <Card className={systemLinkCardClass} title={<span className="text-sm font-medium">ClickFunnels Webhook</span>}>
            <p className="mb-3 text-sm text-muted-foreground">
              Use this webhook URL in ClickFunnels settings. Events: contact_created, contact_destroyed, purchase_created, purchase_destroyed.
            </p>
            <div className="flex w-full min-w-0 items-center gap-2">
              <Input value={clickfunnelsWebhookURL} readOnly className={readonlyLinkInputClass} />
              <CopyButton value={clickfunnelsWebhookURL} />
            </div>
          </Card>
        </div>
      </Spin>
    </PageShell>
  )
}
