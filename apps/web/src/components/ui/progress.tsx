import { HTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100))
    
    return (
      <div
        ref={ref}
        className={clsx('relative h-4 w-full overflow-hidden rounded-full bg-gray-200', className)}
        {...props}
      >
        <div
          className="h-full bg-primary bg-blue-600 transition-all duration-500 ease-in-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    )
  }
)
Progress.displayName = 'Progress'
