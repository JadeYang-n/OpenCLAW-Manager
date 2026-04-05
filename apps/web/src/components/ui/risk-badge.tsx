import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from './badge'

export interface RiskBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  level: 'L' | 'M' | 'H'
  showLabel?: boolean
}

const riskConfig = {
  L: { variant: 'success', label: '低风险' },
  M: { variant: 'warning', label: '中风险' },
  H: { variant: 'error', label: '高风险' },
} as const

const RiskBadge = React.forwardRef<HTMLDivElement, RiskBadgeProps>(
  ({ className, level, showLabel = true, ...props }, ref) => {
    const config = riskConfig[level]
    
    return (
      <Badge
        ref={ref}
        variant={config.variant}
        rounded="full"
        className={cn("font-bold tracking-wider", className)}
        {...props}
      >
        {level}
        {showLabel && <span className="ml-1 text-xs opacity-80">{config.label}</span>}
      </Badge>
    )
  }
)
RiskBadge.displayName = "RiskBadge"

export { RiskBadge }
