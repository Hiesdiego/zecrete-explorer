// zecrete/src/components/ui/use-toast.ts

"use client";
import { toast as sonnerToast } from "sonner";

export const useToast = () => ({
  toast: ({ title, description, variant = "default" }: any) => {
    if (variant === "destructive") sonnerToast.error(title, { description });
    else sonnerToast.success(title, { description });
  },
});
