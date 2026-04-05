import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from './badge'

export type RoleType = 'admin' | 'operator' | 'dept_admin' | 'employee' | 'auditor'

export interface RoleBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  role: RoleType
  showLabel?: boolean
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'muted'
}

const roleConfig = {
  admin: { 
    default: { variant: 'error', label: '超管' },
    primary: { variant: 'primary', label: '超管' },
    success: { variant: 'success', label: '超管' },
    warning: { variant: 'warning', label: '超管' },
    error: { variant: 'error', label: '超管' },
    muted: { variant: 'muted', label: '超管' },
  },
  operator: {
    default: { variant: 'primary', label: '运维' },
    primary: { variant: 'primary', label: '运维' },
    success: { variant: 'success', label: '运维' },
    warning: { variant: 'warning', label: '运维' },
    error: { variant: 'error', label: '运维' },
    muted: { variant: 'muted', label: '运维' },
  },
  dept_admin: {
    default: { variant: 'success', label: '部门' },
    primary: { variant: 'primary', label: '部门' },
    success: { variant: 'success', label: '部门' },
    warning: { variant: 'warning', label: '部门' },
    error: { variant: 'error', label: '部门' },
    muted: { variant: 'muted', label: '部门' },
  },
  employee: {
    default: { variant: 'muted', label: '员工' },
    primary: { variant: 'primary', label: '员工' },
    success: { variant: 'success', label: '员工' },
    warning: { variant: 'warning', label: '员工' },
    error: { variant: 'error', label: '员工' },
    muted: { variant: 'muted', label: '员工' },
  },
  auditor: {
    default: { variant: 'warning', label: '审计' },
    primary: { variant: 'primary', label: '审计' },
    success: { variant: 'success', label: '审计' },
    warning: { variant: 'warning', label: '审计' },
    error: { variant: 'error', label: '审计' },
    muted: { variant: 'muted', label: '审计' },
  },
} as const

const RoleBadge = React.forwardRef<HTMLDivElement, RoleBadgeProps>(
  ({ className, role, showLabel = true, variant = 'default', ...props }, ref) => {
    const config = roleConfig[role][variant]
    
    return (
      <Badge
        ref={ref}
        variant={config.variant}
        size="sm"
        className={cn("font-medium", className)}
        {...props}
      >
        {config.label}
        {showLabel && <span className="ml-1 opacity-80"></span>}
      </Badge>
    )
  }
)
RoleBadge.displayName = "RoleBadge"

export { RoleBadge }
