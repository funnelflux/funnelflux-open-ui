import * as React from "react"
import { Modal } from "antd"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

/**
 * AlertDialog using Ant Design Modal.
 * Preserves the compound shadcn API:
 *   <AlertDialog open={open} onOpenChange={setOpen}>
 *     <AlertDialogContent>
 *       <AlertDialogHeader>
 *         <AlertDialogTitle>Title</AlertDialogTitle>
 *         <AlertDialogDescription>Desc</AlertDialogDescription>
 *       </AlertDialogHeader>
 *       <AlertDialogFooter>
 *         <AlertDialogCancel>Cancel</AlertDialogCancel>
 *         <AlertDialogAction>Continue</AlertDialogAction>
 *       </AlertDialogFooter>
 *     </AlertDialogContent>
 *   </AlertDialog>
 */

function AlertDialog({
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
  let contentProps: any = {}

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dn = (child.type as any)?.displayName
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (dn === "AlertDialogContent") contentProps = (child as any).props ?? {}
  })

  return (
    <Modal
      open={open}
      onCancel={() => onOpenChange?.(false)}
      footer={null}
      closable={false}
      destroyOnClose
      maskClosable={false}
      className={cn(contentProps.className)}
      width={512}
    >
      {contentProps.children}
    </Modal>
  )
}

function AlertDialogPortal({ children }: { children: React.ReactNode }) { return <>{children}</> }
AlertDialogPortal.displayName = "AlertDialogPortal"

function AlertDialogOverlay(_props: React.HTMLAttributes<HTMLDivElement>) { return null }
AlertDialogOverlay.displayName = "AlertDialogOverlay"

function AlertDialogTrigger({ children }: { children: React.ReactNode; asChild?: boolean } & React.HTMLAttributes<HTMLElement>) {
  return <>{children}</>
}
AlertDialogTrigger.displayName = "AlertDialogTrigger"

function AlertDialogContent({ children }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <>{children}</>
}
AlertDialogContent.displayName = "AlertDialogContent"

function AlertDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
}
AlertDialogHeader.displayName = "AlertDialogHeader"

function AlertDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
}
AlertDialogFooter.displayName = "AlertDialogFooter"

function AlertDialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold", className)} {...props} />
}
AlertDialogTitle.displayName = "AlertDialogTitle"

function AlertDialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />
}
AlertDialogDescription.displayName = "AlertDialogDescription"

function AlertDialogAction({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn(buttonVariants(), className)} {...props} />
}
AlertDialogAction.displayName = "AlertDialogAction"

function AlertDialogCancel({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)} {...props} />
}
AlertDialogCancel.displayName = "AlertDialogCancel"

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
