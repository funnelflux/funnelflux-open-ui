import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Card,
  CopyButton,
  Field,
  Icon,
  Input,
  PageShell,
  Select,
  Space,
  Spin,
  useToastApi,
} from '@/components/ui-kit'
import type { SelectOption } from '@/components/ui-kit'
import { useSystemLinksData, useFunnels, useFunnel, useGenerateEntranceLink } from '@/api/hooks'
import type { FunnelNode } from '@/types/entities'
import { getErrorMessage } from '@/lib/utils'

export function SystemLinksPage() {
  const toast = useToastApi()
  const { data: linksData, isLoading: loadingData } = useSystemLinksData()
  const generateEntranceLink = useGenerateEntranceLink()

  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [selectedFunnel, setSelectedFunnel] = useState('')
  const [selectedNode, setSelectedNode] = useState('')
  const [selectedTrafficSource, setSelectedTrafficSource] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('')
  const [costInput, setCostInput] = useState('')
  const [entranceLink, setEntranceLink] = useState('')
  const [iframeCode, setIframeCode] = useState('')
  const [pixelUrl, setPixelUrl] = useState('')
  const [pixelHtml, setPixelHtml] = useState('')
  const requestIdRef = useRef(0)

  const { data: funnels } = useFunnels(selectedCampaign)
  const { data: funnelDetail } = useFunnel(selectedFunnel)

  const selectedTrafficSourceOption = useMemo(
    () => (linksData?.trafficSources ?? []).find((source) => source.id === selectedTrafficSource),
    [linksData?.trafficSources, selectedTrafficSource],
  )

  const handleNodeChange = useCallback((value: string) => {
    setSelectedNode(value === '__default__' ? '' : value)
  }, [])

  const handleDomainChange = useCallback((value: string) => {
    setSelectedDomain(value === '__default__' ? '' : value)
  }, [])

  const nodes = useMemo<FunnelNode[]>(
    () => (funnelDetail?.nodes ?? []).filter((node) => !node.isArchived),
    [funnelDetail?.nodes],
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
    setEntranceLink('')
    setSelectedNode('')
  }, [selectedCampaign, selectedFunnel, selectedTrafficSource, selectedDomain])

  useEffect(() => {
    setCostInput(resolvedDefaultCost)
  }, [resolvedDefaultCost])

  useEffect(() => {
    setIframeCode(linksData?.conversionIframe ?? '')
    setPixelUrl(linksData?.pixelURL ?? '')
    setPixelHtml(linksData?.pixelHTML ?? '')
  }, [linksData?.conversionIframe, linksData?.pixelURL, linksData?.pixelHTML])

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
    if (!selectedCampaign || !selectedFunnel || !selectedTrafficSource) return

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

    generateEntranceLink.mutate(request, {
      onSuccess: (data) => {
        if (requestIdRef.current === thisRequest) setEntranceLink(data || '')
      },
      onError: (error) => {
        if (requestIdRef.current === thisRequest) toast.error(getErrorMessage(error))
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutation object is stable (.mutate)
  }, [costInput, selectedCampaign, selectedDomain, selectedFunnel, selectedNode, selectedTrafficSource])

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
    () => [
      { label: 'Default domain', value: '__default__' },
      ...(linksData?.domains ?? []).map((d) => ({ label: d.domain, value: d.domain, searchId: d.id })),
    ],
    [linksData?.domains],
  )

  const nodeOptions: SelectOption[] = useMemo(
    () => [
      { label: 'Default funnel entry', value: '__default__' },
      ...nodes.map((node) => ({
        label: node.nodeName,
        value: node.idNode,
        searchId: node.idNode,
      })),
    ],
    [nodes],
  )

  const clickfunnelsWebhookURL = useMemo(() => {
    const cbUrl = linksData?.clickbankIPNURL ?? ''
    return cbUrl ? cbUrl.replace('cb.php', 'clickfunnels.php') : ''
  }, [linksData?.clickbankIPNURL])

  const costLabel = selectedTrafficSourceOption?.costType === 'cpa' ? 'Cost per action' : 'Cost per entrance'

  return (
    <PageShell title="System Links" subtitle="Generate funnel links and conversion integration links.">
      <Spin spinning={loadingData} tip="Loading link options…">
        <div className="space-y-6">
          <Card title={<span className="text-sm font-medium">Funnel URL</span>}>
            <p className="mb-4 text-sm text-muted-foreground">
              Follow the steps below to get the URL of one of your funnels.
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field title="Step 1: Select a Campaign" required htmlFor="system-links-campaign">
                <Select
                  id="system-links-campaign"
                  options={campaignOptions}
                  value={selectedCampaign || undefined}
                  onChange={setSelectedCampaign}
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
                  onChange={setSelectedFunnel}
                  disabled={loadingData || !selectedCampaign}
                  placeholder={selectedCampaign ? 'Select funnel' : 'Select a campaign first'}
                  className="w-full"
                />
              </Field>

              <Field title="Step 2B (Optional): Select a Node" htmlFor="system-links-node">
                <Select
                  id="system-links-node"
                  options={nodeOptions}
                  value={selectedNode || '__default__'}
                  onChange={handleNodeChange}
                  disabled={loadingData || !selectedFunnel}
                  placeholder={selectedFunnel ? 'Select node' : 'Select a funnel first'}
                  className="w-full"
                />
              </Field>

              <Field title="Step 3: Select a Traffic Source" required htmlFor="system-links-traffic-source">
                <Select
                  id="system-links-traffic-source"
                  options={trafficSourceOptions}
                  value={selectedTrafficSource || undefined}
                  onChange={setSelectedTrafficSource}
                  placeholder="Select traffic source"
                  className="w-full"
                  disabled={loadingData}
                />
              </Field>

              <Field title={`Step 4: ${costLabel}`} htmlFor="system-links-cost">
                <Input
                  id="system-links-cost"
                  value={costInput}
                  onChange={(event) => setCostInput(event.target.value)}
                  placeholder="0.00"
                />
              </Field>

              <Field title="Step 5 (Optional): Select a Domain" htmlFor="system-links-domain">
                <Select
                  id="system-links-domain"
                  options={domainOptions}
                  value={selectedDomain || '__default__'}
                  onChange={handleDomainChange}
                  placeholder="Default domain"
                  className="w-full"
                  disabled={loadingData}
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field title="Step 6: Copy your link" htmlFor="system-links-url-output">
                <Space align="center" className="w-full">
                  <Input
                    id="system-links-url-output"
                    value={entranceLink}
                    readOnly
                    className="font-mono text-xs flex-1 min-w-0"
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
                </Space>
              </Field>
              {generateEntranceLink.isPending ? (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon name="loader-2" animation="spin" />
                  <span>Refreshing link…</span>
                </div>
              ) : null}
            </div>
          </Card>

          <Card title={<span className="text-sm font-medium">Funnels' Action Click URL</span>}>
            <p className="mb-3 text-sm text-muted-foreground">
              Copy this link and replace <code>ACTION-NUMBER</code> with a number from 1 to 64.
            </p>
            <Space align="center" className="w-full">
              <Input value={linksData?.actionURL ?? ''} readOnly className="font-mono text-xs flex-1 min-w-0" />
              <CopyButton value={linksData?.actionURL ?? ''} />
            </Space>
          </Card>

          <Card title={<span className="text-sm font-medium">Conversion Postback URL</span>}>
            <p className="mb-3 text-sm text-muted-foreground">
              Use this URL to register conversions from a remote server (affiliate network postbacks).
            </p>
            <Space align="center" className="w-full">
              <Input value={linksData?.postbackURL ?? ''} readOnly className="font-mono text-xs flex-1 min-w-0" />
              <CopyButton value={linksData?.postbackURL ?? ''} />
            </Space>
          </Card>

          <Card title={<span className="text-sm font-medium">Conversion iFrame</span>}>
            <p className="mb-3 text-sm text-muted-foreground">
              Use this iFrame on your thank-you page. Copying regenerates a fresh pixel salt.
            </p>
            <Space align="center" className="w-full">
              <Input value={iframeCode} readOnly className="font-mono text-xs flex-1 min-w-0" />
              <Button
                onClick={async () => {
                  const next = refreshTrackingSalt(iframeCode)
                  setIframeCode(next)
                  await copyText(next, 'iFrame copied')
                }}
              >
                Copy
              </Button>
            </Space>
          </Card>

          <Card title={<span className="text-sm font-medium">Conversion Pixel</span>}>
            <p className="mb-3 text-sm text-muted-foreground">
              Pixel URL and HTML snippet. Copying regenerates a fresh pixel salt.
            </p>
            <div className="space-y-3">
              <Field title="Pixel URL" htmlFor="system-links-pixel-url">
                <Space align="center" className="w-full">
                  <Input id="system-links-pixel-url" value={pixelUrl} readOnly className="font-mono text-xs flex-1 min-w-0" />
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
                </Space>
              </Field>
              <Field title="Pixel HTML" htmlFor="system-links-pixel-html">
                <Space align="center" className="w-full">
                  <Input id="system-links-pixel-html" value={pixelHtml} readOnly className="font-mono text-xs flex-1 min-w-0" />
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
                </Space>
              </Field>
            </div>
          </Card>

          <Card title={<span className="text-sm font-medium">Clickbank Instant Notifications</span>}>
            <p className="mb-3 text-sm text-muted-foreground">
              Secret key and URL for Clickbank instant sale/re-bill/refund notifications (API v6).
            </p>
            <div className="space-y-3">
              <Field title="Secret Key" htmlFor="system-links-cb-key">
                <Space align="center" className="w-full">
                  <Input id="system-links-cb-key" value={linksData?.clickbankIPNKey ?? ''} readOnly className="font-mono text-xs flex-1 min-w-0" />
                  <CopyButton value={linksData?.clickbankIPNKey ?? ''} />
                </Space>
              </Field>
              <Field title="Notification URL" htmlFor="system-links-cb-url">
                <Space align="center" className="w-full">
                  <Input id="system-links-cb-url" value={linksData?.clickbankIPNURL ?? ''} readOnly className="font-mono text-xs flex-1 min-w-0" />
                  <CopyButton value={linksData?.clickbankIPNURL ?? ''} />
                </Space>
              </Field>
            </div>
          </Card>

          <Card title={<span className="text-sm font-medium">ClickFunnels Webhook</span>}>
            <p className="mb-3 text-sm text-muted-foreground">
              Use this webhook URL in ClickFunnels settings. Events: contact_created, contact_destroyed, purchase_created, purchase_destroyed.
            </p>
            <Space align="center" className="w-full">
              <Input value={clickfunnelsWebhookURL} readOnly className="font-mono text-xs flex-1 min-w-0" />
              <CopyButton value={clickfunnelsWebhookURL} />
            </Space>
          </Card>
        </div>
      </Spin>
    </PageShell>
  )
}
