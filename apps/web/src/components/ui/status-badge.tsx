import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from './badge'

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: 'success' | 'warning' | 'error' | 'processing' | 'idle' | 'pending'
  label?: string
  showIcon?: boolean
}

const statusConfig = {
  success: { variant: 'success', label: '成功', icon: '✓' },
  warning: { variant: 'warning', label: '警告', icon: '⚠️' },
  error: { variant: 'error', label: '错误', icon: '✕' },
  processing: { variant: 'primary', label: '处理中', icon: '⏳' },
  idle: { variant: 'muted', label: '空闲', icon: '⏸️' },
  pending: { variant: 'warning', label: '待处理', icon: '⏳' },
} as const

const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ className, status, label, showIcon = true, ...props }, ref) => {
    const config = statusConfig[status]
    
    return (
      <Badge
        ref={ref}
        variant={config.variant}
        className={cn("capitalize", className)}
        {...props}
      >
        {showIcon && <span className="mr-1">{config.icon}</span>}
        {label || config.label}
      </Badge>
    )
  }
)
StatusBadge.displayName = "StatusBadge"

export { StatusBadge }
