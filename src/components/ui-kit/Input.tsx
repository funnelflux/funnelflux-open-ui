import { forwardRef } from 'react'
import type { ComponentRef } from 'react'
import { Input as AntdInput } from 'antd'
import type { InputProps as AntdInputProps } from 'antd'
import type { TextAreaProps } from 'antd/es/input/TextArea'
import type { ControlSize, LegacyAntdControlSize } from '@/lib/controlSize'
import { controlTierToAntdSize } from '@/lib/controlSize'

export type InputProps = Omit<AntdInputProps, 'size'> & {
  /**
   * sm | md | lg — aligns with Button and Select.
   * Legacy Ant Design `small` / `middle` / `large` are mapped to the same tiers.
   */
  size?: ControlSize | LegacyAntdControlSize
}

type TextAreaRef = ComponentRef<typeof AntdInput.TextArea>

const inputRoot = forwardRef<ComponentRef<typeof AntdInput>, InputProps>(function Input(
  { size = 'md', ...rest },
  ref,
) {
  return <AntdInput ref={ref} size={controlTierToAntdSize(size)} {...rest} />
})

export type InputTextAreaProps = Omit<TextAreaProps, 'size'> & {
  size?: ControlSize | LegacyAntdControlSize
}

const inputTextArea = forwardRef<TextAreaRef, InputTextAreaProps>(function InputTextArea(
  { size = 'md', ...rest },
  ref,
) {
  return <AntdInput.TextArea ref={ref} size={controlTierToAntdSize(size)} {...rest} />
})

/** Ant Design Input — prefer `size="md"` so controls align across the app */
export const Input = Object.assign(inputRoot, {
  TextArea: inputTextArea,
})

export type { InputRef } from 'antd'
