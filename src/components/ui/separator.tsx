import * as React from "react"
import { Divider } from "antd"
import { cn } from "@/lib/utils"

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
  decorative?: boolean
}

function Separator({
  className,
  orientation = "horizontal",
  decorative: _decorative = true,
  ...props
}: SeparatorProps) {
  return (
    <Divider
      type={orientation === "vertical" ? "vertical" : "horizontal"}
      className={cn("!my-0 !border-border", className)}
      style={props.style}
    />
  )
}
Separator.displayName = "Separator"

export { Separator }
