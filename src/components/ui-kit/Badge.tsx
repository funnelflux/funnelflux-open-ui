import { Badge as AntBadge, type BadgeProps as AntBadgeProps } from 'antd'
import { forwardRef } from 'react'

export type BadgeSemanticVariant = 'info' | 'success' | 'warning' | 'error' | 'neutral'

const semanticBadgeColors: Record<BadgeSemanticVariant, { indicator: string; text: string }> = {
  info: { indicator: 'var(--primary)', text: 'var(--ff-info-text)' },
  success: { indicator: 'var(--ff-success)', text: 'var(--ff-success-text)' },
  warning: { indicator: 'var(--ff-warning)', text: 'var(--ff-warning-text)' },
  error: { indicator: 'var(--ff-error)', text: 'var(--ff-error-text)' },
  neutral: { indicator: 'var(--muted-fg)', text: 'var(--muted-fg)' },
}

export type BadgeProps = AntBadgeProps & {
  /** Semantic tokenized status color for the indicator and optional status text. */
  variant?: BadgeSemanticVariant
}

const Badge = Object.assign(
  forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
    { variant, color, style, ...rest },
    ref,
  ) {
    const semanticColors = variant ? semanticBadgeColors[variant] : undefined
    const semanticTextStyle =
      semanticColors && rest.count == null && rest.children == null
        ? { color: semanticColors.text, ...style }
        : style

    return (
      <AntBadge
        {...rest}
        ref={ref}
        color={semanticColors?.indicator ?? color}
        style={semanticTextStyle}
      />
    )
  }),
  {
    Ribbon: AntBadge.Ribbon,
  },
)

export { Badge }
