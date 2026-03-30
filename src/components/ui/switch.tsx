import * as React from "react"
import { Switch as AntSwitch } from "antd"
import { cn } from "@/lib/utils"

export interface SwitchProps {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
  name?: string
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, onCheckedChange, ...props }, ref) => {
    return (
      <AntSwitch
        ref={ref}
        className={cn(className)}
        onChange={onCheckedChange}
        {...props}
      />
    )
  },
)
Switch.displayName = "Switch"

export { Switch }
