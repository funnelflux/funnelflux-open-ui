import { useEffect, useMemo, useState } from 'react'
import { Copy, Loader2, Link } from 'lucide-react'
import { Button, Input, Select, Card } from 'antd'
import { PageHeader } from '@/components/shared/PageHeader'
import { useToastApi } from '@/components/ui-kit'
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

function CopyButton({ value }: { value: string }) {
  const toast = useToastApi()

  return (
    <Button
      htmlType="button"
      type="text"
      onClick={() =>
        navigator.clipboard.writeText(value).then(
          () => toast.success('Copied to clipboard'),
          () => toast.error('Failed to copy'),
        )
      }
    >
      <Copy className="h-4 w-4" />
    </Button>
  )
}

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

  const { data: funnels } = useFunnels(selectedCampaign)
  const { data: funnelDetail } = useFunnel(selectedFunnel)
  const { data: trafficSource } = useTrafficSource(selectedTrafficSource)

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

    const request = {
      idCampaign: selectedCampaign,
      idFunnel: selectedFunnel,
      idNode: selectedNode || undefined,
      idTrafficSource: selectedTrafficSource,
      domain: selectedDomain || undefined,
    }

    generateEntranceLink.mutate(request, {
      onSuccess: (data) => setEntranceLink(data || ''),
      onError: (error) => toast.error(getErrorMessage(error)),
    })

    generateNoRedirectJS.mutate(request, {
      onSuccess: (data) => setUniversalJs(data || ''),
      onError: (error) => toast.error(getErrorMessage(error)),
    })

    generateActionLink.mutate(request, {
      onSuccess: (data) => setActionLinks(data ? [data] : []),
      onError: (error) => toast.error(getErrorMessage(error)),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutation objects are stable (.mutate), only selection values should trigger
  }, [selectedCampaign, selectedDomain, selectedFunnel, selectedNode, selectedTrafficSource])

  const campaigns = linksData?.campaigns ?? []
  const trafficSources = linksData?.trafficSources ?? []
  const domains = linksData?.domains ?? []
  const postbackUrl = trafficSource?.postback?.postbackCode ?? ''
  const isGenerating =
    generateEntranceLink.isPending ||
    generateActionLink.isPending ||
    generateNoRedirectJS.isPending

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Links"
        subtitle="Generate entrance links, action links, and postback helpers"
      />

      {loadingData ? (
        <p className="text-sm text-muted-foreground">Loading options...</p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Campaign *</label>
              <Select value={selectedCampaign || undefined} onChange={setSelectedCampaign} placeholder="Select campaign" className="w-full">
                {campaigns.map((campaign) => (
                  <Select.Option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </Select.Option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Funnel *</label>
              <Select
                value={selectedFunnel || undefined}
                onChange={setSelectedFunnel}
                disabled={!selectedCampaign}
                placeholder={selectedCampaign ? 'Select funnel' : 'Select a campaign first'}
                className="w-full"
              >
                {(funnels ?? []).map((funnel) => (
                  <Select.Option key={funnel.id} value={funnel.id}>
                    {funnel.name}
                  </Select.Option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Node</label>
              <Select
                value={selectedNode || '__default__'}
                onChange={(value) => setSelectedNode(value === '__default__' ? '' : value)}
                disabled={!selectedFunnel}
                placeholder={selectedFunnel ? 'Select node' : 'Select a funnel first'}
                className="w-full"
              >
                <Select.Option value="__default__">Default funnel entry</Select.Option>
                {nodes.map((node) => (
                  <Select.Option key={node.idNode} value={node.idNode}>
                    {node.nodeName}
                  </Select.Option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Traffic Source *</label>
              <Select
                value={selectedTrafficSource || undefined}
                onChange={setSelectedTrafficSource}
                placeholder="Select traffic source"
                className="w-full"
              >
                {trafficSources.map((source) => (
                  <Select.Option key={source.id} value={source.id}>
                    {source.name}
                  </Select.Option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-sm font-medium">Domain</label>
              <Select
                value={selectedDomain || '__default__'}
                onChange={(value) => setSelectedDomain(value === '__default__' ? '' : value)}
                placeholder="Default domain"
                className="w-full"
              >
                <Select.Option value="__default__">Default domain</Select.Option>
                {domains.map((domain) => (
                  <Select.Option key={domain.id} value={domain.domain}>
                    {domain.domain}
                  </Select.Option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
            Outputs update automatically when the cascade changes.
          </div>

          {entranceLink ? (
            <Card title={<span className="text-sm">Entrance Link</span>}>
              <div className="flex items-center gap-2">
                <Input value={entranceLink} readOnly className="font-mono text-xs" />
                <CopyButton value={entranceLink} />
              </div>
            </Card>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-3">
            <Card title={<span className="text-sm">Universal JS</span>}>
              <div className="space-y-2">
                <Input value={universalJs} readOnly className="font-mono text-xs" />
                {universalJs ? <CopyButton value={universalJs} /> : null}
              </div>
            </Card>

            <Card title={<span className="text-sm">Action Click URLs</span>}>
              <div className="space-y-2">
                {actionLinks.length > 0 ? (
                  actionLinks.map((actionLink, index) => (
                    <div key={actionLink} className="flex items-center gap-2">
                      <span className="w-6 text-xs text-muted-foreground">{index + 1}.</span>
                      <Input value={actionLink} readOnly className="font-mono text-xs" />
                      <CopyButton value={actionLink} />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Select a campaign, funnel, and traffic source to generate action URLs.</p>
                )}
              </div>
            </Card>

            <Card title={<span className="text-sm">Conversion Postback URLs</span>}>
              <div className="space-y-2">
                {postbackUrl ? (
                  <>
                    <Input value={postbackUrl} readOnly className="font-mono text-xs" />
                    <CopyButton value={postbackUrl} />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Choose a traffic source with postback configuration to preview its conversion URL.</p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
