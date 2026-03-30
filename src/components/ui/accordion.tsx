import * as React from "react"
import { Collapse } from "antd"
import { cn } from "@/lib/utils"

/**
 * Compound Accordion preserving shadcn API:
 *   <Accordion type="single" collapsible>
 *     <AccordionItem value="a">
 *       <AccordionTrigger>Title</AccordionTrigger>
 *       <AccordionContent>Body</AccordionContent>
 *     </AccordionItem>
 *   </Accordion>
 */

interface PanelDef {
  key: string
  label: React.ReactNode
  children: React.ReactNode
  className?: string
}

function collectPanels(children: React.ReactNode): PanelDef[] {
  const panels: PanelDef[] = []

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dn = (child.type as any)?.displayName
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = child.props as any

    if (dn === "AccordionItem") {
      let label: React.ReactNode = null
      let content: React.ReactNode = null

      React.Children.forEach(p.children, (inner: React.ReactNode) => {
        if (!React.isValidElement(inner)) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const idn = (inner.type as any)?.displayName
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ip = inner.props as any
        if (idn === "AccordionTrigger") label = ip.children
        else if (idn === "AccordionContent") content = ip.children
      })

      panels.push({ key: p.value, label, children: content, className: p.className })
    }
  })

  return panels
}

function Accordion({
  children,
  type,
  collapsible: _collapsible,
  value,
  defaultValue,
  onValueChange,
  className,
}: {
  children: React.ReactNode
  type?: "single" | "multiple"
  collapsible?: boolean
  value?: string | string[]
  defaultValue?: string | string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onValueChange?: (value: any) => void
  className?: string
}) {
  const panels = collectPanels(children)
  const isMultiple = type === "multiple"

  const activeKey = value
    ? Array.isArray(value) ? value : [value]
    : undefined
  const defaultActiveKey = defaultValue
    ? Array.isArray(defaultValue) ? defaultValue : [defaultValue]
    : undefined

  return (
    <Collapse
      accordion={!isMultiple}
      activeKey={activeKey}
      defaultActiveKey={defaultActiveKey}
      onChange={(keys) => {
        const k = Array.isArray(keys) ? keys : [keys]
        if (isMultiple) {
          onValueChange?.(k as string[])
        } else {
          onValueChange?.(k[0] as string ?? "")
        }
      }}
      className={cn(className)}
      items={panels.map((p) => ({
        key: p.key,
        label: p.label,
        children: p.children,
        className: p.className,
      }))}
      bordered={false}
    />
  )
}

// ── Stub compound children ──

function AccordionItem({ children }: { children: React.ReactNode; value: string; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <>{children}</>
}
AccordionItem.displayName = "AccordionItem"

function AccordionTrigger({ children }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLButtonElement>) {
  return <>{children}</>
}
AccordionTrigger.displayName = "AccordionTrigger"

function AccordionContent({ children }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <>{children}</>
}
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
