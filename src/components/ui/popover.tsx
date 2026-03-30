import * as React from "react"
import { Popover as AntPopover } from "antd"
import { cn } from "@/lib/utils"

function Popover({
  children,
  open,
  onOpenChange,
}: {
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let triggerProps: any = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let contentProps: any = {}

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dn = (child.type as any)?.displayName
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (dn === "PopoverTrigger") triggerProps = (child as any).props ?? {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else if (dn === "PopoverContent") contentProps = (child as any).props ?? {}
  })

  const triggerChildren = triggerProps.children ?? null

  return (
    <AntPopover
      content={contentProps.children}
      open={open}
      onOpenChange={onOpenChange}
      trigger="click"
      overlayClassName={cn("min-w-[8rem]", contentProps.className)}
    >
      {triggerChildren}
    </AntPopover>
  )
}

function PopoverTrigger({ children }: { children: React.ReactNode; asChild?: boolean } & React.HTMLAttributes<HTMLElement>) {
  return <>{children}</>
}
PopoverTrigger.displayName = "PopoverTrigger"

function PopoverContent({ children }: {
  children: React.ReactNode
  className?: string
  align?: string
  sideOffset?: number
  side?: string
} & React.HTMLAttributes<HTMLDivElement>) {
  return <>{children}</>
}
PopoverContent.displayName = "PopoverContent"

export { Popover, PopoverTrigger, PopoverContent }
