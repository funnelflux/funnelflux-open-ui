/**
 * Shared control sizing for Ant Design–based ui-kit primitives (Button, Select, DatePicker, etc.).
 * Default **md** matches theme `controlHeight` (35px) so toolbars align when mixing components.
 */
export type ControlSize = 'sm' | 'md' | 'lg'

/** Pixel heights aligned with `antd-theme` token.controlHeight / SM / LG */
export const CONTROL_SIZE_HEIGHT_PX: Record<ControlSize, number> = {
  sm: 28,
  md: 35,
  lg: 42,
}

/** Maps app size names to Ant Design `size` on Button, Select, DatePicker, Input, etc. */
export function controlSizeToAntdSize(
  controlSize: ControlSize,
): 'small' | 'middle' | 'large' {
  switch (controlSize) {
    case 'sm':
      return 'small'
    case 'lg':
      return 'large'
    default:
      return 'middle'
  }
}
