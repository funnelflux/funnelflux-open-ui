import * as React from "react"
import { Tooltip as AntTooltip } from "antd"

function TooltipProvider({ children }: { children: React.ReactNode; delayDuration?: number; skipDelayDuration?: number }) {
  return <>{children}</>
}

function Tooltip({
  children,
  open,
  defaultOpen,
  onOpenChange,
}: {
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  let trigger: React.ReactNode = null
  let title: React.ReactNode = null

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const displayName = (child.type as any)?.displayName
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const childProps = child.props as any
    if (displayName === "TooltipTrigger") {
      trigger = childProps.children
    } else if (displayName === "TooltipContent") {
      title = childProps.children
    }
  })

  return (
    <AntTooltip
      title={title}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
    >
      {trigger}
    </AntTooltip>
  )
}

function TooltipTrigger({
  children,
  asChild: _asChild,
}: {
  children: React.ReactNode
  asChild?: boolean
}) {
  return <>{children}</>
}
TooltipTrigger.displayName = "TooltipTrigger"

function TooltipContent({
  children,
}: {
  children: React.ReactNode
  className?: string
  sideOffset?: number
  side?: string
  align?: string
}) {
  return <>{children}</>
}
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
