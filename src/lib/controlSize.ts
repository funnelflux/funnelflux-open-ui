/**
 * Shared control sizing for Ant Design–based ui-kit primitives (Button, Select, DatePicker, etc.).
 * Default **md** matches theme `controlHeight` (35px) so toolbars align when mixing components.
 */
export type ControlSize = 'sm' | 'md' | 'lg'

/** Ant Design naming — map to the same tiers as `ControlSize` (`h-control-*` in CSS). */
export type LegacyAntdControlSize = 'small' | 'middle' | 'large'

/** Pixel heights — must match `design-tokens.css` `--control-height-*` */
export const CONTROL_SIZE_HEIGHT_PX: Record<ControlSize, number> = {
  sm: 28,
  md: 35,
  lg: 42,
}

/** Collapse app + Ant Design size labels to `ControlSize` tiers. */
export function normalizeControlTier(
  size?: ControlSize | LegacyAntdControlSize,
): ControlSize {
  if (size === 'small' || size === 'sm') return 'sm'
  if (size === 'large' || size === 'lg') return 'lg'
  return 'md'
}

/** Date/range pickers use medium height minimum (`sm` → `md`). */
export function normalizePickerControlTier(
  size?: ControlSize | LegacyAntdControlSize,
): Exclude<ControlSize, 'sm'> {
  const tier = normalizeControlTier(size)
  return tier === 'sm' ? 'md' : tier
}

/** Maps normalized control tier to Ant Design `size` on Button, Select, DatePicker, Input, etc. */
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

export function controlTierToAntdSize(
  size?: ControlSize | LegacyAntdControlSize,
): 'small' | 'middle' | 'large' {
  return controlSizeToAntdSize(normalizeControlTier(size))
}
