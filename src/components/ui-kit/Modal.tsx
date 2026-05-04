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

/** Ant Design `styles` typing includes function forms; object literals are supported at runtime. */
const FULLSCREEN_STYLE = {
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
} as unknown as NonNullable<Extract<AntModalProps['styles'], Record<string, unknown>>>

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

type ModalStylesObject = {
  wrapper?: CSSProperties
  container?: CSSProperties
  body?: CSSProperties
  [key: string]: CSSProperties | undefined
}

function asStylesObject(styles: AntModalProps['styles'] | undefined): ModalStylesObject {
  return typeof styles === 'object' && styles ? (styles as ModalStylesObject) : {}
}

function mergedModalStyles(
  variant: ModalLayoutVariant,
  styles: AntModalProps['styles'] | undefined,
): AntModalProps['styles'] {
  if (variant === 'default') return styles
  const base = asStylesObject(styles)
  if (variant === 'form') {
    return {
      ...base,
      body: {
        ...SCROLL_BODY_STYLE,
        ...base.body,
      },
    } as AntModalProps['styles']
  }
  const fullscreen = FULLSCREEN_STYLE as ModalStylesObject
  return {
    ...fullscreen,
    ...base,
    wrapper: {
      ...fullscreen.wrapper,
      ...base.wrapper,
    },
    container: {
      ...fullscreen.container,
      ...base.container,
    },
    body: {
      ...fullscreen.body,
      ...base.body,
    },
  } as AntModalProps['styles']
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
  const classNamesObj = typeof classNames === 'object' && classNames
    ? (classNames as Record<string, string | undefined>)
    : {}
  const mergedClassNames =
    effectiveVariant === 'fullscreen'
      ? { ...classNamesObj, mask: [classNamesObj.mask, 'backdrop-blur-[2px]'].filter(Boolean).join(' ') }
      : classNames
  const mergedStyle = effectiveVariant === 'fullscreen'
    ? { top: 0, paddingBottom: 0, margin: 0, maxWidth: '100vw', ...(style ?? {}) }
    : style

  return <AntModal styles={mergedStyles} classNames={mergedClassNames} style={mergedStyle} {...rest} />
}
