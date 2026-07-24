import { Suspense, lazy } from 'react'
import { DEFAULT_CODE_EDITOR_HEIGHT } from '@/components/ui-kit/codeEditorConfig'

export type CodeEditorLanguage = 'javascript' | 'php'

export interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language: CodeEditorLanguage
  readOnly?: boolean
  /** Passed to CodeMirror `height` prop (CSS length). */
  height?: string
  id?: string
}

/** CodeMirror implementation is code-split so the ~650 KB vendor bundle loads on demand. */
const CodeEditorInner = lazy(() => import('@/components/ui-kit/CodeEditorInner'))

export function CodeEditor(props: CodeEditorProps) {
  const { height = DEFAULT_CODE_EDITOR_HEIGHT } = props
  return (
    <Suspense
      fallback={
        <div className="min-h-0 overflow-hidden rounded-md border border-border">
          <div
            className="min-h-[200px] w-full animate-pulse bg-surface-sunken"
            style={{ height }}
            aria-hidden="true"
          />
        </div>
      }
    >
      <CodeEditorInner {...props} />
    </Suspense>
  )
}
