import * as React from "react"
import { Modal } from "antd"
import type { ModalProps } from "antd"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

function Dialog({
  children,
  open,
  onOpenChange,
}: {
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let triggerNode: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let contentProps: any = {}
  const rest: React.ReactNode[] = []

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) { rest.push(child); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dn = (child.type as any)?.displayName
    if (dn === "DialogTrigger") triggerNode = child
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else if (dn === "DialogContent") contentProps = (child as any).props ?? {}
    else rest.push(child)
  })

  return (
    <>
      {triggerNode && (
        <span role="button" tabIndex={0} onClick={() => onOpenChange?.(true)}>
          {triggerNode.props?.children}
        </span>
      )}
      <Modal
        open={open}
        onCancel={() => onOpenChange?.(false)}
        footer={null}
        destroyOnClose
        className={cn(contentProps.className)}
        closeIcon={<X className="h-4 w-4" />}
        width={contentProps.width ?? contentProps.style?.maxWidth ?? 512}
        zIndex={contentProps.zIndex}
        styles={contentProps.styles as ModalProps['styles']}
        classNames={contentProps.classNames as ModalProps['classNames']}
      >
        {contentProps.children}
      </Modal>
      {rest}
    </>
  )
}

function DialogTrigger({
  children,
  asChild: _asChild,
  ...props
}: {
  children: React.ReactNode
  asChild?: boolean
} & React.HTMLAttributes<HTMLElement>) {
  void _asChild
  return <span role="button" tabIndex={0} {...props}>{children}</span>
}
DialogTrigger.displayName = "DialogTrigger"

function DialogPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
DialogPortal.displayName = "DialogPortal"

function DialogOverlay({ className: _className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  void _className
  void props
  return null
}
DialogOverlay.displayName = "DialogOverlay"

function DialogClose({ children, ...props }: React.HTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  return <button type="button" {...props}>{children}</button>
}
DialogClose.displayName = "DialogClose"

/** Props are read by `Dialog` from the element (`child.props`); only `children` are rendered here. */
function DialogContent({
  children,
}: {
  children: React.ReactNode
  className?: string
  /** Pixel width or CSS width string (passed to Ant Design Modal). */
  width?: number | string
  /** Stacking order; use above React Flow / canvas overlays (e.g. 1100). */
  zIndex?: number
  style?: React.CSSProperties
  styles?: ModalProps['styles']
  classNames?: ModalProps['classNames']
}) {
  return <>{children}</>
}
DialogContent.displayName = "DialogContent"

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
}
DialogHeader.displayName = "DialogHeader"

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
}
DialogFooter.displayName = "DialogFooter"

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
}
DialogTitle.displayName = "DialogTitle"

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />
}
DialogDescription.displayName = "DialogDescription"

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
