import { useCallback, useEffect, useState } from 'react'

type RevealableRow = { id: string; _isCategoryHeader?: boolean }

/**
 * Scroll to and briefly highlight a row after create/clone save.
 * Pass `revealRowId` / `setRevealRowId` from the parent so pagination can react before rows render.
 */
export function useRevealEntityRow(
  pageRows: RevealableRow[],
  revealRowId: string | null,
  setRevealRowId: (id: string | null) => void,
) {
  const [highlightRowId, setHighlightRowId] = useState<string | null>(null)

  const requestReveal = useCallback((id: string) => setRevealRowId(id), [setRevealRowId])

  useEffect(() => {
    if (!revealRowId) return
    const visible = pageRows.some(
      (row) => row.id === revealRowId && !row._isCategoryHeader,
    )
    if (!visible) return

    const scrollTimer = window.setTimeout(() => {
      document
        .querySelector(`.dt-scroll-container [data-row-id="${revealRowId}"]`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      const id = revealRowId
      setRevealRowId(null)
      setHighlightRowId(id)
      window.setTimeout(() => setHighlightRowId(null), 2400)
    }, 50)

    return () => window.clearTimeout(scrollTimer)
  }, [revealRowId, pageRows, setRevealRowId])

  return { requestReveal, highlightRowId }
}
