import { forwardRef } from 'react'
import { Button as AntdButton } from 'antd'
import type { ButtonProps as AntdButtonProps } from 'antd'
import type { ControlSize } from '@/lib/controlSize'
import { controlSizeToAntdSize } from '@/lib/controlSize'

export interface ButtonProps extends Omit<AntdButtonProps, 'size'> {
  /** Default **md** (35px) — aligns with Select / DatePicker in toolbars */
  controlSize?: ControlSize
  size?: AntdButtonProps['size']
}

export const Button = forwardRef<HTMLButtonElement | null, ButtonProps>(
  function Button({ controlSize = 'md', size, ...rest }, ref) {
    return (
      <AntdButton
        ref={ref}
        size={size ?? controlSizeToAntdSize(controlSize)}
        {...rest}
      />
    )
  },
)
