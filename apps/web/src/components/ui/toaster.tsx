import { Toaster as Sonner } from "react-hot-toast"

const Toaster = () => {
  return (
    <Sonner
      toastOptions={{
        className: "toast",
        duration: 3000,
        style: {
          background: "var(--background)",
          color: "var(--foreground)",
          border: "1px solid var(--border)",
        },
        success: {
          iconTheme: {
            primary: "var(--success)",
            secondary: "var(--success-foreground)",
          },
        },
        error: {
          iconTheme: {
            primary: "var(--destructive)",
            secondary: "var(--destructive-foreground)",
          },
        },
      }}
    />
  )
}

export { Toaster }
