import * as React from "react"
import { Drawer } from "antd"
import { cn } from "@/lib/utils"

type SheetSide = "top" | "bottom" | "left" | "right"

const sideToPlacement: Record<SheetSide, "top" | "bottom" | "left" | "right"> = {
  top: "top",
  bottom: "bottom",
  left: "left",
  right: "right",
}

function Sheet({
  children,
  open,
  onOpenChange,
}: {
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  // Collect SheetContent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let contentProps: any = {}
  const rest: React.ReactNode[] = []

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) { rest.push(child); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dn = (child.type as any)?.displayName
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (dn === "SheetContent") contentProps = (child as any).props ?? {}
    else rest.push(child)
  })
  const side: SheetSide = contentProps.side ?? "right"

  // Parse max-width from className like "sm:max-w-lg"
  let width: number | string = 378
  const className: string = contentProps.className ?? ""
  if (className.includes("max-w-2xl")) width = 672
  else if (className.includes("max-w-xl")) width = 576
  else if (className.includes("max-w-lg")) width = 512
  else if (className.includes("max-w-md")) width = 448
  else if (className.includes("max-w-sm")) width = 384

  return (
    <>
      {rest}
      <Drawer
        open={open}
        onClose={() => onOpenChange?.(false)}
        placement={sideToPlacement[side]}
        width={side === "left" || side === "right" ? width : undefined}
        height={side === "top" || side === "bottom" ? width : undefined}
        destroyOnClose
        className="[&_.ant-drawer-body]:p-6"
      >
        {contentProps.children}
      </Drawer>
    </>
  )
}

function SheetTrigger({ children, ...props }: { children: React.ReactNode; asChild?: boolean } & React.HTMLAttributes<HTMLElement>) {
  return <span {...props}>{children}</span>
}
SheetTrigger.displayName = "SheetTrigger"

function SheetClose({ children, ...props }: { children: React.ReactNode; asChild?: boolean } & React.HTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props}>{children}</button>
}
SheetClose.displayName = "SheetClose"

function SheetPortal({ children }: { children: React.ReactNode }) { return <>{children}</> }
SheetPortal.displayName = "SheetPortal"

function SheetOverlay(_props: React.HTMLAttributes<HTMLDivElement>) { return null }
SheetOverlay.displayName = "SheetOverlay"

function SheetContent({ children }: { children: React.ReactNode; side?: SheetSide; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <>{children}</>
}
SheetContent.displayName = "SheetContent"

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
}
SheetHeader.displayName = "SheetHeader"

function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
}
SheetFooter.displayName = "SheetFooter"

function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold text-foreground", className)} {...props} />
}
SheetTitle.displayName = "SheetTitle"

function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />
}
SheetDescription.displayName = "SheetDescription"

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
