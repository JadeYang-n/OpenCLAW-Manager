import * as React from "react"
import * as Toast_primitives from "@radix-ui/react-toast"
import { X } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const ToastProvider = Toast_primitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof Toast_primitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof Toast_primitives.Viewport>
>(({ className, ...props }, ref) => (
  <Toast_primitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = Toast_primitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-all data-[state=open]:duration-300 data-[state=open]:sm:duration-500",
  {
    variants: {
      variant: {
        default: "border bg-white dark:bg-gray-950",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
        success: "border-green-500/50 bg-green-50 text-green-900 dark:border-green-900/50 dark:bg-green-950 dark:text-green-100",
        error: "border-red-500/50 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950 dark:text-red-100",
        warning: "border-yellow-500/50 bg-yellow-50 text-yellow-900 dark:border-yellow-900/50 dark:bg-yellow-950 dark:text-yellow-100",
        info: "border-blue-500/50 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950 dark:text-blue-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof Toast_primitives.Root>,
  React.ComponentPropsWithoutRef<typeof Toast_primitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <Toast_primitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = Toast_primitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof Toast_primitives.Action>,
  React.ComponentPropsWithoutRef<typeof Toast_primitives.Action>
>(({ className, ...props }, ref) => (
  <Toast_primitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-white transition-colors hover:bg-gray-100 focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-gray-50/30 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = Toast_primitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof Toast_primitives.Close>,
  React.ComponentPropsWithoutRef<typeof Toast_primitives.Close>
>(({ className, ...props }, ref) => (
  <Toast_primitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </Toast_primitives.Close>
))
ToastClose.displayName = Toast_primitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof Toast_primitives.Title>,
  React.ComponentPropsWithoutRef<typeof Toast_primitives.Title>
>(({ className, ...props }, ref) => (
  <Toast_primitives.Title
    ref={ref}
    className={cn("text-sm font-semibold [&+div]:text-xs", className)}
    {...props}
  />
))
ToastTitle.displayName = Toast_primitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof Toast_primitives.Description>,
  React.ComponentPropsWithoutRef<typeof Toast_primitives.Description>
>(({ className, ...props }, ref) => (
  <Toast_primitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = Toast_primitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
