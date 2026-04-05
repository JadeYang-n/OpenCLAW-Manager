import * as React from "react"
import { cn } from "@/lib/utils"

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string
  description?: string
  error?: string
  required?: boolean
  className?: string
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, label, description, error, required, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("space-y-2", className)}
        {...props}
      >
        {label && (
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
            {required && <span className="ml-1 text-error">*</span>}
          </label>
        )}
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
        {children}
        {error && (
          <p className="text-sm text-error font-medium">
            {error}
          </p>
        )}
      </div>
    )
  }
)
FormField.displayName = "FormField"

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}
      {...props}
    />
  )
})
Label.displayName = "Label"

export { FormField, Label }
