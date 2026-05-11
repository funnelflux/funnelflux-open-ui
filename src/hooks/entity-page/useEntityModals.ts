import { useCallback, useState } from 'react'

export function useEntityModals() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleCreate = useCallback(() => {
    setEditId(null)
    setSheetOpen(true)
  }, [])

  const handleEdit = useCallback((id: string) => {
    setEditId(id)
    setSheetOpen(true)
  }, [])

  return {
    sheetOpen,
    setSheetOpen,
    editId,
    setEditId,
    deleteId,
    setDeleteId,
    handleCreate,
    handleEdit,
  }
}
