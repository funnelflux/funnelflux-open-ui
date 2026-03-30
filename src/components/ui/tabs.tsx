import * as React from "react"
import { Tabs as AntTabs } from "antd"
import { cn } from "@/lib/utils"

/**
 * Compound Tabs preserving shadcn API:
 *   <Tabs value={v} onValueChange={fn}>
 *     <TabsList>
 *       <TabsTrigger value="a">A</TabsTrigger>
 *     </TabsList>
 *     <TabsContent value="a">Content A</TabsContent>
 *   </Tabs>
 */

interface TabDef {
  value: string
  label: React.ReactNode
  content?: React.ReactNode
  disabled?: boolean
}

function collectTabs(children: React.ReactNode): { tabs: TabDef[]; listClass?: string } {
  const tabs: TabDef[] = []
  let listClass: string | undefined

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dn = (child.type as any)?.displayName as string | undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = child.props as any

    if (dn === "TabsList") {
      listClass = p.className
      React.Children.forEach(p.children, (trigger: React.ReactNode) => {
        if (!React.isValidElement(trigger)) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tp = trigger.props as any
        tabs.push({ value: tp.value, label: tp.children, disabled: tp.disabled })
      })
    } else if (dn === "TabsContent") {
      const existing = tabs.find((t) => t.value === p.value)
      if (existing) {
        existing.content = p.children
      } else {
        tabs.push({ value: p.value, label: p.value, content: p.children })
      }
    }
  })

  return { tabs, listClass }
}

function Tabs({
  children,
  value,
  defaultValue,
  onValueChange,
  className,
}: {
  children: React.ReactNode
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  className?: string
  orientation?: string
}) {
  const { tabs } = collectTabs(children)

  return (
    <AntTabs
      activeKey={value}
      defaultActiveKey={defaultValue}
      onChange={onValueChange}
      className={cn(className)}
      items={tabs.map((t) => ({
        key: t.value,
        label: t.label,
        children: t.content,
        disabled: t.disabled,
      }))}
    />
  )
}

// ── Stub compound children ──

function TabsList({ children }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <>{children}</>
}
TabsList.displayName = "TabsList"

function TabsTrigger({ children }: { children: React.ReactNode; value: string; className?: string; disabled?: boolean } & React.HTMLAttributes<HTMLButtonElement>) {
  return <>{children}</>
}
TabsTrigger.displayName = "TabsTrigger"

function TabsContent({ children }: { children: React.ReactNode; value: string; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <>{children}</>
}
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
