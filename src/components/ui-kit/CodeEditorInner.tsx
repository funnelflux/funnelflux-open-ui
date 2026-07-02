/**
 * CodeMirror-backed implementation of `CodeEditor`.
 * Loaded via `React.lazy` from `CodeEditor.tsx` so the CodeMirror vendor bundle
 * stays out of the eager ui-kit/entry chunks — do not import this module statically.
 */
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { php } from '@codemirror/lang-php'
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode'
import { useMemo } from 'react'
import { useThemeStore } from '@/store/theme'
import type { CodeEditorProps } from '@/components/ui-kit/CodeEditor'

export default function CodeEditorInner({
  value,
  onChange,
  language,
  readOnly,
  height = 'min(420px, 50vh)',
  id,
}: CodeEditorProps) {
  const themeMode = useThemeStore((s) => s.mode)
  const extensions = useMemo(
    () => [language === 'javascript' ? javascript() : php()],
    [language],
  )
  const theme = themeMode === 'dark' ? vscodeDark : vscodeLight

  return (
    <div className="min-h-0 overflow-hidden rounded-md border border-border">
      <CodeMirror
        id={id}
        value={value}
        height={height}
        theme={theme}
        extensions={extensions}
        onChange={onChange}
        editable={!readOnly}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          indentOnInput: true,
        }}
        className="text-sm [&_.cm-editor]:min-h-[200px] [&_.cm-scroller]:overflow-auto"
      />
    </div>
  )
}
