import * as React from "react"
import { Select as AntSelect } from "antd"
import { cn } from "@/lib/utils"

/**
 * Compound Select that preserves the shadcn API surface:
 *   <Select value={v} onValueChange={fn}>
 *     <SelectTrigger className="...">
 *       <SelectValue placeholder="..." />
 *     </SelectTrigger>
 *     <SelectContent>
 *       <SelectItem value="a">A</SelectItem>
 *     </SelectContent>
 *   </Select>
 *
 * Internally renders a single Ant Design <Select>.
 */

interface OptionDef {
  value: string
  label: React.ReactNode
  disabled?: boolean
}

function collectOptions(children: React.ReactNode, opts: OptionDef[], meta: { placeholder?: React.ReactNode; triggerClass?: string }) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dn = (child.type as any)?.displayName as string | undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = child.props as any

    switch (dn) {
      case "SelectTrigger":
        meta.triggerClass = p.className
        collectOptions(p.children, opts, meta)
        break
      case "SelectValue":
        meta.placeholder = p.placeholder
        break
      case "SelectContent":
      case "SelectGroup":
        collectOptions(p.children, opts, meta)
        break
      case "SelectItem":
        opts.push({ value: p.value, label: p.children, disabled: p.disabled })
        break
      default:
        if (p?.children) collectOptions(p.children, opts, meta)
        break
    }
  })
}

function Select({
  children,
  value,
  defaultValue,
  onValueChange,
  open,
  onOpenChange,
  disabled,
}: {
  children: React.ReactNode
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
  name?: string
}) {
  const opts: OptionDef[] = []
  const meta: { placeholder?: React.ReactNode; triggerClass?: string } = {}
  collectOptions(children, opts, meta)

  return (
    <AntSelect
      value={value || defaultValue || undefined}
      onChange={(v: string) => onValueChange?.(v)}
      open={open}
      onDropdownVisibleChange={onOpenChange}
      disabled={disabled}
      placeholder={meta.placeholder}
      className={cn("!w-full", meta.triggerClass)}
      popupMatchSelectWidth={true}
      options={opts.map((o) => ({ value: o.value, label: o.label, disabled: o.disabled }))}
    />
  )
}

// ── Stub compound children (collected by Select, never rendered alone) ──

function SelectGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
SelectGroup.displayName = "SelectGroup"

function SelectValue(_props: { placeholder?: React.ReactNode; children?: React.ReactNode }) {
  return null
}
SelectValue.displayName = "SelectValue"

function SelectTrigger({ children }: { children: React.ReactNode; className?: string; asChild?: boolean } & React.HTMLAttributes<HTMLButtonElement>) {
  return <>{children}</>
}
SelectTrigger.displayName = "SelectTrigger"

function SelectContent({ children }: { children: React.ReactNode; className?: string; position?: string; align?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <>{children}</>
}
SelectContent.displayName = "SelectContent"

function SelectLabel({ children }: { children: React.ReactNode; className?: string }) {
  return <>{children}</>
}
SelectLabel.displayName = "SelectLabel"

function SelectItem({ children }: { children: React.ReactNode; value: string; className?: string; disabled?: boolean }) {
  return <>{children}</>
}
SelectItem.displayName = "SelectItem"

function SelectSeparator(_props: { className?: string }) { return null }
SelectSeparator.displayName = "SelectSeparator"

function SelectScrollUpButton(_props: { className?: string }) { return null }
SelectScrollUpButton.displayName = "SelectScrollUpButton"

function SelectScrollDownButton(_props: { className?: string }) { return null }
SelectScrollDownButton.displayName = "SelectScrollDownButton"

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
