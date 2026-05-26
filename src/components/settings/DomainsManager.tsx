import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Icon } from '@/components/ui-kit/icons'
import { Alert, Button, ConfirmModal, Input, Select, Tag, useToastApi, type SelectOption } from '@/components/ui-kit'
import {
  useDefaultTrackingDomain,
  useDeleteDomain,
  useDomains,
  useEditDomain,
  useSaveDomain,
  useSetDefaultTrackingDomain,
  useSetWebRootDomain,
  useWebRootDomain,
} from '@/api/hooks/useDomains'
import type { Domain } from '@/types/ui'
import { getErrorMessage } from '@/lib/utils'

function DomainSection({
  title,
  description,
  icon,
  children,
}: {
  title: string
  description: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-md border border-border bg-surface-secondary p-4">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 inline-flex text-muted-foreground">{icon}</span>
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

export function DomainsManager() {
  const toast = useToastApi()
  const { data: domains = [], isLoading, isError, error } = useDomains()
  const {
    data: trackingDomain = '',
    isLoading: isTrackingLoading,
    isError: isTrackingError,
    error: trackingQueryError,
  } = useDefaultTrackingDomain()
  const {
    data: webRootDomain,
    isLoading: isWebRootLoading,
    isError: isWebRootError,
    error: webRootQueryError,
    refetch: refetchWebRoot,
  } = useWebRootDomain()

  const saveDomain = useSaveDomain()
  const editDomain = useEditDomain()
  const deleteDomain = useDeleteDomain()
  const setTrackingDomain = useSetDefaultTrackingDomain()
  const setWebRootDomain = useSetWebRootDomain()

  const [newDomain, setNewDomain] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Domain | null>(null)
  const [editTarget, setEditTarget] = useState<Domain | null>(null)
  const [editValue, setEditValue] = useState('')
  const [inventoryError, setInventoryError] = useState('')
  const [trackingError, setTrackingError] = useState('')
  const [webRootError, setWebRootError] = useState('')

  const currentTrackingDomain =
    trackingDomain || domains.find((domain) => domain.isDefault)?.domain || undefined
  const currentWebRootDomain = webRootDomain?.domain || undefined

  const domainOptions = useMemo<SelectOption[]>(
    () => domains.map((domain) => ({ label: domain.domain, value: domain.domain })),
    [domains],
  )

  function handleAdd() {
    const trimmed = newDomain.trim()
    if (!trimmed) return

    setInventoryError('')
    saveDomain.mutate(trimmed, {
      onSuccess: () => {
        toast.success(`Domain "${trimmed}" added`)
        setNewDomain('')
      },
      onError: (err) => {
        const message = getErrorMessage(err)
        setInventoryError(message)
        toast.error(`Failed to add domain: ${message}`)
      },
    })
  }

  function startEdit(domain: Domain) {
    setInventoryError('')
    setEditTarget(domain)
    setEditValue(domain.domain)
  }

  function handleEditSave() {
    if (!editTarget) return
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === editTarget.domain) {
      setEditTarget(null)
      setEditValue('')
      return
    }

    setInventoryError('')
    editDomain.mutate(
      { oldDomain: editTarget.domain, newDomain: trimmed },
      {
        onSuccess: () => {
          toast.success(`Domain "${editTarget.domain}" updated`)
          setEditTarget(null)
          setEditValue('')
        },
        onError: (err) => {
          const message = getErrorMessage(err)
          setInventoryError(message)
          toast.error(`Failed to update domain: ${message}`)
        },
      },
    )
  }

  function confirmDelete() {
    if (!deleteTarget) return
    setInventoryError('')
    deleteDomain.mutate(deleteTarget.domain, {
      onSuccess: () => {
        toast.success(`Domain "${deleteTarget.domain}" deleted`)
        setDeleteTarget(null)
      },
      onError: (err) => {
        const message = getErrorMessage(err)
        setInventoryError(message)
        toast.error(`Failed to delete domain: ${message}`)
        setDeleteTarget(null)
      },
    })
  }

  function handleSetTrackingDomain(domainName: string) {
    if (!domainName || domainName === currentTrackingDomain) return

    setTrackingError('')
    setTrackingDomain.mutate(domainName, {
      onSuccess: () => {
        toast.success(`"${domainName}" set as default tracking domain`)
      },
      onError: (err) => {
        const message = getErrorMessage(err)
        setTrackingError(message)
        toast.error(`Failed to update tracking domain: ${message}`)
      },
    })
  }

  function handleSetWebRootDomain(domainName: string) {
    if (!domainName || domainName === currentWebRootDomain) return

    setWebRootError('')
    setWebRootDomain.mutate(domainName, {
      onSuccess: () => {
        toast.success(`"${domainName}" set as login / license domain`)
      },
      onError: (err) => {
        const message = getErrorMessage(err)
        setWebRootError(message)
        toast.error(`Failed to update login domain: ${message}`)
        refetchWebRoot()
      },
    })
  }

  function handleNewDomainKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  function handleEditKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleEditSave()
    }
    if (e.key === 'Escape') {
      setEditTarget(null)
      setEditValue('')
    }
  }

  const inventoryBusy = saveDomain.isPending || editDomain.isPending || deleteDomain.isPending
  const trackingBusy = setTrackingDomain.isPending
  const webRootBusy = setWebRootDomain.isPending

  return (
    <div className="space-y-4">
      <DomainSection
        title="Domain Inventory"
        description="Manage the known domains list. Adding or editing a domain does not change tracking or login defaults."
        icon={<Icon name="globe" size="lg" />}
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={handleNewDomainKeyDown}
              placeholder="e.g. track.example.com"
              className="sm:max-w-sm"
              disabled={inventoryBusy}
            />
            <Button
              type="primary"
              onClick={handleAdd}
              disabled={!newDomain.trim() || inventoryBusy}
              iconName={saveDomain.isPending ? 'loader-2' : 'plus'}
              iconAnimation={saveDomain.isPending ? 'spin' : 'none'}
            >
              Add Domain
            </Button>
          </div>

          {inventoryError && (
            <Alert type="error" showIcon message={inventoryError} />
          )}
          {isError && (
            <Alert type="error" showIcon message={`Failed to load domains: ${getErrorMessage(error)}`} />
          )}

          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading domains...</p>
          )}

          {!isLoading && domains.length === 0 && (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Icon name="globe" size="lg" />
              <span>No domains configured.</span>
            </div>
          )}

          {domains.length > 0 && (
            <div className="space-y-2">
              {domains.map((domain) => {
                const isEditing = editTarget?.domain === domain.domain
                return (
                  <div
                    key={domain.id}
                    className="flex flex-col gap-3 rounded-md border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    {isEditing ? (
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          disabled={editDomain.isPending}
                        />
                        <Button
                          type="primary"
                          size="sm"
                          onClick={handleEditSave}
                          disabled={!editValue.trim() || editDomain.isPending}
                          iconName={editDomain.isPending ? 'loader-2' : 'check'}
                          iconAnimation={editDomain.isPending ? 'spin' : 'none'}
                          aria-label="Save domain"
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditTarget(null)
                            setEditValue('')
                          }}
                          disabled={editDomain.isPending}
                          iconName="x"
                          aria-label="Cancel edit"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">{domain.domain}</span>
                          {domain.domain === currentTrackingDomain && (
                            <Tag className="text-xs">Tracking default</Tag>
                          )}
                          {domain.domain === currentWebRootDomain && (
                            <Tag className="text-xs">Login / license</Tag>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="text"
                            size="small"
                            onClick={() => startEdit(domain)}
                            disabled={inventoryBusy}
                            title="Edit domain"
                            aria-label="Edit domain"
                            iconName="pencil"
                          />
                          <Button
                            type="text"
                            size="small"
                            onClick={() => setDeleteTarget(domain)}
                            disabled={inventoryBusy}
                            className="text-destructive hover:text-destructive"
                            title="Delete domain"
                            aria-label="Delete domain"
                            iconName="trash-2"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DomainSection>

      <DomainSection
        title="Default Tracking Domain"
        description="Used for generated tracking links, funnel links, and reporting URLs. This does not change the login URL or license domain."
        icon={<Icon name="hyperlink" size="lg" />}
      >
        <div className="space-y-3">
          <Select
            options={domainOptions}
            value={currentTrackingDomain}
            onChange={(value) => handleSetTrackingDomain(String(value))}
            placeholder="Select tracking domain"
            loading={isTrackingLoading || trackingBusy}
            disabled={isLoading || isTrackingLoading || trackingBusy || domainOptions.length === 0}
            className="w-full"
          />
          {trackingBusy && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon name="loader-2" size="md" animation="spin" />
              Updating tracking domain...
            </p>
          )}
          {trackingError && <Alert type="error" showIcon message={trackingError} />}
          {isTrackingError && (
            <Alert
              type="error"
              showIcon
              message={`Failed to load default tracking domain: ${getErrorMessage(trackingQueryError)}`}
            />
          )}
        </div>
      </DomainSection>

      <DomainSection
        title="Login / License Domain"
        description="Controls application.webRoot for login/admin URLs and license domain attachment. Backend rolls this back if license attachment fails."
        icon={<Icon name="shield" size="lg" />}
      >
        <div className="space-y-3">
          <Select
            options={domainOptions}
            value={currentWebRootDomain}
            onChange={(value) => handleSetWebRootDomain(String(value))}
            placeholder="Select login / license domain"
            loading={isWebRootLoading || webRootBusy}
            disabled={isLoading || isWebRootLoading || webRootBusy || domainOptions.length === 0}
            className="w-full"
          />
          {webRootDomain?.webRoot && (
            <p className="text-sm text-muted-foreground">
              Current web root: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{webRootDomain.webRoot}</code>
            </p>
          )}
          {webRootBusy && (
            <Alert
              type="info"
              showIcon
              message="Updating login domain..."
              description="Saving webRoot and attaching the license domain. This must complete before changing another domain setting."
            />
          )}
          {webRootError && <Alert type="error" showIcon message={webRootError} />}
          {isWebRootError && (
            <Alert
              type="error"
              showIcon
              message={`Failed to load login / license domain: ${getErrorMessage(webRootQueryError)}`}
            />
          )}
        </div>
      </DomainSection>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Domain"
        description={`Are you sure you want to delete "${deleteTarget?.domain}"? If this domain is active for tracking or login, the backend will block deletion.`}
        confirmText="Delete"
        danger
        loading={deleteDomain.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
