import { Children, forwardRef } from 'react'
import { Button as AntdButton } from 'antd'
import type { ButtonProps as AntdButtonProps } from 'antd'
import type { ControlSize, LegacyAntdControlSize } from '@/lib/controlSize'
import { controlSizeToAntdSize, normalizeControlTier } from '@/lib/controlSize'
import { cn } from '@/lib/utils'
import { Icon, type IconName, type IconSize, type IconProps } from '@/components/ui-kit/icons'

export interface ButtonProps extends Omit<AntdButtonProps, 'size'> {
  /**
   * sm | md | lg — matches Select and Input (`h-control-*`).
   * Legacy Ant Design `small` / `middle` / `large` are accepted and mapped to the same tiers.
   */
  size?: ControlSize | LegacyAntdControlSize

  /**
   * Prefer `iconName` over passing `<Icon />` manually.
   * Spacing and sizing are handled internally.
   */
  iconName?: IconName

  /** Override icon size if needed (defaults to match `size`). */
  iconSize?: IconSize

  /** Optional icon animation (e.g. spinner/pulse) without custom classes. */
  iconAnimation?: IconProps['animation']
}

export const Button = forwardRef<HTMLButtonElement | null, ButtonProps>(
  function Button(
    { size = 'md', className, icon, iconName, iconSize, iconAnimation, children, ...rest },
    ref,
  ) {
    const tier = normalizeControlTier(size)
    const antdBtnSize = controlSizeToAntdSize(tier)

    const effectiveIconSize: IconSize =
      iconSize ?? (tier === 'sm' ? 'sm' : tier === 'lg' ? 'lg' : 'md')

    const resolvedIcon =
      iconName ? <Icon name={iconName} size={effectiveIconSize} animation={iconAnimation} aria-hidden />
      : icon

    const iconOnly =
      resolvedIcon != null &&
      (children == null || children === false || Children.count(children) === 0)

    const iconOnlyClass =
      iconOnly ?
        ({
          sm: 'h-control-sm w-control-sm inline-flex items-center justify-center !p-0',
          md: 'h-control-md w-control-md inline-flex items-center justify-center !p-0',
          lg: 'h-control-lg w-control-lg inline-flex items-center justify-center !p-0',
        }[tier])
      : undefined

    return (
      <AntdButton
        ref={ref}
        size={antdBtnSize}
        icon={resolvedIcon}
        className={cn(iconOnlyClass, className)}
        {...rest}
      >
        {children}
      </AntdButton>
    )
  },
)
