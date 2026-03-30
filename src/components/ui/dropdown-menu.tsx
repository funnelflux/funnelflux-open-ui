import * as React from "react"
import { Dropdown } from "antd"
import type { MenuProps } from "antd"
import { Check, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Internal helpers ──

interface ItemDef {
  key: string
  label: React.ReactNode
  icon?: React.ReactNode
  danger?: boolean
  disabled?: boolean
  type?: "item" | "checkbox" | "radio" | "separator" | "label"
  checked?: boolean
  onSelect?: () => void
  onCheckedChange?: (checked: boolean) => void
}

function collectItems(children: React.ReactNode): ItemDef[] {
  const items: ItemDef[] = []
  let idx = 0

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dn = (child.type as any)?.displayName as string | undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = child.props as any

    switch (dn) {
      case "DropdownMenuItem":
        items.push({
          key: `item-${idx++}`,
          label: p.children,
          disabled: p.disabled,
          onSelect: p.onClick ?? p.onSelect,
        })
        break
      case "DropdownMenuCheckboxItem":
        items.push({
          key: `cb-${idx++}`,
          label: p.children,
          type: "checkbox",
          checked: p.checked,
          onCheckedChange: p.onCheckedChange,
          onSelect: p.onClick,
        })
        break
      case "DropdownMenuRadioItem":
        items.push({
          key: `radio-${idx++}`,
          label: p.children,
          type: "radio",
          checked: p.checked,
          onSelect: p.onClick,
        })
        break
      case "DropdownMenuSeparator":
        items.push({ key: `sep-${idx++}`, label: "", type: "separator" })
        break
      case "DropdownMenuLabel":
        items.push({ key: `lbl-${idx++}`, label: p.children, type: "label" })
        break
      case "DropdownMenuGroup":
        items.push(...collectItems(p.children))
        break
      default:
        break
    }
  })

  return items
}

function itemDefsToMenuItems(defs: ItemDef[]): MenuProps["items"] {
  return defs.map((def) => {
    if (def.type === "separator") {
      return { key: def.key, type: "divider" as const }
    }
    if (def.type === "label") {
      return { key: def.key, label: def.label, type: "group" as const }
    }
    if (def.type === "checkbox") {
      return {
        key: def.key,
        label: (
          <span className="flex items-center gap-2">
            <span className="w-4">{def.checked ? <Check className="h-3.5 w-3.5" /> : null}</span>
            {def.label}
          </span>
        ),
        onClick: () => def.onCheckedChange?.(!def.checked),
      }
    }
    if (def.type === "radio") {
      return {
        key: def.key,
        label: (
          <span className="flex items-center gap-2">
            <span className="w-4">{def.checked ? <Circle className="h-2 w-2 fill-current" /> : null}</span>
            {def.label}
          </span>
        ),
        onClick: () => def.onSelect?.(),
      }
    }
    return {
      key: def.key,
      label: def.label,
      icon: def.icon,
      danger: def.danger,
      disabled: def.disabled,
      onClick: () => def.onSelect?.(),
    }
  })
}

// ── Compound components ──

function DropdownMenu({ children }: { children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let triggerProps: any = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let contentProps: any = {}

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dn = (child.type as any)?.displayName
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (dn === "DropdownMenuTrigger") triggerProps = (child as any).props ?? {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else if (dn === "DropdownMenuContent") contentProps = (child as any).props ?? {}
  })

  const contentChildren = contentProps.children ?? null
  const contentClassName = contentProps.className
  const items = contentChildren ? collectItems(contentChildren) : []

  const triggerChildren = triggerProps.children ?? null
  const asChild = triggerProps.asChild ?? false

  return (
    <Dropdown
      menu={{ items: itemDefsToMenuItems(items) }}
      trigger={["click"]}
      overlayClassName={cn("min-w-[8rem]", contentClassName)}
    >
      {asChild ? (
        triggerChildren
      ) : (
        <span role="button" tabIndex={0} className="cursor-pointer">
          {triggerChildren}
        </span>
      )}
    </Dropdown>
  )
}

function DropdownMenuTrigger({ children }: { children: React.ReactNode; asChild?: boolean } & React.HTMLAttributes<HTMLElement>) {
  return <>{children}</>
}
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

function DropdownMenuContent({ children }: { children: React.ReactNode; className?: string; align?: string; sideOffset?: number; side?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <>{children}</>
}
DropdownMenuContent.displayName = "DropdownMenuContent"

function DropdownMenuItem({ children }: { children: React.ReactNode; className?: string; inset?: boolean; disabled?: boolean; onClick?: () => void; onSelect?: () => void; asChild?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return <>{children}</>
}
DropdownMenuItem.displayName = "DropdownMenuItem"

function DropdownMenuCheckboxItem({ children }: { children: React.ReactNode; className?: string; checked?: boolean; onCheckedChange?: (checked: boolean) => void; onClick?: () => void } & React.HTMLAttributes<HTMLDivElement>) {
  return <>{children}</>
}
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem"

function DropdownMenuRadioItem({ children }: { children: React.ReactNode; className?: string; value?: string; checked?: boolean; onClick?: () => void } & React.HTMLAttributes<HTMLDivElement>) {
  return <>{children}</>
}
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem"

function DropdownMenuLabel({ children }: { children: React.ReactNode; className?: string; inset?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return <>{children}</>
}
DropdownMenuLabel.displayName = "DropdownMenuLabel"

function DropdownMenuSeparator(_props: { className?: string } & React.HTMLAttributes<HTMLDivElement>) { return null }
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

function DropdownMenuShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />
}
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

function DropdownMenuGroup({ children }: { children: React.ReactNode }) { return <>{children}</> }
DropdownMenuGroup.displayName = "DropdownMenuGroup"

function DropdownMenuPortal({ children }: { children: React.ReactNode }) { return <>{children}</> }
DropdownMenuPortal.displayName = "DropdownMenuPortal"

function DropdownMenuSub({ children }: { children: React.ReactNode }) { return <>{children}</> }
DropdownMenuSub.displayName = "DropdownMenuSub"

function DropdownMenuSubContent({ children }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) { return <>{children}</> }
DropdownMenuSubContent.displayName = "DropdownMenuSubContent"

function DropdownMenuSubTrigger({ children }: { children: React.ReactNode; className?: string; inset?: boolean } & React.HTMLAttributes<HTMLDivElement>) { return <>{children}</> }
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger"

function DropdownMenuRadioGroup({ children }: { children: React.ReactNode; value?: string; onValueChange?: (value: string) => void }) { return <>{children}</> }
DropdownMenuRadioGroup.displayName = "DropdownMenuRadioGroup"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}
