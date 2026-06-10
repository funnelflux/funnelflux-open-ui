import { useCallback } from 'react'
import { Button, type ButtonProps } from './Button'
import { useToastApi } from './toast'

export interface CopyButtonProps extends Omit<ButtonProps, 'onClick' | 'children' | 'iconName' | 'icon'> {
  /** Text written to the clipboard on click. */
  value: string
  /** Toast after a successful copy (default: “Copied to clipboard”). */
  successMessage?: string
  /** Toast when the Clipboard API rejects (default: “Failed to copy”). */
  errorMessage?: string
}

/**
 * Icon-only control that copies `value` via the Clipboard API and surfaces result via {@link useToastApi}.
 */
export function CopyButton({
  value,
  successMessage = 'Copied to clipboard',
  errorMessage = 'Failed to copy',
  type = 'text',
  iconSize = 'sm',
  htmlType = 'button',
  'aria-label': ariaLabel = 'Copy to clipboard',
  disabled,
  ...rest
}: CopyButtonProps) {
  const toast = useToastApi()

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(value).then(
      () => toast.success(successMessage),
      () => toast.error(errorMessage),
    )
  }, [toast, value, successMessage, errorMessage])

  const isEmpty = value.trim().length === 0

  return (
    <Button
      {...rest}
      htmlType={htmlType}
      type={type}
      iconName="copy"
      iconSize={iconSize}
      aria-label={ariaLabel}
      disabled={Boolean(disabled) || isEmpty}
      onClick={handleCopy}
    />
  )
}
