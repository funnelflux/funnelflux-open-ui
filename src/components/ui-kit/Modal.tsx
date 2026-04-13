import { Modal as AntModal } from 'antd'
import type { ModalProps as AntModalProps } from 'antd'
import type { CSSProperties } from 'react'

/** Body layout for long forms: cap height, flex column; children use flex-1 + overflow-y-auto for scroll. */
const SCROLL_BODY_STYLE: CSSProperties = {
  maxHeight: 'min(85vh, 720px)',
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

export type ModalProps = AntModalProps & {
  /**
   * When true, constrains modal body height and uses a flex column so inner layouts
   * (e.g. form + sticky footer) can scroll correctly. Default false for simple dialogs.
   */
  scrollBody?: boolean
}

export function Modal({ scrollBody = false, styles, ...rest }: ModalProps) {
  const mergedStyles = scrollBody
    ? {
        ...(typeof styles === 'object' && styles ? styles : {}),
        body: {
          ...SCROLL_BODY_STYLE,
          ...(styles as { body?: CSSProperties } | undefined)?.body,
        },
      }
    : styles

  return <AntModal styles={mergedStyles} {...rest} />
}
