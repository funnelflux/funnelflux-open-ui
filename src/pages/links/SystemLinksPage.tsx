import { useEffect, useMemo, useState } from 'react'
import { Copy, Loader2, Link } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { useToast } from '@/components/shared/Toaster'
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
  const toast = useToast()

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
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
  const toast = useToast()
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
              <Label>Campaign *</Label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Funnel *</Label>
              <Select
                value={selectedFunnel}
                onValueChange={setSelectedFunnel}
                disabled={!selectedCampaign}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedCampaign ? 'Select funnel' : 'Select a campaign first'} />
                </SelectTrigger>
                <SelectContent>
                  {(funnels ?? []).map((funnel) => (
                    <SelectItem key={funnel.id} value={funnel.id}>
                      {funnel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Node</Label>
              <Select
                value={selectedNode || '__default__'}
                onValueChange={(value) => setSelectedNode(value === '__default__' ? '' : value)}
                disabled={!selectedFunnel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedFunnel ? 'Select node' : 'Select a funnel first'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">Default funnel entry</SelectItem>
                  {nodes.map((node) => (
                    <SelectItem key={node.idNode} value={node.idNode}>
                      {node.nodeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Traffic Source *</Label>
              <Select
                value={selectedTrafficSource}
                onValueChange={setSelectedTrafficSource}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select traffic source" />
                </SelectTrigger>
                <SelectContent>
                  {trafficSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 lg:col-span-2">
              <Label>Domain</Label>
              <Select
                value={selectedDomain || '__default__'}
                onValueChange={(value) => setSelectedDomain(value === '__default__' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Default domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">Default domain</SelectItem>
                  {domains.map((domain) => (
                    <SelectItem key={domain.id} value={domain.domain}>
                      {domain.domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
            Outputs update automatically when the cascade changes.
          </div>

          {entranceLink ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Entrance Link</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Input value={entranceLink} readOnly className="font-mono text-xs" />
                  <CopyButton value={entranceLink} />
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Universal JS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input value={universalJs} readOnly className="font-mono text-xs" />
                {universalJs ? <CopyButton value={universalJs} /> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Action Click URLs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Conversion Postback URLs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {postbackUrl ? (
                  <>
                    <Input value={postbackUrl} readOnly className="font-mono text-xs" />
                    <CopyButton value={postbackUrl} />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Choose a traffic source with postback configuration to preview its conversion URL.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
