import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FunnelCodeSnippet } from '@/types/entities'
import {
  Modal,
  Form,
  Input,
  Button,
  Select,
  Field,
  InputNumber,
  CodeEditor,
  Spin,
  ConfirmModal,
  useToastApi,
  type SelectOption,
} from '@/components/ui-kit'
import {
  NODE_TYPES,
  NODE_TYPE_LABELS,
  type JsCodeNodeParams,
  type PhpCodeNodeParams,
} from '@/types/funnel'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { useCodeSnippet, useCodeSnippets, useSaveCodeSnippet } from '@/api/hooks'
import { DEFAULT_JS_CODE_CONTENT, DEFAULT_PHP_CODE_CONTENT } from '@/lib/codeSnippetDefaults'
import { generateId } from '@/lib/id-generator'

interface CodeNodeEditModalProps {
  nodeId: string
  /** `javascript` ↔ jsCode node; `php` ↔ phpCode node */
  codeType: 'javascript' | 'php'
  open: boolean
  onClose: () => void
}

type CodeSnippetParams = JsCodeNodeParams & PhpCodeNodeParams

function CodeNodeEditForm({
  nodeId,
  codeType,
  onClose,
}: Omit<CodeNodeEditModalProps, 'open'>) {
  const toast = useToastApi()
  const saveMutation = useSaveCodeSnippet()
  const updateNodeData = useFunnelEditorStore((s) => s.updateNodeData)
  const node = useFunnelEditorStore((s) => s.nodes.find((n) => n.id === nodeId))

  const defaultBody = codeType === 'javascript' ? DEFAULT_JS_CODE_CONTENT : DEFAULT_PHP_CODE_CONTENT
  const params = (node?.data.params ?? {}) as CodeSnippetParams
  const initialSnippetId =
    typeof params.snippetId === 'string' && params.snippetId.trim() !== '' ? params.snippetId.trim() : ''

  const detailQuery = useCodeSnippet(initialSnippetId, {
    enabled: initialSnippetId !== '',
  })

  const listQuery = useCodeSnippets(codeType)

  const snippetOptions = useMemo((): SelectOption[] => {
    const rows = listQuery.data ?? []
    return rows.map((row) => ({ value: row.id, label: row.name }))
  }, [listQuery.data])

  const [copyFromSnippetId, setCopyFromSnippetId] = useState<string | null>(null)
  const [selectLoadSnippetId, setSelectLoadSnippetId] = useState<string | undefined>(undefined)
  const [confirmOverwriteOpen, setConfirmOverwriteOpen] = useState(false)
  const copyFromQuery = useCodeSnippet(copyFromSnippetId ?? '', { enabled: !!copyFromSnippetId })

  const committedRef = useRef({ name: '', content: '', delay: 1000 })
  const pendingOverwriteSnippetIdRef = useRef<string | null>(null)

  const [codeName, setCodeName] = useState(
    () => params.snippetName?.trim() || node?.data.label?.trim() || '',
  )
  const [codeContent, setCodeContent] = useState(() => defaultBody)
  const [delayMs, setDelayMs] = useState(1000)
  const [boundSnippetId, setBoundSnippetId] = useState<string | null>(() =>
    initialSnippetId !== '' ? initialSnippetId : null,
  )

  useEffect(() => {
    committedRef.current = {
      name: params.snippetName?.trim() || node?.data.label?.trim() || '',
      content: defaultBody,
      delay: 1000,
    }
  }, [nodeId, defaultBody, params.snippetName, node?.data.label])

  const isDirtyAgainstCommitted = useCallback((): boolean => {
    const c = committedRef.current
    if (codeName.trim() !== c.name.trim()) return true
    if (codeContent !== c.content) return true
    if (codeType === 'javascript' && delayMs !== c.delay) return true
    return false
  }, [codeContent, codeName, codeType, delayMs])

  const initialHydratedRef = useRef(false)

  useEffect(() => {
    initialHydratedRef.current = false
  }, [nodeId, initialSnippetId])

  useEffect(() => {
    if (!initialSnippetId) return
    if (detailQuery.isError) {
      if (!initialHydratedRef.current) {
        initialHydratedRef.current = true
        queueMicrotask(() => {
          setBoundSnippetId(null)
          toast.error('Could not load this code snippet from the server.')
        })
      }
      return
    }
    const row = detailQuery.data
    if (!row || detailQuery.isPending) return
    if (initialHydratedRef.current) return
    initialHydratedRef.current = true
    queueMicrotask(() => {
      setCodeName(row.codeName)
      setCodeContent(row.codeContent)
      if (codeType === 'javascript') {
        const d = row.codeJavascriptParams?.delay ?? 1000
        setDelayMs(d)
        committedRef.current = { name: row.codeName, content: row.codeContent, delay: d }
      } else {
        committedRef.current = { name: row.codeName, content: row.codeContent, delay: 1000 }
      }
      setBoundSnippetId(row.idCode)
    })
  }, [
    initialSnippetId,
    detailQuery.data,
    detailQuery.isPending,
    detailQuery.isError,
    codeType,
    toast,
  ])

  useEffect(() => {
    if (!copyFromSnippetId) return
    if (copyFromQuery.isError) {
      queueMicrotask(() => {
        toast.error('Could not load snippet')
        setCopyFromSnippetId(null)
        setSelectLoadSnippetId(undefined)
      })
      return
    }
    const row = copyFromQuery.data
    if (!row || copyFromQuery.isPending) return
    queueMicrotask(() => {
      setCodeName(row.codeName)
      setCodeContent(row.codeContent)
      if (codeType === 'javascript') {
        const d = row.codeJavascriptParams?.delay ?? 1000
        setDelayMs(d)
        committedRef.current = { name: row.codeName, content: row.codeContent, delay: d }
      } else {
        committedRef.current = { name: row.codeName, content: row.codeContent, delay: 1000 }
      }
      setBoundSnippetId(row.idCode)
      setCopyFromSnippetId(null)
      setSelectLoadSnippetId(undefined)
    })
  }, [copyFromSnippetId, copyFromQuery.data, copyFromQuery.isPending, copyFromQuery.isError, codeType, toast])

  const handleLoadSnippetSelect = useCallback(
    (value: string | undefined | null) => {
      if (value == null || value === '') {
        setSelectLoadSnippetId(undefined)
        setCopyFromSnippetId(null)
        return
      }
      const next = value.trim()
      if (next === '') return
      setSelectLoadSnippetId(next)
      if (isDirtyAgainstCommitted()) {
        pendingOverwriteSnippetIdRef.current = next
        setConfirmOverwriteOpen(true)
        return
      }
      setCopyFromSnippetId(next)
    },
    [isDirtyAgainstCommitted],
  )

  const handleConfirmSnippetOverwrite = useCallback(() => {
    const id = pendingOverwriteSnippetIdRef.current
    setConfirmOverwriteOpen(false)
    pendingOverwriteSnippetIdRef.current = null
    if (id) setCopyFromSnippetId(id)
  }, [])

  const handleCancelSnippetOverwrite = useCallback(() => {
    setConfirmOverwriteOpen(false)
    pendingOverwriteSnippetIdRef.current = null
    setSelectLoadSnippetId(undefined)
  }, [])

  const awaitingInitialSnippet = Boolean(initialSnippetId) && detailQuery.isPending

  const handleApply = useCallback(async () => {
    if (!node) return
    const trimmedName = codeName.trim()
    if (!trimmedName) {
      toast.error('A unique name is required')
      return
    }
    const idCode = boundSnippetId ?? generateId()
    const body: FunnelCodeSnippet = {
      idCode,
      codeName: trimmedName,
      codeType,
      codeContent,
      ...(codeType === 'javascript' ?
        {
          codeJavascriptParams: {
            delay: Math.max(0, Math.floor(Number(delayMs)) || 0),
          },
        }
      : {}),
    }
    try {
      await saveMutation.mutateAsync({
        snippet: body,
        mode: boundSnippetId ? 'update' : 'create',
      })
      updateNodeData(nodeId, {
        label: trimmedName,
        params: {
          ...((node.data.params as object) ?? {}),
          snippetId: idCode,
          snippetName: trimmedName,
        },
      })
      onClose()
    } catch {
      toast.error('Failed to save code snippet.')
    }
  }, [
    boundSnippetId,
    codeContent,
    codeName,
    codeType,
    delayMs,
    node,
    nodeId,
    onClose,
    saveMutation,
    toast,
    updateNodeData,
  ])

  const nodeTypeLabel =
    codeType === 'javascript' ? NODE_TYPE_LABELS[NODE_TYPES.jsCode] : NODE_TYPE_LABELS[NODE_TYPES.phpCode]

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 pb-2">
      <ConfirmModal
        open={confirmOverwriteOpen}
        onCancel={handleCancelSnippetOverwrite}
        onConfirm={handleConfirmSnippetOverwrite}
        title="Overwrite current code?"
        description="Do you really want to overwrite your current code?"
        cancelText="Wait, I've changed my mind!"
        confirmText="Yes, replace it now..."
        danger
      />
      {awaitingInitialSnippet ?
        <div className="flex flex-1 items-center justify-center py-16">
          <Spin description="Loading snippet…" />
        </div>
      : <>
          <p className="text-sm text-muted-foreground">{nodeTypeLabel} — edits are saved as a funnel code snippet.</p>

          <Form layout="vertical" className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Form.Item label="Code snippet name" required>
                <Input
                  value={codeName}
                  onChange={(e) => setCodeName(e.target.value)}
                  placeholder="e.g. Pre-lander redirect helper"
                  allowClear
                />
              </Form.Item>
              <Field
                title="Load existing snippet"
                description="Selecting a snippet overwrites the editor with its saved contents."
              >
                <Select
                  aria-label="Load existing snippet"
                  value={selectLoadSnippetId}
                  loading={copyFromQuery.isFetching}
                  onChange={handleLoadSnippetSelect}
                  allowClear
                  showSearch
                  placeholder="Choose a snippet to load into this node"
                  options={snippetOptions}
                  className="w-full"
                />
              </Field>
            </div>

            {codeType === 'javascript' && (
              <Form.Item label="Delay before redirect (milliseconds)" extra="Stored with the JavaScript snippet.">
                <InputNumber
                  min={0}
                  className="w-full max-w-xs"
                  value={delayMs}
                  onChange={(v) => setDelayMs(v == null ? 0 : Number(v))}
                />
              </Form.Item>
            )}

            <Field title={codeType === 'javascript' ? 'Enter your JavaScript below:' : 'Enter your PHP below:'}>
              <CodeEditor
                language={codeType === 'javascript' ? 'javascript' : 'php'}
                value={codeContent}
                onChange={setCodeContent}
              />
            </Field>
          </Form>

          <div className="mt-auto flex shrink-0 justify-end gap-2 border-t border-border pt-4">
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="primary"
              loading={saveMutation.isPending}
              disabled={awaitingInitialSnippet || !codeName.trim()}
              onClick={() => void handleApply()}
            >
              Apply
            </Button>
          </div>
        </>
      }
    </div>
  )
}

export function CodeNodeEditModal({ nodeId, codeType, open, onClose }: CodeNodeEditModalProps) {
  const node = useFunnelEditorStore((s) => {
    if (!nodeId) return undefined
    return s.nodes.find((n) => n.id === nodeId)
  })

  const expectedType = codeType === 'javascript' ? NODE_TYPES.jsCode : NODE_TYPES.phpCode

  const title =
    codeType === 'javascript' ? `Edit ${NODE_TYPE_LABELS[NODE_TYPES.jsCode]}`
    : `Edit ${NODE_TYPE_LABELS[NODE_TYPES.phpCode]}`

  const wrongType = node !== undefined && node.data.nodeType !== expectedType

  if (!nodeId || !node || wrongType) return null

  return (
    <Modal
      title={title}
      open={open}
      width={900}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      layoutVariant="form"
    >
      {open ?
        <CodeNodeEditForm key={nodeId} nodeId={nodeId} codeType={codeType} onClose={onClose} />
      : null}
    </Modal>
  )
}
