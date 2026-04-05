import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline' | 'muted'
  size?: 'sm' | 'default' | 'lg' | 'icon'
  rounded?: 'default' | 'full' | 'md' | 'none'
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', size = 'default', rounded = 'default', ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    
    // Variant styles
    const variants = {
      default: "bg-primary text-primary-foreground hover:bg-primary/80",
      primary: "bg-primary text-primary-foreground hover:bg-primary/80",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      success: "bg-success text-success-foreground hover:bg-success/80",
      warning: "bg-warning text-warning-foreground hover:bg-warning/80",
      error: "bg-error text-error-foreground hover:bg-error/80",
      outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      muted: "bg-muted text-muted-foreground hover:bg-muted/80",
    }
    
    // Size styles
    const sizes = {
      sm: "h-5 px-2 text-xs",
      default: "h-6 px-2.5 text-xs",
      lg: "h-8 px-3 text-sm",
      icon: "h-5 w-5 p-1",
    }
    
    // Rounded styles
    const roundings = {
      default: "rounded-md",
      full: "rounded-full",
      md: "rounded",
      none: "rounded-none",
    }
    
    return (
      <div
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          roundings[rounded],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }
