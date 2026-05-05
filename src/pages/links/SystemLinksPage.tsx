import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Card,
  CopyButton,
  Divider,
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
import {
  useSystemLinksData,
  useFunnels,
  useFunnel,
  useTrafficSource,
  useGenerateEntranceLink,
  useGenerateActionLink,
  useGenerateNoRedirectJS,
} from '@/api/hooks'
import type { FunnelNode } from '@/types/entities'
import { getErrorMessage } from '@/lib/utils'

export function SystemLinksPage() {
  const toast = useToastApi()
  const { data: linksData, isLoading: loadingData } = useSystemLinksData()
  const generateEntranceLink = useGenerateEntranceLink()
  const generateActionLink = useGenerateActionLink()
  const generateNoRedirectJS = useGenerateNoRedirectJS()

  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [selectedFunnel, setSelectedFunnel] = useState('')
  const [selectedNode, setSelectedNode] = useState('')
  const [selectedTrafficSource, setSelectedTrafficSource] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('')
  const [entranceLink, setEntranceLink] = useState('')
  const [actionLinks, setActionLinks] = useState<string[]>([])
  const [universalJs, setUniversalJs] = useState('')
  const requestIdRef = useRef(0)

  const { data: funnels } = useFunnels(selectedCampaign)
  const { data: funnelDetail } = useFunnel(selectedFunnel)
  const { data: trafficSource } = useTrafficSource(selectedTrafficSource)

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

  useEffect(() => {
    setSelectedNode('')
    setEntranceLink('')
    setActionLinks([])
    setUniversalJs('')
  }, [selectedCampaign, selectedFunnel, selectedTrafficSource, selectedDomain])

  useEffect(() => {
    if (!selectedCampaign || !selectedFunnel || !selectedTrafficSource) {
      return
    }

    const thisRequest = ++requestIdRef.current

    const request = {
      idCampaign: selectedCampaign,
      idFunnel: selectedFunnel,
      idNode: selectedNode || undefined,
      idTrafficSource: selectedTrafficSource,
      domain: selectedDomain || undefined,
    }

    generateEntranceLink.mutate(request, {
      onSuccess: (data) => {
        if (requestIdRef.current === thisRequest) setEntranceLink(data || '')
      },
      onError: (error) => {
        if (requestIdRef.current === thisRequest) toast.error(getErrorMessage(error))
      },
    })

    generateNoRedirectJS.mutate(request, {
      onSuccess: (data) => {
        if (requestIdRef.current === thisRequest) setUniversalJs(data || '')
      },
      onError: (error) => {
        if (requestIdRef.current === thisRequest) toast.error(getErrorMessage(error))
      },
    })

    generateActionLink.mutate(request, {
      onSuccess: (data) => {
        if (requestIdRef.current === thisRequest) setActionLinks(data ? [data] : [])
      },
      onError: (error) => {
        if (requestIdRef.current === thisRequest) toast.error(getErrorMessage(error))
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutation objects are stable (.mutate), only selection values should trigger
  }, [selectedCampaign, selectedDomain, selectedFunnel, selectedNode, selectedTrafficSource])

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

  const postbackUrl = trafficSource?.postback?.postbackCode ?? ''
  const isGenerating =
    generateEntranceLink.isPending ||
    generateActionLink.isPending ||
    generateNoRedirectJS.isPending

  return (
    <PageShell
      title="System Links"
      subtitle="Generate entrance links, action links, and postback helpers"
    >
      <Spin spinning={loadingData} tip="Loading link options…">
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field title="Campaign" required htmlFor="system-links-campaign">
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

            <Field title="Funnel" required htmlFor="system-links-funnel">
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

            <Field
              title="Node"
              htmlFor="system-links-node"
              description='Optional funnel node for tracking links. Use “Default funnel entry” for the funnel’s normal start.'
            >
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

            <Field title="Traffic Source" required htmlFor="system-links-traffic-source">
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

            <Field
              title="Domain"
              htmlFor="system-links-domain"
              className="lg:col-span-2"
              description="Override the tracking domain or leave as default."
            >
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

          <Space align="center" size="small" className="text-sm text-muted-foreground">
            {isGenerating ? (
              <Icon name="loader-2" animation="spin" aria-hidden />
            ) : (
              <Icon name="hyperlink" aria-hidden />
            )}
            <span>Outputs update automatically when the cascade changes.</span>
          </Space>

          <Divider className="my-0" />

          {entranceLink ? (
            <Card title={<span className="text-sm font-medium">Entrance Link</span>}>
              <Space align="center" className="w-full">
                <Input value={entranceLink} readOnly className="font-mono text-xs flex-1 min-w-0" />
                <CopyButton value={entranceLink} />
              </Space>
            </Card>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-3">
            <Card title={<span className="text-sm font-medium">Universal JS</span>}>
              <Space orientation="vertical" size="small" className="w-full">
                <Input value={universalJs} readOnly className="font-mono text-xs w-full" />
                {universalJs ? <CopyButton value={universalJs} /> : null}
              </Space>
            </Card>

            <Card title={<span className="text-sm font-medium">Action Click URLs</span>}>
              <div className="space-y-2">
                {actionLinks.length > 0 ? (
                  actionLinks.map((actionLink, index) => (
                    <Space key={actionLink} align="center" className="w-full">
                      <span className="w-6 shrink-0 text-xs text-muted-foreground">{index + 1}.</span>
                      <Input value={actionLink} readOnly className="font-mono text-xs flex-1 min-w-0" />
                      <CopyButton value={actionLink} />
                    </Space>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a campaign, funnel, and traffic source to generate action URLs.
                  </p>
                )}
              </div>
            </Card>

            <Card title={<span className="text-sm font-medium">Conversion Postback URLs</span>}>
              <Space orientation="vertical" size="small" className="w-full">
                {postbackUrl ? (
                  <>
                    <Input value={postbackUrl} readOnly className="font-mono text-xs w-full" />
                    <CopyButton value={postbackUrl} />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Choose a traffic source with postback configuration to preview its conversion URL.
                  </p>
                )}
              </Space>
            </Card>
          </div>
        </div>
      </Spin>
    </PageShell>
  )
}
