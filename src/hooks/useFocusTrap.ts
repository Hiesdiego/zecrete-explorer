// src/hooks/useFocusTrap.ts
"use client";
import { useEffect, useRef } from "react";

export function useFocusTrap(active: boolean) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;
    const focusable = el.querySelectorAll<HTMLElement>('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // do nothing here — parent handles close
      }
      if (e.key === "Tab") {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    function onFocusin() {
      if (!el.contains(document.activeElement)) first?.focus();
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusin);
    // set initial focus
    setTimeout(()=> first?.focus(), 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusin);
    };
  }, [active]);

  return ref;
}
