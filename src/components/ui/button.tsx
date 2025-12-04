// zecrete/src/components/ui/button.tsx

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // **NEO-BRUTALIST REDESIGN BASE**
  // - No rounded corners (remove 'rounded-md')
  // - Thicker border and initial shadow
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-bold border-2 border-foreground shadow-[4px_4px_0_0_#000] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Primary button with strong contrast
        default: "bg-primary text-primary-foreground hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none",
        // Destructive button with strong contrast
        destructive: "bg-destructive text-destructive-foreground hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none",
        // Outline button (now the 'Hollow' style)
        outline: "bg-background text-foreground hover:bg-foreground hover:text-background hover:shadow-none",
        // Secondary (often used as a muted variant)
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 hover:shadow-[2px_2px_0_0_#000]",
        // Ghost button (minimalist, still with a strong hover)
        ghost: "shadow-none hover:bg-accent hover:text-accent-foreground border-transparent",
        // Link button remains simple
        link: "text-primary underline-offset-4 hover:underline shadow-none border-transparent",
      },
      size: {
        default: "h-11 px-6 py-2", // Slightly taller and wider
        sm: "h-9 px-4",
        lg: "h-12 px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }