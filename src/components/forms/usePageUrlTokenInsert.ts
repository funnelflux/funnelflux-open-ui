import { useCallback, useRef, type RefObject } from 'react'
import type { InputRef } from '@/components/ui-kit'

interface UsePageUrlTokenInsertArgs {
  urlInputRef: RefObject<InputRef | null>
  getUrlValue: () => string
  setUrlValue: (url: string) => void
}

export function usePageUrlTokenInsert({
  urlInputRef,
  getUrlValue,
  setUrlValue,
}: UsePageUrlTokenInsertArgs) {
  const urlCaretRef = useRef({ start: -1, end: -1 })

  const rememberUrlCaret = useCallback(() => {
    const input = urlInputRef.current?.input
    if (!input) return
    urlCaretRef.current = {
      start: input.selectionStart ?? getUrlValue().length,
      end: input.selectionEnd ?? getUrlValue().length,
    }
  }, [getUrlValue, urlInputRef])

  const insertTokenIntoUrl = useCallback(
    (token: string) => {
      if (!token) return

      const current = getUrlValue()
      let start = urlCaretRef.current.start
      let end = urlCaretRef.current.end

      if (start < 0 || end < 0) {
        start = current.length
        end = current.length
      }

      const next = `${current.slice(0, start)}${token}${current.slice(end)}`
      setUrlValue(next)

      requestAnimationFrame(() => {
        const urlInput = urlInputRef.current?.input
        if (!urlInput) return
        const caret = start + token.length
        urlInput.focus()
        urlInput.setSelectionRange(caret, caret)
        urlCaretRef.current = { start: caret, end: caret }
      })
    },
    [getUrlValue, setUrlValue, urlInputRef],
  )

  return { rememberUrlCaret, insertTokenIntoUrl }
}
