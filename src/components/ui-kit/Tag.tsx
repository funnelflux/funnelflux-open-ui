import { Tag as AntTag, type TagProps as AntTagProps } from 'antd'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export type TagSemanticVariant =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'neutral'
  | 'accent'
  | 'primary'

const semanticTagClasses: Record<TagSemanticVariant, string> = {
  info: '!border-primary/30 !bg-primary-subtle !text-info-text',
  success: '!border-success/30 !bg-success/10 !text-success-text',
  warning: '!border-warning/30 !bg-warning/10 !text-warning-text',
  error: '!border-error/30 !bg-error/10 !text-error-text',
  neutral: '!border-border !bg-muted !text-muted-foreground',
  accent: '!border-accent-orange/30 !bg-accent-orange/10 !text-accent-orange',
  primary: '!border-primary/40 !bg-primary/10 !text-primary',
}

export type TagProps = Omit<AntTagProps, 'variant'> & {
  /** Semantic tokenized colors. Ant Design variants (`filled`, `solid`, `outlined`) remain supported. */
  variant?: AntTagProps['variant'] | TagSemanticVariant
}

function isSemanticTagVariant(variant: TagProps['variant']): variant is TagSemanticVariant {
  return typeof variant === 'string' && variant in semanticTagClasses
}

const Tag = Object.assign(
  forwardRef<HTMLAnchorElement | HTMLSpanElement, TagProps>(function Tag(
    { variant, color, className, ...rest },
    ref,
  ) {
    const semanticVariant = isSemanticTagVariant(variant) ? variant : undefined

    return (
      <AntTag
        {...rest}
        ref={ref}
        color={semanticVariant ? undefined : color}
        variant={semanticVariant ? undefined : (variant as AntTagProps['variant'])}
        className={cn(semanticVariant ? semanticTagClasses[semanticVariant] : undefined, className)}
      />
    )
  }),
  {
    CheckableTag: AntTag.CheckableTag,
    CheckableTagGroup: AntTag.CheckableTagGroup,
  },
)

export { Tag }
export type { AntTagProps as TagPropsFromAntd }
