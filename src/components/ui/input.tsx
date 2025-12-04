// zecrete/src/components/ui/input.tsx

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = "text", ...props }, ref) => {
  return <input type={type} className={cn("flex h-11 w-full border-2 border-foreground bg-background px-4 py-2 text-base shadow-[4px_4px_0_0_#000] transition-shadow duration-150 ease-out placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50", className)} ref={ref} {...props} />;
});
Input.displayName = "Input";

export { Input };
