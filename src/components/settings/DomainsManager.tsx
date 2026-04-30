import { useState } from 'react'
import { Icon } from '@/components/ui-kit/icons'
import { Button, Input, Tag } from '@/components/ui-kit'
import { ConfirmModal, useToastApi } from '@/components/ui-kit'
import {
  useDomains,
  useSaveDomain,
  useDeleteDomain,
  useSetDefaultDomain,
} from '@/api/hooks/useDomains'
import type { Domain } from '@/types/ui'
import { getErrorMessage } from '@/lib/utils'

export function DomainsManager() {
  const toast = useToastApi()
  const { data: domains, isLoading } = useDomains()
  const saveDomain = useSaveDomain()
  const deleteDomain = useDeleteDomain()
  const setDefaultDomain = useSetDefaultDomain()

  const [newDomain, setNewDomain] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Domain | null>(null)

  function handleAdd() {
    const trimmed = newDomain.trim()
    if (!trimmed) return

    saveDomain.mutate(trimmed, {
      onSuccess: () => {
        toast.success(`Domain "${trimmed}" added`)
        setNewDomain('')
      },
      onError: (err) => {
        toast.error(`Failed to add domain: ${getErrorMessage(err)}`)
      },
    })
  }

  function handleSetDefault(domain: Domain) {
    setDefaultDomain.mutate(domain.domain, {
      onSuccess: () => {
        toast.success(`"${domain.domain}" set as default`)
      },
      onError: (err) => {
        toast.error(`Failed to set default: ${getErrorMessage(err)}`)
      },
    })
  }

  function confirmDelete() {
    if (!deleteTarget) return
    deleteDomain.mutate(deleteTarget.domain, {
      onSuccess: () => {
        toast.success(`Domain "${deleteTarget.domain}" deleted`)
        setDeleteTarget(null)
      },
      onError: (err) => {
        toast.error(`Failed to delete domain: ${getErrorMessage(err)}`)
        setDeleteTarget(null)
      },
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Domains</h3>

      <div className="flex items-center gap-2">
        <Input
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. track.example.com"
          className="max-w-sm"
        />
        <Button
          type="primary"
          onClick={handleAdd}
          disabled={!newDomain.trim() || saveDomain.isPending}
        >
          {saveDomain.isPending ? (
            <span className="mr-1 inline-flex">
              <Icon name="loader-2" size="md" animation="spin" />
            </span>
          ) : (
            <span className="mr-1 inline-flex">
              <Icon name="plus" size="md" />
            </span>
          )}
          Add
        </Button>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading domains...</p>
      )}

      {!isLoading && (!domains || domains.length === 0) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Icon name="globe" size="lg" />
          <span>No domains configured.</span>
        </div>
      )}

      {domains && domains.length > 0 && (
        <div className="space-y-2">
          {domains.map((domain) => (
            <div
              key={domain.id}
              className="flex items-center justify-between rounded-md border px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{domain.domain}</span>
                {domain.isDefault && (
                  <Tag className="text-xs">
                    Default
                  </Tag>
                )}
              </div>
              <div className="flex items-center gap-1">
                {!domain.isDefault && (
                  <Button
                    type="text"
                    size="small"
                    onClick={() => handleSetDefault(domain)}
                    disabled={setDefaultDomain.isPending}
                    title="Set as default"
                    aria-label="Set as default"
                  >
                    <Icon name="star" size="md" />
                  </Button>
                )}
                <Button
                  type="text"
                  size="small"
                  onClick={() => setDeleteTarget(domain)}
                  className="text-destructive hover:text-destructive"
                  title="Delete domain"
                  aria-label="Delete domain"
                >
                  <Icon name="trash-2" size="md" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Domain"
        description={`Are you sure you want to delete "${deleteTarget?.domain}"? This cannot be undone.`}
        confirmText="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
