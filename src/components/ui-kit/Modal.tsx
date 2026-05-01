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

const FULLSCREEN_STYLE: NonNullable<AntModalProps['styles']> = {
  wrapper: {
    padding: 0,
    alignItems: 'stretch',
  },
  container: {
    height: '100vh',
    maxHeight: '100dvh',
    margin: 0,
    padding: 0,
    top: 0,
    borderRadius: 0,
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    minHeight: 0,
    height: '100%',
    padding: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
}

type ModalLayoutVariant = 'default' | 'form' | 'fullscreen'

export type ModalProps = AntModalProps & {
  /**
   * When true, constrains modal body height and uses a flex column so inner layouts
   * (e.g. form + sticky footer) can scroll correctly. Default false for simple dialogs.
   */
  scrollBody?: boolean

  /**
   * App-level layout variant.
   * - `default`: plain Ant Modal behavior
   * - `form`: long-form/fixed-footer layout (scrollable body)
   * - `fullscreen`: viewport-sized modal shell for immersive tools
   */
  layoutVariant?: ModalLayoutVariant
}

function mergedModalStyles(
  variant: ModalLayoutVariant,
  styles: AntModalProps['styles'] | undefined,
): AntModalProps['styles'] {
  if (variant === 'default') return styles
  if (variant === 'form') {
    return {
      ...(typeof styles === 'object' && styles ? styles : {}),
      body: {
        ...SCROLL_BODY_STYLE,
        ...(styles as { body?: CSSProperties } | undefined)?.body,
      },
    }
  }
  return {
    ...FULLSCREEN_STYLE,
    ...(typeof styles === 'object' && styles ? styles : {}),
    wrapper: {
      ...FULLSCREEN_STYLE.wrapper,
      ...(styles as { wrapper?: CSSProperties } | undefined)?.wrapper,
    },
    container: {
      ...FULLSCREEN_STYLE.container,
      ...(styles as { container?: CSSProperties } | undefined)?.container,
    },
    body: {
      ...FULLSCREEN_STYLE.body,
      ...(styles as { body?: CSSProperties } | undefined)?.body,
    },
  }
}

export function Modal({
  scrollBody = false,
  layoutVariant = 'default',
  styles,
  classNames,
  style,
  ...rest
}: ModalProps) {
  const effectiveVariant: ModalLayoutVariant = layoutVariant === 'default' && scrollBody ? 'form' : layoutVariant
  const mergedStyles = mergedModalStyles(effectiveVariant, styles)
  const mergedClassNames =
    effectiveVariant === 'fullscreen'
      ? { ...(classNames ?? {}), mask: [classNames?.mask, 'backdrop-blur-[2px]'].filter(Boolean).join(' ') }
      : classNames
  const mergedStyle = effectiveVariant === 'fullscreen'
    ? { top: 0, paddingBottom: 0, margin: 0, maxWidth: '100vw', ...(style ?? {}) }
    : style

  return <AntModal styles={mergedStyles} classNames={mergedClassNames} style={mergedStyle} {...rest} />
}
