import * as React from "react"
import { cn } from "@/lib/cn"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium",
          "transition-all duration-200 ease-out",
          "active:scale-[0.98] motion-reduce:transform-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          "touch-manipulation",
          {
            "bg-yellow-400 text-slate-900 hover:bg-yellow-500 shadow-sm shadow-yellow-500/20 hover:shadow-md hover:shadow-yellow-500/30": variant === "default",
            "border border-slate-200 bg-white hover:bg-slate-100 text-slate-900 hover:border-slate-300": variant === "outline",
            "hover:bg-slate-100 hover:text-slate-900 text-slate-600": variant === "ghost",
            "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20": variant === "destructive",
            "min-h-11 px-4 py-2": size === "default",
            "min-h-11 sm:min-h-9 rounded-lg px-3": size === "sm",
            "h-14 rounded-2xl px-8 text-base min-h-[56px]": size === "lg",
            "h-11 w-11": size === "icon",
          },
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {children}
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
